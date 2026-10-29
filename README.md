# Tu Food Court — sitio web

Sitio estático (HTML/CSS/JS sin build) para **tufoodcourtpr.com**. Español por defecto, inglés con el botón EN.

## Páginas
| Ruta | Qué es |
|---|---|
| `/` | Home: hero, tres estaciones, menú por pestañas, delivery MMC, catering, visítanos |
| `/pedidos/` | **Destino del código QR.** Elige Delivery o Catering |
| `/delivery/` | Formulario de pedido: delivery (exclusivo empleados de Metro Medical Center) o recogido en el mostrador; para hoy o programado hasta 14 días |
| `/catering/` | Formulario de cotización de catering |
| `/qr/` | Afiche carta + tarjetas de mostrador 4-up listos para imprimir (noindex) |
| `/privacidad/` | Política de privacidad |

## Dónde se edita cada cosa
- **Teléfono, email, horario (`schedule`), redes, última llamada / duración de ventanas / días de anticipación, métodos de pago, recogido solo-empleados sí/no, horas mínimas de anticipación para catering (48, sin mínimo de personas)** → `assets/js/config.js`. Las ventanas de hora y las líneas de horario del sitio se generan solas a partir de `schedule` (hoy: L–V 6:00 AM–2:00 PM, sáb. 8:00 AM–1:00 PM, dom. cerrado; última llamada 30 min antes de cerrar = 1:30 PM / 12:30 PM). El afiche de `/qr/` también lee horario, última llamada y métodos de pago de aquí..
- **Menú y precios** → `assets/js/menu.js` (fuente: `MENU CON PRECIOS BAYAMON.xlsx`, precios sin IVU; `price` fijo o `priceBy` + `prices` cuando depende de una opción, p. ej. tamaño de pizza; `price: null` = «precio en mostrador», no suma al subtotal). El recargo del 3.8% y el redondeo hacia arriba a .99 se controlan con `priceAdjustPercent` / `priceRounding` en `config.js`; el sitio calcula el precio final a partir del precio de la hoja.
- **Textos en inglés** → `assets/js/i18n.js` (los textos en español viven en cada HTML)
- **Colores y tipografía** → `assets/css/site.css` (verde `#004F39`, rojo-naranja `#DB461C`, ámbar `#F59924`, muestreados del logo oficial)
- **Logos** → `assets/img/` (copiados de los assets de marca)
- **QR** → `assets/img/qr/`. El que se imprime es `qr-pedidos.*` → `https://tufoodcourtpr.com/pedidos/?src=qr` (los pedidos llegan marcados `Origen: qr`). `qr-delivery.*` y `qr-catering.*` apuntan directo a cada formulario por si algún día quieres un QR distinto en el mostrador y en los pisos; hoy no se usan en el sitio.

## Cómo llegan los pedidos
Los dos formularios envían por AJAX a **FormSubmit** (`https://formsubmit.co/ajax/<formEmail>`), que reenvía todo al buzón configurado en `config.js` y manda una copia automática al cliente.

**Activación (una sola vez):** la primera vez que se envíe un formulario, FormSubmit manda un email de activación a `formEmail`; hay que hacer clic en ese enlace o los mensajes no llegan. Hazlo tú mismo con un pedido de prueba una vez el buzón exista.

Cada solicitud trae un número de referencia (`TFC-D-aammdd-XXXX` delivery, `TFC-R-…` recogido, `TFC-C-…` catering), modalidad, nombre, teléfono, email, canal preferido de confirmación, número de empleado y departamento (solo delivery), lugar/fecha/ventana, cada línea del pedido como fila (`Pedido 1`, `Pedido 2`…), método de pago (ATH Móvil, tarjeta de crédito o efectivo), notas, idioma y origen (`qr` o `web`). El cliente recibe una copia automática con el resumen de su pedido.

**Delivery vs. recogido:** el delivery es solo para empleados de MMC (pide número de empleado, departamento y la confirmación con ID). El recogido en el mostrador está abierto a todo el mundo; si prefieres que también sea solo para empleados, pon `pickupEmployeesOnly: true` en `config.js`.

## Publicar (GitHub Pages, $0)
1. Repo: `https://github.com/hospicount/tufoodcourt-website` (rama `main`). Para publicar cambios: `git add -A && git commit -m "..." && git push`.
2. Settings → Pages → Deploy from branch `main` / root. El archivo `CNAME` ya apunta a `tufoodcourtpr.com`.
3. En Squarespace DNS: **borrar primero los registros A / CNAME por defecto de Squarespace** (si quedan, Pages falla de forma intermitente y no emite el certificado), luego añadir registros `A` del apex a `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` y `CNAME www → hospicount.github.io`. Activar "Enforce HTTPS" en Pages cuando valide el certificado (puede tardar hasta 24 h).

