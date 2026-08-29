const DEFAULT_ITEMS = [
  "Cantar una canción",
  "10 sentadillas",
  "Imitar a un animal",
  "Contar un chiste",
  "Hablar sin mover las manos",
  "Bailar 30 segundos",
];

const COLORS = [
  "#2d61cf",
  "#0b1221",
  "#3d82f6",
  "#0b1221",
  "#21489c",
  "#0b1221",
  "#347af0",
  "#0b1221",
];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spinButton");
const centerButton = document.getElementById("centerButton");
const resultText = document.getElementById("resultText");
const itemsElement = document.getElementById("items");
const countElement = document.getElementById("count");
const itemInput = document.getElementById("itemInput");
const addButton = document.getElementById("addButton");
const clearButton = document.getElementById("clearButton");
const resetButton = document.getElementById("resetButton");

const resultModal = document.getElementById("resultModal");
const modalResult = document.getElementById("modalResult");
const closeModalButton = document.getElementById("closeModal");
const modalOkButton = document.getElementById("modalOk");

let items = loadItems();
let rotation = 0;
let spinning = false;
let animationFrame = null;
let idleLastTime = null;
let spinAudio = null;
let audioReady = false;
let lastTickSlice = -1;

// Velocidad de giro lento permanente (radianes por segundo).
const IDLE_SPEED = 0.20;

function loadItems() {
  try {
    const saved = localStorage.getItem("rozii-wheel-items");
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_ITEMS];
  } catch {
    return [...DEFAULT_ITEMS];
  }
}

function saveItems() {
  localStorage.setItem("rozii-wheel-items", JSON.stringify(items));
}

function renderItems() {
  countElement.textContent = items.length;
  itemsElement.innerHTML = "";

  if (!items.length) {
    itemsElement.innerHTML = '<div class="empty">No hay retos. Agrega uno arriba.</div>';
    return;
  }

  items.forEach((text, index) => {
    const row = document.createElement("div");
    row.className = "item";

    const label = document.createElement("div");
    label.className = "item-label";

    const dot = document.createElement("span");
    dot.className = "item-dot";
    dot.style.background = COLORS[index % COLORS.length];

    const span = document.createElement("span");
    span.className = "item-text";
    span.textContent = text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-item";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = "Eliminar";
    deleteButton.addEventListener("click", () => removeItem(index));

    label.append(dot, span);
    row.append(label, deleteButton);
    itemsElement.appendChild(row);
  });
}

function removeItem(index) {
  if (spinning) return;
  items.splice(index, 1);
  saveItems();
  resultText.textContent = "";
  drawWheel();
  renderItems();
}

function addItem() {
  if (spinning) return;

  const value = itemInput.value.trim();
  if (!value) {
    itemInput.focus();
    return;
  }

  items.push(value);
  itemInput.value = "";
  saveItems();
  resultText.textContent = "";
  drawWheel();
  renderItems();
  itemInput.focus();
}

function drawWheel() {
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.455;
  const count = Math.max(items.length, 1);
  const slice = (Math.PI * 2) / count;

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
  ctx.fillStyle = "#050b18";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = "#315da8";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation - Math.PI / 2);

  for (let i = 0; i < count; i++) {
    const start = i * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();

    const color = COLORS[i % COLORS.length];
    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = "rgba(195, 218, 255, 0.34)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (items.length) {
      drawLabel(items[i], start + slice / 2, radius);
    }
  }

  ctx.restore();
}

