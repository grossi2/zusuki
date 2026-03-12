import {
  fetchGameSessions,
  isFirebaseReady,
  saveGameSession,
  signInWithGoogle,
  signOutCurrentUser,
  subscribeToAuth,
} from "./firebase.js";

// ============================
// Configuracion basica
// ============================

const STORAGE_KEY_NOTATION = "music_level1_notation";
const STORAGE_KEY_LEVEL = "music_level_level";
const STORAGE_KEY_SOUND = "music_level1_sound";

const NOTES_LEVEL1 = [
  { id: "do", latin: "Do", anglo: "C", rel: 125 },
  { id: "re", latin: "Re", anglo: "D", rel: 112.5 },
  { id: "mi", latin: "Mi", anglo: "E", rel: 100 },
  { id: "fa", latin: "Fa", anglo: "F", rel: 87.5 },
  { id: "sol", latin: "Sol", anglo: "G", rel: 75 },
  { id: "la", latin: "La", anglo: "A", rel: 62.5 },
  { id: "si", latin: "Si", anglo: "B", rel: 50 },
];

const NOTES_HIGH = [
  { id: "do", latin: "Do", anglo: "C", rel: 37.5 },
  { id: "re", latin: "Re", anglo: "D", rel: 25 },
  { id: "mi", latin: "Mi", anglo: "E", rel: 12.5 },
  { id: "fa", latin: "Fa", anglo: "F", rel: 0 },
  { id: "sol", latin: "Sol", anglo: "G", rel: -12.5 },
  { id: "la", latin: "La", anglo: "A", rel: -25 },
];

const NOTES_LEVEL2 = [...NOTES_LEVEL1, ...NOTES_HIGH];

const BASE_PITCHES = [
  { id: "do", latin: "Do", anglo: "C" },
  { id: "re", latin: "Re", anglo: "D" },
  { id: "mi", latin: "Mi", anglo: "E" },
  { id: "fa", latin: "Fa", anglo: "F" },
  { id: "sol", latin: "Sol", anglo: "G" },
  { id: "la", latin: "La", anglo: "A" },
  { id: "si", latin: "Si", anglo: "B" },
];

const state = {
  notation: "latina",
  level: 1,
  soundEnabled: false,
  currentGameNote: null,
  scoreCorrect: 0,
  scoreWrong: 0,
  user: null,
  firebaseReady: isFirebaseReady(),
  sessionId: createSessionId(),
  sessionStartedAtMs: Date.now(),
  sessionDirty: false,
};

let audioContext = null;

function createSessionId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getCurrentNotes() {
  return state.level === 2 ? NOTES_LEVEL2 : NOTES_LEVEL1;
}

function getNoteLabel(note) {
  return state.notation === "latina" ? note.latin : note.anglo;
}

function getDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDayKey(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(dayKey) {
  return parseDayKey(dayKey).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatLongDate(dayKey) {
  return parseDayKey(dayKey).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function loadNotationFromStorage() {
  const saved = window.localStorage.getItem(STORAGE_KEY_NOTATION);
  if (saved === "latina" || saved === "anglo") {
    state.notation = saved;
  }
}

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

function saveNotationToStorage() {
  window.localStorage.setItem(STORAGE_KEY_NOTATION, state.notation);
}

function saveLevelToStorage() {
  window.localStorage.setItem(STORAGE_KEY_LEVEL, String(state.level));
}

function saveSoundToStorage() {
  window.localStorage.setItem(STORAGE_KEY_SOUND, String(state.soundEnabled));
}

function clearElementChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function getNoteTopPercentFromRel(rel) {
  const topRegion = 20;
  const regionHeight = 60;
  return topRegion + (regionHeight * rel) / 100 + 1;
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

function updateAuthUI() {
  const loginButtons = document.querySelectorAll("[data-auth-login]");
  const logoutButtons = document.querySelectorAll("[data-auth-logout]");
  const userLabels = document.querySelectorAll("[data-auth-user]");
  const statusLabels = document.querySelectorAll("[data-auth-status]");

  const user = state.user;
  const configured = state.firebaseReady;

  loginButtons.forEach((button) => {
    button.disabled = !configured || Boolean(user);
  });

  logoutButtons.forEach((button) => {
    button.disabled = !configured || !user;
  });

  userLabels.forEach((label) => {
    label.textContent = user ? user.displayName || user.email || "Sesion iniciada" : "Invitado";
  });

  statusLabels.forEach((label) => {
    if (!configured) {
      label.textContent = "Firebase no esta configurado todavia.";
    } else if (user) {
      label.textContent = user.email || "Sesion iniciada con Google.";
    } else {
      label.textContent = "Inicia sesion para guardar y consultar estadisticas.";
    }
  });
}

function updateSaveStatsUI(message = "") {
  const button = document.getElementById("save-stats-btn");
  const status = document.getElementById("save-stats-status");
  if (!button || !status) return;

  const hasProgress = state.scoreCorrect + state.scoreWrong > 0;

  if (!state.firebaseReady) {
    button.disabled = true;
    status.textContent = "Configura Firebase para guardar estadisticas.";
    return;
  }

  if (!state.user) {
    button.disabled = true;
    status.textContent = "Inicia sesion para guardar tus resultados.";
    return;
  }

  if (!hasProgress) {
    button.disabled = true;
    status.textContent = "Responde al menos una nota para guardar la sesion.";
    return;
  }

  button.disabled = false;
  status.textContent = message || "Sesion lista para guardar.";
}

function getFirebaseErrorMessage(error, fallbackMessage) {
  const code = error && typeof error.code === "string" ? error.code : "";

  if (code === "permission-denied") {
    return "Firestore rechazo la escritura. Revisa las reglas de seguridad.";
  }

  if (code === "unavailable") {
    return "Firestore no esta disponible en este momento.";
  }

  if (code === "failed-precondition") {
    return "Firestore no esta listo o falta configuracion requerida.";
  }

  if (code === "not-found") {
    return "No se encontro la base de datos Firestore.";
  }

  if (code) {
    return `${fallbackMessage} (${code})`;
  }

  return fallbackMessage;
}

function setupAuthUI() {
  document.querySelectorAll("[data-auth-login]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await signInWithGoogle();
      } catch (error) {
        const statusLabels = document.querySelectorAll("[data-auth-status]");
        statusLabels.forEach((label) => {
          label.textContent = "No se pudo iniciar sesion con Google.";
        });
      }
    });
  });

  document.querySelectorAll("[data-auth-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await signOutCurrentUser();
      } catch (error) {
        const statusLabels = document.querySelectorAll("[data-auth-status]");
        statusLabels.forEach((label) => {
          label.textContent = "No se pudo cerrar la sesion.";
        });
      }
    });
  });

  subscribeToAuth((user) => {
    state.user = user;
    updateAuthUI();
    updateSaveStatsUI();
    renderStatsPage();
  });
}

