// Tu Food Court — shared site behavior: header/footer, language toggle (ES default / EN), config bindings, menu render.
(function () {
  const C = window.TFC_CONFIG;
  const LANG_KEY = 'tfc-lang';

  // ---------- language ----------
  function getLang() {
    try {
      const url = new URL(location.href);
      const q = url.searchParams.get('lang');
      if (q === 'en' || q === 'es') {
        // ?lang= seeds the preference once, then is dropped from the URL so the toggle keeps working after reloads.
        try { localStorage.setItem(LANG_KEY, q); } catch (e) { /* storage unavailable */ }
        url.searchParams.delete('lang');
        history.replaceState(null, '', url.pathname + url.search + url.hash);
        return q;
      }
      return localStorage.getItem(LANG_KEY) || 'es';
    } catch (e) { return 'es'; }
  }
  let lang = getLang();
  const TFC = (window.TFC = window.TFC || {});
  TFC.lang = () => lang;
  TFC.pick = (v) => (v && typeof v === 'object' ? v[lang] ?? v.es : v);
  // Display translation for a Spanish data value (option choices, payment methods, catering values). Sent values stay Spanish.
  TFC.tr = (v) => (lang === 'en' && window.TFC_EN_VALUES && window.TFC_EN_VALUES[v]) || v;
  // Stations in config.comingSoon: preview only (no prices, not orderable), marked «Próximamente».
  TFC.isSoon = (id) => Array.isArray(C.comingSoon) && C.comingSoon.includes(id);
  TFC.soonTag = () => `<span class="soon-tag">${lang === 'en' ? 'Coming soon' : 'Próximamente'}</span>`;

  // ---------- prices ----------
  const adjust = (n, it) => {
    if (it && it.exact) return n; // drinks: the price is final as written ($1.50 stays $1.50), no +% and no .99 rounding
    let v = n * (1 + (C.priceAdjustPercent || 0) / 100);
    if (C.priceRounding === 'up99') v = Math.ceil(v - 0.99 - 1e-9) + 0.99; // 12.45 → 12.99, 9.34 → 9.99, 12.99 stays
    return Math.round(v * 100) / 100;
  };
  TFC.money = (n) => (n == null ? '' : '$' + n.toFixed(2));
  // Unit price for an item with the chosen options: number, null = not priced yet, undefined = option not chosen yet.
  // `iso` (YYYY-MM-DD, optional) is the pickup/delivery date: when given, the weekly promotion (config.weeklyPromo) is applied for that day.
  TFC.price = (it, opts, iso) => {
    let r;
    if (it.priceBy) {
      const v = opts && opts[it.priceBy];
      if (!v || !Object.prototype.hasOwnProperty.call(it.prices || {}, v)) return undefined; // not chosen, or no longer offered (prices sheet)
      const p = it.prices[v]; r = p == null ? null : adjust(p, it);
    } else r = it.price == null ? null : adjust(it.price, it);
    return r != null && iso && TFC.promoApplies(it, iso) ? TFC.promoPrice(r) : r;
  };

  // ---------- weekly promotion (config.weeklyPromo) ----------
  const isoDow = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12).getDay() : -1; };
  const promoOn = () => { const p = C.weeklyPromo; return !!p && p.percent > 0 && p.percent < 100 && Number.isInteger(p.day) && p.day >= 0 && p.day <= 6 && Array.isArray(p.items); };
  // Is the dish in the promotion? By its own id, or because ANY station that lists it is in `items` (a dish shared by two stations,
  // like «Ensalada de frutas» in Desayuno and Postres, is therefore discounted and tagged the same everywhere).
  const inPromo = (it) => {
    const ids = C.weeklyPromo.items;
    return ids.includes(it.id) || (window.TFC_MENU || []).some((s) => ids.includes(s.id) && (s.sections || []).some((sec) => (sec.items || []).some((i) => i.id === it.id)));
  };
  // Is `it` (a menu item) discounted on the date `iso` (YYYY-MM-DD)?
  TFC.promoApplies = (it, iso) => promoOn() && !!it && isoDow(iso) === C.weeklyPromo.day && !(C.weeklyPromo.from && iso < C.weeklyPromo.from) && inPromo(it);
  // Normal price → promotional price, rounded DOWN to the cent (cents arithmetic: no floating-point surprises).
  TFC.promoPrice = (regular) => Math.floor(Math.round(regular * 100) * (100 - C.weeklyPromo.percent) / 100 + 1e-9) / 100;
  TFC.promoPercent = () => (promoOn() ? C.weeklyPromo.percent : 0);
  // Short label, language-aware: «Viernes −50%» / «Fridays 50% off». kitchen = Spanish, lower-case (for the order email).
  TFC.promoLabel = (kitchen) => {
    const p = C.weeklyPromo;
    if (lang === 'en' && !kitchen) return `${DAY_NAMES.en[p.day]}s ${p.percent}% off`;
    const d = DAY_NAMES.es[p.day];
    return `${kitchen ? d : d.charAt(0).toUpperCase() + d.slice(1)} −${p.percent}%`;
  };
  TFC.promoName = (kitchen) => { // never throws: a missing or plain-string `name` falls back to a generic label (it sits on the order-sending path)
    const n = C.weeklyPromo.name;
    return TFC.pick(kitchen && n && typeof n === 'object' ? n.es : n) || (lang === 'en' && !kitchen ? 'Weekly promo' : 'Promo semanal');
  };
  // Menu tag next to a discounted dish; shown once the promotion has started (today, Puerto Rico time, is on or after `from`).
  const nowPR = () => { // Puerto Rico's date (YYYY-MM-DD) and minutes since midnight, whatever the phone's clock says
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: C.timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
    return { iso: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
  };
  const todayPR = () => nowPR().iso;
  const addDays = (iso, n) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    const d = new Date(+m[1], +m[2] - 1, +m[3] + n, 12);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  TFC.promoTag = (it) => {
    if (!promoOn() || (C.weeklyPromo.from && todayPR() < C.weeklyPromo.from)) return '';
    return inPromo(it) && !TFC.isSoon(it.id) ? `<span class="promo-tag">${esc(TFC.promoLabel(false))}</span>` : '';
  };
  // The next promo day we can still take orders for: today while same-day orders are open (before last call), otherwise the next one.
  // null = no promotion, not started yet, or the promo day is not an opening day.
  TFC.promoNext = () => {
    const p = C.weeklyPromo;
    const h = promoOn() && TFC.time.dayHours(p.day);
    if (!h) return null;
    const now = nowPR();
    if (p.from && now.iso < p.from) return null;
    for (let i = 0; i <= 7; i++) {
      const iso = addDays(now.iso, i);
      if (isoDow(iso) !== p.day) continue;
      if (i === 0 && now.min >= h[1] - C.lastCallMinutesBeforeClose) continue; // last call has passed: the next one
      return { iso, days: i, today: i === 0, until: h[1] - C.lastCallMinutesBeforeClose };
    }
    return null;
  };
  // The date the home menu shows promo prices for: today, only while the promotion is live (else '').
  const liveIso = () => { const n = TFC.promoNext(); return n && n.today ? n.iso : ''; };
  // Menu label: "$9", or per-option "10\" $9 · 16\" $18"; '' when unpriced. An option without a price (sheet says
  // «mostrador») is left out of the label; the cart line says "precio en mostrador" once that option is chosen.
  const priced = (it) => Object.entries(it.prices || {}).filter(([, v]) => v != null);
  // When the price option has no select (`hidden: true`, e.g. the plate while the Combo is off) the label is just the amount.
  const named = (it) => !(it.options || []).some((o) => o.key === it.priceBy && o.hidden);
  TFC.priceLabel = (it) => {
    if (it.priceBy) return priced(it).map(([k, v]) => `${named(it) ? TFC.tr(k) + ' ' : ''}${TFC.money(adjust(v, it))}`).join(' · ');
    return it.price == null ? '' : TFC.money(adjust(it.price, it));
  };
  // Same label as HTML: each variant is an unbreakable span so long labels wrap between variants on phones.
  // `iso` (optional): when the weekly promotion applies to the dish on that date, each price shows «was → now».
  TFC.priceHtml = (it, iso) => {
    const on = !!iso && TFC.promoApplies(it, iso);
    const en = lang === 'en';
    const m = (v) => {
      const r = adjust(v, it);
      return on ? `<s class="was"><span class="sr-only">${en ? 'regular price ' : 'precio normal '}</span>${TFC.money(r)}</s> <span class="now"><span class="sr-only">${en ? 'now ' : 'ahora '}</span>${TFC.money(TFC.promoPrice(r))}</span>` : TFC.money(r);
    };
    if (it.priceBy) return priced(it).map(([k, v]) => `<span class="var">${named(it) ? esc(TFC.tr(k)) + ' ' : ''}${m(v)}</span>`).join(' <span class="sep">·</span> ');
    if (it.price == null) return '';
    return on ? `<span class="var">${m(it.price)}</span>` : m(it.price);
  };

  // Spanish lives in the HTML; English in TFC_EN keyed by data-i18n. Originals are cached so toggling back works.
  function applyLang() {
    document.documentElement.lang = lang;
    const en = window.TFC_EN || {};
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      if (el.dataset.es === undefined) el.dataset.es = el.innerHTML;
      const k = el.dataset.i18n;
      el.innerHTML = lang === 'en' && en[k] !== undefined ? en[k] : el.dataset.es;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      if (el.dataset.esPh === undefined) el.dataset.esPh = el.getAttribute('placeholder') || '';
      const k = el.dataset.i18nPh;
      el.setAttribute('placeholder', lang === 'en' && en[k] !== undefined ? en[k] : el.dataset.esPh);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      if (el.dataset.esAria === undefined) el.dataset.esAria = el.getAttribute('aria-label') || '';
      const k = el.dataset.i18nAria;
      el.setAttribute('aria-label', lang === 'en' && en[k] !== undefined ? en[k] : el.dataset.esAria);
    });
    if (document.body.dataset.titleEn) {
      if (!document.body.dataset.titleEs) document.body.dataset.titleEs = document.title;
      document.title = lang === 'en' ? document.body.dataset.titleEn : document.body.dataset.titleEs;
    }
    document.querySelectorAll('.lang-toggle').forEach((b) => {
      b.textContent = lang === 'en' ? 'ES' : 'EN';
      b.setAttribute('lang', lang === 'en' ? 'es' : 'en');
      b.setAttribute('aria-label', lang === 'en' ? 'Cambiar a español' : 'Switch to English');
    });
    bindConfig();
    document.dispatchEvent(new CustomEvent('tfc:lang', { detail: lang }));
  }
  TFC.setLang = (l) => {
    lang = l;
    try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* storage unavailable */ }
    applyLang();
  };

  // ---------- header / footer ----------
  const page = document.body.dataset.page || '';
  function navLink(href, key, es, current) {
    return `<a href="${href}" data-i18n="${key}"${current ? ' aria-current="page"' : ''}>${es}</a>`;
  }
  function header() {
    const el = document.querySelector('[data-site-header]');
    if (!el) return;
    el.innerHTML = `
      <div class="wrap header-inner">
        <a class="brand" href="/" aria-label="Tu Food Court — inicio" data-i18n-aria="nav.home">
          <img src="/assets/img/logo-horiz-v1.png" alt="Tu Food Court" width="360" height="158">
        </a>
        <nav class="nav" id="site-nav" aria-label="Principal" data-i18n-aria="nav.main">
          ${navLink('/#menu', 'nav.menu', 'Menú', false)}
          ${navLink('/delivery/', 'nav.delivery', 'Delivery / Recogido', page === 'delivery')}
          ${navLink('/catering/', 'nav.catering', 'Catering', page === 'catering')}
          ${navLink('/#visitanos', 'nav.visit', 'Visítanos', false)}
          <a class="btn btn-amber btn-sm nav-cta" href="/pedidos/" data-i18n="nav.order">Pedir / Catering</a>
        </nav>
        <div class="header-actions">
          <button class="lang-toggle" type="button">EN</button>
          <button class="nav-burger" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Abrir navegación" data-i18n-aria="nav.burger">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>`;
    const burger = el.querySelector('.nav-burger');
    const nav = el.querySelector('.nav');
    const close = () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      if (open) nav.querySelector('a').focus(); // the links come before the burger in the page order
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { close(); burger.focus(); } });
    document.addEventListener('click', (e) => { if (nav.classList.contains('open') && !e.target.closest('.site-header')) close(); });
  }
  function footer() {
    const el = document.querySelector('[data-site-footer]');
    if (!el) return;
    el.innerHTML = `
      <div class="wrap footer-grid">
        <div>
          <img class="footer-logo" src="/assets/img/logo-v1.png" alt="Tu Food Court" width="823" height="717" loading="lazy">
        </div>
        <div>
          <h3 data-i18n="footer.find">Encuéntranos</h3>
          <p><strong data-cfg="locationName"></strong><br><span data-cfg="locationArea"></span></p>
          <p><a data-cfg-maps href="#" target="_blank" rel="noopener" data-i18n="footer.map">Ver en Google Maps</a></p>
        </div>
        <div>
          <h3 data-i18n="footer.hours">Horario</h3>
          <p data-cfg="hours"></p>
          <p class="muted" data-cfg="openingLabel"></p>
        </div>
        <div>
          <h3 data-i18n="footer.contact">Contacto</h3>
          <p data-cfg-contact></p>
          <p><a href="/pedidos/" data-i18n="footer.order">Delivery y catering →</a></p>
        </div>
      </div>
      <div class="wrap footer-bottom">
        <span>© ${new Date().getFullYear()} Tu Food Court LLC</span>
        <a href="/privacidad/" data-i18n="footer.privacy">Privacidad</a>
      </div>`;
  }

  // ---------- opening hours helpers (shared with forms.js) ----------
  const DAY_NAMES = {
    es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  };
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  function fmt12(min) {
    const h = Math.floor(min / 60) % 24, m = min % 60;
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  function fmtRange(s, e) {
    const a = fmt12(s), b = fmt12(e);
    return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
  }
  const dayHours = (dow) => { const h = C.schedule[dow]; return Array.isArray(h) ? [toMin(h[0]), toMin(h[1])] : null; }; // null for a closed or «soon» day
  const dayState = (dow) => (Array.isArray(C.schedule[dow]) ? 'open' : C.schedule[dow] === 'soon' ? 'soon' : 'closed');
  // Consecutive days with identical hours are grouped: "Lunes a viernes · 6:00 AM – 3:00 PM".
  function dayGroups() {
    const groups = [];
    [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
      const key = JSON.stringify(C.schedule[d] || null);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.days.push(d); else groups.push({ key, days: [d], hours: dayHours(d), state: dayState(d) });
    });
    return groups;
  }
  function groupLabel(g, lower) {
    const names = g.days.map((d) => DAY_NAMES[lang][d]);
    const cap = (s) => (lower || lang === 'en' ? s : s.charAt(0).toUpperCase() + s.slice(1));
    const first = cap(names[0]), last = names[names.length - 1];
    if (names.length >= 3) return lang === 'en' ? `${first} to ${last}` : `${first} a ${last}`;
    if (names.length === 2) return lang === 'en' ? `${first} and ${last}` : `${first} y ${last}`;
    return first;
  }
  function hoursLines() {
    return dayGroups().map((g) => (g.hours
      ? `${groupLabel(g)} · ${fmt12(g.hours[0])} – ${fmt12(g.hours[1])}`
      : `${groupLabel(g)} · ${g.state === 'soon' ? (lang === 'en' ? 'coming soon' : 'próximamente') : (lang === 'en' ? 'closed' : 'cerrado')}`));
  }
  function lastCallText() {
    const parts = dayGroups().filter((g) => g.hours).map((g) => {
      const t = g.hours[1] - C.lastCallMinutesBeforeClose;
      if (lang === 'en') return `${groupLabel(g)} until ${fmt12(t)}`;
      return `${groupLabel(g, true)} hasta ${Math.floor(t / 60) % 12 === 1 ? 'la' : 'las'} ${fmt12(t)}`;
    });
    return lang === 'en'
      ? `Same-day orders: ${parts.join(', ')}. You can also schedule for another day.`
      : `Pedidos para el mismo día: ${parts.join(' y ')}. También puedes programar tu pedido para otro día.`;
  }
  TFC.time = { toMin, fmt12, fmtRange, dayHours, dayState, dayName: (d) => DAY_NAMES[lang][d], hoursLines, lastCallText };

  // ---------- config bindings ----------
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  TFC.esc = esc;
  function listText(arr) {
    const items = arr.map((x) => TFC.tr(x));
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + (lang === 'en' ? ' or ' : ' o ') + items[items.length - 1];
  }
  function bindConfig() {
    // «Próximamente» badges show only for stations still in config.comingSoon; their catering options stay disabled.
    document.querySelectorAll('[data-soon]').forEach((el) => { el.hidden = !TFC.isSoon(el.dataset.soon); });
    document.querySelectorAll('[data-soon-station]').forEach((input) => {
      input.disabled = TFC.isSoon(input.dataset.soonStation);
      if (input.disabled) input.checked = false;
    });
    document.querySelectorAll('[data-cfg]').forEach((el) => {
      const v = el.dataset.cfg === 'hours' ? hoursLines() : TFC.pick(C[el.dataset.cfg]);
      const text = Array.isArray(v) ? v.map(esc).join('<br>') : esc(v ?? '');
      el.innerHTML = text;
      el.hidden = !text; // a cleared config value hides its element instead of leaving an empty pill/line
    });
    document.querySelectorAll('[data-cfg-pay]').forEach((el) => { el.textContent = listText(C.paymentOptions); });
    document.querySelectorAll('[data-cfg-lastcall]').forEach((el) => { el.textContent = lastCallText(); });
    document.querySelectorAll('[data-cfg-hours-inline]').forEach((el) => { el.textContent = hoursLines().join(' · '); });
    document.querySelectorAll('[data-cfg-maps]').forEach((a) => {
      a.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(C.mapsQuery);
    });
    document.querySelectorAll('[data-cfg-tel]').forEach((a) => { // phone link inside a translated sentence
      a.hidden = !C.phone;
      if (C.phone) { a.href = 'tel:' + C.phone.replace(/[^\d+]/g, ''); a.textContent = C.phone; }
    });
    document.querySelectorAll('[data-cfg-contact]').forEach((el) => {
      const lines = [];
      if (C.phone) lines.push(`<a href="tel:${esc(C.phone.replace(/[^\d+]/g, ''))}">${esc(C.phone)}</a>`);
      if (C.email) lines.push(`<a href="mailto:${esc(C.email)}">${esc(C.email)}</a>`);
      if (C.instagram) lines.push(`<a href="https://instagram.com/${esc(C.instagram)}" target="_blank" rel="noopener">@${esc(C.instagram)}</a>`);
      if (C.facebook) lines.push(`<a href="${esc(C.facebook)}" target="_blank" rel="noopener">Facebook</a>`);
      el.innerHTML = lines.join('<br>') || (lang === 'en' ? 'Coming soon' : 'Próximamente');
    });
  }

  // ---------- menu (home page) ----------
  // Items the owner hid in the prices sheet (Disponible = No) carry available === false; empty sections are skipped.
  TFC.visibleItems = (sec) => (sec.items || []).filter((it) => it.available !== false);
  function renderMenu() {
    const root = document.querySelector('[data-menu]');
    if (!root) return;
    // A link to a section below the menu (/#visitanos) needs the full-height menu in place when the browser scrolls.
    const jump = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    const below = jump && (root.compareDocumentPosition(jump) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (TFC.pricesPending && !below) { // prices.js is still reading the owner's sheet (1.5 s at most); it re-renders when done
      root.innerHTML = `<p class="menu-loading" role="status">${lang === 'en' ? 'Loading the menu…' : 'Cargando el menú…'}</p>`;
      return;
    }
    const stations = window.TFC_MENU.filter((s) => !s.hideOnMenu);
    const active = root.dataset.active || stations[0].id;
    root.dataset.active = active;
    const tabs = stations.map((s) => `
      <button type="button" class="menu-tab tab-${s.color}" aria-pressed="${s.id === active}" data-station="${s.id}">
        ${esc(TFC.pick(s.station))}${TFC.isSoon(s.id) ? ' ' + TFC.soonTag() : ''}
      </button>`).join('');
    const s = stations.find((x) => x.id === active);
    const soon = TFC.isSoon(s.id); // a preview: dishes without prices (they are announced when the station opens)
    const live = soon ? '' : liveIso(); // today's date while the weekly promotion is live: promo dishes show «was → now» prices
    const sections = s.sections.filter((sec) => sec.groups || TFC.visibleItems(sec).length).map((sec) => `
      <section class="menu-section">
        <h3>${esc(TFC.pick(sec.title))}</h3>
        ${sec.note && !soon ? `<p class="menu-note">${esc(TFC.pick(sec.note))}</p>` : ''}
        ${sec.groups ? `<div class="menu-groups">${sec.groups.map((g) => `
          <div class="menu-group"><h4>${esc(TFC.pick(g.label))}</h4><ul>${g.list.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>` : `
        <ul class="menu-items">${TFC.visibleItems(sec).map((it) => `
          <li><div class="mi-row"><span class="mi-name">${esc(TFC.tr(it.name))}${soon ? '' : TFC.promoTag(it)}</span>${soon ? '' : TFC.isSoon(it.id) ? `<span class="mi-soon">${TFC.soonTag()}</span>` : `<span class="mi-price">${TFC.priceHtml(it, live) || esc(lang === 'en' ? 'counter price' : 'precio en mostrador')}</span>`}</div>${it.desc ? `<span class="mi-desc">${esc(TFC.pick(it.desc))}</span>` : ''}</li>`).join('')}</ul>`}
      </section>`).join('');
    root.innerHTML = `
      <div class="menu-tabs">${tabs}</div>
      <div class="menu-panel panel-${s.color}">
        <p class="menu-tagline">${esc(TFC.pick(s.tagline))}</p>
        ${soon ? `<p class="soon-note">${lang === 'en' ? '<strong>Coming soon.</strong> We are getting this station ready. Here is a preview of the menu; prices will be posted when it opens.' : '<strong>Próximamente.</strong> Estamos preparando esta estación. Aquí tienes un adelanto del menú; los precios se publican al abrir.'}</p>` : ''}
        ${s.id === 'criollo' ? '<div class="criollo-today" data-criollo-today hidden></div>' : ''}
        <div class="menu-sections">${sections || `<p class="menu-empty">${lang === 'en' ? 'No dishes available right now.' : 'Sin platos disponibles por ahora.'}</p>`}</div>
      </div>`;
    root.querySelectorAll('.menu-tab').forEach((b) => b.addEventListener('click', () => {
      root.dataset.active = b.dataset.station; renderMenu();
      root.querySelector(`[data-station="${b.dataset.station}"]`).focus();
    }));
    document.dispatchEvent(new CustomEvent('tfc:menu-rendered')); // criollo.js fills "hoy en la línea" if a sheet is configured
  }
  document.addEventListener('tfc:lang', renderMenu);
  document.addEventListener('tfc:prices', () => { // sheet prices arrived or changed (prices.js): redraw, keep keyboard focus on the tab
    const root = document.querySelector('[data-menu]');
    const a = document.activeElement;
    const station = root && a && root.contains(a) && a.dataset.station;
    renderMenu();
    if (station) { const b = root.querySelector(`[data-station="${station}"]`); if (b) b.focus({ preventScroll: true }); }
  });

  // ---------- home banner: the weekly promotion, first thing under the header (config.weeklyPromo) ----------
  // The discounted dishes with their cheapest price, from the same menu data (and sheet prices) the menu itself uses.
  function promoDishes() {
    const out = [], seen = new Set();
    (window.TFC_MENU || []).forEach((s) => (s.sections || []).forEach((sec) => TFC.visibleItems(sec).forEach((it) => {
      if (seen.has(it.id) || TFC.isSoon(s.id) || TFC.isSoon(it.id) || !inPromo(it)) return;
      const regs = it.priceBy ? priced(it).map(([, v]) => adjust(v, it)) : (it.price == null ? [] : [adjust(it.price, it)]);
      if (!regs.length) return;
      seen.add(it.id);
      const min = Math.min(...regs);
      out.push({ name: TFC.tr(it.name), multi: Math.max(...regs) > min, was: min, now: TFC.promoPrice(min) });
    })));
    return out;
  }
  function chipsHtml(dishes, en) {
    return `<ul class="promo-dishes">${dishes.map((x) => `<li><span class="pd-name">${esc(x.name)}</span> <span class="pd-price">${x.multi ? (en ? 'from ' : 'desde ') : ''}<s class="was"><span class="sr-only">${en ? 'regular price ' : 'precio normal '}</span>${TFC.money(x.was)}</s> <span class="now"><span class="sr-only">${en ? 'promo price ' : 'precio de promo '}</span>${TFC.money(x.now)}</span></span></li>`).join('')}</ul>`;
  }
  // Shown from `announceDaysBefore` days ahead (1 = the day before, e.g. Thursday for Friday) until the promo day's last call.
  const announceDays = () => { const n = C.weeklyPromo && C.weeklyPromo.announceDaysBefore; return Number.isInteger(n) && n >= 0 ? n : 1; };
  // Draws the banner; returns whether it is showing.
  function promoBanner() {
    const el = document.querySelector('[data-promo-banner]');
    if (!el) return false;
    const nx = TFC.promoNext();
    el.classList.remove('is-pending'); // the height the inline pre-paint script in index.html reserved is no longer needed
    if (!nx || nx.days > announceDays()) { delete el.dataset.key; delete el.dataset.dishes; el.hidden = true; el.innerHTML = ''; return false; }
    const p = C.weeklyPromo, en = lang === 'en';
    // Chips are drawn at once from the data in hand (menu.js + any cached sheet prices); when the sheet answers and changes a price or
    // hides a dish, only the list is swapped (no new frame: the button doesn't jump and the 50% burst doesn't replay).
    const dishes = promoDishes();
    const dishKey = dishes.map((d) => d.name + d.was).join();
    const key = [lang, nx.iso, nx.days, p.percent, C.deliveryPaused].join('|');
    if (el.dataset.key === key && !el.hidden) {
      if (el.dataset.dishes !== dishKey) {
        el.dataset.dishes = dishKey;
        const old = el.querySelector('.promo-dishes');
        if (old) old.remove();
        if (dishes.length) el.querySelector('.promo-sub').insertAdjacentHTML('afterend', chipsHtml(dishes, en));
      }
      return true;
    }
    el.dataset.key = key;
    el.dataset.dishes = dishKey;
    const soon = nx.days === 1; // the day before (Thursday): «¡Mañana es viernes!»
    const day = DAY_NAMES[lang][p.day];
    const dayPl = en ? day + 's' : (day.endsWith('s') ? day : day + 's');
    const what = TFC.pick(p.what) || (en ? 'select dishes' : 'platos selectos');
    const [y, m, d] = nx.iso.split('-').map(Number);
    const dateTxt = new Date(y, m - 1, d, 12).toLocaleDateString(en ? 'en-US' : 'es-PR', { day: 'numeric', month: 'long' });
    const until = TFC.time.fmt12(nx.until);
    const art = Math.floor(nx.until / 60) % 12 === 1 ? 'la' : 'las';
    const how = C.deliveryPaused ? (en ? 'Pickup at the counter' : 'Recogido en el mostrador') : (en ? 'Pickup or delivery' : 'Recogido o delivery');
    const kicker = nx.today ? (en ? `Today is ${day}!` : `¡Hoy es ${day}!`)
      : soon ? (en ? `Tomorrow is ${day}!` : `¡Mañana es ${day}!`)
      : (en ? `Every ${day}` : `Todos los ${dayPl}`);
    const sub = nx.today
      ? (en ? `${p.percent}% off ${what}. Today only!` : `${p.percent}% de descuento en ${what}. ¡Solo hoy!`)
      : soon ? (en ? `Tomorrow: ${p.percent}% off ${what}. Place your order today!` : `Mañana: ${p.percent}% de descuento en ${what}. ¡Haz tu pedido desde hoy!`)
      : (en ? `${p.percent}% off ${what} every ${day}. Next one: ${day}, ${dateTxt}.` : `${p.percent}% de descuento en ${what} todos los ${dayPl}. El próximo: ${day} ${dateTxt}.`);
    const cta = nx.today ? (en ? 'Order now' : 'Pedir ahora') : soon ? (en ? 'Order for tomorrow' : 'Pedir para mañana') : (en ? `Order for ${day}` : `Pedir para el ${day}`);
    const fine = nx.today
      ? (en ? `Same-day orders until ${until}\u00a0· Prices before IVU` : `Pedidos para hoy hasta ${art} ${until}\u00a0· Precios sin IVU`)
      : `${how}\u00a0· ${en ? 'Prices before IVU' : 'Precios sin IVU'}`;
    el.hidden = false;
    el.innerHTML = `
      <div class="wrap promo-inner">
        <div class="promo-burst" aria-hidden="true"><span class="pb-num">${p.percent}<small>%</small></span><span class="pb-off">OFF</span></div>
        <div class="promo-copy">
          <span class="promo-kicker">${esc(kicker)}</span>
          <p class="promo-title" id="promo-title">${esc(TFC.promoName(false))}</p>
          <p class="promo-sub">${esc(sub)}</p>
          ${dishes.length ? chipsHtml(dishes, en) : ''}
        </div>
        <div class="promo-act">
          <a class="btn btn-amber btn-lg" href="${esc(nx.today ? '/delivery/' : '/delivery/?fecha=' + nx.iso)}">${esc(cta)} →</a>
          <span class="promo-fine">${esc(fine)}</span>
        </div>
      </div>`;
    return true;
  }
  // The catering ad runs every day (config.cateringAd): the big banner at the top, or a slim strip under the promo banner while that one shows.
  function topBanners() {
    const promo = promoBanner();
    const ad = document.querySelector('[data-catering-ad]');
    if (!ad) return;
    ad.hidden = C.cateringAd === false;
    ad.classList.toggle('is-slim', promo);
  }
  document.addEventListener('tfc:lang', topBanners);
  document.addEventListener('tfc:prices', topBanners);
  // A page left open past last call (or over midnight) flips the banners and the menu prices when the phone comes back.
  let liveKey = liveIso();
  const resync = () => { topBanners(); const k = liveIso(); if (k !== liveKey) { liveKey = k; renderMenu(); } };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resync(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) resync(); });
  // A tab left in front (a desk computer) still flips at Friday's last call and at midnight: re-check once a minute. Cheap: the banner
  // only redraws when its state changed, the menu only when the live promo date did.
  if (document.querySelector('[data-promo-banner], [data-menu]')) setInterval(() => { if (!document.hidden) resync(); }, 60000);

  // ---------- boot ----------
  header();
  footer();
  document.addEventListener('click', (e) => { if (e.target.closest('.lang-toggle')) TFC.setLang(lang === 'en' ? 'es' : 'en'); });
  applyLang();
})();
