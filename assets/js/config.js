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
  // Prices come from assets/js/menu.js (sheet prices, before IVU). Owner rule (2026-10-28): add 3.8% to every
  // listed price, then round UP to the next .99 (e.g. $11.99 → $12.45 → $12.99). Set percent to 0 and rounding
  // to 'none' to show the sheet prices exactly as listed.
  priceAdjustPercent: 3.8,
  priceRounding: 'up99', // 'up99' | 'none'
  paymentOptions: ['ATH Móvil', 'Tarjeta de crédito', 'Efectivo'], // Spanish values; EN display in i18n.js TFC_EN_VALUES
  confirmChannels: ['Llamada', 'Texto (SMS)', 'WhatsApp', 'Email'],
  fulfillmentOptions: ['Delivery a mi área (empleados MMC)', 'Recogido en el mostrador'],

  // Catering: how many days in advance an event must be requested, and minimum headcount
  cateringLeadDays: 3,
  cateringMinGuests: 10,
};