function setupConfigPanel() {
  const latinaRadio = document.getElementById("notation-latina");
  const angloRadio = document.getElementById("notation-anglo");
  const soundCheckbox = document.getElementById("sound-enabled");
  if (!latinaRadio || !angloRadio) return;

  if (state.notation === "anglo") {
    angloRadio.checked = true;
  } else {
    latinaRadio.checked = true;
  }

  if (soundCheckbox) {
    soundCheckbox.checked = state.soundEnabled;
  }

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

function renderTheorySection() {
  const notesLayer = document.getElementById("theory-notes");
  const list = document.getElementById("theory-note-list");
  if (!notesLayer || !list) return;

  clearElementChildren(notesLayer);
  clearElementChildren(list);

  const notesToShow = getCurrentNotes();

  notesToShow.forEach((note, index) => {
    const noteEl = document.createElement("div");
    noteEl.className = "note note--stem-up";

    const leftPercent =
      notesToShow.length === 1 ? 50 : 18 + (index * 74) / (notesToShow.length - 1);
    noteEl.style.left = `${leftPercent}%`;

    const topPercent = getNoteTopPercentFromRel(note.rel);
    noteEl.style.top = `${topPercent}%`;

    const labelEl = document.createElement("div");
    labelEl.className = "note-label";
    labelEl.textContent = getNoteLabel(note);
    noteEl.appendChild(labelEl);

    if (note.rel > 100 || note.rel < 0) {
      const ledger = document.createElement("div");
      ledger.className = "ledger-line";
      ledger.style.left = noteEl.style.left;
      ledger.style.top = `${topPercent}%`;
      notesLayer.appendChild(ledger);
    }

    notesLayer.appendChild(noteEl);

    const li = document.createElement("li");
    li.textContent = `${getNoteLabel(note)} - posicion ${index + 1}`;
    list.appendChild(li);
  });
}

function pickRandomNote() {
  const notes = getCurrentNotes();
  const index = Math.floor(Math.random() * notes.length);
  return notes[index];
}

function drawGameNote() {
  const container = document.getElementById("game-note");
  if (!container) return;

  clearElementChildren(container);
  if (!state.currentGameNote) return;

  const note = state.currentGameNote;
  const noteEl = document.createElement("div");
  noteEl.className = "note";
  noteEl.style.left = "50%";

  const topPercent = getNoteTopPercentFromRel(note.rel);
  noteEl.style.top = `${topPercent}%`;

  if (note.rel > 100 || note.rel < 0) {
    const ledger = document.createElement("div");
    ledger.className = "ledger-line";
    ledger.style.left = "50%";
    ledger.style.top = `${topPercent}%`;
    container.appendChild(ledger);
  }

  container.appendChild(noteEl);
}

function renderOptions() {
  const container = document.getElementById("options-container");
  const feedbackEl = document.getElementById("feedback");
  if (!container || !feedbackEl) return;

  clearElementChildren(container);
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  BASE_PITCHES.forEach((pitch) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = state.notation === "latina" ? pitch.latin : pitch.anglo;
    btn.addEventListener("click", () => handleAnswer(pitch));
    container.appendChild(btn);
  });
}

function handleAnswer(selectedNote) {
  const feedbackEl = document.getElementById("feedback");
  if (!feedbackEl || !state.currentGameNote) return;

  const correctLabel = getNoteLabel(state.currentGameNote);
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((btn) => {
    btn.classList.add("disabled");
    btn.disabled = true;
  });

  if (selectedNote.id === state.currentGameNote.id) {
    state.scoreCorrect += 1;
    feedbackEl.textContent = `Correcto. Era ${correctLabel}.`;
    feedbackEl.className = "feedback correct";
    playFeedbackSound("success");
  } else {
    state.scoreWrong += 1;
    feedbackEl.textContent = `No es correcto. La nota correcta era ${correctLabel}.`;
    feedbackEl.className = "feedback wrong";
    playFeedbackSound("error");
  }

  state.sessionDirty = true;
  updateScore();
  updateSaveStatsUI();
}

function updateScore() {
  const correctEl = document.getElementById("score-correct");
  const wrongEl = document.getElementById("score-wrong");
  if (!correctEl || !wrongEl) return;

  correctEl.textContent = String(state.scoreCorrect);
  wrongEl.textContent = String(state.scoreWrong);
}

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

async function persistCurrentSession() {
  try {
    await saveGameSession({
      sessionId: state.sessionId,
      sessionStartedAtMs: state.sessionStartedAtMs,
      correctCount: state.scoreCorrect,
      wrongCount: state.scoreWrong,
      level: state.level,
      notation: state.notation,
      savedAtMs: Date.now(),
      savedDateKey: getDayKey(new Date()),
    });

    state.sessionDirty = false;
    updateSaveStatsUI("Estadisticas guardadas correctamente.");
    renderStatsPage();
  } catch (error) {
    console.error("Error al guardar estadisticas", error);
    updateSaveStatsUI(
      getFirebaseErrorMessage(error, "No se pudieron guardar las estadisticas.")
    );
  }
}

