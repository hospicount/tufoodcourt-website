// Tu Food Court — prices and availability from the owner's Google Sheet (tab «Precios»).
// menu.js keeps the built-in base prices. This file overlays the sheet's «Precio base» (still BEFORE the +% / .99
// rule applied in site.js) and hides what the owner marks «Disponible = No». One row per item, or per option when the
// price depends on it (pizza size, Regular/Combo…). Nothing here is required: no sheet, no access, a bad cell or a slow
// network → the built-in menu shows. Must load after menu.js and before site.js / forms.js.
//
// Transport note: the gviz CSV endpoint types every column by its majority (E «Precio base» = number, G «Disponible» =
// text) and exports minority-type cells as EMPTY, so text typed into the price column never reaches us. That is why the
// counter-price switch is the number 0 (the word «mostrador» is still accepted when it does arrive).
(function () {
  const C = window.TFC_CONFIG || {};
  const T = (window.TFC = window.TFC || {});
  const MENU = window.TFC_MENU || [];
  const id = String(C.pricesSheetId || '').trim();
  const tab = String(C.pricesSheetTab || '').trim();
  const KEY = 'tfc-prices-v1';
  const CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // a copy older than this is ignored
  const FIRST_PAINT_WAIT = 1500;                   // first visit without a cached copy: wait this long for the sheet, then render
  const REFRESH_AFTER = 10 * 60 * 1000;            // a page brought back to the foreground refetches if its last attempt is older
  const MAX_PRICE = 500;
  const warn = (msg) => { if (window.console) console.warn('precios sheet: ' + msg); };
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  // Phone keyboards type curly quotes: 10” must still match the built-in 10".
  const norm = (s) => String(s == null ? '' : s).replace(/[“”„″]/g, '"').replace(/[‘’′]/g, "'")
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const nameOf = (it) => (typeof it.name === 'string' ? it.name : (it.name && it.name.es) || it.id);

  // ---------- CSV (RFC 4180: quoted fields, doubled quotes, newlines inside quotes) ----------
  // Blank rows are KEPT so that warnings can quote the real sheet row number; parseRows skips them.
  // A quote that is not at the start of a field (hand-typed `10"`) is kept literally instead of opening a quoted field.
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    const rows = [];
    let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"' && field === '') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  const isBlank = (r) => !r.some((v) => String(v).trim() !== '');

  // ---------- built-in defaults, so a later sheet (or a deleted row) is applied from a clean slate ----------
  const items = Object.create(null); // id → { it, price, prices, options: [{ o, choices }] }  (null prototype: a Código of "constructor" is just unknown)
  MENU.forEach((s) => (s.sections || []).forEach((sec) => (sec.items || []).forEach((it) => {
    if (!it || !it.id) return;
    items[norm(it.id)] = {
      it,
      price: it.price,
      prices: it.prices ? { ...it.prices } : null,
      options: (it.options || []).map((o) => ({ o, choices: (o.choices || []).slice() })),
    };
  })));
  function reset() {
    Object.keys(items).forEach((k) => {
      const d = items[k], it = d.it;
      it.price = d.price;
      if (d.prices) it.prices = { ...d.prices };
      d.options.forEach((x) => { x.o.choices = x.choices.slice(); });
      delete it.available;
    });
  }

  // ---------- cells ----------
  // "11.99", "$11.99", "11,99", "1,299.00" → number (cents); 0 or «mostrador» → null (sold at the counter price);
  // blank → undefined (keep the built-in price); anything else → NaN (ignored with a warning).
  function parsePrice(s) {
    s = norm(s).replace(/\$|usd|\s/g, '');
    if (s === '') return undefined;
    if (/mostrador|counter|consultar/.test(s)) return null;
    if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, ''); else s = s.replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    const n = Math.round(parseFloat(s) * 100) / 100;
    if (n === 0) return null;
    return n > 0 && n <= MAX_PRICE ? n : NaN;
  }
  // «Disponible»: blank → undefined (shown); a cell that STARTS with a hide word → false; a show word → true;
  // anything else → NaN (shown, with a warning so the owner notices).
  const HIDE = /^(no\b|n\b|agotad|oculto|oculta|sin\b|se acab|off\b|false|falso|0\b)/;
  const SHOW = /^(si\b|yes\b|true|1\b|x\b|ok\b|disponible|activo|activa|on\b)/;
  function parseAvail(s) { s = norm(s); if (s === '') return undefined; if (HIDE.test(s)) return false; if (SHOW.test(s)) return true; return NaN; }

  // ---------- rows → entries ----------
  const HEAD = {
    code: ['codigo', 'id', 'code', 'clave'],
    opt: ['opcion', 'option', 'variante', 'variant', 'tamano', 'size'],
    price: ['precio base', 'precio', 'price', 'base', 'base price', 'precio sin ajuste'],
    avail: ['disponible', 'available', 'activo', 'active', 'en venta', 'en el menu', 'se vende'],
    name: ['plato', 'nombre', 'name', 'item', 'dish'],
  };
  const isPriceTitle = (v) => HEAD.price.includes(v) || v.startsWith('precio base'); // «Precio base ($)» still counts
  // The title row is the first row with a «Código» cell, wherever it is (a sorted sheet may push it down). Titles are
  // matched whole, so the informational «Precio en el sitio» column is never read as the price.
  function parseRows(rows) {
    let h = -1, col = null;
    for (let i = 0; i < rows.length && h < 0; i++) {
      const r = rows[i].map(norm);
      const c = r.findIndex((v) => HEAD.code.includes(v));
      if (c >= 0) {
        h = i;
        col = { code: c, opt: r.findIndex((v) => HEAD.opt.includes(v)), price: r.findIndex(isPriceTitle), avail: r.findIndex((v) => HEAD.avail.includes(v)), name: r.findIndex((v) => HEAD.name.includes(v)) };
      }
    }
    if (h < 0) { warn('falta la fila de títulos (Código, Opción, Precio base, Disponible): no se aplican precios'); return null; }
    if (col.price < 0 && col.avail < 0) { warn('faltan las columnas «Precio base» y «Disponible»: no se aplica nada'); return null; }
    if (col.price < 0) warn('no encuentro la columna «Precio base»: solo se aplica «Disponible»');
    if (col.avail < 0) warn('no encuentro la columna «Disponible»: solo se aplican los precios');
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      if (i === h) continue;
      const r = rows[i];
      if (isBlank(r)) continue;
      const cell = (k) => (col[k] >= 0 && r[col[k]] != null ? String(r[col[k]]).trim() : '');
      const code = norm(cell('code'));
      if (!code) { if (cell('price') || cell('avail')) warn(`fila ${i + 1}: sin Código; se ignora`); continue; }
      out.push({ line: i + 1, code, opt: cell('opt'), price: cell('price'), avail: cell('avail'), name: cell('name') });
    }
    return out;
  }

  // ---------- entries → menu ----------
  function apply(entries) {
    reset();
    let n = 0;
    const seen = Object.create(null); // "code|option" → first line: a repeated row never overrides the first one
    (entries || []).forEach((e) => {
      if (!has(items, e.code)) { warn(`fila ${e.line}: el Código «${e.code}» no existe en menu.js; se ignora`); return; }
      const d = items[e.code], it = d.it, label = nameOf(it);
      const k = e.code + '|' + norm(e.opt);
      if (seen[k]) { warn(`fila ${e.line}: Código «${e.code}»${e.opt ? ' / ' + e.opt : ''} repetido (ya está en la fila ${seen[k]}); se usa la primera fila. Copiar una fila no crea un plato nuevo`); return; }
      seen[k] = e.line;
      if (e.name && norm(e.name) !== norm(label)) warn(`fila ${e.line}: el Plato «${e.name}» no coincide con el Código «${e.code}» (${label}); la fila se aplica a ${label}. Un plato nuevo se añade en menu.js`);
      const price = parsePrice(e.price);
      const avail = parseAvail(e.avail);
      const hasPrice = price !== undefined && !Number.isNaN(price);
      const hide = avail === false;
      if (Number.isNaN(price)) warn(`fila ${e.line}: precio «${e.price}» no válido; se mantiene el precio del sitio`);
      if (Number.isNaN(avail)) warn(`fila ${e.line}: no entiendo Disponible «${e.avail}»; el plato se muestra (escribe No o Sí)`);
      if (it.priceBy) {
        const keys = Object.keys(d.prices || {});
        if (!e.opt) { // whole-item row for a per-option item: availability applies to all options, the price cannot
          if (hasPrice) warn(`fila ${e.line}: «${label}» tiene precio por opción; escribe la Opción (${keys.join(' / ')})`);
          if (hide) { it.available = false; n++; }
          return;
        }
        const key = keys.find((x) => norm(x) === norm(e.opt));
        if (!key) { warn(`fila ${e.line}: la opción «${e.opt}» no existe para «${label}» (${keys.join(' / ')}); se ignora`); return; }
        if (hasPrice) { it.prices[key] = price; n++; }
        if (hide) {
          delete it.prices[key];
          d.options.forEach((x) => { if (x.o.key === it.priceBy) x.o.choices = x.o.choices.filter((c) => c !== key); });
          if (!Object.keys(it.prices).length) it.available = false;
          n++;
        }
      } else {
        if (e.opt) { warn(`fila ${e.line}: «${label}» no tiene precio por opción; esa fila se ignora (deja la Opción vacía)`); return; }
        if (hasPrice) { it.price = price; n++; }
        if (hide) { it.available = false; n++; }
      }
    });
    return n;
  }

  // ---------- state ----------
  let settled = false, lastSig = '', lastAttempt = 0, resolveReady;
  T.pricesPending = !!id; // renderers show "Cargando el menú…" while this is true (first answer or FIRST_PAINT_WAIT)
  T.pricesReady = new Promise((r) => { resolveReady = r; });

  function settle(changed) {
    const first = !settled;
    settled = true;
    T.pricesPending = false;
    if (first) resolveReady();
    if (first || changed) document.dispatchEvent(new CustomEvent('tfc:prices'));
  }
  function commit(entries) {
    const sig = JSON.stringify(entries);
    const changed = sig !== lastSig;
    if (changed) { apply(entries); lastSig = sig; }
    settle(changed);
    return changed;
  }

  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && Array.isArray(c.entries) && Date.now() - (c.t || 0) < CACHE_MAX_AGE ? c.entries : null;
    } catch (e) { return null; }
  }
  function writeCache(entries) {
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), entries })); } catch (e) { /* storage unavailable */ }
  }
  function dropCache() { try { localStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ } }
  // The sheet answered but is definitively unusable (tab gone → gviz serves another tab; bad id → 4xx, but not the
  // transient 408/425/429, which count as a network error and keep the cache): back to the
  // built-in prices on this device too, so every customer sees the same menu.
  function forget(why) { warn(why + ': se usan los precios de menu.js'); dropCache(); commit([]); }

  async function load() {
    if (!id || !window.fetch || !window.AbortController) { settle(false); return; }
    lastAttempt = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&headers=1${tab ? `&sheet=${encodeURIComponent(tab)}` : ''}`;
      const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit', redirect: 'error' }); // a private sheet redirects to Google login: fail quietly
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 425 && res.status !== 429) { forget('HTTP ' + res.status + (res.status === 401 || res.status === 403 ? ' (¿la hoja está compartida con «cualquier persona con el enlace»?)' : '')); return; }
        throw new Error('HTTP ' + res.status);
      }
      const entries = parseRows(parseCSV(await res.text()));
      if (!entries) { forget('la pestaña «' + (tab || 'Precios') + '» no tiene la fila de títulos'); return; }
      commit(entries);
      writeCache(entries);
    } catch (e) {
      warn(e && e.message); // offline, slow or private: keep the built-in prices or the last downloaded copy
      settle(false);
    } finally { clearTimeout(timer); }
  }

  // Preview without a sheet: TFC.prices.applyCSV('Código,Opción,Precio base,Disponible\npz-queso,10",11,\nsd-yuca,,,No')
  const applyCSV = (text) => { const entries = parseRows(parseCSV(String(text || ''))); if (entries) commit(entries); return entries; };

  if (id) {
    let cached = readCache();
    if (cached) {
      try { commit(cached); } // instant first paint with the last known prices; the fetch below refreshes them
      catch (e) { warn('copia guardada inválida: ' + (e && e.message)); dropCache(); reset(); lastSig = ''; cached = null; }
    }
    if (!cached) setTimeout(() => { if (!settled) settle(false); }, FIRST_PAINT_WAIT);
    const refresh = () => { if (Date.now() - lastAttempt > REFRESH_AFTER) load(); }; // also retries a load that failed offline
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('pageshow', (e) => { if (e.persisted) refresh(); });
    load();
  } else settle(false); // feature off: nothing to wait for

  T.prices = { parseCSV, parsePrice, parseAvail, parseRows, apply, applyCSV, reset, norm };
})();
