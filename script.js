// ============================
// Configuración básica
// ============================

// Claves de almacenamiento en localStorage para recordar la configuración
const STORAGE_KEY_NOTATION = "music_level1_notation";
const STORAGE_KEY_LEVEL = "music_level_level";
const STORAGE_KEY_SOUND = "music_level1_sound";

// Definimos las notas básicas con una posición vertical fija dentro del pentagrama.
// Usamos valores en porcentaje que se ajustan visualmente a la posición correcta
// en un pentagrama de clave de sol (Do con línea adicional inferior, etc.).
// Las 5 líneas del pentagrama se dibujan en CSS dentro de .staff-lines.
// En ese contenedor usamos un rango vertical de 0% (línea superior) a 100% (línea inferior).
// Definimos posiciones relativas dentro de ese rango:
// - Línea superior (5ª)      -> 0%
// - 4ª línea                 -> 25%
// - 3ª línea                 -> 50%
// - 2ª línea                 -> 75%
// - 1ª línea (inferior)      -> 100%
//
// A partir de ahí:
// - Do: línea adicional por debajo     -> 125%
// - Re: espacio bajo la 1ª línea       -> 112.5%
// - Mi: 1ª línea                       -> 100%
// - Fa: 1º espacio                     -> 87.5%
// - Sol: 2ª línea                      -> 75%
// - La: 2º espacio                     -> 62.5%
// - Si: 3ª línea                       -> 50%
// Posiciones relativas exactas respecto a las 5 líneas:
// líneas: 0, 25, 50, 75, 100 (de arriba a abajo)
// espacios: 12.5, 37.5, 62.5, 87.5

// Notas del nivel 1: solo la octava baja (como en la primera parte de tu imagen)
const NOTES_LEVEL1 = [
  { id: "do", latin: "Do", anglo: "C", rel: 125 }, // línea adicional inferior
  { id: "re", latin: "Re", anglo: "D", rel: 112.5 }, // espacio bajo 1ª línea
  { id: "mi", latin: "Mi", anglo: "E", rel: 100 }, // 1ª línea
  { id: "fa", latin: "Fa", anglo: "F", rel: 87.5 }, // 1er espacio
  { id: "sol", latin: "Sol", anglo: "G", rel: 75 }, // 2ª línea
  { id: "la", latin: "La", anglo: "A", rel: 62.5 }, // 2º espacio
  { id: "si", latin: "Si", anglo: "B", rel: 50 }, // 3ª línea
];

// Notas de la octava alta (segunda parte de tu imagen)
// Repetimos los mismos nombres de nota pero en posiciones más agudas.
const NOTES_HIGH = [
  { id: "do", latin: "Do", anglo: "C", rel: 37.5 }, // 3er espacio
  { id: "re", latin: "Re", anglo: "D", rel: 25 }, // 4ª línea
  { id: "mi", latin: "Mi", anglo: "E", rel: 12.5 }, // 4º espacio
  { id: "fa", latin: "Fa", anglo: "F", rel: 0 }, // 5ª línea
  { id: "sol", latin: "Sol", anglo: "G", rel: -12.5 }, // espacio sobre el pentagrama
  { id: "la", latin: "La", anglo: "A", rel: -25 }, // línea adicional superior
];

// Nivel 2: notas bajas + notas altas
const NOTES_LEVEL2 = [...NOTES_LEVEL1, ...NOTES_HIGH];

// Para las opciones del juego usamos solo las 7 notas básicas (sin importar la octava)
const BASE_PITCHES = [
  { id: "do", latin: "Do", anglo: "C" },
  { id: "re", latin: "Re", anglo: "D" },
  { id: "mi", latin: "Mi", anglo: "E" },
  { id: "fa", latin: "Fa", anglo: "F" },
  { id: "sol", latin: "Sol", anglo: "G" },
  { id: "la", latin: "La", anglo: "A" },
  { id: "si", latin: "Si", anglo: "B" },
];

// Estado actual de la aplicación (se mantiene en memoria)
const state = {
  notation: "latina", // "latina" o "anglo"
  level: 1, // 1 (notas bajas) o 2 (bajas + altas)
  soundEnabled: false,
  currentGameNote: null, // Objeto de nota actual en el juego
  scoreCorrect: 0,
  scoreWrong: 0,
};

let audioContext = null;

// ============================
// Utilidades
// ============================

// Obtiene el texto de una nota según la configuración actual
function getNoteLabel(note) {
  return state.notation === "latina" ? note.latin : note.anglo;
}

// Lee la configuración de localStorage (si existe)
function loadNotationFromStorage() {
  const saved = window.localStorage.getItem(STORAGE_KEY_NOTATION);
  if (saved === "latina" || saved === "anglo") {
    state.notation = saved;
  }
}

// Lee el nivel de localStorage (si existe)
function loadLevelFromStorage() {
  const saved = window.localStorage.getItem(STORAGE_KEY_LEVEL);
  if (saved === "1" || saved === "2") {
    state.level = Number(saved);
  }
}

