// Tu Food Court — menu data. Source: "MENU CON PRECIOS BAYAMON.xlsx" (2026-10-28).
// Prices are in USD before IVU. `price` is a flat price; `priceBy` + `prices` make the price depend on one option
// (e.g. pizza size). `price: null` = not priced yet (shown as "precio en mostrador", excluded from the subtotal).
// `orderable` items appear in the delivery/pickup picker. `options` render as required selects on each cart line.
window.TFC_MENU = [
  {
    id: 'desayuno',
    station: { es: 'Desayuno', en: 'Breakfast' },
    tagline: { es: 'Desde las 6:00 AM, de lunes a viernes', en: 'From 6:00 AM, Monday to Friday' },
    color: 'amber',
    sections: [
      {
        title: { es: 'Desayuno', en: 'Breakfast' },
        items: [
          { id: 'de-revoltillo', name: 'Revoltillo con bacon o jamón', price: 7, orderable: true,
            options: [{ key: 'carne', label: { es: 'Con', en: 'With' }, choices: ['Bacon', 'Jamón'] }] },
          { id: 'de-tostada', name: 'Tostada de aguacate', desc: { es: 'Con revoltillo o salmón ahumado', en: 'With scrambled eggs or smoked salmon' }, orderable: true,
            options: [{ key: 'con', label: { es: 'Con', en: 'With' }, choices: ['Revoltillo', 'Salmón ahumado'] }],
            priceBy: 'con', prices: { 'Revoltillo': 9, 'Salmón ahumado': 11 } },
          { id: 'de-wrap-cubano', name: 'Wrap cubano', price: 9, orderable: true },
          { id: 'de-wrap', name: 'Wrap de desayuno', price: 8, orderable: true },
          { id: 'de-yogurt', name: 'Yogurt con granola', price: 6, orderable: true },
          { id: 'de-frutas', name: 'Ensalada de frutas', price: 7, orderable: true },
          { id: 'de-avena', name: 'Avena', price: 4, orderable: true },
        ],
      },
    ],
  },
  {
    id: 'criollo',
    station: { es: 'Criollo', en: 'Criollo' },
    tagline: { es: 'La comida de casa, servida a diario', en: 'Home-style Puerto Rican, served daily' },
    color: 'green',
    sections: [
      {
        title: { es: 'Almuerzo criollo', en: 'Criollo lunch' },
        note: {
          es: 'Arma tu plato con lo que esté en la línea hoy: arroz, guiso y proteína del día. Escribe tu preferencia en la nota y te confirmamos lo disponible.',
          en: 'Build your plate from today\'s line: rice, stew and protein of the day. Write your preference in the note and we confirm what\'s available.',
        },
        items: [
          { id: 'cr-plato', name: 'Plato criollo del día', desc: { es: 'Arroz, guiso y proteína del día · Regular o Combo', en: 'Rice, stew and protein of the day · Regular or Combo' }, orderable: true,
            options: [{ key: 'tipo', label: { es: 'Opción', en: 'Option' }, choices: ['Regular', 'Combo'] }],
            priceBy: 'tipo', prices: { 'Regular': 11.99, 'Combo': 14.99 },
            notePh: { es: 'Ej.: arroz con gandules, habichuelas, pollo', en: 'E.g.: rice with pigeon peas, beans, chicken' } },
        ],
      },
      {
        title: { es: 'Acompañantes criollos', en: 'Criollo sides' },
        items: [
          { id: 'sd-arroz-blanco', name: 'Arroz blanco', price: 3, orderable: true },
          { id: 'sd-arroz-guisado', name: 'Arroz guisado del día', price: 4, orderable: true },
          { id: 'sd-guiso', name: 'Guiso del día', desc: { es: 'Habichuelas, gandules, garbanzos…', en: 'Beans, pigeon peas, chickpeas…' }, price: 2, orderable: true },
          { id: 'sd-tostones', name: 'Tostones', price: 5, orderable: true },
          { id: 'sd-guineitos', name: 'Guineítos', price: 3, orderable: true },
          { id: 'sd-yuca', name: 'Yuca', price: 4, orderable: true },
          { id: 'sd-batata', name: 'Batata', price: 4, orderable: true },
          { id: 'sd-mofongo', name: 'Mofongo', price: 6, orderable: true },
          { id: 'sd-yucafongo', name: 'Yucafongo', price: 6, orderable: true },
        ],
      },
    ],
  },
  {
    id: 'pizza',
    station: { es: 'Pizza', en: 'Pizza' },
    tagline: { es: '10" personal o 16" grande', en: '10" personal or 16" large' },
    color: 'red',
    sections: [
      {
        title: { es: 'Las pizzas', en: 'The pizzas' },
        note: { es: 'Precios 10" / 16".', en: 'Prices 10" / 16".' },
        items: [
          { id: 'pz-queso', name: 'Queso', desc: { es: 'La clásica de mozzarella', en: 'The mozzarella classic' }, prices: { '10"': 9, '16"': 18 } },
          { id: 'pz-pepperoni', name: 'Pepperoni', prices: { '10"': 10, '16"': 20 } },
          { id: 'pz-veggies', name: 'Veggies', desc: { es: 'Vegetales rostizados', en: 'Roasted vegetables' }, prices: { '10"': 12, '16"': 24 } },
          { id: 'pz-carbonara', name: 'Carbonara', desc: { es: 'Bacon y cebolla, salsa blanca', en: 'Bacon and onion, white sauce' }, prices: { '10"': 12, '16"': 24 } },
          { id: 'pz-meat', name: 'Meat Lover', prices: { '10"': 14, '16"': 28 } },
        ].map((p) => ({
          ...p,
          orderable: true,
          priceBy: 'tamano',
          options: [
            { key: 'tamano', label: { es: 'Tamaño', en: 'Size' }, choices: ['10"', '16"'] },
          ],
        })),
      },
    ],
  },
  {
    id: 'mexicano',
    station: { es: 'Mexicano', en: 'Mexican' },
    tagline: { es: 'Tacos, burritos, quesadillas, nachos y más', en: 'Tacos, burritos, quesadillas, nachos and more' },
    color: 'amber',
    sections: [
      {
        title: { es: 'Tacos', en: 'Tacos' },
        items: [
          { id: 'tc-tacos', name: 'Tacos', desc: { es: 'Carne, cerdo o pollo · salsa roja o verde', en: 'Beef, pork or chicken · red or green salsa' }, price: 8, orderable: true,
            options: [
              { key: 'proteina', label: { es: 'Proteína', en: 'Protein' }, choices: ['Carne', 'Cerdo', 'Pollo'] },
              { key: 'salsa', label: { es: 'Salsa', en: 'Salsa' }, choices: ['Roja', 'Verde'] },
            ] },
        ],
      },
      {
        title: { es: 'Burritos y quesadillas', en: 'Burritos & quesadillas' },
        items: [
          { id: 'bu-burrito', name: 'Burrito', desc: { es: 'Carne, cerdo o pollo', en: 'Beef, pork or chicken' }, price: 12, orderable: true,
            options: [{ key: 'proteina', label: { es: 'Proteína', en: 'Protein' }, choices: ['Carne', 'Cerdo', 'Pollo'] }] },
          { id: 'qs-quesadilla', name: 'Quesadilla', desc: { es: 'Carne, cerdo o pollo', en: 'Beef, pork or chicken' }, price: 12, orderable: true,
            options: [{ key: 'proteina', label: { es: 'Proteína', en: 'Protein' }, choices: ['Carne', 'Cerdo', 'Pollo'] }] },
        ],
      },
      {
        title: { es: 'Nachos, papas y burger', en: 'Nachos, potatoes & burger' },
        items: [
          { id: 'na-nachos', name: 'Nachos', desc: { es: 'Regular, o con carne, pollo o cerdo', en: 'Regular, or with beef, chicken or pork' }, orderable: true,
            options: [{ key: 'estilo', label: { es: 'Estilo', en: 'Style' }, choices: ['Regular', 'Carne', 'Pollo', 'Cerdo'] }],
            priceBy: 'estilo', prices: { 'Regular': 8, 'Carne': 12, 'Pollo': 12, 'Cerdo': 12 } },
          { id: 'lp-potato', name: 'Loaded Potato', desc: { es: 'Carne, cerdo o pollo', en: 'Beef, pork or chicken' }, orderable: true,
            options: [{ key: 'proteina', label: { es: 'Proteína', en: 'Protein' }, choices: ['Carne', 'Cerdo', 'Pollo'] }],
            priceBy: 'proteina', prices: { 'Carne': 11, 'Cerdo': 10, 'Pollo': 10 } },
          { id: 'mb-burger', name: 'Mex Burger', price: 12, orderable: true },
        ],
      },
      {
        title: { es: 'Para acompañar', en: 'On the side' },
        items: [
          { id: 'ap-guac', name: 'Guacamole', price: 6, orderable: true },
          { id: 'ap-pico', name: 'Pico de gallo', price: 3, orderable: true },
        ],
      },
    ],
  },
  {
    id: 'ensaladas',
    station: { es: 'Ensaladas', en: 'Salads' },
    tagline: { es: 'Frescas, con o sin pollo', en: 'Fresh, with or without chicken' },
    color: 'green',
    sections: [
      {
        title: { es: 'Ensaladas', en: 'Salads' },
        items: [
          { id: 'en-caesar', name: 'Caesar', desc: { es: 'Sola o con pollo', en: 'Plain or with chicken' }, orderable: true,
            options: [{ key: 'pollo', label: { es: 'Pollo', en: 'Chicken' }, choices: ['Sin pollo', 'Con pollo'] }],
            priceBy: 'pollo', prices: { 'Sin pollo': 10, 'Con pollo': 13 } },
          { id: 'en-chef', name: 'Chef Salad', desc: { es: 'Sola o con pollo', en: 'Plain or with chicken' }, orderable: true,
            options: [{ key: 'pollo', label: { es: 'Pollo', en: 'Chicken' }, choices: ['Sin pollo', 'Con pollo'] }],
            priceBy: 'pollo', prices: { 'Sin pollo': 11, 'Con pollo': 13 } },
        ],
      },
    ],
  },
  {
    id: 'postres',
    station: { es: 'Postres', en: 'Desserts' },
    tagline: { es: 'Para cerrar con algo dulce', en: 'Something sweet to finish' },
    color: 'red',
    sections: [
      {
        title: { es: 'Postres', en: 'Desserts' },
        items: [
          { id: 'po-flan', name: 'Flan de guava y queso', price: 6, orderable: true },
          { id: 'po-tres-leches', name: 'Tres leches', price: 7, orderable: true },
          { id: 'po-choco', name: 'Choco Fudge Cake', price: 8, orderable: true },
        ],
      },
    ],
  },
  {
    id: 'bebidas',
    station: { es: 'Bebidas', en: 'Drinks' },
    tagline: { es: 'Refrescos, jugos y agua', en: 'Sodas, juices and water' },
    color: 'cream',
    hideOnMenu: true,
    sections: [
      {
        title: { es: 'Bebidas', en: 'Drinks' },
        items: [
          { id: 'bb-refresco', name: 'Refresco en lata', price: null, orderable: true },
          { id: 'bb-jugo', name: 'Jugo embotellado', price: null, orderable: true },
          { id: 'bb-agua', name: 'Agua embotellada', price: null, orderable: true },
        ],
      },
    ],
  },
];
