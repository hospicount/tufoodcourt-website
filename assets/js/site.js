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
  const adjust = (n) => {
    let v = n * (1 + (C.priceAdjustPercent || 0) / 100);
    if (C.priceRounding === 'up99') v = Math.ceil(v - 0.99 - 1e-9) + 0.99; // 12.45 → 12.99, 9.34 → 9.99, 12.99 stays
    return Math.round(v * 100) / 100;
  };
  TFC.money = (n) => (n == null ? '' : '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2)));
  // Unit price for an item with the chosen options: number, null = not priced yet, undefined = option not chosen yet.
  TFC.price = (it, opts) => {
    if (it.priceBy) {
      const v = opts && opts[it.priceBy];
      if (!v || !Object.prototype.hasOwnProperty.call(it.prices || {}, v)) return undefined; // not chosen, or no longer offered (prices sheet)
      const p = it.prices[v]; return p == null ? null : adjust(p);
    }
    return it.price == null ? null : adjust(it.price);
  };
  // Menu label: "$9", or per-option "10\" $9 · 16\" $18"; '' when unpriced. An option without a price (sheet says
  // «mostrador») is left out of the label; the cart line says "precio en mostrador" once that option is chosen.
  const priced = (it) => Object.entries(it.prices || {}).filter(([, v]) => v != null);
  TFC.priceLabel = (it) => {
    if (it.priceBy) return priced(it).map(([k, v]) => `${TFC.tr(k)} ${TFC.money(adjust(v))}`).join(' · ');
    return it.price == null ? '' : TFC.money(adjust(it.price));
  };
  // Same label as HTML: each variant is an unbreakable span so long labels wrap between variants on phones.
  TFC.priceHtml = (it) => {
    if (it.priceBy) return priced(it).map(([k, v]) => `<span class="var">${esc(TFC.tr(k))} ${TFC.money(adjust(v))}</span>`).join(' <span class="sep">·</span> ');
    return it.price == null ? '' : TFC.money(adjust(it.price));
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
          <a class="btn btn-amber btn-sm nav-cta" href="/pedidos/" data-i18n="nav.order">Pedir / Cotizar</a>
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
  const dayHours = (dow) => { const h = C.schedule[dow]; return h ? [toMin(h[0]), toMin(h[1])] : null; };
  // Consecutive days with identical hours are grouped: "Lunes a viernes · 6:00 AM – 3:00 PM".
  function dayGroups() {
    const groups = [];
    [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
      const key = JSON.stringify(C.schedule[d] || null);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.days.push(d); else groups.push({ key, days: [d], hours: dayHours(d) });
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
    return dayGroups().map((g) => g.hours
      ? `${groupLabel(g)} · ${fmt12(g.hours[0])} – ${fmt12(g.hours[1])}`
      : `${groupLabel(g)} · ${lang === 'en' ? 'closed' : 'cerrado'}`);
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
  TFC.time = { toMin, fmt12, fmtRange, dayHours, dayName: (d) => DAY_NAMES[lang][d], hoursLines, lastCallText };

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
    const sections = s.sections.filter((sec) => sec.groups || TFC.visibleItems(sec).length).map((sec) => `
      <section class="menu-section">
        <h3>${esc(TFC.pick(sec.title))}</h3>
        ${sec.note && !soon ? `<p class="menu-note">${esc(TFC.pick(sec.note))}</p>` : ''}
        ${sec.groups ? `<div class="menu-groups">${sec.groups.map((g) => `
          <div class="menu-group"><h4>${esc(TFC.pick(g.label))}</h4><ul>${g.list.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>` : `
        <ul class="menu-items">${TFC.visibleItems(sec).map((it) => `
          <li><div class="mi-row"><span class="mi-name">${esc(TFC.tr(it.name))}</span>${soon ? '' : TFC.isSoon(it.id) ? `<span class="mi-soon">${TFC.soonTag()}</span>` : `<span class="mi-price">${TFC.priceHtml(it) || esc(lang === 'en' ? 'counter price' : 'precio en mostrador')}</span>`}</div>${it.desc ? `<span class="mi-desc">${esc(TFC.pick(it.desc))}</span>` : ''}</li>`).join('')}</ul>`}
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

  // ---------- boot ----------
  header();
  footer();
  document.addEventListener('click', (e) => { if (e.target.closest('.lang-toggle')) TFC.setLang(lang === 'en' ? 'es' : 'en'); });
  applyLang();
})();