function drawLabel(text, angle, radius) {
  ctx.save();
  ctx.rotate(angle);

  const maxWidth = radius * 0.58;
  let fontSize = Math.max(17, Math.min(25, radius * 0.08));
  ctx.font = `700 ${fontSize}px Poppins, Arial, sans-serif`;

  while (ctx.measureText(text).width > maxWidth && fontSize > 11) {
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px Poppins, Arial, sans-serif`;
  }

  ctx.fillStyle = "#f4f8ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
  ctx.shadowBlur = 3;

  const x = radius * 0.62;
  const available = radius * 0.72;

  if (ctx.measureText(text).width <= available) {
    ctx.fillText(text, x, 0, available);
  } else {
    const words = text.split(/\s+/);
    let line1 = "";
    let line2 = "";

    for (const word of words) {
      const candidate = line1 ? `${line1} ${word}` : word;
      if (ctx.measureText(candidate).width <= available) {
        line1 = candidate;
      } else {
        line2 = line2 ? `${line2} ${word}` : word;
      }
    }

    if (line2) {
      ctx.fillText(line1, x, -fontSize * 0.62, available);
      ctx.fillText(line2, x, fontSize * 0.62, available);
    } else {
      ctx.fillText(text, x, 0, available);
    }
  }

  ctx.restore();
}

// -------- Sonido generado por Web Audio (no necesitas subir archivos .mp3) --------
function initAudio() {
  if (audioReady) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  spinAudio = new AudioCtx();
  if (spinAudio.state === "suspended") {
    spinAudio.resume().catch(() => {});
  }
  audioReady = true;
}

function playTone({ frequency = 440, duration = 0.08, volume = 0.05, type = "sine", slideTo = null }) {
  if (!spinAudio) return;

  const now = spinAudio.currentTime;
  const osc = spinAudio.createOscillator();
  const gain = spinAudio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(spinAudio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function playSpinStartSound() {
  playTone({ frequency: 180, duration: 0.15, volume: 0.08, type: "sawtooth", slideTo: 420 });
}

function playWheelTick() {
  playTone({ frequency: 760, duration: 0.035, volume: 0.028, type: "square", slideTo: 560 });
}

function playResultSound() {
  if (!spinAudio) return;
  playTone({ frequency: 523.25, duration: 0.11, volume: 0.065, type: "sine" });
  setTimeout(() => playTone({ frequency: 659.25, duration: 0.11, volume: 0.065, type: "sine" }), 85);
  setTimeout(() => playTone({ frequency: 783.99, duration: 0.20, volume: 0.08, type: "sine" }), 170);
}

// -------- Giro lento permanente --------
function idleLoop(now) {
  if (idleLastTime === null) idleLastTime = now;
  const dt = Math.min((now - idleLastTime) / 1000, 0.05);
  idleLastTime = now;

  if (!spinning && !resultModal.classList.contains("open") && items.length > 0) {
    rotation += IDLE_SPEED * dt;
    drawWheel();
  }

  animationFrame = requestAnimationFrame(idleLoop);
}

// Calcula o índice que está sob a flecha no topo.
function getPointerIndex() {
  if (!items.length) return -1;
  const slice = (Math.PI * 2) / items.length;

  // Cada setor comienza en 0 y la ruleta se dibuja con rotation - PI/2.
  // El ángulo del puntero en coordenadas del sector es -rotation.
  const relative = ((-rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor(relative / slice) % items.length;
}

function spin() {
  if (spinning || items.length < 1) return;

  initAudio();
  if (spinAudio?.state === "suspended") {
    spinAudio.resume().catch(() => {});
  }

  spinning = true;
  closeResultModal();
  setControlsDisabled(true);
  resultText.textContent = "";
  playSpinStartSound();

  const count = items.length;
  const slice = (Math.PI * 2) / count;
  const winnerIndex = Math.floor(Math.random() * count);

  // Queremos el centro del segmento ganador exactamente bajo la flecha.
  const winnerCenter = winnerIndex * slice + slice / 2;
  const desiredBase = -winnerCenter;

  const current = rotation;
  const twoPi = Math.PI * 2;
  let target = desiredBase;
  while (target <= current) target += twoPi;

  // Entre 6 y 8 vueltas completas antes de detenerse.
  target += (6 + Math.floor(Math.random() * 3)) * twoPi;

  const startRotation = rotation;
  const delta = target - startRotation;
  const duration = 4600;
  const startTime = performance.now();
  let previousVisualRotation = startRotation;

  function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
  }

  function animate(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easeOutQuint(progress);

    rotation = startRotation + delta * eased;

    // Tick de audio basado en el cruce de cada división de la ruleta.
    const previousIndexAngle = Math.floor((((previousVisualRotation % twoPi) + twoPi) % twoPi) / slice);
    const currentIndexAngle = Math.floor((((rotation % twoPi) + twoPi) % twoPi) / slice);
    if (currentIndexAngle !== previousIndexAngle) {
      playWheelTick();
      lastTickSlice = currentIndexAngle;
    }
    previousVisualRotation = rotation;

    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      spinning = false;
      rotation = target;
      drawWheel();

      resultText.textContent = `🎉 Resultado: ${items[winnerIndex]}`;
      openResultModal(items[winnerIndex]);
      playResultSound();
      setControlsDisabled(false);
    }
  }

  animationFrame = requestAnimationFrame(animate);
}

function setControlsDisabled(disabled) {
  spinButton.disabled = disabled || items.length === 0;
  centerButton.disabled = disabled || items.length === 0;
  addButton.disabled = disabled;
  itemInput.disabled = disabled;
  clearButton.disabled = disabled;
  resetButton.disabled = disabled;

  document.querySelectorAll(".delete-item").forEach((button) => {
    button.disabled = disabled;
  });
}

function openResultModal(result) {
  modalResult.textContent = result;
  resultModal.classList.add("open");
  resultModal.setAttribute("aria-hidden", "false");
  modalOkButton.focus();
}

function closeResultModal() {
  resultModal.classList.remove("open");
  resultModal.setAttribute("aria-hidden", "true");
}

addButton.addEventListener("click", addItem);

itemInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addItem();
});

spinButton.addEventListener("click", spin);
centerButton.addEventListener("click", spin);

clearButton.addEventListener("click", () => {
  if (spinning) return;
  items = [];
  saveItems();
  resultText.textContent = "";
  closeResultModal();
  drawWheel();
  renderItems();
});

resetButton.addEventListener("click", () => {
  if (spinning) return;
  items = [...DEFAULT_ITEMS];
  rotation = 0;
  saveItems();
  resultText.textContent = "";
  closeResultModal();
  drawWheel();
  renderItems();
});

closeModalButton.addEventListener("click", closeResultModal);
modalOkButton.addEventListener("click", closeResultModal);
resultModal.addEventListener("click", (event) => {
  if (event.target.hasAttribute("data-close-modal")) closeResultModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeResultModal();
});

window.addEventListener("resize", drawWheel);

// Iniciar dibujo y giro lento permanente.
drawWheel();
renderItems();
animationFrame = requestAnimationFrame(idleLoop);
