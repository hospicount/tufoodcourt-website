// Tu Food Court — menu data. Source: "MENU CON PRECIOS BAYAMON.xlsx" (2026-10-28).
// Prices are in USD before IVU. `price` is a flat price; `priceBy` + `prices` make the price depend on one option
// (e.g. pizza size). `price: null` = not priced yet (shown as "precio en mostrador", excluded from the subtotal).
// `exact: true` = show the price exactly as written, skipping the +% / round-up-to-.99 rule (drinks).
// An option with `hidden: true` has no select: its first choice is picked automatically and it is left out of order texts;
// when it is also the `priceBy` option the price shows without the option name (the criollo plate while the Combo is off).
// `orderable` items appear in the delivery/pickup picker. `options` render as required selects on each cart line.
// An option with `when: { key, is }` only shows (and is only required) while the option `key` of the same line is `is`; otherwise it is
// left blank and out of the order texts (the drink that comes with the 10" pizza).
// `includes` = what comes with a dish, as { es, en } names (owner, 2026-11-24): the dish gets a required «Preparación» select
// (see withIncludes below): «Con todo», or «Quitar algo», which shows a checkbox per included item to leave out. The order email says
// «con todo» or «sin guacamole, sin sour cream». Leaving something out does not change the price.
// Listed under Desayuno and Postres. It is one shared object, so a price or «Disponible» change in the sheet applies to both.
const TFC_FRUTAS = { id: 'de-frutas', name: 'Ensalada de frutas', price: 7, orderable: true };

// Drinks (owner list, 2026-11-11). They are sold in the «Bebidas» station AND are the choices of the «Bebida» select of the
// criollo plate (`choicesFrom: 'bebidas'`): prices.js rebuilds that select from the drinks still available, so «Disponible = No»
// on a drink's row of the «Precios» tab removes it from both places.
// Prices (owner, 2026-11-11): every drink $1.50 except the water, $1.00. `exact: true` = the price is shown as typed, WITHOUT the
// +3.8% / round-up-to-.99 rule (site.js adjust()), because that rule would turn $1.50 into $1.99. In the «Precios» tab the
// «Precio base» of a drink is therefore its final price. The water has its own new id (not the old `bb-agua`) on purpose: the sheet
// still has an old `bb-agua` row set to 0 (= counter price) that would otherwise override this price.
const TFC_BEBIDAS = [
  { id: 'bb-coca', name: 'Coca-Cola', price: 1.5 },
  { id: 'bb-coca-zero', name: 'Coca-Cola Zero', price: 1.5 },
  { id: 'bb-kola', name: 'Kola Champagne', price: 1.5 },
  { id: 'bb-agua-botella', name: 'Agua', price: 1 },
  { id: 'bb-malta', name: 'Malta India Light', price: 1.5 },
  { id: 'bb-welchs-fresa-kiwi', name: "Welch's Strawberry Kiwi", price: 1.5 },
  { id: 'bb-welchs-manzana', name: "Welch's Apple Juice", price: 1.5 },
].map((b) => ({ ...b, exact: true, orderable: true }));

// The drink that comes with a dish (owner, 2026-11-24: the criollo plate, the 10" pizza and the tacos «include a drink of preference»).
// A required select with the names of the drinks still available (`choicesFrom: 'bebidas'`, rebuilt by prices.js from the «Precios» tab).
// No «Sin bebida» choice (owner, 2026-11-24: the drink is always chosen). `when` = only for some choices of another option (the 10" pizza).
const bebidaIncluida = (when) => ({ key: 'bebida', label: { es: 'Bebida', en: 'Drink' }, choices: TFC_BEBIDAS.map((b) => b.name), choicesFrom: 'bebidas', ...(when ? { when } : {}) });

