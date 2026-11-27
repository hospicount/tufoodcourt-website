// Tu Food Court — site configuration.
// Everything the owner may need to change lives here. Values marked TODO are placeholders.
window.TFC_CONFIG = {
  siteUrl: 'https://tufoodcourtpr.com',

  // Inbox that receives delivery + catering requests (FormSubmit relays the form to this address;
  // the first submission sends a one-time activation email to it that must be clicked).
  formEmail: 'info@tufoodcourtpr.com',

  // Contact details shown on the site. Leave '' to hide a line.
  phone: '787-449-1530', // shown in the contact card, the form footers and the «no se envió» box
  email: 'info@tufoodcourtpr.com',
  instagram: '',      // TODO e.g. 'tufoodcourtpr'
  facebook: '',       // TODO

  openingLabel: { es: '¡Ya estamos abiertos!', en: 'We\'re now open!' },

  // Not available yet: station ids or dish ids from menu.js. A station gets a «Próximamente» badge on the home page,
  // its menu tab becomes a preview without prices, it cannot be ordered and its catering option is disabled.
  // A dish shows «Próximamente» instead of its price and cannot be ordered. To open one, remove its id here
  // (for a station also rewrite the "muy pronto" sentences: README → Estaciones y platos próximamente).
  // (Pizza opened 2026-11-24, soft opening that week: owner. Mexicano opened 2026-11-05 with a limited menu; what it does not sell yet is
  // «No» in the «Precios» tab. Chicken nachos opened 2026-11-24 as the «Pollo» choice of the nachos.)
  comingSoon: [
    'catering-tacos',                           // the «Barra de tacos» option of the catering form stays disabled (the owner has not opened taco bars for catering)
    'po-flan', 'po-tres-leches',                // desserts (available now: fruit salad, Choco Fudge Cake and Carrot Cake)
  ],

  // Opening hours — single source for the footer, the "Visítanos" card and the order time windows.
  // 0 = Sunday … 6 = Saturday. Each day is ['HH:MM', 'HH:MM'] (24-hour open, close), null = closed,
  // or 'soon' = shown as «próximamente» / "coming soon" (not orderable, like a closed day). To open Saturdays later,
  // replace 'soon' with e.g. ['08:00', '13:00'] — the footer, the order windows and the last call follow by themselves
  // (also update the OpeningHoursSpecification JSON-LD at the top of index.html, which search engines read).
  schedule: {
    0: null,
    1: ['06:00', '15:00'],
    2: ['06:00', '15:00'],
    3: ['06:00', '15:00'],
    4: ['06:00', '15:00'],
    5: ['06:00', '15:00'],
    6: 'soon',
  },
  // Whole days closed on top of the weekly schedule (holidays). Key = 'YYYY-MM-DD' (Puerto Rico date); value = the reason shown to
  // customers ({ es, en }, or '' for none). On these days the order form takes no orders (the date gets «Ese día estamos cerrados
  // (Navidad)»), the Friday promotion is skipped (no banner, no promo prices), «Hoy en la línea criolla» shows nothing, and the hours
  // lines (home «Horario» card + every page's footer) list the closures of the next 3 weeks. Catering requests are not limited (the owner arranges those). A past date can be
  // deleted or left; it does nothing. Owner, 2026-11-27: closed on all these days (open on Jan 11 Hostos and Jan 18 MLK).
  closedDates: {
    '2026-12-24': { es: 'Nochebuena', en: 'Christmas Eve' },
    '2026-12-25': { es: 'Navidad', en: 'Christmas Day' },
    '2026-12-31': { es: 'Despedida de año', en: 'New Year\'s Eve' },
    '2027-01-01': { es: 'Año Nuevo', en: 'New Year\'s Day' },
    '2027-01-06': { es: 'Día de Reyes', en: 'Three Kings Day' },
  },
  // Hours of a station (or a single dish) inside the opening hours — owner, 2026-11-24: «The pizza hours are from 10:30am up to 3pm».
  // Key = station id or dish id from menu.js; `from`/`until` = 24-hour 'HH:MM'; `label` = how sentences name it («Horario de las pizzas»).
  // An order (or an addition) with one of these dishes only offers time windows inside those hours: starting at `from` or later and
  // ending by `until` minus lastCallMinutesBeforeClose (pizza: 10:30 – 11:00 AM … 2:00 – 2:30 PM, like everything else). The home menu,
  // the order page's Pizza tab and the home pizza ad show the hours. Catering requests are not limited (the owner arranges those).
  // Remove an entry to lift the limit.
  stationHours: {
    pizza: { from: '10:30', until: '15:00', label: { es: 'las pizzas', en: 'pizzas' } },
  },
  locationName: 'Metro Medical Center',
  locationArea: { es: 'Food Court · Bayamón, Puerto Rico', en: 'Food Court · Bayamón, Puerto Rico' },
  mapsQuery: 'Metro Medical Center Bayamón Puerto Rico',

  // Delivery (Metro Medical Center employees only) and pickup orders
  lastCallMinutesBeforeClose: 30, // same-day orders until 2:30 PM Mon–Fri (30 min before the 3:00 PM close)
  slotMinutes: 30,                // length of each time window offered
  orderLeadMinutes: 30,           // today's windows ending sooner than this are greyed out
  maxAdvanceDays: 14,             // how far ahead an order can be scheduled
  pickupEmployeesOnly: false,     // true = pickup also requires MMC employee details
  deliveryPaused: false,          // true = «Delivery» can't be chosen on the order page (pickup keeps working); set false + publish to resume
  // Base prices come from assets/js/menu.js, overridden by the «Precios» tab of the owner's Google Sheet (see below;
  // before IVU). Owner rule (2026-10-28): add 3.8% to every base price, then round UP to the next .99
  // (e.g. $11.99 → $12.45 → $12.99). Set percent to 0 and rounding to 'none' to show the base prices exactly as listed.
  // If you change this rule, also update the «Precio en el sitio» formula in the sheet (it only previews the rule).
  // Exception: items with `exact: true` in menu.js (the drinks: $1.50 / water $1.00) are shown exactly as written, with no % and no rounding.
  priceAdjustPercent: 3.8,
  priceRounding: 'up99', // 'up99' | 'none'
  // Weekly promotion (owner, 2026-11-20: «Fridays, fruit salads and salads 50% off»). On `day` (0 = Sunday … 5 = Friday) the listed items cost
  // `percent`% less than their normal site price; the result is rounded DOWN to the cent (7.99 → 3.99, 10.99 → 5.49). It follows the
  // pickup/delivery DATE chosen on the order form (not the day the order is placed), and an addition keeps its order's date.
  // `items` = station ids and/or dish ids from menu.js. `from` = first date it applies (YYYY-MM-DD; '' = already on) — the «Viernes −50%» tags
  // on the menus appear from that date too. Set weeklyPromo: null to switch it off. (The future daily-menu email must apply the same rule; see README.)
  weeklyPromo: {
    day: 5,
    percent: 50,
    from: '2026-11-20', // owner (2026-11-20): start the same day — Friday 2026-11-20 is the first promo day
    items: ['ensaladas', 'de-frutas'],
    name: { es: 'Viernes de ensaladas', en: 'Salad Friday' },
    what: { es: 'ensaladas y ensalada de frutas', en: 'salads and fruit salad' }, // wording for the home banner (keep in step with `items`)
    // Home banner: shown from this many days before the promo day until that day's last call (owner, 2026-11-23: «every Thursday, start
    // with the Friday 50% off» → 1 = from Thursday). The rest of the week the top of the home page runs the catering ad instead.
    announceDaysBefore: 1,
  },
  paymentOptions: ['ATH Móvil', 'Tarjeta de crédito', 'Efectivo'], // Spanish values; EN display in i18n.js TFC_EN_VALUES
  confirmChannels: ['Llamada', 'Texto (SMS)', 'WhatsApp', 'Email'],
  fulfillmentOptions: ['Delivery a mi área (empleados MMC)', 'Recogido en el mostrador'],

  // Catering: how many hours before the service time a request must arrive (48 = two days). No minimum headcount.
  cateringLeadHours: 48,
  // Home page catering ad («¡No cotizamos! Danos tu presupuesto y te hacemos tu actividad.», owner 2026-11-23): runs every day — the big
  // banner at the top of the home page, or a slim strip under the Friday-promo banner while that one is on. false = hide both.
  cateringAd: true,
  // Home page pizza ad (owner, 2026-11-24: «Today we start with the pizzas!!! … Soft opening this week»). Shown from `from` to `until`
  // (Puerto Rico dates, both days included; '' = no end). Until `softOpeningUntil` (included) it says «Soft opening esta semana» and invites
  // people to try them; afterwards «¡Nuevo en Tu Food Court!». It hides itself while 'pizza' is in comingSoon or while every pizza is «No»
  // in the «Precios» tab (nothing to order). Only one big banner at a time: the Friday-promo banner on its days, otherwise this one; the
  // others become slim strips under it. null = off.
  pizzaAd: { from: '2026-11-24', softOpeningUntil: '2026-11-27', until: '2026-12-11' },

  // "Hoy en la línea criolla": a Google Sheet the owner edits (one row per day, see README). Share the sheet as
  // "Anyone with the link → Viewer" (never Editor) and paste the long ID from its URL
  // (docs.google.com/spreadsheets/d/<ID>/edit). The ID is public here, so EVERY tab of that file is public:
  // keep nothing but the menu in it. Empty = feature off. criolloSheetTab is optional (empty = first tab).
  criolloSheetId: '1XlkcwBumvJUcfANCLBRleZe83wKtoDwrkjED5xDRWIY', // «Menú criollo — Tu Food Court» in the admin@tufoodcourtpr.com Drive
  criolloSheetTab: '',
  // Prices & availability: the «Precios» tab of that same sheet (one row per item, or per option when the price depends
  // on it; see README). «Precio base» = before the rule above, with a dot decimal; blank = the price in menu.js;
  // 0 = counter price; «Disponible» = No hides the item (or that option). Empty id = feature off (menu.js prices only).
  pricesSheetId: '1XlkcwBumvJUcfANCLBRleZe83wKtoDwrkjED5xDRWIY',
  pricesSheetTab: 'Precios',
  timeZone: 'America/Puerto_Rico', // "today" is decided in Puerto Rico time, whatever the phone's clock says
};
