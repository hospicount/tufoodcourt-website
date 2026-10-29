// Tu Food Court — "Hoy en la línea criolla".
// Reads the owner's Google Sheet (one row per day) and shows the row for the right day:
//   · home menu, Criollo tab → today (Puerto Rico time)
//   · order picker → the date the customer chose for the order (orders can be scheduled days ahead)
// The sheet is shared as "anyone with the link → viewer" and must contain nothing but the menu (its ID is
// public in config.js). If the sheet is missing, private or unreachable, the site shows nothing extra.
(function () {
  const C = window.TFC_CONFIG || {};
  const T = window.TFC || {};
  const id = String(C.criolloSheetId || '').trim();
  const TZ = C.timeZone || 'America/Puerto_Rico';
  const esc = T.esc || ((s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const lang = () => (T.lang ? T.lang() : 'es');
  const L = (es, en) => (lang() === 'en' ? en : es);
  const warn = (msg) => { if (window.console) console.warn('criollo sheet: ' + msg); };

  // ---------- CSV (RFC 4180: quoted fields, doubled quotes, newlines inside quotes) ----------
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, ''); // strip a UTF-8 BOM if the export carries one
    const rows = [];
    let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((v) => String(v).trim() !== ''));
  }

  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

  // ---------- calendar ----------
  const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const DAYS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const WD = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6,
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const MONTHS = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
    ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12, jan: 1, apr: 4, aug: 8, dec: 12 };

  const dayOf = (y, m, d) => { const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return { y, m, d, dow, en: DAYS_EN[dow], es: DAYS_ES[dow] }; };
  const sameDay = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;
  const validDay = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();

  // Today in Puerto Rico, whatever the phone's clock zone says.
  function today(now) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' });
    const p = {}; f.formatToParts(now || new Date()).forEach((x) => { p[x.type] = x.value; });
    return dayOf(+p.year, +p.month, +p.day);
  }
  const fromISO = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m && validDay(+m[1], +m[2], +m[3]) ? dayOf(+m[1], +m[2], +m[3]) : null; };
  // Closed per config.js schedule (0 = Sunday … 6 = Saturday, null = closed). No schedule = never closed.
  const closedOn = (t) => !!C.schedule && C.schedule[t.dow] == null;

  // Date candidates for a text like "2026-11-03", "11/3/2026", "3/11", "3 de noviembre", "nov 3", "3".
  // Ambiguous a/b forms return both readings (US first); the caller disambiguates with the weekday when it has one.
  function dateCandidates(s, ref) {
    s = norm(s).replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();
    const out = [], add = (y, m, d) => { if (validDay(y, m, d)) out.push({ y, m, d }); };
    let m;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) { add(+m[1], +m[2], +m[3]); return out; }
    if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/))) {
      let y = m[3] ? +m[3] : ref.y; if (y < 100) y += 2000;
      add(y, +m[1], +m[2]); add(y, +m[2], +m[1]);
      return out;
    }
    if ((m = s.match(/^(\d{1,2})(?: de)? ([a-z]+)(?: de| del)?(?: (\d{4}))?$/)) && MONTHS[m[2]]) { add(m[3] ? +m[3] : ref.y, MONTHS[m[2]], +m[1]); return out; }
    if ((m = s.match(/^([a-z]+) (\d{1,2})(?: (\d{4}))?$/)) && MONTHS[m[1]]) { add(m[3] ? +m[3] : ref.y, MONTHS[m[1]], +m[2]); return out; }
    if ((m = s.match(/^(\d{1,2})$/))) { // day of month only: this month, next month, last month
      const d = +m[1];
      [[ref.y, ref.m], ref.m === 12 ? [ref.y + 1, 1] : [ref.y, ref.m + 1], ref.m === 1 ? [ref.y - 1, 12] : [ref.y, ref.m - 1]].forEach(([y, mo]) => add(y, mo, d));
      return out;
    }
    return out;
  }

  // Classifies a «Día» cell relative to `ref` (the day being looked up):
  //   {kind:'date', date}  "2026-11-03", "3/11", "Lunes 2026-11-09", "Lunes 9", "Lunes 9 de noviembre"  → that date only
  //   {kind:'weekday', dow} "Lunes", "Lunes (feriado)"                                                 → every Monday
  //   {kind:'any'}          "Hoy" / "Today"                                                             → fallback for any day
  //   {kind:'bad'}          a weekday with digits we cannot read (never silently treated as weekly)
  //   null                  blank or unrelated text
  function classify(cell, ref) {
    const s = norm(cell).replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    if (s === 'hoy' || s === 'today') return { kind: 'any' };
    const first = s.split(' ')[0];
    const dow = Object.prototype.hasOwnProperty.call(WD, first) ? WD[first] : null;
    const rest = dow == null ? s : s.slice(first.length).trim();
    if (dow != null && !/\d/.test(rest)) return { kind: 'weekday', dow };
    const cands = dateCandidates(rest, ref);
    if (dow != null) {
      const match = cands.find((c) => dayOf(c.y, c.m, c.d).dow === dow);
      return match ? { kind: 'date', date: match } : { kind: 'bad' };
    }
    if (!cands.length) return null;
    if (/^\d{1,2}$/.test(rest)) { // bare day number: the next occurrence (this month if not past, else next month)
      const pick = cands.find((c) => c.y > ref.y || (c.y === ref.y && (c.m > ref.m || (c.m === ref.m && c.d >= ref.d)))) || cands[0];
      return { kind: 'date', date: pick };
    }
    return { kind: 'date', date: cands[0] };
  }

  // The header row: the one whose first cell is Día/Day/Fecha/Date. Returns -1 when the sheet has no header.
  function headerIndex(rows) {
    const h = rows.findIndex((r) => ['dia', 'day', 'fecha', 'date'].includes(norm(r[0])));
    if (h >= 0) return h;
    const k = rows[0] ? classify(rows[0][0], today()) : null;
    if (k) { warn('falta la fila de títulos (Día, Arroz, Guiso…): no se muestra el menú del día'); return -1; }
    return 0;
  }

  // Precedence: an exact date row beats a weekday row, which beats a "Hoy" row. Among equals the LAST row wins.
  // On a closed day (schedule) only an explicit date row shows.
  function pickRow(rows, t, h) {
    h = h == null ? 0 : h;
    let date = null, weekday = null, any = null;
    for (let i = h + 1; i < rows.length; i++) {
      const c = classify(rows[i][0], t);
      if (!c) continue;
      if (c.kind === 'bad') { warn(`fila ${i + 1}: no entiendo la fecha «${rows[i][0]}»; esa fila se ignora`); continue; }
      if (c.kind === 'date') { if (sameDay(c.date, t)) date = rows[i]; continue; }
      if (c.kind === 'weekday') { if (c.dow === t.dow) weekday = rows[i]; continue; }
      any = rows[i];
    }
    if (date) return date;
    if (closedOn(t)) return null;
    return weekday || any || null;
  }

  // ---------- rendering ----------
  const LABELS_EN = { arroz: 'Rice', arroces: 'Rice', guiso: 'Stew', guisos: 'Stew', proteina: 'Protein', proteinas: 'Proteins', carne: 'Meat', carnes: 'Meats', acompanante: 'Side', acompanantes: 'Sides', sopa: 'Soup', sopas: 'Soups', ensalada: 'Salad', postre: 'Dessert', postres: 'Desserts', especial: 'Special', nota: 'Note', notas: 'Notes', bebida: 'Drink', bebidas: 'Drinks', vegetales: 'Vegetables' };
  const label = (h) => (lang() === 'en' && LABELS_EN[norm(h)]) || h;

  function dayLabel(day) {
    try {
      return new Intl.DateTimeFormat(lang() === 'en' ? 'en-US' : 'es-PR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
        .format(new Date(Date.UTC(day.y, day.m - 1, day.d, 12)));
    } catch (e) { return ''; }
  }

  function plato() {
    const st = (window.TFC_MENU || []).find((s) => s.id === 'criollo');
    let it = null;
    (st ? st.sections : []).forEach((sec) => sec.items.forEach((x) => { if (x.id === 'cr-plato') it = x; }));
    return it;
  }

  function cardHtml(headers, row, day, isToday) {
    const items = headers.slice(1).map((h, i) => ({ h: String(h || '').trim(), v: String(row[i + 1] || '').trim() })).filter((x) => x.h && x.v);
    if (!items.length) return '';
    const it = plato();
    const price = it && T.priceHtml ? T.priceHtml(it) : '';
    const title = isToday ? L('Hoy en la línea criolla', 'On the criollo line today') : L('En la línea criolla ese día', 'On the criollo line that day');
    return `
      <p class="today-title">${esc(title)}<span class="today-date">${esc(dayLabel(day))}</span></p>
      <dl class="today-list">${items.map((x) => `<div><dt>${esc(label(x.h))}</dt><dd>${esc(x.v)}</dd></div>`).join('')}</dl>
      ${price ? `<p class="today-foot">${esc(L('Plato criollo del día', 'Criollo plate of the day'))}: ${price} · ${esc(L('escribe tu preferencia al pedir', 'tell us your preference when ordering'))}</p>` : ''}`;
  }

  let sheet = null;   // { headers, rows, h } or null
  let loadedAt = 0;

  // The order picker follows the date the customer picked for the order; everything else shows today.
  function dayFor(box, now) {
    const form = box.closest('form');
    const input = form && form.querySelector('input[type=date]');
    return (input && fromISO(input.value)) || today(now);
  }

  function fill() {
    const now = new Date();
    const t = today(now);
    document.querySelectorAll('[data-criollo-today]').forEach((box) => {
      let html = '';
      if (sheet) {
        const day = dayFor(box, now);
        const row = pickRow(sheet.rows, day, sheet.h);
        html = row ? cardHtml(sheet.headers, row, day, sameDay(day, t)) : '';
      }
      box.innerHTML = html;
      box.hidden = !html;
    });
  }

  function setSheet(rows) {
    const h = rows.length ? headerIndex(rows) : -1;
    sheet = h >= 0 && rows.length > h + 1 ? { headers: rows[h], rows, h } : null;
    fill();
    return !!sheet;
  }

  async function load() {
    if (!id || !window.fetch || !window.AbortController) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const tab = String(C.criolloSheetTab || '').trim();
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&headers=1${tab ? `&sheet=${encodeURIComponent(tab)}` : ''}`;
      const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit', redirect: 'error' }); // a private sheet redirects to Google login: fail quietly
      if (!res.ok) throw new Error('HTTP ' + res.status + (res.status === 401 || res.status === 403 ? ' (¿la hoja está compartida con «cualquier persona con el enlace»?)' : ''));
      loadedAt = Date.now();
      setSheet(parseCSV(await res.text()));
    } catch (e) {
      warn(e && e.message); // not shared, offline or slow network: the site just shows its normal criollo text
    } finally { clearTimeout(timer); }
  }

  // Preview without a sheet: TFC.criollo.applyCSV('Día,Arroz\nHoy,Arroz con gandules')
  const applyCSV = (text) => setSheet(parseCSV(String(text || '')));

  // Re-pick the day whenever something re-renders, the language flips, the order date changes,
  // or the page comes back to the foreground (a tab left open past midnight; refetch if the data is old).
  const refresh = () => { if (id && loadedAt && Date.now() - loadedAt > 10 * 60 * 1000) load(); else fill(); };
  document.addEventListener('tfc:menu-rendered', fill);
  document.addEventListener('tfc:lang', fill);
  document.addEventListener('change', (e) => { if (e.target && e.target.type === 'date') fill(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) refresh(); });
  load();

  T.criollo = { parseCSV, classify, dateCandidates, headerIndex, pickRow, today, fromISO, norm, applyCSV };
})();