function loadSoundFromStorage() {
  const saved = window.localStorage.getItem(STORAGE_KEY_SOUND);
  if (saved === "true") {
    state.soundEnabled = true;
  }
}

// Guarda la configuración actual en localStorage
function saveNotationToStorage() {
  window.localStorage.setItem(STORAGE_KEY_NOTATION, state.notation);
}

function saveLevelToStorage() {
  window.localStorage.setItem(STORAGE_KEY_LEVEL, String(state.level));
}

function saveSoundToStorage() {
  window.localStorage.setItem(STORAGE_KEY_SOUND, String(state.soundEnabled));
}

// Devuelve el conjunto de notas correspondiente al nivel actual
function getCurrentNotes() {
  return state.level === 2 ? NOTES_LEVEL2 : NOTES_LEVEL1;
}

// ============================
// Sección: Configuración
// ============================

function setupConfigPanel() {
  const latinaRadio = document.getElementById("notation-latina");
  const angloRadio = document.getElementById("notation-anglo");
  const soundCheckbox = document.getElementById("sound-enabled");
  if (!latinaRadio || !angloRadio) return;

  // Marcar el radio correcto según el estado actual
  if (state.notation === "anglo") {
    angloRadio.checked = true;
  } else {
    latinaRadio.checked = true;
  }

  if (soundCheckbox) {
    soundCheckbox.checked = state.soundEnabled;
  }

  // Al cambiar la selección, actualizamos el estado y refrescamos vistas
  const handleChange = (notation) => {
    state.notation = notation;
    saveNotationToStorage();
    renderTheorySection();
    renderGameUI();
  };

  latinaRadio.addEventListener("change", () => handleChange("latina"));
  angloRadio.addEventListener("change", () => handleChange("anglo"));

  if (soundCheckbox) {
    soundCheckbox.addEventListener("change", () => {
      state.soundEnabled = soundCheckbox.checked;
      saveSoundToStorage();

      if (state.soundEnabled) {
        ensureAudioContext();
      }
    });
  }
}

// Configura los botones de nivel para Teoría y Juego
function setupLevelControls() {
  const levelButtons = document.querySelectorAll("[data-level-select]");
  if (!levelButtons.length) return;

  const applyLevelToButtons = () => {
    levelButtons.forEach((btn) => {
      const level = Number(btn.getAttribute("data-level-select"));
      btn.classList.toggle("level-btn--active", level === state.level);
    });
  };

  levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedLevel = Number(btn.getAttribute("data-level-select"));
      if (selectedLevel !== 1 && selectedLevel !== 2) return;
      state.level = selectedLevel;
      saveLevelToStorage();
      applyLevelToButtons();
      renderTheorySection();
      syncGameNoteWithLevel();
      renderGameUI();
    });
  });

  applyLevelToButtons();
}

// ============================
// Sección: Teoría
// ============================

// Convierte la posición relativa (0–100 dentro de .staff-lines) a porcentaje
// dentro del alto total del staff (usamos un área central del 60% de alto).
function getNoteTopPercentFromRel(rel) {
  const topRegion = 20; // .staff-lines top: 20%
  const regionHeight = 60; // 20% a 80%
  // Pequeño ajuste (+1) para centrar mejor la cabeza de la nota
  // sobre la línea o espacio correspondiente, sin que quede demasiado baja.
  return topRegion + (regionHeight * rel) / 100 + 1;
}

function clearElementChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playFeedbackSound(kind) {
  if (!state.soundEnabled) return;

  const context = ensureAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const now = context.currentTime;

  oscillator.type = "sine";

  if (kind === "success") {
    oscillator.frequency.setValueAtTime(523.25, now);
    oscillator.frequency.exponentialRampToValueAtTime(659.25, now + 0.16);
  } else {
    oscillator.frequency.setValueAtTime(261.63, now);
    oscillator.frequency.exponentialRampToValueAtTime(196, now + 0.2);
  }

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.3);
}

function renderTheorySection() {
  const notesLayer = document.getElementById("theory-notes");
  const list = document.getElementById("theory-note-list");
  if (!notesLayer || !list) return;

  clearElementChildren(notesLayer);
  clearElementChildren(list);

  const notesToShow = getCurrentNotes();

  // Recorremos todas las notas y dibujamos su círculo y etiqueta
  notesToShow.forEach((note, index) => {
    const noteEl = document.createElement("div");
    // En teoría mostramos la nota con su plica (palito)
    noteEl.className = "note note--stem-up";

    // Posición horizontal repartida de izquierda a derecha, aprovechando más ancho
    const leftPercent =
      notesToShow.length === 1
        ? 50
        : 18 + (index * 74) / (notesToShow.length - 1);
    noteEl.style.left = `${leftPercent}%`;

    // Posición vertical calculada desde la posición relativa
    const topPercent = getNoteTopPercentFromRel(note.rel);
    noteEl.style.top = `${topPercent}%`;

    // Etiqueta visible con el nombre de la nota, colocada debajo
    const labelEl = document.createElement("div");
    labelEl.className = "note-label";
    labelEl.textContent = getNoteLabel(note);
    noteEl.appendChild(labelEl);

    // Línea adicional para notas fuera de las 5 líneas principales
    if (note.rel > 100 || note.rel < 0) {
      const ledger = document.createElement("div");
      ledger.className = "ledger-line";
      ledger.style.left = noteEl.style.left;
      ledger.style.top = `${topPercent}%`;
      notesLayer.appendChild(ledger);
    }

    notesLayer.appendChild(noteEl);

    // Etiqueta de la lista de notas
    const li = document.createElement("li");
    li.textContent = `${getNoteLabel(note)} - posición ${index + 1}`;
    list.appendChild(li);
  });
}

