const DEFAULT_ITEMS = [
  "Cantar una canción",
  "10 sentadillas",
  "Imitar a un animal",
  "Contar un chiste",
  "Hablar sin mover las manos",
  "Bailar 30 segundos"
];

const STORAGE_KEY = "rozti-roulette-items-v2";

const state = {
  items: loadItems(),
  rotation: 0,
  spinning: false,
  idleSpeed: 7,
  spinDuration: 5,
  soundEnabled: true,
  audio: null,
  humGain: null,
  humOsc: null,
  lastCrossedIndex: null,
  winnerIndex: null,
  winnerPulse: 0
};

const els = {
  canvas: document.getElementById("wheelCanvas"),
  ctx: document.getElementById("wheelCanvas").getContext("2d"),
  pointer: document.getElementById("pointer"),
  spinButton: document.getElementById("spinButton"),
  itemsList: document.getElementById("itemsList"),
  countLabel: document.getElementById("countLabel"),
  statusPill: document.getElementById("statusPill"),
  addForm: document.getElementById("addForm"),
  itemInput: document.getElementById("itemInput"),
  clearButton: document.getElementById("clearButton"),
  resetButton: document.getElementById("resetButton"),
  idleSpeed: document.getElementById("idleSpeed"),
  spinDuration: document.getElementById("spinDuration"),
  soundEnabled: document.getElementById("soundEnabled"),
  resultModal: document.getElementById("resultModal"),
  resultText: document.getElementById("resultText"),
  againButton: document.getElementById("againButton")
};

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : [...DEFAULT_ITEMS];
  } catch {
    return [...DEFAULT_ITEMS];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function setStatus(text) {
  els.statusPill.textContent = text;
}

function sectorColor(index) {
  const palette = ["#347cf3", "#0e1730", "#24458d", "#07101f", "#2d74e5", "#0a1323"];
  return palette[index % palette.length];
}

function renderItems() {
  els.itemsList.innerHTML = "";
  els.countLabel.textContent = `(${state.items.length})`;

  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-row";

    const dot = document.createElement("span");
    dot.className = "item-dot";
    dot.style.background = sectorColor(index);

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = item;

    const remove = document.createElement("button");
    remove.className = "item-delete";
    remove.type = "button";
    remove.title = "Eliminar";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      if (state.spinning) return;
      state.items.splice(index, 1);
      state.winnerIndex = null;
      saveItems();
      renderItems();
      drawWheel();
    });

    row.append(dot, text, remove);
    els.itemsList.appendChild(row);
  });

  els.spinButton.disabled = state.items.length < 2;
  if (state.items.length < 2 && !state.spinning) {
    setStatus("Agrega al menos 2 elementos");
  } else if (!state.spinning) {
    setStatus("Lista para girar");
  }
}

function resizeCanvas() {
  const rect = els.canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  els.canvas.width = Math.round(rect.width * dpr);
  els.canvas.height = Math.round(rect.height * dpr);
  els.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawWheel();
}

