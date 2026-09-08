# Encuesta USIL 2027 — "¿Qué te gustaría aprender en 2027?"

Landing page de encuesta anónima, 100% estática (HTML + CSS + JavaScript
vanilla, sin frameworks ni build step), con preguntas en serie tipo
Typeform: una pregunta por pantalla, barra de progreso, navegación con
"Atrás" / "Siguiente" y lógica condicional (skip logic) para las
preguntas que dependen de respuestas anteriores.

## Estructura del proyecto

```
encuesta-usil-2027/
├── index.html          # Estructura de la página + carga de estilos y scripts
├── css/
│   └── styles.css       # Todos los estilos (tokens, layout, componentes, responsive)
├── js/
│   ├── questions.js      # Modelo de datos: portada, secciones, preguntas, opciones y condiciones
│   └── app.js             # Motor: navegación, render, validación, ranking, envío
├── apps-script/
│   └── Code.gs           # Script de Google Apps Script (recibe respuestas y las guarda en Sheets)
└── assets/
    ├── favicon.ico
    ├── favicon-16.png / favicon-32.png / favicon-192.png
    └── apple-touch-icon.png
```

Todas las rutas son relativas (`css/styles.css`, `js/app.js`, etc.), por
lo que el proyecto funciona igual en la raíz de un repositorio
(`usuario.github.io`) como en un subdirectorio de proyecto
(`usuario.github.io/nombre-repo/`).

## Cómo desplegar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser público o privado si
   tienes GitHub Pro/Team/Enterprise).
2. Sube el contenido de esta carpeta a la raíz del repositorio
   (`index.html` debe quedar en la raíz, no dentro de una subcarpeta).
3. En GitHub, ve a **Settings → Pages**.
4. En "Build and deployment", selecciona **Deploy from a branch**,
   elige la rama `main` (o `master`) y la carpeta `/ (root)`.
5. Guarda. GitHub te dará una URL del tipo
   `https://tu-usuario.github.io/nombre-repo/` en uno o dos minutos.

No se requiere ningún paso de build (`npm install`, bundlers, etc.):
GitHub Pages sirve los archivos tal como están.

## Cómo probarlo en local

No necesitas un servidor especial, pero abrir `index.html` con
doble clic (protocolo `file://`) puede tener restricciones del
navegador con `fetch`/módulos. Lo más simple:

