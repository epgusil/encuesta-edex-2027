/**
 * questions.js
 * ------------------------------------------------------------------
 * Modelo de datos de la encuesta "¿Qué te gustaría aprender en 2027?"
 * (USIL | Educación Ejecutiva).
 *
 * Este archivo NO contiene lógica de render ni de navegación —
 * eso vive en app.js. Aquí solo se define:
 *   - COVER: contenido de la portada
 *   - SECTIONS: metadatos de cada bloque temático (etiqueta + icono)
 *   - QUESTIONS: arreglo ordenado de preguntas, cada una con su tipo,
 *     opciones y una función `condition(answers)` opcional que decide
 *     si la pregunta debe mostrarse (skip logic).
 *   - FINAL: contenido de la pantalla de agradecimiento.
 *
 * Convenciones:
 *   - Cada opción tiene { value, label } — `value` es el slug que se
 *     guarda en las respuestas; `label` es el texto exacto mostrado.
 *   - `condition(answers)` se evalúa SIEMPRE contra las respuestas ya
 *     dadas hasta el momento. Si depende de una pregunta que aún no
 *     se contesta, debe devolver `false` (así la pregunta condicional
 *     aparece recién cuando se sabe que corresponde).
 *   - Los ids de cada pregunta (p1, p2, p3...) son identificadores
 *     internos arbitrarios — NO reflejan el orden de aparición en la
 *     encuesta (ese orden lo define únicamente la posición de cada
 *     objeto dentro del arreglo QUESTIONS). Se mantienen sin
 *     renumerar entre reordenamientos para no romper las condiciones
 *     que los referencian (answers.p3, answers.p4b_ciudad, etc.).
 *   - El indicador "Escoge N opciones" / "Ordena tus N preferencias"
 *     y, en las preguntas de ranking, la explicación de cómo funciona
 *     el ranking, se generan dinámicamente en app.js a partir de
 *     type/min/max/rankCount — no se escriben a mano aquí.
 * ------------------------------------------------------------------
 */

/* ============================== PORTADA ============================== */

const COVER = {
  eyebrow: "USIL | EDUCACIÓN EJECUTIVA | ENCUESTA 2027",
  title: "¿Qué te gustaría aprender en 2027?",
  subtitle: "Tu experiencia nos ayudará a diseñar la próxima oferta de Educación Ejecutiva USIL",
  description:
    "Queremos conocer tus prioridades de actualización y especialización profesional, " +
    "así como tus preferencias de modalidad, duración y horarios. Tus respuestas nos " +
    "permitirán desarrollar una oferta académica relevante y alineada con las nuevas " +
    "demandas del entorno laboral.",
  legal:
    "Completar la encuesta toma aproximadamente 6 a 8 minutos. Los resultados " +
    "se analizarán de forma agrupada para orientar la planificación académica. " +
    "Responder no implica un compromiso de matrícula.",
  cta: "Comenzar encuesta"
};

/* ============================== SECCIONES ============================== */

const SECTIONS = {
  experiencia:        { icon: "🎓", label: "Tu experiencia con Educación Ejecutiva USIL" },
  perfil:              { icon: "💼", label: "Tu perfil profesional" },
  sector:              { icon: "🏢", label: "Tu sector de trabajo" },
  intereses:           { icon: "🎯", label: "Tus intereses de capacitación" },
  modalidad:           { icon: "🕒", label: "Cómo te gustaría capacitarte" },
  ubicacion:           { icon: "📍", label: "Desde dónde participarías" },
  ubicacionDuracion:   { icon: "🧭", label: "Ubicación y duración" },
  horarios:            { icon: "📅", label: "Días y horarios" },
  dificultades:        { icon: "🧩", label: "Qué podría dificultar tu capacitación" }
};

/* ============================== HELPERS ============================== */

