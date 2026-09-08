/**
 * app.js
 * ------------------------------------------------------------------
 * Motor de la encuesta. Depende de questions.js (COVER, SECTIONS,
 * QUESTIONS, FINAL) ya cargado en el <head>/<body> antes que este
 * archivo.
 *
 * Responsabilidades:
 *   1. Mantener el estado (respuestas + pantalla actual).
 *   2. Calcular en cada momento el "camino real" de pantallas según
 *      las respuestas dadas (skip logic) — ver getOrderedScreens().
 *   3. Renderizar cada tipo de pregunta (multi, ranking, single,
 *      dropdown, text) con validación en tiempo real.
 *   4. Animar la transición entre pantallas y actualizar la barra
 *      de progreso.
 *   5. Exponer un único punto de integración para enviar las
 *      respuestas a un backend real — ver submitSurvey().
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  /* ============================== ESTADO ============================== */

  const state = {
    screenId: "cover",
    answers: {}
  };

  const ORDINAL_BADGE = ["1°", "2°", "3°"];
  const ORDINAL_TEXT = ["1ª", "2ª", "3ª"];

  // Teclas retro flotantes de la portada — un keycap por eje temático de
  // Educación Ejecutiva. Cada tecla tiene dos posiciones porcentuales
  // (dentro de .cover-hero, que cambia de tamaño/orientación por breakpoint):
  //   xd/yd -> desktop (≥900px): forma de diamante vertical, con jitter
  //            para que no se vea como grilla ni como anillo perfecto.
  //   xm/ym -> mobile (<900px): mismo espíritu de diamante pero achatado
  //            horizontalmente, para una franja corta y ancha.
  // rot/dur/delay controlan la animación de flotado (floatKey en styles.css).
  const KEYCAPS = [
    {
      label: "Derecho y Gobierno Corporativo",
      color: "#2E86AB",
      xd: 30, yd: 20, xm: 5, ym: 50, rot: -6, dur: 7.2, delay: -0.4,
      icon: '<path d="M12 3v14"/><path d="M5 6h14"/><path d="M5 6l-3 6a3 3 0 0 0 6 0z"/><path d="M19 6l-3 6a3 3 0 0 0 6 0z"/><path d="M8 21h8"/><path d="M12 17v4"/>'
    },
    {
      label: "Educación",
      color: "#E4572E",
      xd: 68, yd: 46, xm: 24, ym: 18, rot: 5, dur: 8.1, delay: -2.1,
      icon: '<path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M6 10.5V16c0 1.5 2.5 3 6 3s6-1.5 6-3v-5.5"/><path d="M22 8v6"/>'
    },
    {
      label: "Gestión Pública",
      color: "#6A4C93",
      xd: 45, yd: 90, xm: 55, ym: 15, rot: -4, dur: 6.6, delay: -3.4,
      icon: '<path d="M3 21h18"/><path d="M4 21V10"/><path d="M20 21V10"/><path d="M2 10l10-6 10 6"/><path d="M8 21v-7"/><path d="M12 21v-7"/><path d="M16 21v-7"/>'
    },
    {
      label: "Innovación e IA",
      color: "#1B998B",
      xd: -8, yd: 42, xm: 95, ym: 48, rot: 7, dur: 7.8, delay: -1.1,
      icon: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>'
    },
    {
      label: "Negocios y ESG",
      color: "#3E8914",
      xd: 42, yd: 58, xm: 70, ym: 85, rot: 4, dur: 8.4, delay: -0.9,
      icon: '<path d="M3 17l5-6 4 3 7-9"/><path d="M15 5h4v4"/><path d="M4 21c3-1 5-3 5-6"/>'
    },
    {
      label: "Liderazgo y Gestión de Personas",
      color: "#C1666B",
      xd: 10, yd: 84, xm: 38, ym: 88, rot: -8, dur: 6.9, delay: -2.8,
      icon: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.4"/><path d="M15.5 14.2c2.6.5 4.5 2.8 4.5 5.8"/>'
    },
    {
      label: "Salud",
      color: "#F4B942",
      xd: 20, yd: 54, xm: 46, ym: 50, rot: -3, dur: 7.5, delay: -3.9,
      icon: '<path d="M12 4v16M4 12h16"/><rect x="4" y="4" width="16" height="16" rx="4"/>'
    }
  ];

  const QUESTIONS_BY_ID = {};
  QUESTIONS.forEach((q) => { QUESTIONS_BY_ID[q.id] = q; });

  /* ============================== CAMINO ACTIVO ============================== */

  // Devuelve el arreglo ordenado de ids de pantalla ("cover", ...preguntas
  // que aplican según las respuestas actuales..., "final").
  function getOrderedScreens(answers) {
    const ids = ["cover"];
    QUESTIONS.forEach((q) => {
      if (!q.condition || q.condition(answers)) ids.push(q.id);
    });
    ids.push("final");
    return ids;
  }

  function getNeighborScreen(direction) {
    const order = getOrderedScreens(state.answers);
    const idx = order.indexOf(state.screenId);
    const targetIdx = direction === "next" ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= order.length) return null;
    return order[targetIdx];
  }

  /* ============================== VALIDACIÓN ============================== */

  function isValid(screenId) {
    if (screenId === "cover" || screenId === "final") return true;
    const q = QUESTIONS_BY_ID[screenId];
    const val = state.answers[q.id];

    switch (q.type) {
      case "multi": {
        const sel = val || [];
        const min = q.min || 1;
        const max = q.max || sel.length || 1;
        return sel.length >= min && sel.length <= max;
      }
      case "ranking": {
        const sel = val || [];
        return sel.length === q.rankCount;
      }
      case "single":
        return !!val;
      case "text": {
        return q.fields.every((f) => {
          const v = state.answers[q.id + "_" + f.key];
          return v && v.trim().length > 0;
        });
      }
      default:
        return true;
    }
  }

  /* ============================== TOAST ============================== */

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  /* ============================== PROGRESO ============================== */

  function updateProgress(screenId) {
    const order = getOrderedScreens(state.answers);
    const idx = order.indexOf(screenId);
    const total = order.length - 1;
    const percent = total > 0 ? Math.round((idx / total) * 100) : 0;

    const track = document.getElementById("progressTrack");
    const fill = document.getElementById("progressFill");
    fill.style.width = percent + "%";

    if (screenId === "cover") {
      track.classList.remove("visible");
    } else {
      track.classList.add("visible");
    }
    track.setAttribute("aria-hidden", screenId === "cover" ? "true" : "false");
  }

  /* ============================== NAVEGACIÓN / TRANSICIÓN ============================== */

  function goTo(screenId, direction) {
    const app = document.getElementById("app");
    const current = app.firstElementChild;

    const swap = () => {
      app.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.className = "screen " + (direction === "back" ? "dir-left" : "dir-right");
      wrapper.innerHTML = buildScreenHTML(screenId);
      app.appendChild(wrapper);
      attachHandlers(screenId, wrapper);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => wrapper.classList.add("in"));
      });

      const autofocus = wrapper.querySelector("[data-autofocus]");
      if (autofocus && window.matchMedia("(min-width: 640px)").matches) {
        setTimeout(() => autofocus.focus({ preventScroll: true }), 60);
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    if (current) {
      current.classList.add(direction === "back" ? "out-right" : "out-left");
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        swap();
      };
      current.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 260);
    } else {
      swap();
    }

    state.screenId = screenId;
    updateProgress(screenId);

    if (screenId === "final") submitSurvey(state.answers);
  }

  function next() {
    const screenId = state.screenId;
    if (screenId !== "cover" && !isValid(screenId)) return;
    const target = getNeighborScreen("next");
    if (target) goTo(target, "next");
  }

  function back() {
    const target = getNeighborScreen("back");
    if (target) goTo(target, "back");
  }

  /* ============================== HTML BUILDERS ============================== */

  function escapeHtml(str) {
    return (str || "").toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildScreenHTML(screenId) {
    if (screenId === "cover") return buildCoverHTML();
    if (screenId === "final") return buildFinalHTML();
    return buildQuestionHTML(QUESTIONS_BY_ID[screenId]);
  }

  function buildCoverHeroHTML() {
    const keys = KEYCAPS.map((k) => `
      <div class="keycap" style="--kx:${k.xm}%;--ky:${k.ym}%;--kx-d:${k.xd}%;--ky-d:${k.yd}%;">
        <div class="keycap-float" style="--rot:${k.rot}deg;--dur:${k.dur}s;--delay:${k.delay}s;">
          <div class="keycap-face" style="--key-color:${k.color};">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${k.icon}</svg>
          </div>
          <span class="keycap-label">${escapeHtml(k.label)}</span>
        </div>
      </div>
    `).join("");
    return `<div class="cover-hero" aria-hidden="true">${keys}</div>`;
  }

  function buildCoverHTML() {
    return `
      <div class="cover">
        <div class="cover-inner">
          <p class="eyebrow">${escapeHtml(COVER.eyebrow)}</p>
          <h1 class="cover-title">${escapeHtml(COVER.title)}</h1>
          <p class="cover-subtitle">${escapeHtml(COVER.subtitle)}</p>
          <p class="cover-description">${escapeHtml(COVER.description)}</p>
          <button type="button" class="btn btn-primary btn-large" id="btnStart" data-autofocus>
            ${escapeHtml(COVER.cta)}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          ${buildCoverHeroHTML()}
          <p class="cover-legal">${escapeHtml(COVER.legal)}</p>
        </div>
      </div>
    `;
  }

  function buildFinalHTML() {
    return `
      <div class="final">
        <div class="final-inner">
          <div class="final-badge" aria-hidden="true">✓</div>
          <h1 class="final-title">${escapeHtml(FINAL.title)}</h1>
          <p class="final-message">${escapeHtml(FINAL.message)}</p>
        </div>
      </div>
    `;
  }

  // Badge estático "Escoge 1 opción" / "Escoge hasta 3 opciones" / "Ordena
  // tus 2 preferencias", calculado desde type/min/max/rankCount — nunca
  // texto fijo por pregunta. Se muestra ANTES de responder, a diferencia
  // del contador dinámico (select-counter / rank-indicator) que ya existe
  // y sigue apareciendo debajo de las opciones mientras se responde.
  function getSelectionHint(q) {
    if (q.type === "single") return "Escoge 1 opción";
    if (q.type === "ranking") return `Ordena tus ${q.rankCount} preferencias`;
    if (q.type === "multi") {
      const min = q.min || 1;
      const max = q.max || min;
      if (min === max) return max === 1 ? "Escoge 1 opción" : `Escoge ${max} opciones`;
      if (min <= 1) return `Escoge hasta ${max} opciones`;
      return `Escoge entre ${min} y ${max} opciones`;
    }
    return null; // texto libre: sin badge
  }

  // Explicación fija (no cambia mientras se responde, a diferencia del
  // rank-indicator) de cómo funciona el mecanismo de ranking, generada
  // dinámicamente a partir de rankCount para cualquier pregunta de tipo
  // "ranking" — si el número de preferencias a ordenar cambia, el texto
  // se ajusta solo.
  function buildRankExplainer(rankCount) {
    if (!rankCount || rankCount < 2) return "";
    const ordinals = ["primera", "segunda", "tercera", "cuarta", "quinta", "sexta"];
    const roleFor = (i) => {
      if (i === 0) return "tu opción principal";
      if (i === 1) return "tu opción secundaria";
      return `tu ${ordinals[i] || `${i + 1}ª`} preferencia`;
    };
    const clauses = [];
    for (let i = 0; i < rankCount; i++) {
      const ord = ordinals[i] || `${i + 1}ª`;
      clauses.push(i === 0
        ? `la ${ord} que elijas será ${roleFor(i)}`
        : `la ${ord} será ${roleFor(i)}`);
    }
    const joined = clauses.length === 2
      ? clauses.join(" y ")
      : clauses.slice(0, -1).join(", ") + " y " + clauses[clauses.length - 1];
    return `Toca las opciones en el orden de tu preferencia: ${joined}.`;
  }

  function buildQuestionHTML(q) {
    const hint = getSelectionHint(q);
    const rankExplainer = q.type === "ranking" ? buildRankExplainer(q.rankCount) : "";
    return `
      <div class="question-screen">
        <div class="question-inner">
          <p class="section-tag"><span class="section-icon" aria-hidden="true">${q.section.icon}</span>${escapeHtml(q.section.label)}</p>
          ${q.blockNote ? `<div class="block-note">${escapeHtml(q.blockNote)}</div>` : ""}
          <h2 class="question-prompt">${escapeHtml(q.prompt)}</h2>
          ${hint ? `<p class="selection-hint">${escapeHtml(hint)}</p>` : ""}
          ${q.help ? `<p class="question-help">${escapeHtml(q.help)}</p>` : ""}
          ${rankExplainer ? `<p class="rank-explainer">${escapeHtml(rankExplainer)}</p>` : ""}
          <div class="question-body" id="questionBody">
            ${buildBodyHTML(q)}
          </div>
        </div>
        ${buildNavHTML()}
      </div>
    `;
  }

  function buildNavHTML() {
    return `
      <div class="nav-row">
        <button type="button" class="btn btn-ghost" id="btnBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Atrás
        </button>
        <div class="nav-hint" id="navHint"></div>
        <button type="button" class="btn btn-primary" id="btnNext">
          Siguiente
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;
  }

  function buildBodyHTML(q) {
    switch (q.type) {
      case "multi": return buildMultiHTML(q);
      case "ranking": return buildRankingHTML(q);
      case "single": return q.renderStyle === "dropdown" ? buildDropdownHTML(q) : buildSingleHTML(q);
      case "text": return buildTextHTML(q);
      default: return "";
    }
  }

  function buildMultiHTML(q) {
    const sel = state.answers[q.id] || [];
    const cls = q.renderStyle === "grid" ? "option-grid" : "option-list";
    const exclusiveActive = q.exclusiveValue && sel.includes(q.exclusiveValue);
    const opts = q.options.map((opt) => {
      const active = sel.includes(opt.value);
      const disabled = exclusiveActive && opt.value !== q.exclusiveValue;
      return `
        <button type="button" class="option option-check ${active ? "active" : ""} ${disabled ? "disabled-by-exclusive" : ""}"
          data-value="${escapeHtml(opt.value)}" ${disabled ? "disabled" : ""} aria-pressed="${active}">
          <span class="option-mark" aria-hidden="true"></span>
          <span class="option-label">${escapeHtml(opt.label)}</span>
        </button>
      `;
    }).join("");
    return `
      <div class="${cls}" data-qid="${q.id}">${opts}</div>
      <p class="select-counter" id="selectCounter"></p>
    `;
  }

  function buildRankingHTML(q) {
    const sel = state.answers[q.id] || [];
    const opts = q.options.map((opt) => {
      const rankIdx = sel.indexOf(opt.value);
      const active = rankIdx > -1;
      return `
        <button type="button" class="option option-rank ${active ? "active rank-" + (rankIdx + 1) : ""}"
          data-value="${escapeHtml(opt.value)}" aria-pressed="${active}">
          <span class="rank-badge" aria-hidden="true">${active ? ORDINAL_BADGE[rankIdx] : ""}</span>
          <span class="option-label">${escapeHtml(opt.label)}</span>
        </button>
      `;
    }).join("");
    return `
      <div class="option-list" data-qid="${q.id}">${opts}</div>
      <p class="rank-indicator" id="rankIndicator"></p>
    `;
  }

  function buildSingleHTML(q) {
    const sel = state.answers[q.id];
    const cls = q.renderStyle === "grid" ? "option-grid" : "option-list";
    const opts = q.options.map((opt) => {
      const active = sel === opt.value;
      return `
        <button type="button" class="option option-radio ${active ? "active" : ""}"
          data-value="${escapeHtml(opt.value)}" aria-pressed="${active}">
          <span class="option-mark option-mark-round" aria-hidden="true"></span>
          <span class="option-label">${escapeHtml(opt.label)}</span>
        </button>
      `;
    }).join("");
    return `<div class="${cls}" data-qid="${q.id}">${opts}</div>`;
  }

  function buildDropdownHTML(q) {
    const sel = state.answers[q.id];
    const selectedLabel = sel ? (q.options.find((o) => o.value === sel) || {}).label : "";
    const opts = q.options.map((opt) => `
        <li role="option" class="combobox-option ${sel === opt.value ? "active" : ""}" data-value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</li>
      `).join("");
    return `
      <div class="dropdown" data-qid="${q.id}">
        <div class="combobox">
          <input type="text" class="combobox-input" id="comboInput" placeholder="Escribe para buscar..."
            autocomplete="off" role="combobox" aria-expanded="false" value="${escapeHtml(selectedLabel)}" data-autofocus>
          <svg class="combobox-caret" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <ul class="combobox-list" id="comboList" role="listbox" hidden>${opts}</ul>
      </div>
    `;
  }

  function buildTextHTML(q) {
    const fields = q.fields.map((f) => {
      const val = state.answers[q.id + "_" + f.key] || "";
      return `
        <div class="text-field">
          <label class="field-label" for="field-${q.id}-${f.key}">${escapeHtml(f.label)}</label>
          <input type="text" class="text-input" id="field-${q.id}-${f.key}" data-field="${f.key}"
            placeholder="${escapeHtml(f.placeholder || "")}" value="${escapeHtml(val)}" ${f === q.fields[0] ? "data-autofocus" : ""}>
        </div>
      `;
    }).join("");
    return `<div class="text-field-group" data-qid="${q.id}">${fields}</div>`;
  }

  /* ============================== HANDLERS POR TIPO ============================== */

  function attachHandlers(screenId, root) {
    if (screenId === "cover") {
      root.querySelector("#btnStart").addEventListener("click", next);
      return;
    }
    if (screenId === "final") return;

    const q = QUESTIONS_BY_ID[screenId];
    const btnBack = root.querySelector("#btnBack");
    const btnNext = root.querySelector("#btnNext");

    btnBack.addEventListener("click", back);
    btnNext.addEventListener("click", next);

    switch (q.type) {
      case "multi": attachMultiHandlers(q, root); break;
      case "ranking": attachRankingHandlers(q, root); break;
      case "single":
        if (q.renderStyle === "dropdown") attachDropdownHandlers(q, root);
        else attachSingleHandlers(q, root);
        break;
      case "text": attachTextHandlers(q, root); break;
    }

    refreshNextState();
  }

  function refreshNextState() {
    const btnNext = document.getElementById("btnNext");
    if (!btnNext) return;
    const valid = isValid(state.screenId);
    btnNext.disabled = !valid;
    btnNext.classList.toggle("is-ready", valid);
  }

  function attachMultiHandlers(q, root) {
    const container = root.querySelector(`.option-grid[data-qid], .option-list[data-qid]`);
    updateSelectCounter(q);
    container.querySelectorAll(".option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-value");
        let sel = state.answers[q.id] ? [...state.answers[q.id]] : [];
        const exclusive = q.exclusiveValue;

        if (exclusive && value === exclusive) {
          sel = sel.includes(exclusive) ? [] : [exclusive];
        } else {
          if (exclusive && sel.includes(exclusive)) sel = sel.filter((v) => v !== exclusive);
          if (sel.includes(value)) {
            sel = sel.filter((v) => v !== value);
          } else {
            if (sel.length >= (q.max || sel.length + 1)) {
              showToast(`Puedes seleccionar hasta ${q.max} opción${q.max > 1 ? "es" : ""}.`);
              return;
            }
            sel.push(value);
          }
        }
        state.answers[q.id] = sel;
        rerenderBody(q);
      });
    });
  }

  function updateSelectCounter(q) {
    const el = document.getElementById("selectCounter");
    if (!el) return;
    const sel = state.answers[q.id] || [];
    if (q.min === q.max) {
      el.textContent = `Seleccionadas: ${sel.length} de ${q.max}`;
    } else {
      el.textContent = `Seleccionadas: ${sel.length} (máximo ${q.max})`;
    }
  }

  function attachRankingHandlers(q, root) {
    const container = root.querySelector(".option-list[data-qid]");
    updateRankIndicator(q);
    container.querySelectorAll(".option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-value");
        let sel = state.answers[q.id] ? [...state.answers[q.id]] : [];
        if (sel.includes(value)) {
          sel = sel.filter((v) => v !== value);
        } else {
          if (sel.length >= q.rankCount) {
            showToast(`Ya elegiste tus ${q.rankCount} preferencias. Toca una opción marcada para quitarla.`);
            return;
          }
          sel.push(value);
        }
        state.answers[q.id] = sel;
        rerenderBody(q);
      });
    });
  }

  function updateRankIndicator(q) {
    const el = document.getElementById("rankIndicator");
    if (!el) return;
    const sel = state.answers[q.id] || [];
    if (sel.length < q.rankCount) {
      el.textContent = `Selecciona tu ${ORDINAL_TEXT[sel.length]} preferencia`;
    } else {
      el.textContent = "Ranking completo. Toca una opción marcada para cambiarla.";
    }
  }

  function attachSingleHandlers(q, root) {
    const container = root.querySelector(".option-grid[data-qid], .option-list[data-qid]");
    container.querySelectorAll(".option").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers[q.id] = btn.getAttribute("data-value");
        rerenderBody(q);
      });
    });
  }

  function attachDropdownHandlers(q, root) {
    const input = root.querySelector("#comboInput");
    const list = root.querySelector("#comboList");
    const items = Array.from(list.querySelectorAll(".combobox-option"));
    let activeIdx = -1;

    function normalize(str) {
      return (str || "").toString().trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function openList() {
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }
    function closeList() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      activeIdx = -1;
      items.forEach((li) => li.classList.remove("highlight"));
    }
    function filter() {
      const q2 = normalize(input.value);
      let firstVisible = null;
      items.forEach((li) => {
        const match = normalize(li.textContent).includes(q2);
        li.style.display = match ? "" : "none";
        if (match && firstVisible === null) firstVisible = li;
      });
      activeIdx = -1;
      items.forEach((li) => li.classList.remove("highlight"));
    }
    function selectItem(li) {
      const value = li.getAttribute("data-value");
      state.answers[q.id] = value;
      input.value = li.textContent.trim();
      items.forEach((it) => it.classList.remove("active"));
      li.classList.add("active");
      closeList();
      refreshNextState();
    }

    input.addEventListener("focus", () => { openList(); filter(); });
    input.addEventListener("input", filter);
    input.addEventListener("click", () => { openList(); filter(); });

    input.addEventListener("keydown", (e) => {
      const visible = items.filter((li) => li.style.display !== "none");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        openList();
        activeIdx = Math.min(activeIdx + 1, visible.length - 1);
        visible.forEach((li) => li.classList.remove("highlight"));
        if (visible[activeIdx]) {
          visible[activeIdx].classList.add("highlight");
          visible[activeIdx].scrollIntoView({ block: "nearest" });
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        visible.forEach((li) => li.classList.remove("highlight"));
        if (visible[activeIdx]) {
          visible[activeIdx].classList.add("highlight");
          visible[activeIdx].scrollIntoView({ block: "nearest" });
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIdx > -1 && visible[activeIdx]) {
          selectItem(visible[activeIdx]);
        } else if (visible.length === 1) {
          selectItem(visible[0]);
        }
      } else if (e.key === "Escape") {
        closeList();
        input.blur();
      }
    });

    items.forEach((li) => {
      li.addEventListener("mousedown", (e) => e.preventDefault());
      li.addEventListener("click", () => selectItem(li));
    });

    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) closeList();
    });

    input.addEventListener("blur", () => {
      setTimeout(() => {
        if (!state.answers[q.id]) input.value = "";
        closeList();
      }, 120);
    });
  }

  function attachTextHandlers(q, root) {
    root.querySelectorAll(".text-input").forEach((input) => {
      const fieldKey = input.getAttribute("data-field");
      input.addEventListener("input", () => {
        state.answers[q.id + "_" + fieldKey] = input.value;
        refreshNextState();
      });
    });
  }

  // Vuelve a pintar solo el cuerpo de la pregunta (sin reanimar toda la
  // pantalla) cada vez que cambia una selección, para feedback inmediato.
  function rerenderBody(q) {
    const body = document.getElementById("questionBody");
    if (!body) return;
    body.innerHTML = buildBodyHTML(q);
    switch (q.type) {
      case "multi": attachMultiHandlers(q, document.getElementById("app")); break;
      case "ranking": attachRankingHandlers(q, document.getElementById("app")); break;
      case "single": attachSingleHandlers(q, document.getElementById("app")); break;
    }
    refreshNextState();
  }

  /* ============================== ATAJOS DE TECLADO ============================== */

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "textarea") return;
    // Si el foco está en el buscador del dropdown, ese componente ya
    // maneja su propio Enter (seleccionar opción resaltada).
    if (e.target.id === "comboInput") return;
    const btnNext = document.getElementById("btnNext");
    const btnStart = document.getElementById("btnStart");
    if (btnStart) { btnStart.click(); return; }
    if (btnNext && !btnNext.disabled) btnNext.click();
  });

  /* ============================== PUNTO DE INTEGRACIÓN ============================== */

  const SURVEY_STORAGE_KEY = "usil-encuesta-2027-respuestas";

  // Pega aquí la URL de tu Web App de Google Apps Script (termina en
  // "/exec"). Mientras esté vacía, la encuesta sigue funcionando normal:
  // solo guarda una copia local en localStorage y no envía nada afuera.
  const GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbyINl-pQsPxzxLydUWls43nToqGleUF-nHdxaTozOQHxgEv--v0meEpAP4XRg2r1zhL/exec";

  // Convierte answers (con arreglos para preguntas multi/ranking) en un
  // objeto plano de una sola fila, usando como clave el `sheetLabel`
  // legible de cada pregunta (definido en questions.js) en vez del id
  // interno (p1, p4b_ciudad...). Recorre QUESTIONS en orden, así que las
  // columnas quedan siempre en el mismo orden sin importar el camino de
  // skip logic que haya seguido cada persona. Los arreglos se unen con
  // "; " —en las preguntas de ranking eso conserva el orden de
  // preferencia (el primer valor es la 1ª preferencia, el segundo la 2ª,
  // etc.). Si una pregunta nueva no tiene `sheetLabel` todavía, usa su
  // `id` como respaldo para que igual llegue a la hoja.
  function flattenAnswersForSheet(answers) {
    const flat = {};
    QUESTIONS.forEach((q) => {
      if (q.type === "text") {
        q.fields.forEach((f) => {
          const val = answers[q.id + "_" + f.key];
          if (val === undefined || val === "") return;
          flat[f.sheetLabel || `${q.id}_${f.key}`] = val;
        });
        return;
      }
      const val = answers[q.id];
      if (val === undefined) return;
      flat[q.sheetLabel || q.id] = Array.isArray(val) ? val.join("; ") : val;
    });
    return flat;
  }

  /**
   * submitSurvey(answers)
   * ------------------------------------------------------------------
   * Se llama automáticamente al llegar a la pantalla final.
   *
   * 1) Siempre guarda una copia en localStorage (solo en el navegador
   *    de la persona), para que el flujo funcione de punta a punta
   *    incluso si el envío al backend falla o no está configurado.
   * 2) Si GOOGLE_SHEETS_ENDPOINT tiene una URL, además envía la
   *    respuesta a esa Web App de Apps Script (ver README.md para el
   *    código del script y los pasos de despliegue).
   *
   * mode: "no-cors" + Content-Type "text/plain" evitan el preflight
   * CORS que Apps Script no responde bien; igual el script del lado
   * del servidor puede leer y parsear el JSON del body sin problema.
   * Con "no-cors" la respuesta llega "opaca" (no se puede leer su
   * contenido ni status), así que el envío es "fire and forget": no
   * bloquea ni condiciona la pantalla de agradecimiento.
   */
  function submitSurvey(answers) {
    const payload = { answers, submittedAt: new Date().toISOString() };

    try {
      const existing = JSON.parse(localStorage.getItem(SURVEY_STORAGE_KEY) || "[]");
      existing.push(payload);
      localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(existing));
      console.log("Encuesta completada (copia local guardada):", payload);
    } catch (err) {
      console.warn("No se pudo guardar la copia local:", err);
    }

    if (!GOOGLE_SHEETS_ENDPOINT) return;

    const sheetData = flattenAnswersForSheet(answers);
    sheetData["Fecha y hora de envío (UTC)"] = payload.submittedAt;

    fetch(GOOGLE_SHEETS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ answers: sheetData })
    }).catch((err) => {
      console.warn("No se pudo enviar la encuesta a Google Sheets:", err);
    });
  }

  /* ============================== INICIO ============================== */

  document.addEventListener("DOMContentLoaded", () => {
    goTo("cover", "next");
  });
})();