```bash
cd encuesta-usil-2027
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Cómo funciona la lógica condicional

Todo el modelo de preguntas vive en `js/questions.js`. Cada pregunta
condicional tiene una función `condition(answers)` que decide si debe
mostrarse, por ejemplo:

```js
{
  id: "p4a",
  // ...
  condition: (answers) => answers.p4 === "fuera-peru"
}
```

`js/app.js` recalcula en cada paso el "camino real" de pantallas según
las respuestas dadas hasta ese momento (`getOrderedScreens`), por lo que
la barra de progreso y los botones "Atrás"/"Siguiente" siempre navegan
solo por las preguntas que corresponden — nunca se muestra una pregunta
que no aplica.

## Conectar con Google Sheets (Apps Script)

La encuesta ya está lista para enviar cada respuesta a una hoja de
Google Sheets — solo falta que despliegues tu propia copia del script
y pegues la URL en un lugar del código.

### 1. Crea la planilla

Crea una hoja de cálculo nueva en Google Sheets (por ejemplo
"Encuesta USIL 2027 — Respuestas"). No hace falta crear ninguna hoja
ni columna manualmente — el script las crea solo.

### 2. Pega el script

En la planilla: **Extensiones → Apps Script**. Se abre un editor con
un archivo `Código.gs` vacío (o con una plantilla). Borra todo su
contenido y pega el de **`apps-script/Code.gs`** (incluido en este
proyecto). Guarda el proyecto (ícono de guardar o `Ctrl/Cmd+S`) — el
nombre del proyecto no importa.

### 3. Despliega como Web App

1. Arriba a la derecha, botón **Deploy → New deployment** (Implementar
   → Nueva implementación).
2. Junto a "Select type", el ícono de engranaje → **Web app**.
3. Configuración:
   - **Execute as:** *Me* (tu cuenta)
   - **Who has access:** **Anyone** (Cualquier usuario) — esto es
     obligatorio: la encuesta es anónima y el envío llega desde un
     sitio estático sin sesión de Google, así que no puede ser "Anyone
     with Google account".
4. **Deploy**. La primera vez Google te va a pedir autorizar el
   script — como es tuyo, elige tu cuenta, y si aparece una pantalla
   de advertencia ("Google hasn't verified this app"), es normal para
   scripts propios: **Advanced → Go to [nombre del proyecto] (unsafe)**
   → **Allow**.
5. Copia la **URL del Web App** que te muestra al final (termina en
   `/exec`).

Cada vez que edites el script más adelante, tienes que volver a
**Deploy → Manage deployments → editar (lápiz) → New version → Deploy**
para que los cambios se reflejen en esa misma URL.

### 4. Conecta la encuesta

Abre `js/app.js`, busca la constante `GOOGLE_SHEETS_ENDPOINT` (cerca
del final del archivo, sección "PUNTO DE INTEGRACIÓN") y pega tu URL:

```js
const GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycb.../exec";
```

Vuelve a desplegar la encuesta en GitHub Pages (o solo sube este
archivo actualizado) y listo — cada respuesta completa va a aparecer
como una fila nueva en la hoja **"Respuestas"**.

### 5. Probar que funciona

Completa la encuesta una vez desde el sitio publicado y revisa la
planilla — debería aparecer una fila nueva en unos segundos. Si no
aparece nada:

- Confirma que la URL termina en `/exec` (no en `/dev`).
- Confirma que "Who has access" quedó en **Anyone**.
- Abre la consola del navegador (F12) al enviar la encuesta — un
  error de red ahí (no de CORS, esos se evitan a propósito) suele
  significar que la URL está mal copiada.

### Cómo funciona por dentro

- `submitSurvey()` en `js/app.js` arma un objeto plano a partir de las
  respuestas, usando como encabezado de columna el `sheetLabel` de
  cada pregunta (definido junto a ella en `js/questions.js`) — por
  eso las columnas de la hoja salen legibles ("Modalidad preferida
  (1ª; 2ª)") en vez de los ids internos ("p3"). Las preguntas de
  selección múltiple y de ranking se unen con `"; "` — en las de
  ranking, el orden del texto respeta el orden de preferencia: el
  primer valor es la 1ª preferencia.
- Ese objeto se envía por `fetch` con `mode: "no-cors"` y
  `Content-Type: text/plain`. Esa combinación evita el preflight de
  CORS que Apps Script no responde bien; el script igual lee y
  parsea el JSON del body sin problema.
- Como la respuesta llega "opaca" (no se puede leer su contenido ni
  status con `no-cors`), el envío es *fire-and-forget*: nunca bloquea
  ni condiciona que se muestre la pantalla de agradecimiento.
- El script (`apps-script/Code.gs`) crea la hoja "Respuestas" si no
  existe, y agrega columnas nuevas automáticamente la primera vez que
  aparece un encabezado que no tenía — si más adelante agregas o
  quitas preguntas en `js/questions.js`, no hace falta tocar el
  script.
- Sigue guardándose además una copia en `localStorage` del navegador
  de cada persona, independiente de si el envío a Sheets funcionó o
  no — es solo un respaldo local, no reemplaza la planilla.

### Si quieres cambiar el texto de alguna columna

El nombre de cada columna sale del campo `sheetLabel` de esa pregunta
en `js/questions.js` (para las preguntas de texto libre como país,
ciudad o distrito, está dentro de su `fields`). Para renombrar una
columna, edita ese texto — no hace falta tocar `apps-script/Code.gs`
ni `app.js`.

Ojo: como las columnas se identifican por el texto exacto del
encabezado, si renombras un `sheetLabel` **después** de haber recibido
respuestas, la hoja va a crear una columna nueva con el nombre nuevo
en vez de renombrar la existente (las respuestas viejas quedan en la
columna anterior). Para evitarlo, renombra también el encabezado ya
existente directamente en la hoja de cálculo, a mano, antes de que
lleguen más respuestas con el nombre nuevo.


No es necesario tocar ninguna otra parte del código: el resto de la
encuesta (preguntas, validación, navegación, diseño) es independiente
de cómo se envíen finalmente los datos.

## Notas de accesibilidad y anonimato

- No se solicita nombre, correo, DNI ni ningún identificador personal
  en ninguna pregunta.
- Los botones de opción son elementos `<button>` reales (navegables
  con teclado, con foco visible).
- Se respeta `prefers-reduced-motion` para personas que desactivan
  animaciones en su sistema.
- El diseño es responsive: una columna y objetivos táctiles grandes en
  mobile, grillas de 2–3 columnas en pantallas más anchas.

