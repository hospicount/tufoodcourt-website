// Tu Food Court — delivery + catering request forms.
// Submissions go to TFC_CONFIG.formEmail via FormSubmit's AJAX endpoint (no backend needed).
// Values sent to the owner stay in Spanish (kitchen language); the UI shows them translated when EN is active.
(function () {
  const C = window.TFC_CONFIG;
  const TFC = window.TFC;
  const esc = TFC.esc;
  const tr = TFC.tr;
  const L = (es, en) => (TFC.lang() === 'en' ? en : es);
  const locale = () => (TFC.lang() === 'en' ? 'en-US' : 'es-PR');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollOpts = (block) => ({ behavior: reduced ? 'auto' : 'smooth', block: block || 'center' });
  const isPhone = () => !matchMedia('(min-width: 760px)').matches;

  // ---------- helpers ----------
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  function refCode(prefix) {
    const d = new Date();
    const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const bytes = new Uint8Array(4);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes); else bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); });
    const rnd = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
    return `TFC-${prefix}-${ymd}-${rnd}`;
  }
  function source() {
    try {
      const s = new URLSearchParams(location.search).get('src') || '';
      return /^[a-z0-9-]{1,20}$/i.test(s) ? s.toLowerCase() : 'web';
    } catch (e) { return 'web'; }
  }
  // "Today" and "now" are Puerto Rico's (config timeZone), whatever time zone the phone is set to.
  function prParts(at) {
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: C.timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(at || new Date()).forEach((x) => { p[x.type] = x.value; });
    return p;
  }
  function todayISO(offsetDays) {
    const p = prParts();
    return new Date(Date.UTC(+p.year, +p.month - 1, +p.day + (offsetDays || 0))).toISOString().slice(0, 10);
  }
  function parseISO(iso) { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d); }
  function fmtDate(iso, loc) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || '';
    return parseISO(iso).toLocaleDateString(loc || locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function fmtTime(hhmm, loc) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    if (!m) return hhmm || '';
    return new Date(2000, 0, 1, +m[1], +m[2]).toLocaleTimeString(loc || locale(), { hour: 'numeric', minute: '2-digit' });
  }
  // Text that gets echoed into the customer's auto-reply: strip links and cap length so the relay can't be abused.
  function clean(s, max) { return String(s || '').replace(/https?:\/\/\S+|www\.\S+|\S+@\S+/gi, '').replace(/\s+/g, ' ').trim().slice(0, max); }
  function cleanName(s) { return clean(s, 40).replace(/[^\p{L}\p{M}' .-]/gu, '').trim() || L('hola', 'hello'); }

  // ---------- validation ----------
  function message(el) {
    const v = el.validity;
    if (el.type === 'checkbox') return L('Requerido para continuar.', 'Required to continue.');
    if (v.customError) return el.validationMessage;
    if (v.valueMissing) return el.tagName === 'SELECT' ? L('Elige una opción.', 'Choose an option.') : L('Este campo es requerido.', 'This field is required.');
    if (v.typeMismatch && el.type === 'email') return L('Escribe un email válido.', 'Enter a valid email.');
    if (v.patternMismatch && el.type === 'tel') return L('Escribe un teléfono válido (ej. 787-000-0000).', 'Enter a valid phone number (e.g. 787-000-0000).');
    if (v.rangeUnderflow && el.type === 'date') return L(`Elige una fecha a partir del ${fmtDate(el.min)}.`, `Choose a date from ${fmtDate(el.min)} on.`);
    if (v.rangeOverflow && el.type === 'date') return L(`Puedes programar hasta el ${fmtDate(el.max)}.`, `You can schedule up to ${fmtDate(el.max)}.`);
    if (v.rangeUnderflow) return L(`El mínimo es ${el.min}.`, `The minimum is ${el.min}.`);
    if (v.rangeOverflow) return L(`El máximo es ${el.max}.`, `The maximum is ${el.max}.`);
    if (v.stepMismatch || v.badInput) return L('Escribe un número entero.', 'Enter a whole number.');
    return L('Revisa este campo.', 'Check this field.');
  }
  function validate(form) {
    let firstBad = null;
    const flagged = new Set(); // one message per radio/checkbox group or cart line
    form.querySelectorAll('.field-error[data-dyn]').forEach((e) => e.remove()); // keep the static cart/stations messages
    form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
    form.querySelectorAll('[aria-describedby]').forEach((e) => e.removeAttribute('aria-describedby'));
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.name === '_honey' || el.closest('[hidden]')) return;
      if (!el.checkValidity()) {
        el.setAttribute('aria-invalid', 'true');
        const line = el.closest('.cart-line');
        const key = el.name + (line ? line.dataset.uid : '');
        el.setAttribute('aria-describedby', 'err-' + key); // every radio or select of the group points at the one message
        if (flagged.has(key)) return;
        flagged.add(key);
        const msg = document.createElement('p');
        msg.id = 'err-' + key;
        msg.className = 'field-error';
        msg.dataset.dyn = '1';
        msg.textContent = message(el);
        (line || el.closest('.field') || el.closest('.check') || el.parentElement).appendChild(msg);
        if (!firstBad) firstBad = el;
      }
    });
    if (firstBad) { firstBad.focus({ preventScroll: true }); firstBad.scrollIntoView(scrollOpts()); }
    return !firstBad;
  }

  // One attempt against FormSubmit. Every failure carries a short, translated `detail` for the error box (and the fallback
  // email), so a customer's screenshot tells us what went wrong; a clear "no" from the service is marked `final`.
  // (Not named `code`: a DOMException such as the AbortError of the timeout already has a numeric, read-only `code`.)
  async function postOnce(payload, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs); // hospital Wi-Fi and the service itself can be slow
    try {
      const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(C.formEmail), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data = await res.json().catch((e) => { if (e && e.name === 'SyntaxError') return {}; throw e; }); // a non-JSON answer (bot-check page, empty body) is "unexpected"; a timeout or a dropped connection mid-body is not
      if (String(data.success) === 'false') {
        const e = new Error(data.message || 'rejected');
        e.final = true;
        e.detail = L('rechazado por el servicio', 'rejected by the service') + (data.message ? ': ' + String(data.message).slice(0, 80) : '');
        throw e;
      }
      if (!res.ok) { const e = new Error('HTTP ' + res.status); e.detail = 'HTTP ' + res.status; throw e; }
      if (String(data.success) !== 'true') { const e = new Error('unexpected answer'); e.detail = L('respuesta inesperada del servicio', 'unexpected answer from the service'); throw e; }
      return data;
    } catch (err) {
      if (err && err.detail) throw err;
      const e = new Error((err && err.message) || 'send failed'); // fetch's TypeError or the timeout's AbortError
      e.detail = err && err.name === 'AbortError' ? L('el servicio tardó demasiado', 'the service took too long') : L('sin conexión con el servicio', 'no connection to the service');
      throw e;
    } finally { clearTimeout(timer); }
  }
  // A hiccup (no network for a second, a timeout, a 5xx or a bot-check page instead of JSON) gets one quiet retry.
  // If the first attempt did reach the service and only its answer was lost, the owner gets the same order twice:
  // both emails carry the same Referencia, so the duplicate is obvious. Losing an order is the worse outcome.
  // Budgets: 20 s for the first attempt, 15 s for the retry, so the customer never waits more than ~37 s for an answer.
  async function send(payload, onRetry) {
    try { return await postOnce(payload, 20000); } catch (err) {
      if (err.final) throw err;
      await new Promise((r) => setTimeout(r, 1500));
      if (onRetry) onRetry();
      return postOnce(payload, 15000);
    }
  }

  function showDone(form, ref, summaryHtml) {
    const done = document.querySelector('[data-form-done]');
    form.hidden = true;
    done.hidden = false;
    done.querySelector('[data-ref]').textContent = ref;
    const s = done.querySelector('[data-summary]');
    if (s) s.innerHTML = summaryHtml || '';
    done.querySelectorAll('[data-keep-src]').forEach((a) => { a.href = a.getAttribute('href').split('?')[0] + location.search; });
    done.scrollIntoView(scrollOpts('start'));
    done.focus({ preventScroll: true }); // a plain focus() re-centres the panel and hides the check mark under the header
  }
  function showError(form, mailBody, subject, detail) {
    const box = form.querySelector('[data-form-error]');
    box.hidden = false;
    const body = mailBody + (detail ? `\n\n[${L('Error al enviar desde la página', 'Error sending from the page')}: ${detail}]` : '');
    const mail = `mailto:${esc(C.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const phone = C.phone ? L(` o llámanos al <a href="tel:${esc(C.phone.replace(/[^+\d]/g, ''))}">${esc(C.phone)}</a>`, ` or call us at <a href="tel:${esc(C.phone.replace(/[^+\d]/g, ''))}">${esc(C.phone)}</a>`) : '';
    box.innerHTML = L(
      `<strong>Tu solicitud NO se envió.</strong> Intenta de nuevo en un momento. Si sigue fallando, <a href="${mail}">envíala por email</a> con un toque (ya va escrita)${phone}.${detail ? `<br><small>Detalle técnico: ${esc(detail)}</small>` : ''}`,
      `<strong>Your request was NOT sent.</strong> Try again in a moment. If it still fails, <a href="${mail}">send it by email</a> with one tap (it is already filled in)${phone}.${detail ? `<br><small>Technical detail: ${esc(detail)}</small>` : ''}`);
    box.scrollIntoView(scrollOpts());
    box.focus();
  }

  function fields(form) {
    const o = {};
    new FormData(form).forEach((v, k) => {
      if (k.startsWith('cart-')) return;
      o[k] = o[k] ? o[k] + ', ' + v : v;
    });
    return o;
  }

  function wireSubmit(form, build) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      form.querySelector('[data-form-error]').hidden = true;
      const okFields = validate(form);
      const okExtra = build.check ? build.check(okFields) : true;
      if (!okFields || !okExtra) return;
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      btn.dataset.label = btn.innerHTML;
      btn.textContent = L('Enviando…', 'Sending…');
      const { payload, summaryHtml, plain } = build.payload();
      try {
        await send(payload, () => { btn.textContent = L('Reintentando…', 'Retrying…'); });
        if (build.after) build.after();
        showDone(form, payload.Referencia, summaryHtml);
      } catch (err) {
        showError(form, plain, payload._subject, err && err.detail);
      } finally {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.label;
      }
    });
  }

  function plainText(obj) {
    return Object.entries(obj).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join('\n');
  }
  // Static chip groups: re-render on language toggle keeping the selection.
  function renderChips(box, name, values, type, required) {
    const cur = [...box.querySelectorAll('input:checked')].map((i) => i.value);
    box.innerHTML = values.map((v, i) => `
      <label class="chip"><input type="${type}" name="${name}" value="${esc(v)}"${required && i === 0 ? ' required' : ''}${cur.includes(v) ? ' checked' : ''}><span>${esc(tr(v))}</span></label>`).join('');
  }

  // =====================================================================
  // DELIVERY (Metro Medical Center employees only)
  // =====================================================================
  const REMEMBER_KEY = 'tfc-delivery-me';
  const REMEMBER_FIELDS = ['nombre', 'telefono', 'email', 'departamento', 'entrega', 'extension'];
  const REMEMBER_DAYS = 90;
  const CART_KEY = 'tfc-cart';
  const CART_HOURS = 2;
  const ASAP = 'Lo antes posible';

  function initDelivery(form) {
    const cart = []; // {uid, id, name, qty, opts:{key:value}, note}
    const picker = form.querySelector('[data-picker]');
    const list = form.querySelector('[data-cart]');
    const cartErr = form.querySelector('[data-cart-error]');
    const cartTitle = form.querySelector('[data-cart-title]');
    const subtotal = form.querySelector('[data-subtotal]');
    const toast = document.querySelector('[data-toast]');
    let station = 'criollo';
    let toastTimer = null;

    // Hidden items (prices sheet: Disponible = No) stay indexed; the 'tfc:prices' handler below removes them from the cart.
    let allItems = {};
    let cartNotice = ''; // one-line status above the cart after the sheet changed something the customer had chosen
    function indexItems() {
      allItems = {};
      window.TFC_MENU.forEach((s) => { // stations and dishes still «Próximamente» (config.comingSoon) cannot be ordered
        if (TFC.isSoon(s.id)) return;
        s.sections.forEach((sec) => sec.items.forEach((it) => { if (it.orderable && !TFC.isSoon(it.id)) allItems[it.id] = { ...it, station: s }; }));
      });
    }
    indexItems();

    // Options with `hidden: true` (menu.js) have no select: the first choice is picked automatically and they are left out of
    // order texts (the criollo plate's Regular/Combo option while the Combo is off).
    function shownOptions(it) { return (it.options || []).filter((o) => !o.hidden); }
    function autoValue(o) { return o.hidden ? (o.choices[0] || '') : ''; }
    function optsText(l) { // chosen values of the visible options, in menu order
      const it = allItems[l.id];
      if (!it) return Object.values(l.opts).filter(Boolean);
      return shownOptions(it).map((o) => l.opts[o.key]).filter(Boolean);
    }

    function renderPicker() {
      if (TFC.pricesPending) { // prices.js is still reading the owner's sheet (1.5 s at most); it re-renders when done
        picker.innerHTML = `<p class="menu-loading" role="status">${L('Cargando el menú…', 'Loading the menu…')}</p>`;
        return;
      }
      const stations = window.TFC_MENU;
      const s = stations.find((x) => x.id === station);
      const soon = TFC.isSoon(s.id);
      const pickable = (sec) => sec.items.filter((i) => i.orderable && i.available !== false);
      const list = soon ? '' : s.sections.map((sec) => pickable(sec).map((it) => TFC.isSoon(it.id) ? `
          <div class="pick-item pick-soon">
            <span class="pick-main"><span class="mi-name">${esc(tr(it.name))}</span>${it.desc ? `<span class="mi-desc">${esc(TFC.pick(it.desc))}</span>` : ''}</span>
            <span class="pick-right">${TFC.soonTag()}</span>
          </div>` : `
          <button type="button" class="pick-item" data-add="${it.id}">
            <span class="sr-only">${L('Añadir', 'Add')}: </span><span class="pick-main"><span class="mi-name">${esc(tr(it.name))}</span>${it.desc ? `<span class="mi-desc">${esc(TFC.pick(it.desc))}</span>` : ''}</span>
            <span class="pick-right"><span class="mi-price">${TFC.priceHtml(it) || esc(L('precio en mostrador', 'counter price'))}</span><span class="pick-plus" aria-hidden="true">+</span></span>
          </button>`).join('')).join('');
      picker.innerHTML = `
        <div class="menu-tabs small">${stations.map((x) => `
          <button type="button" class="menu-tab tab-${x.color}" aria-pressed="${x.id === station}" data-station="${x.id}">${esc(TFC.pick(x.station))}${TFC.isSoon(x.id) ? ' ' + TFC.soonTag() : ''}</button>`).join('')}
        </div>
        ${station === 'criollo' ? '<div class="criollo-today compact" data-criollo-today hidden></div>' : ''}
        <div class="pick-list">${soon ? `<p class="soon-note">${L('<strong>Próximamente.</strong> Esta estación abre muy pronto. Por ahora puedes pedir de las demás estaciones.', '<strong>Coming soon.</strong> This station opens soon. For now you can order from the other stations.')}</p>`
          : list || `<p class="menu-empty">${L('Sin platos disponibles por ahora.', 'No dishes available right now.')}</p>`}</div>`;
      picker.querySelectorAll('[data-station]').forEach((b) => b.addEventListener('click', () => {
        station = b.dataset.station; renderPicker();
        picker.querySelector(`[data-station="${station}"]`).focus();
      }));
      picker.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => add(b.dataset.add)));
      document.dispatchEvent(new CustomEvent('tfc:menu-rendered'));
    }

    // The cart survives a reload, a header link or the phone discarding the tab: this tab only, for a couple of hours.
    function saveCart() {
      try {
        if (cart.length) sessionStorage.setItem(CART_KEY, JSON.stringify({ t: Date.now(), cart }));
        else sessionStorage.removeItem(CART_KEY);
      } catch (e) { /* storage unavailable */ }
    }
    function restoreCart() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(CART_KEY) || 'null');
        if (!saved || !Array.isArray(saved.cart) || Date.now() - saved.t > CART_HOURS * 3600 * 1000) return;
        const soonIds = new Set(); // dishes of stations or dishes in config.comingSoon
        window.TFC_MENU.forEach((s) => s.sections.forEach((sec) => sec.items.forEach((it) => { if (TFC.isSoon(s.id) || TFC.isSoon(it.id)) soonIds.add(it.id); })));
        const soonNames = [], goneNames = [];
        let lostOption = false; // a saved choice that is no longer offered (e.g. a nachos style that was removed) comes back blank: say so
        saved.cart.forEach((l) => {
          const it = l && allItems[l.id];
          if (!it || it.available === false) { // the 'tfc:prices' handler reconciles anything the sheet changes later
            if (l && l.name) (soonIds.has(l.id) && !it ? soonNames : goneNames).push(tr(String(l.name)));
            return;
          }
          const opts = {};
          (it.options || []).forEach((o) => { const v = l.opts && l.opts[o.key]; if (o.choices.includes(v)) opts[o.key] = v; else { opts[o.key] = autoValue(o); if (v && !o.hidden) lostOption = true; } });
          cart.push({ uid: Math.random().toString(36).slice(2), id: l.id, name: it.name, qty: Math.max(1, Math.min(99, parseInt(l.qty, 10) || 1)), opts, note: String(l.note || '').slice(0, 140) });
        });
        // Tell the customer what a saved cart lost (e.g. a dish added before it was marked «Próximamente»).
        cartNotice = [
          soonNames.length ? L(`${soonNames.join(', ')}: ${soonNames.length > 1 ? 'llegan' : 'llega'} muy pronto; por ahora se quitó de tu pedido.`, `${soonNames.join(', ')}: coming soon; removed from your order for now.`) : '',
          goneNames.length ? L(`${goneNames.join(', ')}: ya no está disponible y se quitó de tu pedido.`, `${goneNames.join(', ')}: no longer available, removed from your order.`) : '',
          lostOption ? L('Una opción de tu pedido ya no está disponible; elige otra.', 'An option in your order is no longer available; choose another.') : '',
        ].filter(Boolean).join(' ');
      } catch (e) { /* storage unavailable or an older format */ }
    }

    function count() { return cart.reduce((n, l) => n + l.qty, 0); }
    const live = form.querySelector('[data-cart-live]');
    function announce() {
      form.querySelector('[data-cart-count]').textContent = count();
      if (live) { const n = count(); live.textContent = `${n} ${n === 1 ? L('artículo', 'item') : L('artículos', 'items')} ${L('en tu pedido', 'in your order')}`; }
    }

    function add(id) {
      const it = allItems[id];
      cartNotice = '';
      let line = shownOptions(it).length ? null : cart.find((l) => l.id === id); // same simple item → bump qty
      if (line) line.qty = Math.min(99, line.qty + 1);
      else {
        const opts = {};
        (it.options || []).forEach((o) => { opts[o.key] = autoValue(o); }); // customer must choose (no silent defaults), except hidden options
        line = { uid: Math.random().toString(36).slice(2), id, name: it.name, qty: 1, opts, note: '' };
        cart.push(line);
      }
      cartErr.hidden = true;
      renderCart();
      const row = list.querySelector(`.cart-line[data-uid="${line.uid}"]`);
      if (row) row.classList.add('flash');
      if (isPhone()) showToast(it);
      else if (row) row.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    }

    function showToast(it) {
      if (!toast) return;
      const needsChoice = shownOptions(it).length > 0;
      toast.innerHTML = `<span>✓ ${esc(tr(it.name))} · ${count()} ${L('art.', count() === 1 ? 'item' : 'items')}</span>
        <button type="button" data-toast-go>${needsChoice ? L('Elegir opciones', 'Choose options') : L('Ver pedido', 'View order')}</button>`;
      toast.hidden = false;
      toast.querySelector('[data-toast-go]').addEventListener('click', () => {
        toast.hidden = true;
        const target = needsChoice ? list.querySelector('.cart-line:last-child select') : cartTitle;
        (target || cartTitle).scrollIntoView(scrollOpts());
        if (target && target.focus) target.focus({ preventScroll: true });
      });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
    }

    function renderCart() {
      announce();
      const noticeHtml = cartNotice ? `<p class="field-error cart-notice" role="status">${esc(cartNotice)}</p>` : '';
      if (!cart.length) {
        list.innerHTML = `${noticeHtml}<p class="cart-empty">${L('Aún no has añadido nada. Toca un plato para añadirlo.', 'Nothing added yet. Tap a dish to add it.')}</p>`;
        refreshTotals();
        return;
      }
      list.innerHTML = noticeHtml + cart.map((l) => {
        const it = allItems[l.id];
        const name = esc(tr(l.name));
        return `
        <div class="cart-line" data-uid="${l.uid}">
          <div class="cart-head">
            <span class="mi-name">${name}</span>
            <span class="cart-price" data-line-price></span>
            <div class="qty" role="group" aria-label="${L('Cantidad de', 'Quantity of')} ${name}">
              <button type="button" data-dec aria-label="${L('Una menos', 'One less')}: ${name}">−</button>
              <input name="cart-qty" type="number" min="1" max="99" value="${l.qty}" inputmode="numeric" aria-label="${L('Cantidad', 'Quantity')}: ${name}">
              <button type="button" data-inc aria-label="${L('Una más', 'One more')}: ${name}">+</button>
            </div>
            <button type="button" class="cart-remove" data-remove aria-label="${L('Quitar', 'Remove')}: ${name}">✕</button>
          </div>
          ${shownOptions(it).length ? `<div class="cart-opts">${shownOptions(it).map((o) => `
            <label>${esc(TFC.pick(o.label))}
              <select name="cart-opt" data-opt="${o.key}" aria-label="${esc(TFC.pick(o.label))}: ${name}" required>
                <option value="">${L('Elige…', 'Choose…')}</option>
                ${o.choices.map((c) => `<option value="${esc(c)}"${l.opts[o.key] === c ? ' selected' : ''}>${esc(tr(c))}</option>`).join('')}
              </select>
            </label>`).join('')}</div>` : ''}
          <input name="cart-note" class="cart-note" type="text" maxlength="140" value="${esc(l.note)}" aria-label="${L('Nota', 'Note')}: ${name}"
            placeholder="${esc(it.notePh ? TFC.pick(it.notePh) : L('Nota (opcional): sin cebolla, extra salsa…', 'Note (optional): no onion, extra sauce…'))}">
        </div>`;
      }).join('');
      list.querySelectorAll('.cart-line').forEach((row) => {
        const l = cart.find((x) => x.uid === row.dataset.uid);
        const qty = row.querySelector('input[type=number]');
        const set = (n) => { l.qty = Math.max(1, Math.min(99, n || 1)); qty.value = l.qty; announce(); refreshTotals(); };
        row.querySelector('[data-inc]').addEventListener('click', () => set(l.qty + 1));
        row.querySelector('[data-dec]').addEventListener('click', () => set(l.qty - 1));
        qty.addEventListener('change', () => set(parseInt(qty.value, 10)));
        row.querySelector('[data-remove]').addEventListener('click', () => { cart.splice(cart.indexOf(l), 1); renderCart(); cartTitle.focus(); });
        row.querySelectorAll('[data-opt]').forEach((s) => s.addEventListener('change', () => { l.opts[s.dataset.opt] = s.value; refreshTotals(); s.removeAttribute('aria-invalid'); const err = row.querySelector('.field-error[data-dyn]'); if (err && row.querySelectorAll('select:invalid').length === 0) err.remove(); }));
        row.querySelector('.cart-note').addEventListener('input', (e) => { l.note = e.target.value; saveCart(); });
        // Enter inside a cart field must not submit the whole form.
        row.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } }));
      });
      refreshTotals();
    }

    // ----- prices -----
    function linePrice(l) { const u = TFC.price(allItems[l.id], l.opts); return u == null ? u : Math.round(u * l.qty * 100) / 100; }
    function totals() {
      let sum = 0, unpriced = 0, pending = 0;
      cart.forEach((l) => { const p = linePrice(l); if (p === null) unpriced++; else if (p === undefined) pending++; else sum += p; });
      return { sum: Math.round(sum * 100) / 100, unpriced, pending };
    }
    function refreshTotals() {
      saveCart();
      list.querySelectorAll('.cart-line').forEach((row) => {
        const l = cart.find((x) => x.uid === row.dataset.uid);
        const p = linePrice(l);
        row.querySelector('[data-line-price]').textContent = p === null ? L('precio en mostrador', 'counter price') : p === undefined ? L('elige opción', 'choose option') : TFC.money(p);
      });
      if (!subtotal) return;
      if (!cart.length) { subtotal.hidden = true; return; }
      const t = totals();
      subtotal.hidden = false;
      subtotal.innerHTML = `<span>${L('Subtotal', 'Subtotal')}</span><strong>${TFC.money(t.sum)}</strong>
        <small>${L('IVU no incluido', 'IVU (sales tax) not included')}${t.unpriced ? L(' · hay artículos al precio del mostrador', ' · some items at counter price') : ''}${t.pending ? L(' · elige las opciones que faltan', ' · choose the missing options') : ''}</small>`;
    }
    function lineText(l, withNote) {
      const opts = optsText(l).join(', ');
      const p = linePrice(l);
      const price = p === null ? (withNote ? ' — precio en mostrador' : L(' — precio en mostrador', ' — counter price')) : p === undefined ? '' : ` — ${TFC.money(p)}`; // kitchen lines (withNote) stay in Spanish
      return `${l.qty} × ${l.name}${opts ? ` (${opts})` : ''}${price}${withNote && l.note ? ` · ${l.note}` : ''}`;
    }

    // ----- fulfillment mode: delivery (MMC employees) vs pickup at the counter -----
    const modeBox = form.querySelector('[data-fulfillment]');
    const isPickup = () => (form.querySelector('[name=modalidad]:checked')?.value || '') === C.fulfillmentOptions[1];
    const needsEmployee = () => !isPickup() || C.pickupEmployeesOnly;
    function applyMode() {
      const pickup = isPickup();
      form.querySelectorAll('[data-delivery-only]').forEach((el) => { el.hidden = pickup; });
      form.querySelectorAll('[data-employee-only]').forEach((el) => { el.hidden = !needsEmployee(); });
      form.querySelector('[data-legend-when]').textContent = pickup ? L('Recogido', 'Pickup') : L('Entrega', 'Delivery');
      form.querySelector('[data-label-window]').textContent = pickup ? L('Hora para recoger', 'Pickup time') : L('Hora de entrega preferida', 'Preferred delivery time');
      form.querySelector('[data-mode-hint]').textContent = C.pickupEmployeesOnly
        ? L('Ambas opciones son exclusivas para empleados de Metro Medical Center.', 'Both options are exclusively for Metro Medical Center employees.')
        : L('El delivery es exclusivo para empleados de Metro Medical Center. El recogido en el mostrador está abierto a todo el mundo.', 'Delivery is exclusively for Metro Medical Center employees. Pickup at the counter is open to everyone.');
    }
    modeBox.addEventListener('change', applyMode);

    // ----- date + time windows (built from the opening hours in config) -----
    const win = form.querySelector('[name=ventana]');
    const date = form.querySelector('[name=fecha]');
    const winHint = form.querySelector('[data-window-hint]');
    const T = TFC.time;
    const nowMin = () => { const p = prParts(); return +p.hour * 60 + +p.minute; };
    const plural = (n) => (TFC.lang() === 'en' ? n + 's' : (n.endsWith('s') ? n : n + 's'));
    function availability(iso) {
      const h = T.dayHours(parseISO(iso).getDay());
      if (!h) return { closed: true, slots: [], asap: false, open: 0 };
      const today = iso === todayISO(0);
      const last = h[1] - C.lastCallMinutesBeforeClose;
      const slots = [];
      for (let t = h[0]; t + C.slotMinutes <= last; t += C.slotMinutes) {
        slots.push({ label: T.fmtRange(t, t + C.slotMinutes), past: today && t + C.slotMinutes <= nowMin() + C.orderLeadMinutes });
      }
      const asap = today && nowMin() >= h[0] && nowMin() < last; // before opening, the regular windows are the honest offer
      return { closed: false, slots, asap, open: slots.filter((x) => !x.past).length + (asap ? 1 : 0) };
    }
    function renderWindows() {
      const cur = win.value;
      const a = availability(date.value);
      const opts = [`<option value="">${L('Selecciona…', 'Choose…')}</option>`];
      if (a.asap) opts.push(`<option value="${ASAP}"${cur === ASAP ? ' selected' : ''}>${esc(tr(ASAP))}</option>`);
      a.slots.forEach((x) => opts.push(`<option value="${esc(x.label)}"${x.past ? ' disabled' : ''}${x.label === cur ? ' selected' : ''}>${esc(x.label)}${x.past ? L(' (ya pasó)', ' (passed)') : ''}</option>`));
      win.innerHTML = opts.join('');
      if (win.selectedIndex > 0 && win.options[win.selectedIndex].disabled) win.value = '';
      const dn = T.dayName(parseISO(date.value).getDay());
      if (date.value && a.closed) date.setCustomValidity(L(`Los ${plural(dn)} estamos cerrados; elige otra fecha.`, `We're closed on ${plural(dn)}; pick another date.`));
      else date.setCustomValidity('');
      winHint.textContent = a.closed ? L('Ese día estamos cerrados.', 'We are closed that day.')
        : a.open === 0 ? L('Para hoy ya pasó la última llamada; elige otra fecha.', 'Today\'s last call has passed; pick another date.')
        : L('Sujeta a disponibilidad; te confirmamos la hora exacta.', 'Subject to availability; we confirm the exact time.');
    }
    // The first day that still has windows (after last call, or on a Sunday, that is the next open day).
    function firstOpenDay() {
      for (let i = 0; i <= C.maxAdvanceDays; i++) { const iso = todayISO(i); if (availability(iso).open > 0) return iso; }
      return todayISO(0);
    }
    date.min = todayISO(0);
    date.max = todayISO(C.maxAdvanceDays);
    date.value = firstOpenDay();
    date.addEventListener('change', renderWindows);
    // A phone can keep this page open for hours: re-check the calendar and the windows before sending and on coming back.
    function refreshDates(moveOn) {
      date.min = todayISO(0);
      date.max = todayISO(C.maxAdvanceDays);
      if (moveOn && date.value && date.value < date.min) { date.value = firstOpenDay(); win.value = ''; }
      renderWindows();
    }
    // At submit a past date gets the normal error: never send a day the customer didn't choose.
    form.addEventListener('submit', () => refreshDates(false)); // registered before wireSubmit's handler, so it runs first
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDates(true); });
    window.addEventListener('pageshow', (e) => { if (e.persisted) refreshDates(true); });

    // ----- static chip groups (re-rendered on language toggle, selection kept) -----
    const pay = form.querySelector('[data-payment]');
    const confirmBy = form.querySelector('[data-confirm-by]');
    const renderStatic = () => {
      renderChips(modeBox, 'modalidad', C.fulfillmentOptions, 'radio', true);
      if (!modeBox.querySelector('input:checked')) modeBox.querySelector('input').checked = true;
      renderChips(pay, 'pago', C.paymentOptions, 'radio', true);
      if (confirmBy) renderChips(confirmBy, 'confirmar_por', C.confirmChannels, 'radio', true);
      applyMode();
      renderWindows();
    };
    renderStatic();
    document.addEventListener('tfc:lang', () => { renderStatic(); renderPicker(); renderCart(); });
    // Sheet prices arrived or changed (prices.js): re-index, drop what the owner hid, clear options no longer offered,
    // redraw the picker (keeping its scroll and focus) and the cart, and tell the customer what changed.
    document.addEventListener('tfc:prices', () => {
      const before = cart.map((l) => linePrice(l));
      indexItems();
      const gone = [], cleared = [];
      for (let i = cart.length - 1; i >= 0; i--) {
        const l = cart[i], it = allItems[l.id];
        if (!it || it.available === false) { gone.unshift(l); cart.splice(i, 1); continue; }
        (it.options || []).forEach((o) => {
          if (o.hidden) { l.opts[o.key] = autoValue(o); return; }
          if (l.opts[o.key] && !o.choices.includes(l.opts[o.key])) { l.opts[o.key] = ''; cleared.push(l); }
        });
      }
      const oldList = picker.querySelector('.pick-list');
      const scrollTop = oldList ? oldList.scrollTop : 0;
      const a = document.activeElement;
      const focusSel = a && picker.contains(a) ? (a.dataset.add ? `[data-add="${a.dataset.add}"]` : a.dataset.station ? `[data-station="${a.dataset.station}"]` : '') : '';
      renderPicker();
      const newList = picker.querySelector('.pick-list');
      if (newList) newList.scrollTop = scrollTop;
      if (focusSel) { const el = picker.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); }
      const after = cart.map((l) => linePrice(l));
      const repriced = !gone.length && !cleared.length && before.some((p, i) => p !== after[i]);
      const goneNote = gone.length ? L(`${gone.map((l) => tr(l.name)).join(', ')}: ya no está disponible y se quitó de tu pedido.`, `${gone.map((l) => tr(l.name)).join(', ')}: no longer available, removed from your order.`) : '';
      const clearedNote = cleared.length ? L('Una opción de tu pedido ya no está disponible; elige otra.', 'An option in your order is no longer available; choose another.') : '';
      if (goneNote || clearedNote) cartNotice = [goneNote, clearedNote].filter(Boolean).join(' '); // both can happen at once (a drink hidden that was an extra line AND a plate's drink)
      else if (repriced) cartNotice = L('Los precios se actualizaron; revisa tu pedido.', 'Prices were updated; please review your order.');
      renderCart();
      if (cartNotice && live) live.textContent = cartNotice;
    });

    // ----- remember me (this phone only) -----
    const remember = form.querySelector('[name=recordar]');
    try {
      let saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
      if (saved && Date.now() - (saved.t || 0) > REMEMBER_DAYS * 864e5) { localStorage.removeItem(REMEMBER_KEY); saved = null; }
      if (saved) { REMEMBER_FIELDS.forEach((k) => { if (saved[k] && form[k] && !form[k].value) form[k].value = saved[k]; }); if (remember) remember.checked = true; }
    } catch (e) { /* storage unavailable */ }
    if (remember) remember.addEventListener('change', () => { if (!remember.checked) { try { localStorage.removeItem(REMEMBER_KEY); } catch (e) { /* storage unavailable */ } } });

    restoreCart();
    renderPicker();
    renderCart();
    if (cartNotice && live) live.textContent = cartNotice; // after renderCart(): announce() rewrites the live region

    wireSubmit(form, {
      check(fieldsOk) {
        if (!cart.length) {
          cartErr.hidden = false;
          if (fieldsOk) { cartErr.scrollIntoView(scrollOpts()); cartTitle.focus({ preventScroll: true }); }
          return false;
        }
        return true;
      },
      payload() {
        const f = fields(form);
        const pickup = isPickup();
        const emp = needsEmployee();
        const ref = refCode(pickup ? 'R' : 'D');
        const shortDate = parseISO(f.fecha).toLocaleDateString('es-PR', { weekday: 'short', day: 'numeric', month: 'short' });
        const when = `${fmtDate(f.fecha)} · ${f.ventana}`;
        const pickupPlace = L('Tu Food Court, food court de Metro Medical Center', 'Tu Food Court, Metro Medical Center food court');
        const t = totals();
        const subtotalEs = `${TFC.money(t.sum)} sin IVU${t.unpriced ? ' (sin los artículos a precio de mostrador)' : ''}`;
        const subtotalEn = `${TFC.money(t.sum)} before IVU${t.unpriced ? ' (items at counter price not included)' : ''}`;
        const payload = {
          _subject: pickup
            ? `🥡 Recogido ${ref} — ${f.nombre} · ${shortDate} · ${f.ventana}`
            : `🛵 Delivery MMC ${ref} — ${f.nombre} (${f.departamento}) · ${shortDate} · ${f.ventana}`,
          _template: 'table',
          _captcha: 'false',
          _honey: f._honey || '',
          Referencia: ref,
          Tipo: pickup ? 'Recogido en el mostrador' : 'Delivery — empleado Metro Medical Center',
          Nombre: f.nombre,
          'Teléfono': f.telefono,
          email: f.email,
          'Confirmar por': f.confirmar_por || '',
        };
        if (emp) { payload['Núm. empleado'] = f.empleado_id; payload.Departamento = f.departamento; }
        if (!pickup) { payload['Entregar en'] = f.entrega; payload['Extensión'] = f.extension || ''; }
        Object.assign(payload, {
          Fecha: `${f.fecha} (${fmtDate(f.fecha, 'es-PR')})`,
          Hora: f.ventana,
          Pago: f.pago,
          'Artículos': String(count()),
          'Subtotal': subtotalEs,
        });
        // One row per line so the email table stays readable.
        cart.forEach((l, i) => { payload[`Pedido ${i + 1}`] = lineText(l, true); });
        payload.Notas = f.notas || '';
        if (emp) payload['Confirmó ser empleado(a) de MMC'] = f.confirmo_empleado ? 'Sí' : 'No';
        Object.assign(payload, {
          Idioma: TFC.lang(),
          Origen: source(),
          _autoresponse: L(
            `¡Gracias, ${cleanName(f.nombre)}! Recibimos tu pedido ${ref}.\n\nPedido:\n${cart.map((l) => '• ' + lineText(l, false)).join('\n')}\n\n${pickup ? 'Recoger en' : 'Entrega'}: ${pickup ? pickupPlace : clean(f.entrega, 80)} — ${when}\nSubtotal: ${subtotalEs}\nPago ${pickup ? 'al recoger' : 'al recibir'}: ${f.pago}\n\nTe confirmaremos el total y la hora por ${f.confirmar_por || 'teléfono o email'} antes de preparar tu pedido.${emp ? ' Recuerda tener tu identificación de empleado a la mano.' : ''}\n\n— Tu Food Court · Metro Medical Center`,
            `Thanks, ${cleanName(f.nombre)}! We received your order ${ref}.\n\nOrder:\n${cart.map((l) => '• ' + lineText(l, false)).join('\n')}\n\n${pickup ? 'Pick up at' : 'Deliver to'}: ${pickup ? pickupPlace : clean(f.entrega, 80)} — ${when}\nSubtotal: ${subtotalEn}\nPay ${pickup ? 'at pickup' : 'on delivery'}: ${f.pago}\n\nWe'll confirm the total and time by ${f.confirmar_por || 'phone or email'} before preparing your order.${emp ? ' Please have your employee ID ready.' : ''}\n\n— Tu Food Court · Metro Medical Center`),
        });
        const summaryHtml = `<ul>${cart.map((l) => { const p = linePrice(l); return `<li>${esc(l.qty)} × ${esc(tr(l.name))}${optsText(l).length ? ` (${optsText(l).map((v) => esc(tr(v))).join(', ')})` : ''}${p == null ? '' : ` — ${TFC.money(p)}`}${l.note ? ` · ${esc(l.note)}` : ''}</li>`; }).join('')}</ul>
          <p><strong>Subtotal:</strong> ${esc(L(subtotalEs, subtotalEn))}</p>
          <p><strong>${pickup ? L('Recoger en', 'Pick up at') : L('Entrega', 'Deliver to')}:</strong> ${esc(pickup ? pickupPlace : f.entrega)} · ${esc(fmtDate(f.fecha))} · ${esc(tr(f.ventana))}</p>
          <p><strong>${L('Te confirmamos por', 'We confirm by')}:</strong> ${esc(tr(f.confirmar_por || ''))}</p>`;
        return { payload, summaryHtml, plain: plainText(payload) };
      },
      after() {
        try {
          if (remember && remember.checked) {
            const o = { t: Date.now() }; REMEMBER_FIELDS.forEach((k) => { o[k] = form[k].value; });
            localStorage.setItem(REMEMBER_KEY, JSON.stringify(o));
          } else localStorage.removeItem(REMEMBER_KEY);
        } catch (e) { /* storage unavailable */ }
        cart.length = 0; // a language toggle behind the confirmation must not save the sent order again
        try { sessionStorage.removeItem(CART_KEY); } catch (e) { /* storage unavailable */ }
      },
    });
  }

  // =====================================================================
  // CATERING
  // =====================================================================
  function initCatering(form) {
    const date = form.querySelector('[name=fecha_evento]');
    const time = form.querySelector('[name=hora]');
    const leadHours = Number(C.cateringLeadHours) || 0;
    const earliest = () => new Date(Date.now() + leadHours * 3600 * 1000);
    const isoOf = (d) => { const p = prParts(d); return `${p.year}-${p.month}-${p.day}`; };
    date.min = isoOf(earliest());
    // The lead time applies to the service date AND time: a request for the earliest allowed day
    // must still be at least `leadHours` ahead of the chosen service hour.
    const checkLead = () => {
      time.setCustomValidity('');
      if (!date.value || !time.value) return;
      const service = new Date(`${date.value}T${time.value}:00-04:00`); // Puerto Rico is UTC-4 all year
      if (Number.isNaN(service.getTime())) return;
      if (service < earliest()) {
        time.setCustomValidity(L(
          `Necesitamos al menos ${leadHours} horas de anticipación. Escoge otra fecha u hora de servicio.`,
          `We need at least ${leadHours} hours' notice. Choose another service date or time.`));
      }
    };
    ['change', 'input'].forEach((ev) => { date.addEventListener(ev, checkLead); time.addEventListener(ev, checkLead); });
    form.addEventListener('submit', checkLead); // registered before wireSubmit's handler, so it runs first
    // The notice text is re-rendered on language toggle, so re-bind the number each time.
    const bindNumbers = () => {
      document.querySelectorAll('[data-lead]').forEach((el) => { el.textContent = leadHours; });
    };
    bindNumbers();
    document.addEventListener('tfc:lang', bindNumbers);

    const where = form.querySelectorAll('[name=lugar_tipo]');
    const addr = form.querySelector('[data-address]');
    const addrInput = addr.querySelector('input');
    const syncAddr = () => {
      const v = form.querySelector('[name=lugar_tipo]:checked')?.value;
      const outside = v === 'Fuera de Metro Medical Center';
      addr.querySelector('label span').textContent = outside ? L('Dirección del evento', 'Event address') : L('Edificio / piso / salón', 'Building / floor / room');
      addrInput.setAttribute('autocomplete', outside ? 'street-address' : 'off');
      addrInput.required = true;
    };
    where.forEach((r) => r.addEventListener('change', syncAddr));
    document.addEventListener('tfc:lang', syncAddr);
    syncAddr();

    const stationsBox = form.querySelector('[data-stations-error]');
    form.querySelectorAll('[name=estaciones]').forEach((c) => c.addEventListener('change', () => { if (form.querySelectorAll('[name=estaciones]:checked').length) stationsBox.hidden = true; }));
    wireSubmit(form, {
      check(fieldsOk) {
        const any = form.querySelectorAll('[name=estaciones]:checked').length > 0;
        stationsBox.hidden = any;
        if (!any && fieldsOk) { stationsBox.scrollIntoView(scrollOpts()); form.querySelector('[name=estaciones]').focus({ preventScroll: true }); }
        return any;
      },
      payload() {
        const f = fields(form);
        const ref = refCode('C');
        const payload = {
          _subject: `🍽️ Catering ${ref} — ${f.nombre} · ${f.invitados} pers. · ${f.fecha_evento}`,
          _template: 'table',
          _captcha: 'false',
          _honey: f._honey || '',
          Referencia: ref,
          Tipo: 'Cotización de catering',
          Nombre: f.nombre,
          'Teléfono': f.telefono,
          email: f.email,
          'Contactar por': f.contacto_pref,
          'Organización': f.organizacion || '',
          'Tipo de evento': f.tipo_evento,
          'Fecha del evento': `${f.fecha_evento} (${fmtDate(f.fecha_evento, 'es-PR')})`,
          Hora: fmtTime(f.hora, 'es-PR'),
          Personas: f.invitados,
          Lugar: `${f.lugar_tipo} — ${f.direccion}`,
          Servicio: f.servicio,
          Estaciones: f.estaciones,
          'Presupuesto por persona': f.presupuesto || 'No indicado',
          'Alergias / restricciones': f.dietas || '',
          Notas: f.notas || '',
          Idioma: TFC.lang(),
          Origen: source(),
          _autoresponse: L(
            `¡Gracias, ${cleanName(f.nombre)}! Recibimos tu solicitud de catering ${ref}: ${f.tipo_evento}, ${fmtDate(f.fecha_evento)} a las ${fmtTime(f.hora)}, ${f.invitados} personas (${f.estaciones}; ${f.servicio}).\n\nTe enviaremos la cotización dentro de 1 día laborable por ${f.contacto_pref}.\n\n— Tu Food Court · Metro Medical Center`,
            `Thanks, ${cleanName(f.nombre)}! We received your catering request ${ref}: ${f.tipo_evento}, ${fmtDate(f.fecha_evento)} at ${fmtTime(f.hora)}, ${f.invitados} guests (${f.estaciones}; ${f.servicio}).\n\nWe'll send your quote within 1 business day via ${f.contacto_pref}.\n\n— Tu Food Court · Metro Medical Center`),
        };
        const summaryHtml = `<p><strong>${esc(tr(f.tipo_evento))}</strong> · ${esc(fmtDate(f.fecha_evento))} · ${esc(fmtTime(f.hora))} · ${esc(f.invitados)} ${L('personas', 'guests')}</p>
          <p>${f.estaciones.split(', ').map((s) => esc(tr(s))).join(', ')} · ${esc(tr(f.servicio))}</p>
          <p><strong>${L('Te contactamos por', 'We contact you by')}:</strong> ${esc(tr(f.contacto_pref))}</p>`;
        return { payload, summaryHtml, plain: plainText(payload) };
      },
    });
  }

  const d = document.querySelector('form[data-form=delivery]');
  if (d) initDelivery(d);
  const c = document.querySelector('form[data-form=catering]');
  if (c) initCatering(c);
})();