## Caché
Los `<script>`/`<link>` llevan `?v=20261029e`. Cuando cambies `config.js`, `menu.js`, `i18n.js` o el CSS, sube ese número en los 7 HTML (buscar y reemplazar) para que los teléfonos que ya visitaron el sitio reciban la versión nueva de inmediato.

## Vista previa local
```bash
python3 -m http.server 4323 --bind 127.0.0.1
```
y abrir http://127.0.0.1:4323/

## Regenerar los QR
Mismos parámetros con los que se generaron los archivos actuales (verde de marca, corrección de error H):
```bash
python3 -c "
import segno
for n,p in [('pedidos','/pedidos/?src=qr'),('delivery','/delivery/?src=qr'),('catering','/catering/?src=qr')]:
    q=segno.make('https://tufoodcourtpr.com'+p, error='h')
    q.save(f'assets/img/qr/qr-{n}.svg', scale=10, border=2, dark='#004F39', light='#FFFFFF')
    q.save(f'assets/img/qr/qr-{n}.png', scale=24, border=2, dark='#004F39', light='#FFFFFF')
"
```

## Menú criollo del día (Google Sheet)

La pestaña **Criollo** del menú y el formulario de pedidos muestran «Hoy en la línea criolla» leyendo una hoja de Google que mantiene el dueño: **«Menú criollo — Tu Food Court»** en el Drive de admin@tufoodcourtpr.com (ID en `criolloSheetId`, `assets/js/config.js`). Plantilla por si hay que recrearla: `tools/menu-criollo-plantilla.xlsx` (pestaña «Menú» + pestaña «Instrucciones»); al subirla a Drive hay que abrirla y usar Archivo → Guardar como hoja de cálculo de Google (un .xlsx sin convertir no lo puede leer el sitio).

- **Una fila por día.** En la columna «Día»:
  - `Lunes` … `Sábado` (solo el nombre) = rotación fija, se repite cada semana. **Cada nombre de día una sola vez**; si hay dos filas «Lunes», se usa la de más abajo.
  - Una fecha (`2026-11-09`, o con el día delante: `Lunes 2026-11-09`, `Lunes 9`, `Lunes 9 de noviembre`) = **solo ese día**. Así se prepara toda una semana o un mes por adelantado: una fila por fecha. La fecha manda sobre la rotación; las fechas pasadas se pueden borrar o dejar.
  - `Hoy` = fila de respaldo: solo se usa cuando no hay fila para ese día (sirve para una hoja de una sola fila que se sobrescribe a diario). Para un especial de hoy, usa la fecha de hoy.
  - Escribe las fechas como `2026-11-09` (año-mes-día); `11/9/2026` también vale. La columna está en formato de texto a propósito.
  - Domingo (cerrado según `schedule`): solo se muestra una fila con fecha explícita.
- El sitio escoge la fila en hora de Puerto Rico al mostrar la página (no al cargar la hoja), y en el formulario de pedidos muestra la fila **de la fecha que el cliente escogió** para su pedido.
- Las demás columnas son libres (el título de la columna es la etiqueta; vacío = no se muestra; se pueden renombrar o añadir). Sin precios: el plato sigue siendo Regular / Combo según `menu.js`. La fila de títulos (Día, Arroz…) tiene que existir; una fila de título encima se ignora si la fila «Día» sigue ahí.
- **Privacidad / seguridad**: el ID de la hoja es público (va en `config.js`), así que **todas las pestañas de ese archivo son públicas**. Usa una hoja dedicada SOLO al menú; nunca guardes costos, suplidores ni datos de empleados ahí. Comparte como **Lector**, nunca como Editor.
- **Conexión**: la hoja se comparte como «Cualquier persona con el enlace → Lector». El sitio la lee directo de `docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&headers=1` (primera pestaña; `criolloSheetTab` para otra). Sin hoja o sin acceso, el sitio simplemente no muestra el bloque y deja un aviso en la consola.
- **Comprobar la conexión** (en una ventana de incógnito): abre `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&headers=1`. Debe bajar un CSV cuya primera línea son los títulos (Día, Arroz, Guiso…). Si aparece la pantalla de inicio de sesión de Google, la hoja no está compartida con el enlace.
- Vista previa sin hoja: en la consola del navegador, `TFC.criollo.applyCSV('Día,Arroz,Guiso\nHoy,Arroz con gandules,Habichuelas')`.