// ============================
// Sección: Jugar
// ============================

function pickRandomNote() {
  const notes = getCurrentNotes();
  const index = Math.floor(Math.random() * notes.length);
  return notes[index];
}

// Dibuja la nota actual del juego en el pentagrama
function drawGameNote() {
  const container = document.getElementById("game-note");
  if (!container) return;

  clearElementChildren(container);
  if (!state.currentGameNote) return;

  const note = state.currentGameNote;

  const noteEl = document.createElement("div");
  noteEl.className = "note";

  // Colocamos la nota centrada horizontalmente
  noteEl.style.left = "50%";
  const topPercent = getNoteTopPercentFromRel(note.rel);
  noteEl.style.top = `${topPercent}%`;
  // En el juego no mostramos el nombre de la nota, solo la figura negra

  // Línea adicional para notas fuera de las 5 líneas principales
  if (note.rel > 100 || note.rel < 0) {
    const ledger = document.createElement("div");
    ledger.className = "ledger-line";
    ledger.style.left = "50%";
    ledger.style.top = `${topPercent}%`;
    container.appendChild(ledger);
  }

  container.appendChild(noteEl);
}

// Crea los botones de opciones según la nomenclatura actual
function renderOptions() {
  const container = document.getElementById("options-container");
  const feedbackEl = document.getElementById("feedback");
  if (!container || !feedbackEl) return;

  clearElementChildren(container);
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  // Para esta versión simple, las 7 notas básicas son las opciones,
  // independientemente de si la nota que suena es grave o aguda.
  BASE_PITCHES.forEach((pitch) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent =
      state.notation === "latina" ? pitch.latin : pitch.anglo;
    btn.addEventListener("click", () => handleAnswer(pitch));
    container.appendChild(btn);
  });
}

// Maneja la respuesta del usuario
function handleAnswer(selectedNote) {
  const feedbackEl = document.getElementById("feedback");
  if (!feedbackEl || !state.currentGameNote) return;
  const correctLabel = getNoteLabel(state.currentGameNote);

  // Deshabilitamos los botones después de responder
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((btn) => {
    btn.classList.add("disabled");
    btn.disabled = true;
  });

  if (selectedNote.id === state.currentGameNote.id) {
    state.scoreCorrect += 1;
    feedbackEl.textContent = `¡Correcto! Era ${correctLabel}.`;
    feedbackEl.className = "feedback correct";
    playFeedbackSound("success");
  } else {
    state.scoreWrong += 1;
    feedbackEl.textContent = `No es correcto. La nota correcta era ${correctLabel}.`;
    feedbackEl.className = "feedback wrong";
    playFeedbackSound("error");
  }

  updateScore();
}

// Actualiza los valores de puntaje en la interfaz
function updateScore() {
  const correctEl = document.getElementById("score-correct");
  const wrongEl = document.getElementById("score-wrong");
  if (!correctEl || !wrongEl) return;
  correctEl.textContent = String(state.scoreCorrect);
  wrongEl.textContent = String(state.scoreWrong);
}

// Prepara una nueva ronda del juego
function nextGameRound() {
  state.currentGameNote = pickRandomNote();
  drawGameNote();
  renderOptions();
}

function syncGameNoteWithLevel() {
  if (!state.currentGameNote) return;

  const noteExistsInLevel = getCurrentNotes().some((note) => {
    return note.id === state.currentGameNote.id && note.rel === state.currentGameNote.rel;
  });

  if (!noteExistsInLevel) {
    state.currentGameNote = pickRandomNote();
  }
}

// Configura la lógica general del juego
function setupGame() {
  const nextBtn = document.getElementById("next-note-btn");
  if (!nextBtn) return;

  nextBtn.addEventListener("click", () => {
    nextGameRound();
  });

  // Empezamos con una primera nota
  nextGameRound();
}

// Refresca elementos del juego cuando cambia la nomenclatura
function renderGameUI() {
  drawGameNote();
  renderOptions();
}

// ============================
// Inicialización
// ============================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Cargar configuración guardada (si existe)
  loadNotationFromStorage();
  loadLevelFromStorage();
  loadSoundFromStorage();

  // 2. Preparar panel de configuración
  setupConfigPanel();

  // 3. Configurar controles de nivel (teoría + juego)
  setupLevelControls();

  // 4. Dibujar sección de teoría inicial
  renderTheorySection();

  // 5. Iniciar juego
  setupGame();
});
