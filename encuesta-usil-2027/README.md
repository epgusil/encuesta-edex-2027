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
└── assets/
    └── favicon.svg
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

## Dónde conectar un backend real

La encuesta funciona completamente sin backend: al llegar a la pantalla
final, la función `submitSurvey(answers)` en `js/app.js` guarda la
respuesta en `localStorage` del navegador (solo como respaldo local,
para que el flujo nunca se bloquee).

Para enviar las respuestas a un backend real, edita **solo** esa
función. Está señalada con comentarios `TODO` y trae dos ejemplos
listos para adaptar:

- **A) Endpoint propio / Formspree / Airtable / API REST** — un
  `fetch()` con `POST` y el JSON de respuestas.
- **B) Google Apps Script publicado como Web App** — para escribir
  directamente en una hoja de Google Sheets.

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
