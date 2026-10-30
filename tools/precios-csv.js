#!/usr/bin/osascript -l JavaScript
// Genera el CSV de la pestaña «Precios» (hoja de Google del dueño) a partir de assets/js/menu.js y config.js:
// una fila por plato, o por opción cuando el precio depende de ella. Columnas: Código, Estación, Plato, Opción,
// Precio base, Precio en el sitio (fórmula que aplica la regla de config.js), Disponible.
// Uso (macOS, desde la raíz del repo):  osascript -l JavaScript tools/precios-csv.js [salida.csv]
// En Google Sheets: Archivo → Importar → Subir → «Insertar hojas nuevas» (la pestaña toma el nombre del archivo).
ObjC.import('Foundation');
var window = {}; // global on purpose: JXA evaluates eval() code in the global scope
function read(p) { return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError($(p), $.NSUTF8StringEncoding, null)); }
function run(argv) {
  const cwd = ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
  const out = argv[0] || 'Precios.csv';
  eval(read(cwd + '/assets/js/config.js'));
  eval(read(cwd + '/assets/js/menu.js'));
  const C = window.TFC_CONFIG, pct = C.priceAdjustPercent || 0, k = 1 + pct / 100;
  const rows = [['Código', 'Estación', 'Plato', 'Opción', 'Precio base', 'Precio en el sitio', 'Disponible']];
  // Informational preview of what the site shows: same as adjust() in site.js; 0 = «mostrador» (counter price).
  const formula = (r) => `=IF(ISNUMBER(E${r}),IF(E${r}=0,"mostrador",${C.priceRounding === 'up99' ? `CEILING(E${r}*${k}-0.99-0.000000001,1)+0.99` : `ROUND(E${r}*${k},2)`}),"")`;
  window.TFC_MENU.forEach((s) => s.sections.forEach((sec) => (sec.items || []).forEach((it) => {
    const name = typeof it.name === 'string' ? it.name : it.name.es;
    const line = (opt, price) => rows.push([it.id, s.station.es, name, opt, price == null ? 0 : price, formula(rows.length + 1), '']); // null price (drinks) → 0 = mostrador
    if (it.priceBy) Object.keys(it.prices).forEach((o) => line(o, it.prices[o]));
    else line('', it.price);
  })));
  const q = (v) => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csv = rows.map((r) => r.map(q).join(',')).join('\n') + '\n';
  $(csv).writeToFileAtomicallyEncodingError($(out), true, $.NSUTF8StringEncoding, null);
  return (rows.length - 1) + ' filas → ' + out;
}