function setupGame() {
  const nextBtn = document.getElementById("next-note-btn");
  const saveStatsBtn = document.getElementById("save-stats-btn");
  if (!nextBtn) return;

  nextBtn.addEventListener("click", () => {
    nextGameRound();
  });

  if (saveStatsBtn) {
    saveStatsBtn.addEventListener("click", async () => {
      saveStatsBtn.disabled = true;
      updateSaveStatsUI("Guardando estadisticas...");
      await persistCurrentSession();
    });
  }

  nextGameRound();
  updateScore();
  updateSaveStatsUI();
}

function renderGameUI() {
  drawGameNote();
  renderOptions();
  updateSaveStatsUI();
}

function aggregateSessionsByDay(sessions) {
  const perDay = new Map();

  sessions.forEach((session) => {
    const dayKey = session.savedDateKey || getDayKey(new Date(session.savedAtMs));
    const current = perDay.get(dayKey) || {
      dayKey,
      correct: 0,
      wrong: 0,
      sessions: 0,
    };

    current.correct += Number(session.correctCount || 0);
    current.wrong += Number(session.wrongCount || 0);
    current.sessions += 1;
    perDay.set(dayKey, current);
  });

  return [...perDay.values()]
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
    .map((entry) => ({
      ...entry,
      score: entry.correct - entry.wrong,
    }));
}

function summarizePeriod(dailyStats, rangeInDays) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (rangeInDays - 1));

  return dailyStats.reduce(
    (acc, entry) => {
      const entryDate = parseDayKey(entry.dayKey);
      if (entryDate >= cutoff) {
        acc.correct += entry.correct;
        acc.wrong += entry.wrong;
        acc.score += entry.score;
      }
      return acc;
    },
    { correct: 0, wrong: 0, score: 0 }
  );
}

function renderSummaryCard(cardId, labelId, values) {
  const card = document.getElementById(cardId);
  const label = document.getElementById(labelId);
  if (!card || !label) return;

  card.querySelector("[data-stat-correct]").textContent = String(values.correct);
  card.querySelector("[data-stat-wrong]").textContent = String(values.wrong);
  card.querySelector("[data-stat-score]").textContent = String(values.score);
  label.textContent = values.label;
}