// Compara texto libre ignorando mayúsculas/acentos, para condiciones
// que dependen de campos de texto (ej. P4C depende de la ciudad en P4B).
function normalizeText(str) {
  return (str || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function textIncludesAny(str, needles) {
  const n = normalizeText(str);
  return needles.some((needle) => n.includes(needle));
}

// P3 (modalidad) se responde como ranking (array ordenado de values).
// Estas condiciones solo necesitan saber si un value está EN el
// ranking, sin importar la posición (1ª o 2ª preferencia cuentan igual).
function p3Includes(answers, values) {
  const ranking = answers.p3;
  if (!Array.isArray(ranking) || ranking.length === 0) return false;
  return values.some((v) => ranking.includes(v));
}

function p6Includes(answers, values) {
  const days = answers.p6;
  if (!Array.isArray(days) || days.length === 0) return false;
  return values.some((v) => days.includes(v));
}

const WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes"];
const WEEKEND = ["sabado", "domingo"];
const MODALIDADES_CON_HORARIO = ["virtual-vivo", "presencial", "semipresencial"];
const MODALIDADES_PRESENCIALES = ["presencial", "semipresencial"];

/* ============================== PREGUNTAS ============================== */

const QUESTIONS = [

  /* ---------- Sección: Tu experiencia con Educación Ejecutiva USIL ---------- */

  {
    id: "p9",
    section: SECTIONS.experiencia,
    sheetLabel: "Experiencia con Educación Ejecutiva USIL",
    prompt: "¿Cuál de las siguientes opciones describe tu experiencia más reciente como alumno de Educación Ejecutiva USIL?",
    help: "Si estudiaste en varios años, considera el más reciente. Si actualmente eres alumno, marca la primera alternativa.",
    type: "single",
    renderStyle: "list",
    options: [
      { value: "actual-alumno", label: "Actualmente soy alumno de Educación Ejecutiva USIL" },
      { value: "alumno-2026", label: "Fui alumno de Educación Ejecutiva USIL en 2026" },
      { value: "alumno-2025", label: "Fui alumno de Educación Ejecutiva USIL en 2025" },
      { value: "alumno-2024-antes", label: "Fui alumno de Educación Ejecutiva USIL en 2024 o antes" },
      { value: "no-alumno", label: "No he sido alumno de Educación Ejecutiva USIL" },
      { value: "no-recuerda-anio", label: "No recuerdo el año en que fui alumno" }
    ]
  },

  /* ---------- Sección: Tu perfil profesional ---------- */

  {
    id: "p10",
    section: SECTIONS.perfil,
    sheetLabel: "Área o función profesional",
    prompt: "¿En qué área o función te desempeñas principalmente?",
    help: "Selecciona la opción que mejor describa el trabajo que realizas, independientemente del sector de tu organización. Si actualmente no trabajas, considera tu experiencia laboral más reciente.",
    type: "single",
    renderStyle: "grid",
    options: [
      { value: "administracion-direccion-general", label: "Administración y dirección general" },
      { value: "finanzas-contabilidad-presupuesto", label: "Finanzas, contabilidad y presupuesto" },
      { value: "marketing-comunicacion", label: "Marketing y comunicación" },
      { value: "ventas-gestion-comercial", label: "Ventas y gestión comercial" },
      { value: "rrhh-gestion-personas", label: "Recursos humanos y gestión de personas" },
      { value: "operaciones-produccion-calidad", label: "Operaciones, producción y calidad" },
      { value: "logistica-compras-abastecimiento", label: "Logística, compras y abastecimiento" },
      { value: "tecnologia-sistemas-datos", label: "Tecnología, sistemas y análisis de datos" },
      { value: "asesoria-legal-cumplimiento", label: "Asesoría legal y cumplimiento normativo" },
      { value: "docencia-gestion-academica", label: "Docencia y gestión académica" },
      { value: "atencion-experiencia-cliente", label: "Atención y experiencia del cliente" },
      { value: "gestion-proyectos-innovacion", label: "Gestión de proyectos e innovación" },
      { value: "atencion-clinica-asistencial", label: "Atención clínica y asistencial en salud" },
      { value: "salud-publica-gestion-servicios", label: "Salud pública y gestión de servicios de salud" },
      { value: "gestion-politicas-programas-publicos", label: "Gestión de políticas, programas y servicios públicos" },
      { value: "otra-area-funcion", label: "Otra área o función" },
      { value: "sin-experiencia", label: "Aún no tengo experiencia laboral" }
    ]
  },

  {
    id: "p11",
    section: SECTIONS.perfil,
    sheetLabel: "Nivel de responsabilidad",
    prompt: "¿Cuál de las siguientes opciones describe mejor tu nivel de responsabilidad en el trabajo?",
    help: "Según las funciones que desempeñas. Si trabajas de manera independiente o tienes un negocio, considera también tus responsabilidades. Si actualmente no trabajas, responde sobre tu experiencia laboral más reciente.",
    type: "single",
    renderStyle: "list",
    options: [
      { value: "practicante-asistente", label: "Practicante o asistente: realizo principalmente funciones de apoyo" },
      { value: "profesional-sin-cargo", label: "Profesional sin personal a cargo: desempeño funciones profesionales o especializadas, por ejemplo, como analista, especialista, docente o médico" },
      { value: "coordinador-supervisor", label: "Coordinador o supervisor: coordino o superviso el trabajo de un equipo" },
      { value: "jefe-responsable-area", label: "Jefe o responsable de un área o servicio: tengo a cargo su funcionamiento y resultados" },
      { value: "gerente-director", label: "Gerente o director: dirijo una organización o una unidad y tomo decisiones estratégicas" },
      { value: "ninguna-opcion", label: "Ninguna de las opciones describe adecuadamente mi responsabilidad" },
      { value: "sin-experiencia", label: "Aún no tengo experiencia laboral" }
    ]
  },

  /* ---------- Sección: Tu sector de trabajo ---------- */

  {
    id: "p12",
    section: SECTIONS.sector,
    sheetLabel: "Sector de la organización",
    prompt: "¿Cuál es la actividad principal de la organización donde trabajas?",
    help: "Si actualmente no trabajas, responde pensando en tu organización más reciente. Si eres independiente, elige el sector en el que desarrollas principalmente tu actividad.",
    type: "single",
    renderStyle: "grid",
    options: [
      { value: "agricultura-ganaderia-pesca-acuicultura", label: "Agricultura, ganadería, pesca o acuicultura" },
      { value: "industria-manufactura", label: "Industria y manufactura" },
      { value: "mineria", label: "Minería" },
      { value: "energia-agua-saneamiento", label: "Energía, agua y servicios de saneamiento" },
      { value: "construccion-infraestructura", label: "Construcción e infraestructura" },
      { value: "actividades-inmobiliarias", label: "Actividades inmobiliarias" },
      { value: "comercio-retail", label: "Comercio y retail" },
      { value: "transporte-almacenamiento-logistico", label: "Transporte, almacenamiento y servicios logísticos" },
      { value: "servicios-financieros-seguros", label: "Servicios financieros y seguros" },
      { value: "salud", label: "Salud" },
      { value: "educacion", label: "Educación" },
      { value: "tecnologia-telecomunicaciones", label: "Tecnología y telecomunicaciones" },
      { value: "turismo-hoteleria-restaurantes", label: "Turismo, hotelería y restaurantes" },
      { value: "consultoria-servicios-profesionales", label: "Consultoría y servicios profesionales" },
      { value: "administracion-publica", label: "Administración pública" },
      { value: "cultura-entretenimiento-deporte", label: "Cultura, entretenimiento y deporte" },
      { value: "otra-actividad", label: "Otra actividad" },
      { value: "sin-experiencia", label: "Aún no tengo experiencia laboral" }
    ]
  },

  /* ---------- Sección: Tus intereses de capacitación ---------- */

  {
    id: "p1",
    section: SECTIONS.intereses,
    sheetLabel: "Campos de interés (hasta 3)",
    prompt: "¿En cuál de los siguientes campos te gustaría capacitarte principalmente durante 2027?",
    help: "Piensa en lo que quieres aprender, independientemente del sector donde trabajas.",
    type: "multi",
    renderStyle: "grid",
    min: 3,
    max: 3,
    options: [
      { value: "finanzas-contabilidad-inversiones", label: "Finanzas, contabilidad e inversiones" },
      { value: "marketing-comunicacion", label: "Marketing y comunicación" },
      { value: "ventas-gestion-comercial", label: "Ventas y gestión comercial" },
      { value: "liderazgo-habilidades-directivas", label: "Liderazgo y habilidades directivas" },
      { value: "rrhh-gestion-personas", label: "Recursos humanos y gestión de personas" },
      { value: "estrategia-gestion-empresarial-emprendimiento", label: "Estrategia, gestión empresarial y emprendimiento" },
      { value: "operaciones-procesos-calidad", label: "Operaciones, procesos y calidad" },
      { value: "logistica-cadena-suministro", label: "Logística y cadena de suministro" },
      { value: "gestion-proyectos", label: "Gestión de proyectos" },
      { value: "ia-datos-automatizacion", label: "Inteligencia artificial, análisis de datos y automatización" },
      { value: "tecnologia-sistemas-ciberseguridad", label: "Tecnología, sistemas y ciberseguridad" },
      { value: "innovacion-transformacion-digital", label: "Innovación y transformación digital" },
      { value: "derecho-cumplimiento-riesgos", label: "Derecho, cumplimiento normativo y gestión de riesgos" },
      { value: "gestion-publica", label: "Gestión pública" },
      { value: "sostenibilidad-ambiental", label: "Sostenibilidad y gestión ambiental" },
      { value: "salud-clinico-asistencial", label: "Salud: conocimientos clínicos y asistenciales" },
      { value: "turismo-hoteleria-servicios", label: "Turismo, hotelería y servicios de hospitalidad: conocimientos técnicos y operativos" },
      { value: "educacion-ensenanza-gestion", label: "Educación: enseñanza y gestión académica" },
      { value: "otro-campo", label: "Un campo distinto de los anteriores" },
      { value: "no-definido", label: "Aún no lo tengo definido" }
    ]
  },

  {
    id: "p2",
    section: SECTIONS.intereses,
    sheetLabel: "Sector de aplicación (hasta 2)",
    prompt: "¿En qué sector te gustaría aplicar principalmente esos conocimientos?",
    help: "No necesariamente tiene que ser el sector donde trabajas actualmente.",
    type: "multi",
    renderStyle: "grid",
    min: 1,
    max: 2,
    options: [
      { value: "salud", label: "Salud" },
      { value: "turismo-hoteleria-restaurantes", label: "Turismo, hotelería y restaurantes" },
      { value: "educacion", label: "Educación" },
      { value: "banca-seguros-financieros", label: "Banca, seguros y servicios financieros" },
      { value: "comercio-retail", label: "Comercio y retail" },
      { value: "industria-manufactura", label: "Industria y manufactura" },
      { value: "construccion-infraestructura", label: "Construcción e infraestructura" },
      { value: "inmobiliario", label: "Inmobiliario" },
      { value: "agricultura-agroindustria-pesca-acuicultura", label: "Agricultura, agroindustria, pesca y acuicultura" },
      { value: "mineria-energia", label: "Minería y energía" },
      { value: "transporte-servicios-logisticos", label: "Transporte y servicios logísticos" },
      { value: "tecnologia-telecomunicaciones", label: "Tecnología y telecomunicaciones" },
      { value: "administracion-publica", label: "Administración pública" },
      { value: "consultoria-servicios-profesionales", label: "Consultoría y servicios profesionales" },
      { value: "otro-sector", label: "Otro sector" },
      { value: "multisector", label: "Busco conocimientos aplicables a distintos sectores, sin enfocarme en uno" },
      { value: "no-definido", label: "Aún no lo tengo definido" }
    ]
  },

  /* ---------- Sección: Cómo te gustaría capacitarte ---------- */

  {
    id: "p3",
    section: SECTIONS.modalidad,
    sheetLabel: "Modalidad preferida (1ª; 2ª)",
    prompt: "¿En qué modalidad te gustaría capacitarte durante 2027?",
    type: "ranking",
    rankCount: 2,
    options: [
      { value: "virtual-vivo", label: "Virtual en vivo: clases por internet con docente y horario establecido" },
      { value: "presencial", label: "Presencial: clases en una sede física" },
      { value: "semipresencial", label: "Semipresencial: combinación de clases virtuales en vivo y presenciales" },
      { value: "virtual-ritmo", label: "Virtual a mi ritmo: contenidos disponibles para estudiar sin un horario fijo de clases" },
      { value: "no-otra", label: "No consideraría otra modalidad" }
    ]
  },

  /* ---------- Sección: Desde dónde participarías ---------- */

  {
    id: "p4",
    section: SECTIONS.ubicacion,
    sheetLabel: "Región de participación",
    prompt: "¿Desde qué lugar participarías habitualmente en la capacitación?",
    help: "Selecciona el departamento o región desde el que te conectarías o te trasladarías a clases. Si participarías desde otro país, selecciona «Fuera del Perú».",
    type: "single",
    renderStyle: "dropdown",
    options: [
      { value: "amazonas", label: "Amazonas" },
      { value: "ancash", label: "Áncash" },
      { value: "apurimac", label: "Apurímac" },
      { value: "arequipa", label: "Arequipa" },
      { value: "ayacucho", label: "Ayacucho" },
      { value: "cajamarca", label: "Cajamarca" },
      { value: "callao", label: "Callao" },
      { value: "cusco", label: "Cusco" },
      { value: "huancavelica", label: "Huancavelica" },
      { value: "huanuco", label: "Huánuco" },
      { value: "ica", label: "Ica" },
      { value: "junin", label: "Junín" },
      { value: "la-libertad", label: "La Libertad" },
      { value: "lambayeque", label: "Lambayeque" },
      { value: "lima", label: "Lima" },
      { value: "loreto", label: "Loreto" },
      { value: "madre-de-dios", label: "Madre de Dios" },
      { value: "moquegua", label: "Moquegua" },
      { value: "pasco", label: "Pasco" },
      { value: "piura", label: "Piura" },
      { value: "puno", label: "Puno" },
      { value: "san-martin", label: "San Martín" },
      { value: "tacna", label: "Tacna" },
      { value: "tumbes", label: "Tumbes" },
      { value: "ucayali", label: "Ucayali" },
      { value: "fuera-peru", label: "Fuera del Perú" }
    ]
  },

  /* ---------- Sección: Ubicación y duración ---------- */

  {
    id: "p4a",
    section: SECTIONS.ubicacionDuracion,
    prompt: "¿Desde qué país y ciudad participarías?",
    type: "text",
    fields: [
      { key: "pais", label: "País", placeholder: "Ej. México", sheetLabel: "País (fuera del Perú)" },
      { key: "ciudad", label: "Ciudad", placeholder: "Ej. Ciudad de México", sheetLabel: "Ciudad (fuera del Perú)" }
    ],
    condition: (answers) => answers.p4 === "fuera-peru"
  },

  {
    id: "p4b",
    section: SECTIONS.ubicacionDuracion,
    prompt: "¿En qué ciudad podrías asistir regularmente a clases presenciales?",
    type: "text",
    fields: [
      { key: "ciudad", label: "Ciudad", placeholder: "Ej. Lima Metropolitana", sheetLabel: "Ciudad de asistencia presencial" }
    ],
    condition: (answers) => p3Includes(answers, MODALIDADES_PRESENCIALES)
  },

  {
    id: "p4c",
    section: SECTIONS.ubicacionDuracion,
    prompt: "¿Desde qué distrito te trasladarías habitualmente a las clases?",
    type: "text",
    fields: [
      { key: "distrito", label: "Distrito", placeholder: "Ej. San Isidro", sheetLabel: "Distrito de traslado" }
    ],
    condition: (answers) =>
      p3Includes(answers, MODALIDADES_PRESENCIALES) &&
      textIncludesAny(answers.p4b_ciudad, ["lima", "callao"])
  },

  {
    id: "p5",
    section: SECTIONS.ubicacionDuracion,
    sheetLabel: "Duración preferida (1ª; 2ª; 3ª)",
    prompt: "¿Qué duración total se adapta mejor a la capacitación que buscas para 2027?",
    help: "Considera el total de horas de la capacitación, no las horas por semana.",
    type: "ranking",
    rankCount: 3,
    options: [
      { value: "hasta-8h", label: "Hasta 8 horas" },
      { value: "9-30h", label: "De 9 a 30 horas" },
      { value: "31-60h", label: "De 31 a 60 horas" },
      { value: "61-120h", label: "De 61 a 120 horas" },
      { value: "mas-120h", label: "Más de 120 horas" },
      { value: "sin-preferencia", label: "No tengo una preferencia definida; dependería del contenido." }
    ]
  },

  /* ---------- Sección: Días y horarios ---------- */

  {
    id: "p6",
    section: SECTIONS.horarios,
    sheetLabel: "Días disponibles",
    prompt: "Si eligieras clases con horario establecido, ¿qué días podrías asistir con mayor regularidad?",
    blockNote:
      "Responde este bloque si alguna de tus modalidades elegidas incluye clases con horario " +
      "establecido. Si solo considerarías estudiar a tu ritmo, este bloque no aplica para ti.",
    type: "multi",
    renderStyle: "list",
    min: 1,
    max: 3,
    options: [
      { value: "lunes", label: "Lunes" },
      { value: "martes", label: "Martes" },
      { value: "miercoles", label: "Miércoles" },
      { value: "jueves", label: "Jueves" },
      { value: "viernes", label: "Viernes" },
      { value: "sabado", label: "Sábado" },
      { value: "domingo", label: "Domingo" }
    ],
    condition: (answers) => p3Includes(answers, MODALIDADES_CON_HORARIO)
  },

  {
    id: "p7",
    section: SECTIONS.horarios,
    sheetLabel: "Horario lunes a viernes (1ª; 2ª)",
    prompt: "Si llevaras clases de lunes a viernes, ¿qué horario podrías cumplir con mayor regularidad?",
    help: "Los horarios están expresados en hora de Perú.",
    type: "ranking",
    rankCount: 2,
    options: [
      { value: "7-10am", label: "De 7:00 a 10:00 a. m." },
      { value: "12-3pm", label: "De 12:00 a 3:00 p. m." },
      { value: "3-6pm", label: "De 3:00 a 6:00 p. m." },
      { value: "7-10pm", label: "De 7:00 a 10:00 p. m." },
      { value: "730-1030pm", label: "De 7:30 a 10:30 p. m." },
      { value: "otro-horario", label: "Otro horario" }
    ],
    condition: (answers) => p3Includes(answers, MODALIDADES_CON_HORARIO) && p6Includes(answers, WEEKDAYS)
  },

  {
    id: "p7a",
    section: SECTIONS.horarios,
    sheetLabel: "Franja de fin de semana (1ª; 2ª)",
    prompt: "Para las clases de fin de semana, ¿qué franja prefieres?",
    help: "Los horarios están expresados en hora de Perú.",
    type: "ranking",
    rankCount: 2,
    options: [
      { value: "manana", label: "Mañana: entre las 8:00 a. m. y la 1:00 p. m." },
      { value: "tarde", label: "Tarde: entre las 2:00 y las 7:00 p. m." },
      { value: "mixta", label: "Una jornada que combine mañana y tarde" },
      { value: "sin-preferencia", label: "No tengo preferencia entre mañana y tarde" },
      { value: "otra-franja", label: "Otra franja" }
    ],
    condition: (answers) => p3Includes(answers, MODALIDADES_CON_HORARIO) && p6Includes(answers, WEEKEND)
  },

  /* ---------- Sección: Qué podría dificultar tu capacitación ---------- */

  {
    id: "p8",
    section: SECTIONS.dificultades,
    sheetLabel: "Principales dificultades",
    prompt: "¿Cuáles serían las principales dificultades para que puedas capacitarte en 2027?",
    help: "Si no identificas dificultades, marca únicamente esa alternativa.",
    type: "multi",
    renderStyle: "list",
    min: 1,
    max: 2,
    exclusiveValue: "ninguna",
    options: [
      { value: "costo", label: "El costo de la capacitación" },
      { value: "falta-tiempo", label: "La falta de tiempo por trabajo o responsabilidades personales" },
      { value: "horarios-clases", label: "Los horarios de las clases" },
      { value: "duracion-total", label: "La duración total de la capacitación" },
      { value: "no-encontrar-contenido", label: "No encontrar un contenido que responda a lo que necesito" },
      { value: "no-encontrar-profundidad", label: "No encontrar el nivel de profundidad que busco" },
      { value: "traslado-sede", label: "El traslado a una sede presencial" },
      { value: "falta-financiamiento", label: "La falta de financiamiento o apoyo de mi empleador" },
      { value: "no-claro-que-estudiar", label: "Aún no tener claro qué necesito estudiar" },
      { value: "ninguna", label: "No identifico dificultades importantes" },
      { value: "otra-dificultad", label: "Otra dificultad" }
    ]
  }
];

/* ============================== PANTALLA FINAL ============================== */

const FINAL = {
  title: "¡Gracias por ayudarnos a diseñar la oferta de 2027!",
  message:
    "Tus respuestas nos permitirán comprender mejor las necesidades de nuestra comunidad " +
    "y priorizar propuestas de capacitación más pertinentes para su desarrollo profesional."
};