function drawWheel() {
  const ctx = els.ctx;
  const rect = els.canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 13;

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.shadowColor = "rgba(52,124,243,.28)";
  ctx.shadowBlur = state.spinning ? 30 : 16;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.fillStyle = "#08101e";
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#11213a";
  ctx.fill();

  if (!state.items.length) return;

  const slice = (Math.PI * 2) / state.items.length;
  const startOffset = -Math.PI / 2 - slice / 2;

  for (let i = 0; i < state.items.length; i++) {
    const start = startOffset + i * slice;
    const end = start + slice;
    const isWinner = state.winnerIndex === i;
    const pulse = isWinner ? 0.5 + Math.sin(state.winnerPulse) * 0.18 : 0;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius - 2, start, end);
    ctx.closePath();

    ctx.fillStyle = sectorColor(i);
    ctx.fill();

    if (isWinner) {
      ctx.shadowColor = `rgba(255,224,94,${0.6 + pulse * 0.2})`;
      ctx.shadowBlur = 22 + pulse * 18;
      ctx.lineWidth = 5 + pulse * 4;
      ctx.strokeStyle = `rgba(255,238,137,${0.88 + pulse * 0.1})`;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,224,94,${0.12 + pulse * 0.08})`;
      ctx.fill();
    }

    ctx.lineWidth = isWinner ? 3 : 2;
    ctx.strokeStyle = isWinner
      ? "rgba(255,245,174,.96)"
      : "rgba(145,180,230,.62)";
    ctx.stroke();

    ctx.restore();

    drawLabel(ctx, state.items[i], start + slice / 2, slice, cx, cy, radius);
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
  ctx.lineWidth = state.spinning ? 5 : 3;
  ctx.strokeStyle = state.spinning
    ? "rgba(68,139,255,.85)"
    : "rgba(54,126,243,.58)";
  ctx.shadowColor = "rgba(63,134,255,.58)";
  ctx.shadowBlur = state.spinning ? 24 : 12;
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.145, 0, Math.PI * 2);
  ctx.fillStyle = "#091426";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#1b83ff";
  ctx.stroke();
}

function drawLabel(ctx, text, angle, slice, cx, cy, radius) {
  const fontSize = Math.max(12, Math.min(19, radius * 0.048));
  const maxWidth = radius * 0.78;
  let label = text;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  if (Math.cos(angle) < 0) ctx.rotate(Math.PI);

  ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f6f8ff";
  ctx.shadowColor = "rgba(0,0,0,.38)";
  ctx.shadowBlur = 4;

  if (ctx.measureText(label).width > maxWidth) {
    let trimmed = label;
    while (trimmed.length > 4 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    label = `${trimmed}…`;
  }

  ctx.fillText(label, radius * 0.62, 0);
  ctx.restore();
}

function applyRotation() {
  els.canvas.style.transform = `rotate(${state.rotation}deg)`;
}

function setWheelGlow(active) {
  els.canvas.classList.toggle("glow", active);
}

function pointerTick() {
  els.pointer.classList.remove("tick");
  void els.pointer.offsetWidth;
  els.pointer.classList.add("tick");
}

function winnerHighlightAnimation() {
  const started = performance.now();

  function animate(now) {
    state.winnerPulse = (now - started) / 110;
    drawWheel();

    if (now - started < 1900 && state.winnerIndex !== null) {
      requestAnimationFrame(animate);
    } else {
      state.winnerPulse = 0;
      drawWheel();
    }
  }

  requestAnimationFrame(animate);
}

let lastTime = performance.now();

function idleLoop(now) {
  const dt = Math.min(40, now - lastTime) / 1000;
  lastTime = now;

  if (!state.spinning && state.items.length >= 2) {
    state.rotation += state.idleSpeed * dt;
    applyRotation();
  }

  requestAnimationFrame(idleLoop);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

async function spin() {
  if (state.spinning || state.items.length < 2) return;

  state.spinning = true;
  state.winnerIndex = null;
  state.winnerPulse = 0;
  state.lastCrossedIndex = null;
  els.spinButton.disabled = true;
  setWheelGlow(true);
  drawWheel();
  setStatus("Girando…");

  await ensureAudio();
  startSpinSound();

  const count = state.items.length;
  const sliceDeg = 360 / count;
  const winner = Math.floor(Math.random() * count);

  const desiredModulo = mod(-winner * sliceDeg, 360);
  const currentModulo = mod(state.rotation, 360);
  let delta = desiredModulo - currentModulo;
  if (delta < 0) delta += 360;

  const extraTurns = 5 + Math.floor(Math.random() * 3);
  const startRotation = state.rotation;
  const targetRotation = startRotation + extraTurns * 360 + delta;
  const totalDelta = targetRotation - startRotation;
  const duration = Number(els.spinDuration.value) * 1000;
  const startTime = performance.now();

  return new Promise(resolve => {
    function animate(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);

      state.rotation = startRotation + totalDelta * eased;
      applyRotation();

      const normalized = mod(-state.rotation, 360);
      const currentIndex = Math.floor(normalized / sliceDeg);

      if (currentIndex !== state.lastCrossedIndex) {
        state.lastCrossedIndex = currentIndex;
        pointerTick();
        tickSound(0.038 + progress * 0.025);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        state.rotation = targetRotation;
        applyRotation();
        stopSpinSound();

        state.spinning = false;
        state.winnerIndex = winner;
        state.winnerPulse = 0;
        setWheelGlow(true);
        drawWheel();

        els.spinButton.disabled = state.items.length < 2;
        setStatus(`Resultado: ${state.items[winner]}`);

        resultSound();
        winnerHighlightAnimation();
        showResult(state.items[winner]);

        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

function showResult(text) {
  els.resultText.textContent = text;
  els.resultText.classList.remove("winner-pop");
  void els.resultText.offsetWidth;
  els.resultText.classList.add("winner-pop");
  els.resultModal.classList.add("open");
  els.resultModal.setAttribute("aria-hidden", "false");
}

function closeResult() {
  els.resultModal.classList.remove("open");
  els.resultModal.setAttribute("aria-hidden", "true");
}

async function ensureAudio() {
  if (!state.soundEnabled) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!state.audio) state.audio = new AudioCtx();
  if (state.audio.state === "suspended") await state.audio.resume();
}

function startSpinSound() {
  if (!state.soundEnabled || !state.audio) return;
  const ctx = state.audio;
  stopSpinSound();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.value = 62;
  gain.gain.value = 0.025;

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();

  state.humOsc = osc;
  state.humGain = gain;
}

function stopSpinSound() {
  if (!state.humOsc || !state.audio) return;
  const now = state.audio.currentTime;

  try {
    state.humGain.gain.cancelScheduledValues(now);
    state.humGain.gain.setValueAtTime(state.humGain.gain.value, now);
    state.humGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    state.humOsc.stop(now + 0.13);
  } catch {}

  state.humOsc = null;
  state.humGain = null;
}

function tickSound(volume = 0.055) {
  if (!state.soundEnabled || !state.audio) return;
  const ctx = state.audio;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.035);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.045);
}

function resultSound() {
  if (!state.soundEnabled || !state.audio) return;
  const ctx = state.audio;
  const start = ctx.currentTime;

  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = start + i * 0.11;

    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  });
}

els.addForm.addEventListener("submit", event => {
  event.preventDefault();
  const text = els.itemInput.value.trim();
  if (!text || state.spinning) return;

  state.items.push(text);
  state.winnerIndex = null;
  els.itemInput.value = "";
  saveItems();
  renderItems();
  drawWheel();
  els.itemInput.focus();
});

els.clearButton.addEventListener("click", () => {
  if (state.spinning) return;
  state.items = [];
  state.winnerIndex = null;
  saveItems();
  renderItems();
  drawWheel();
});

els.resetButton.addEventListener("click", () => {
  if (state.spinning) return;
  state.items = [...DEFAULT_ITEMS];
  state.winnerIndex = null;
  saveItems();
  renderItems();
  drawWheel();
});

els.idleSpeed.addEventListener("input", e => state.idleSpeed = Number(e.target.value));
els.spinDuration.addEventListener("input", e => state.spinDuration = Number(e.target.value));

els.soundEnabled.addEventListener("change", async e => {
  state.soundEnabled = e.target.checked;
  if (state.soundEnabled) await ensureAudio();
  else stopSpinSound();
});

els.spinButton.addEventListener("click", spin);
els.againButton.addEventListener("click", () => {
  closeResult();
  spin();
});

document.querySelectorAll("[data-close-modal]").forEach(node => {
  node.addEventListener("click", closeResult);
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeResult();
  if (e.code === "Space" &&
      document.activeElement.tagName !== "INPUT" &&
      !state.spinning) {
    e.preventDefault();
    spin();
  }
});

window.addEventListener("resize", resizeCanvas);
renderItems();
resizeCanvas();
requestAnimationFrame(idleLoop);