function renderStatsTable(dailyStats) {
  const body = document.getElementById("stats-table-body");
  if (!body) return;

  clearElementChildren(body);

  if (!dailyStats.length) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="5" class="stats-empty-cell">Todavia no hay estadisticas guardadas.</td>';
    body.appendChild(row);
    return;
  }

  [...dailyStats].reverse().forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatLongDate(entry.dayKey)}</td>
      <td>${entry.correct}</td>
      <td>${entry.wrong}</td>
      <td>${entry.score}</td>
      <td>${entry.sessions}</td>
    `;
    body.appendChild(row);
  });
}

function renderStatsChart(dailyStats) {
  const chart = document.getElementById("stats-chart");
  const emptyState = document.getElementById("stats-chart-empty");
  if (!chart || !emptyState) return;

  clearElementChildren(chart);

  if (!dailyStats.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  const width = 720;
  const height = 260;
  const padding = 30;
  const maxValue = Math.max(
    1,
    ...dailyStats.flatMap((entry) => [entry.correct, entry.wrong])
  );

  const stepX = dailyStats.length === 1 ? 0 : (width - padding * 2) / (dailyStats.length - 1);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "stats-chart-svg");

  const buildPoints = (field) =>
    dailyStats
      .map((entry, index) => {
        const x = padding + index * stepX;
        const y = height - padding - ((entry[field] || 0) / maxValue) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");

  const grid = document.createElementNS("http://www.w3.org/2000/svg", "line");
  grid.setAttribute("x1", String(padding));
  grid.setAttribute("y1", String(height - padding));
  grid.setAttribute("x2", String(width - padding));
  grid.setAttribute("y2", String(height - padding));
  grid.setAttribute("class", "chart-axis");
  svg.appendChild(grid);

  const correctLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  correctLine.setAttribute("points", buildPoints("correct"));
  correctLine.setAttribute("class", "chart-line chart-line--correct");
  svg.appendChild(correctLine);

  const wrongLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  wrongLine.setAttribute("points", buildPoints("wrong"));
  wrongLine.setAttribute("class", "chart-line chart-line--wrong");
  svg.appendChild(wrongLine);

  dailyStats.forEach((entry, index) => {
    const x = padding + index * stepX;
    const correctY =
      height - padding - (entry.correct / maxValue) * (height - padding * 2);
    const wrongY = height - padding - (entry.wrong / maxValue) * (height - padding * 2);

    const correctDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    correctDot.setAttribute("cx", String(x));
    correctDot.setAttribute("cy", String(correctY));
    correctDot.setAttribute("r", "4");
    correctDot.setAttribute("class", "chart-dot chart-dot--correct");
    svg.appendChild(correctDot);

    const wrongDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    wrongDot.setAttribute("cx", String(x));
    wrongDot.setAttribute("cy", String(wrongY));
    wrongDot.setAttribute("r", "4");
    wrongDot.setAttribute("class", "chart-dot chart-dot--wrong");
    svg.appendChild(wrongDot);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(height - 8));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-label");
    label.textContent = formatShortDate(entry.dayKey);
    svg.appendChild(label);
  });

  chart.appendChild(svg);
}

async function renderStatsPage() {
  const status = document.getElementById("stats-status");
  const gated = document.getElementById("stats-gated");
  const content = document.getElementById("stats-content");
  if (!status || !gated || !content) return;

  if (!state.firebaseReady) {
    gated.hidden = false;
    content.hidden = true;
    status.textContent = "Configura Firebase para habilitar login y estadisticas.";
    return;
  }

  if (!state.user) {
    gated.hidden = false;
    content.hidden = true;
    status.textContent = "Inicia sesion con Google para ver tus estadisticas.";
    return;
  }

  gated.hidden = true;
  content.hidden = false;
  status.textContent = "Cargando estadisticas...";

  try {
    const sessions = await fetchGameSessions();
    const dailyStats = aggregateSessionsByDay(sessions);
    const todayKey = getDayKey(new Date());
    const todayEntry = dailyStats.find((entry) => entry.dayKey === todayKey) || {
      correct: 0,
      wrong: 0,
      score: 0,
    };
    const weekSummary = summarizePeriod(dailyStats, 7);
    const monthSummary = summarizePeriod(dailyStats, 30);

    renderSummaryCard("stats-card-today", "stats-card-today-label", {
      label: "Hoy",
      correct: todayEntry.correct,
      wrong: todayEntry.wrong,
      score: todayEntry.score,
    });

    renderSummaryCard("stats-card-week", "stats-card-week-label", {
      label: "Ultimos 7 dias",
      correct: weekSummary.correct,
      wrong: weekSummary.wrong,
      score: weekSummary.score,
    });

    renderSummaryCard("stats-card-month", "stats-card-month-label", {
      label: "Ultimos 30 dias",
      correct: monthSummary.correct,
      wrong: monthSummary.wrong,
      score: monthSummary.score,
    });

    renderStatsTable(dailyStats);
    renderStatsChart(dailyStats);
    status.textContent = "Estadisticas actualizadas.";
  } catch (error) {
    console.error("Error al cargar estadisticas", error);
    gated.hidden = false;
    content.hidden = true;
    status.textContent = getFirebaseErrorMessage(
      error,
      "No se pudieron cargar las estadisticas."
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadNotationFromStorage();
  loadLevelFromStorage();
  loadSoundFromStorage();

  setupAuthUI();
  setupConfigPanel();
  setupLevelControls();
  renderTheorySection();
  setupGame();
  updateAuthUI();
  renderStatsPage();
});