// «Con todo» / «Quitar algo» (owner, 2026-11-24: «customers get to select if they want with everything or if they want without
// something»; they chose a required «Con todo / Quitar algo» select over pre-checked boxes). forms.js reads `sin: true`: the FIRST
// choice means everything, the SECOND shows a checkbox per item of `includes` to leave out (at least one must be checked).
// Keep the choices in this order; the English display names are in i18n.js (TFC_EN_VALUES).
function withIncludes(item, includes) {
  return { ...item, includes, options: [...(item.options || []), { key: 'prep', label: { es: 'Preparación', en: 'Preparation' }, choices: ['Con todo', 'Quitar algo'], sin: true }] };
}

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
          TFC_FRUTAS,
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
          { id: 'cr-plato', name: 'Plato criollo del día', desc: { es: 'Arroz, guiso, proteína del día y bebida a tu elección', en: 'Rice, stew, protein of the day and a drink of your choice' }, orderable: true,
            options: [
              // «Opción» (Regular / Combo) is OFF for now (owner, 2026-11-11: "Eliminate the Opción for now"). The plate has a single price,
              // so this option is `hidden`: no select is shown and 'Regular' is chosen automatically (the sheet row «cr-plato / Regular»
              // still sets the price). To bring the Combo back: choices ['Regular', 'Combo'], prices { 'Regular': 11.99, 'Combo': 14.99 }
              // and delete `hidden: true`.
              { key: 'tipo', label: { es: 'Opción', en: 'Option' }, choices: ['Regular'], hidden: true },
              // The drink comes with the plate (2026-11-11). Same names as the «Bebidas» station; see TFC_BEBIDAS.
              bebidaIncluida(),
            ],
            priceBy: 'tipo', prices: { 'Regular': 11.99 },
            notePh: { es: 'Ej.: arroz con gandules, habichuelas, pollo', en: 'E.g.: rice with pigeon peas, beans, chicken' } },
          // Added 2026-11-11 (owner: "the soup of the day for $5.99"). Base 5 → $5.99 with the site rule. Which soup it is comes from the
          // «Sopa del Dia» column of the «Menú» tab (shown in the "Hoy en la línea criolla" card), so no option select here.
          { id: 'cr-sopa', name: 'Sopa del día', desc: { es: 'La sopa que esté en la línea ese día', en: 'Whichever soup is on the line that day' }, price: 5, orderable: true },
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
    tagline: { es: '10" personal (con bebida) o 16" grande', en: '10" personal (with a drink) or 16" large' },
    color: 'red',
    sections: [
      {
        title: { es: 'Las pizzas', en: 'The pizzas' },
        note: { es: 'Precios 10" / 16". La de 10" incluye una bebida a tu elección.', en: 'Prices 10" / 16". The 10" comes with a drink of your choice.' },
        // Shown above these dishes on the order page (the home menu shows `note`).
        pickNote: { es: 'La pizza de 10" incluye una bebida a tu elección.', en: 'The 10" pizza comes with a drink of your choice.' },
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
            // Owner, 2026-11-24: «the 10" includes a drink of preference» (the 16" does not). Price unchanged.
            bebidaIncluida({ key: 'tamano', is: '10"' }),
          ],
        })),
      },
    ],
  },
  {
    id: 'mexicano',
    station: { es: 'Mexicano', en: 'Mexican' },
    tagline: { es: 'Tacos y nachos; el resto de la carta, muy pronto', en: 'Tacos and nachos; the rest of the menu, coming soon' },
    color: 'amber',
    sections: [
      {
        title: { es: 'Tacos', en: 'Tacos' },
        items: [
          // Owner, 2026-11-24: «3 tacos per order. Includes a side of nachos with melted cheese, drink of choice, guacamole, sour cream,
          // and pico de gallo». The price is the «Precios» row (tc-tacos).
          withIncludes({ id: 'tc-tacos', name: 'Tacos',
            desc: { es: '3 tacos por orden (carne, cerdo o pollo; salsa roja o verde). Incluye nachos con queso derretido, guacamole, sour cream, pico de gallo y bebida a tu elección.',
              en: '3 tacos per order (beef, pork or chicken; red or green salsa). Includes nachos with melted cheese, guacamole, sour cream, pico de gallo and a drink of your choice.' },
            price: 8, orderable: true,
            options: [
              { key: 'proteina', label: { es: 'Proteína', en: 'Protein' }, choices: ['Carne', 'Cerdo', 'Pollo'] },
              { key: 'salsa', label: { es: 'Salsa', en: 'Salsa' }, choices: ['Roja', 'Verde'] },
              bebidaIncluida(),
            ] }, [
            { es: 'Nachos con queso derretido', en: 'Nachos with melted cheese' },
            { es: 'Guacamole', en: 'Guacamole' },
            { es: 'Sour cream', en: 'Sour cream' },
            { es: 'Pico de gallo', en: 'Pico de gallo' },
          ]),
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
          // Owner, 2026-11-24: «All proteins are available. Includes Melted Cheese, Pico de Gallo, Guacamole, Sour Cream» → Carne, Pollo and
          // Carnitas (owner's pick; the old «Cerdo» choice is gone, Carnitas is the pork) at $12.99 (base 12). «Regular» (no protein, $8.99)
          // stays hidden by its «No» row in the «Precios» tab. The key stays 'estilo' so carts saved before keep their choice.
          withIncludes({ id: 'na-nachos', name: 'Nachos', orderable: true,
            desc: { es: 'Incluye queso derretido, pico de gallo, guacamole y sour cream.', en: 'Includes melted cheese, pico de gallo, guacamole and sour cream.' },
            options: [{ key: 'estilo', label: { es: 'Proteína', en: 'Protein' }, choices: ['Regular', 'Carne', 'Pollo', 'Carnitas'] }],
            priceBy: 'estilo', prices: { 'Regular': 8, 'Carne': 12, 'Pollo': 12, 'Carnitas': 12 } }, [
            { es: 'Queso derretido', en: 'Melted cheese' },
            { es: 'Pico de gallo', en: 'Pico de gallo' },
            { es: 'Guacamole', en: 'Guacamole' },
            { es: 'Sour cream', en: 'Sour cream' },
          ]),
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
          { id: 'ap-cielito', name: 'Cielito Lindo con chips', price: 6, orderable: true }, // added 2026-11-04; owner 2026-11-11: $6.99 (base 6 with the site rule); the «Precios» row has Precio base blank, so this value applies
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
          TFC_FRUTAS,
          { id: 'po-flan', name: 'Flan de guava y queso', price: 6, orderable: true },
          { id: 'po-tres-leches', name: 'Tres leches', price: 7, orderable: true },
          { id: 'po-choco', name: 'Choco Fudge Cake', price: 8, orderable: true },
          { id: 'po-carrot', name: 'Carrot Cake', price: 8, orderable: true }, // added 2026-11-11 (owner: $8.99, base 8 with the site rule)
        ],
      },
    ],
  },
  {
    id: 'bebidas',
    station: { es: 'Bebidas', en: 'Drinks' },
    tagline: { es: 'Refrescos, jugos y agua', en: 'Sodas, juices and water' },
    color: 'cream',
    sections: [
      {
        title: { es: 'Bebidas', en: 'Drinks' },
        note: { es: 'El plato criollo, la pizza de 10" y los tacos incluyen bebida: se escoge en las opciones del plato. Aquí puedes añadir una adicional.', en: 'The criollo plate, the 10" pizza and the tacos come with a drink, chosen in the dish\'s options. Add an extra one here.' },
        items: TFC_BEBIDAS,
      },
    ],
  },
];
