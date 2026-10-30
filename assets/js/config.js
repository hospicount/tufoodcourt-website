// Tu Food Court — site configuration.
// Everything the owner may need to change lives here. Values marked TODO are placeholders.
window.TFC_CONFIG = {
  siteUrl: 'https://tufoodcourtpr.com',

  // Inbox that receives delivery + catering requests (FormSubmit relays the form to this address;
  // the first submission sends a one-time activation email to it that must be clicked).
  formEmail: 'info@tufoodcourtpr.com',

  // Contact details shown on the site. Leave '' to hide a line.
  phone: '',          // TODO e.g. '787-000-0000'
  email: 'info@tufoodcourtpr.com',
  instagram: '',      // TODO e.g. 'tufoodcourtpr'
  facebook: '',       // TODO

  openingLabel: { es: 'Abrimos en noviembre 2026', en: 'Opening November 2026' },

  // Opening hours — single source for the footer, the "Visítanos" card and the order time windows.
  // 0 = Sunday … 6 = Saturday; null = closed; 24-hour "HH:MM".
  schedule: {
    0: null,
    1: ['06:00', '14:00'],
    2: ['06:00', '14:00'],
    3: ['06:00', '14:00'],
    4: ['06:00', '14:00'],
    5: ['06:00', '14:00'],
    6: ['08:00', '13:00'],
  },
  locationName: 'Metro Medical Center',
  locationArea: { es: 'Food Court · Bayamón, Puerto Rico', en: 'Food Court · Bayamón, Puerto Rico' },
  mapsQuery: 'Metro Medical Center Bayamón Puerto Rico',

  // Delivery (Metro Medical Center employees only) and pickup orders
  lastCallMinutesBeforeClose: 30, // same-day orders until 1:30 PM Mon–Fri and 12:30 PM Sat
  slotMinutes: 30,                // length of each time window offered
  orderLeadMinutes: 30,           // today's windows ending sooner than this are greyed out
  maxAdvanceDays: 14,             // how far ahead an order can be scheduled
  pickupEmployeesOnly: false,     // true = pickup also requires MMC employee details
  // Base prices come from assets/js/menu.js, overridden by the «Precios» tab of the owner's Google Sheet (see below;
  // before IVU). Owner rule (2026-10-28): add 3.8% to every base price, then round UP to the next .99
  // (e.g. $11.99 → $12.45 → $12.99). Set percent to 0 and rounding to 'none' to show the base prices exactly as listed.
  // If you change this rule, also update the «Precio en el sitio» formula in the sheet (it only previews the rule).
  priceAdjustPercent: 3.8,
  priceRounding: 'up99', // 'up99' | 'none'
  paymentOptions: ['ATH Móvil', 'Tarjeta de crédito', 'Efectivo'], // Spanish values; EN display in i18n.js TFC_EN_VALUES
  confirmChannels: ['Llamada', 'Texto (SMS)', 'WhatsApp', 'Email'],
  fulfillmentOptions: ['Delivery a mi área (empleados MMC)', 'Recogido en el mostrador'],

  // Catering: how many hours before the service time a request must arrive (48 = two days). No minimum headcount.
  cateringLeadHours: 48,

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
