const wordSets = {
  easy: [
    "SANTA", "SNOW", "TREE", "BELL", "STAR", "GIFT", "NOEL", "HOLLY", "CANDY",
    "ANGEL", "CAROL", "CHIME", "CHEER", "COCOA", "CROWN", "ELVES", "GLOBE",
    "GRACE", "ICING", "IVORY", "JOLLY", "LIGHT", "MERRY", "MITTS", "MUSIC",
    "PEACE", "PINE", "SUGAR", "TREAT", "YULE", "WRAP", "WARM", "COZY", "GLOW",
    "FLAKE", "FROST", "MINTY", "NIPPY", "CEDAR", "FEAST", "SNUG", "TOAST",
    "CLOVE", "SLEET", "HARKS",
  ],
  medium: [
    "CANDLE", "MITTEN", "SLEIGH", "CAROLS", "WINTER", "ICICLE", "TINSEL",
    "CHIMES", "SLEDGE", "MANTEL", "ORNATE", "CUPIDS", "WISHES", "WREATH",
    "FROZEN", "JINGLE", "SILVER", "GOLDEN", "SWEETS", "FROSTY", "ICECAP",
    "SNOWED", "BAUBLE", "GIFTED", "JOYFUL", "MISTLE", "HUMBUG", "DANCER",
    "DONNER", "RUDOLF", "VIXENS", "COCOAS", "BLITZEN", "PRANCER", "GARLAND",
    "HOLIDAY", "WINTERS", "SNOWMAN", "KRINGLE", "PRESENT", "SPARKLE",
    "MERRIER", "ICICLES", "SLEDDER", "SWEATER", "FESTIVE", "CANDLES",
    "CAROLER", "GIFTING", "MUSICAL", "JUBILEE", "PUDDING", "SNOWING",
    "SKATING", "HANGING", "STARLIT", "WISHFUL", "YULELOG", "CHILLER",
    "MERRILY",
  ],
  hard: [
    "REINDEER", "STOCKING", "MISTLETOE", "SNOWFLAKE", "SNOWFALL", "EVERGREEN",
    "NUTCRACKER", "CANDLELIT", "CHRISTMAS", "WONDERLAND", "SUGARPLUM",
    "HOLLYBERRY", "NORTHPOLE", "SNOWGLOBE", "FIREPLACE", "TOYMAKER",
    "STARLIGHT", "BELLSLEIGH", "WINTERTIME", "FESTIVITY", "CELEBRATE",
    "GIFTWRAP", "SLEIGHING", "JINGLEBELL", "DECEMBER", "SNOWBANK",
    "FROSTBITE", "TWINKLING", "PEPPERMINT", "GINGERROOT", "SNOWSTORM",
    "ICECRYSTAL", "HOLIDAYING", "HAPPINESS", "JOYFULNESS", "MERRYMAKER",
    "WINTERCOAT", "FLURRIES", "ICESCAPES", "ICEBOUND", "CHIMNEYED",
    "STARGAZER", "GIFTSTACK", "STOCKINGS", "HOMEBOUND", "FROSTING",
    "SNOWDRIFT", "SHIVERING", "CRANBERRY", "MARSHMALL", "CANDYCANE",
    "SWEETROLL", "CHESTNUTS", "REINDEERS", "SANTACLAUS", "YULETIDE",
    "SNOWCAPPED", "ICECASTLE", "GLITTERED", "NIGHTFALL",
  ],
};

const state = {
  currentWord: "",
  tiles: [],
  slots: [],
  shakesLeft: 2,
  shakesUsed: 0,
  streak: 0,
  score: 0,
  solvedCount: 0,
  draggingId: null,
  dragOffset: { x: 0, y: 0 },
  containerRect: null,
  slotRects: [],
  difficulty: "auto",
  hardMode: false,
};

const tilesEl = document.getElementById("tiles");
const slotsEl = document.getElementById("slots");
const messageEl = document.getElementById("message");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const shakesEl = document.getElementById("shakes");
const sackEl = document.getElementById("sack");
const submitBtn = document.getElementById("submit");
const shakeBtn = document.getElementById("shake");
const skipBtn = document.getElementById("skip");
const difficultySelect = document.getElementById("difficulty");
const hardModeToggle = document.getElementById("grinchMode");
const infoBtn = document.getElementById("infoBtn");
const infoModal = document.getElementById("infoModal");
const closeInfo = document.getElementById("closeInfo");
const streakFill = document.getElementById("streakFill");

const shakeDragState = {
  active: false,
  startX: 0,
  startY: 0,
  lastShakeAt: 0,
};

const SHAKE_DRAG_THRESHOLD = 24;
const SHAKE_DRAG_COOLDOWN_MS = 500;
const SNAP_DISTANCE_PX = 70;

function pickWord() {
  const level = state.solvedCount + 1;
  let pool = wordSets.easy;
  if (state.difficulty === "easy") pool = wordSets.easy;
  if (state.difficulty === "medium") pool = wordSets.medium;
  if (state.difficulty === "hard") pool = wordSets.hard;
  if (state.difficulty === "auto") {
    if (level >= 4 && level <= 6) pool = wordSets.medium;
    if (level >= 7) pool = wordSets.hard;
  }
  const word = pool[Math.floor(Math.random() * pool.length)];
  return word.toUpperCase();
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function scrambleWord(word) {
  const letters = word.split("");
  let scrambled = shuffle(letters);
  let safety = 0;
  while (scrambled.join("") === word && safety < 8) {
    scrambled = shuffle(letters);
    safety += 1;
  }
  return scrambled;
}

function buildSlots(count) {
  slotsEl.innerHTML = "";
  state.slots = Array.from({ length: count }, () => null);
  for (let i = 0; i < count; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.index = String(i);
    slotsEl.appendChild(slot);
  }
}

function renderTiles(letters) {
  tilesEl.innerHTML = "";
  state.tiles = letters.map((letter, index) => {
    const id = `tile-${index}-${Date.now()}`;
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.textContent = letter;
    tile.dataset.id = id;
    tile.addEventListener("pointerdown", onPointerDown);
    tilesEl.appendChild(tile);
    return {
      letter,
      id,
      inSlot: false,
      slotIndex: null,
      el: tile,
      x: 0,
      y: 0,
    };
  });
  layoutUnplaced();
}

function pickDecoyLetter(word) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const options = alphabet.filter((letter) => !word.includes(letter));
  if (options.length === 0) return alphabet[Math.floor(Math.random() * alphabet.length)];
  return options[Math.floor(Math.random() * options.length)];
}

function layoutUnplaced() {
  if (!state.containerRect) return;
  const pad = 10;
  const maxX = state.containerRect.width - 70;
  const maxY = state.containerRect.height - 70;
  state.tiles.forEach((tile) => {
    if (tile.inSlot) return;
    const x = pad + Math.random() * Math.max(30, maxX - pad);
    const y = pad + Math.random() * Math.max(10, maxY - pad);
    tile.x = x;
    tile.y = y;
    tile.el.style.left = `${x}px`;
    tile.el.style.top = `${y}px`;
    tile.el.classList.add("blur");
    window.setTimeout(() => tile.el.classList.remove("blur"), 200);
  });
}

function updateRects() {
  state.containerRect = tilesEl.getBoundingClientRect();
  state.slotRects = Array.from(slotsEl.children).map((slot) => {
    const rect = slot.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
    };
  });
}

function snapToSlot(tile, index) {
  const slotRect = state.slotRects[index];
  const tileRect = tile.el.getBoundingClientRect();
  const x = slotRect.centerX - tileRect.width / 2 - state.containerRect.left;
  const y = slotRect.centerY - tileRect.height / 2 - state.containerRect.top;
  tile.x = x;
  tile.y = y;
  tile.el.style.left = `${x}px`;
  tile.el.style.top = `${y}px`;
  tile.inSlot = true;
  tile.slotIndex = index;
  state.slots[index] = tile.id;
  slotsEl.children[index].classList.add("filled");
}

function releaseSlot(tile) {
  if (tile.inSlot && tile.slotIndex !== null) {
    state.slots[tile.slotIndex] = null;
    slotsEl.children[tile.slotIndex].classList.remove("filled");
  }
  tile.inSlot = false;
  tile.slotIndex = null;
}

function onPointerDown(event) {
  const tileEl = event.currentTarget;
  const tile = state.tiles.find((t) => t.id === tileEl.dataset.id);
  if (!tile) return;
  updateRects();
  event.preventDefault();
  tile.el.setPointerCapture(event.pointerId);
  state.draggingId = tile.id;
  tile.el.classList.add("dragging");

  if (tile.inSlot) releaseSlot(tile);

  const rect = tile.el.getBoundingClientRect();
  state.dragOffset.x = event.clientX - rect.left;
  state.dragOffset.y = event.clientY - rect.top;

  tile.el.addEventListener("pointermove", onPointerMove);
  tile.el.addEventListener("pointerup", onPointerUp);
  tile.el.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event) {
  const tile = state.tiles.find((t) => t.id === state.draggingId);
  if (!tile) return;
  const x = event.clientX - state.containerRect.left - state.dragOffset.x;
  const y = event.clientY - state.containerRect.top - state.dragOffset.y;
  tile.x = x;
  tile.y = y;
  tile.el.style.left = `${x}px`;
  tile.el.style.top = `${y}px`;
}

function onPointerUp(event) {
  const tile = state.tiles.find((t) => t.id === state.draggingId);
  if (!tile) return;
  tile.el.classList.remove("dragging");

  const targetIndex = state.slotRects.findIndex((rect, index) => {
    if (state.slots[index]) return false;
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  });

  let snapIndex = targetIndex;
  if (snapIndex < 0) {
    const nearest = state.slotRects
      .map((rect, index) => ({
        index,
        dist: Math.hypot(event.clientX - rect.centerX, event.clientY - rect.centerY),
        width: rect.width,
      }))
      .filter((slot) => !state.slots[slot.index])
      .sort((a, b) => a.dist - b.dist)[0];
    if (nearest && nearest.dist <= Math.max(SNAP_DISTANCE_PX, nearest.width * 0.9)) {
      snapIndex = nearest.index;
    }
  }

  if (snapIndex >= 0) {
    snapToSlot(tile, snapIndex);
  } else {
    tile.inSlot = false;
    tile.slotIndex = null;
    tile.el.style.left = `${tile.x}px`;
    tile.el.style.top = `${tile.y}px`;
  }

  tile.el.releasePointerCapture(event.pointerId);
  tile.el.removeEventListener("pointermove", onPointerMove);
  tile.el.removeEventListener("pointerup", onPointerUp);
  tile.el.removeEventListener("pointercancel", onPointerUp);
  state.draggingId = null;
}

function currentGuess() {
  return state.slots.map((id) => {
    if (!id) return "";
    const tile = state.tiles.find((t) => t.id === id);
    return tile ? tile.letter : "";
  }).join("");
}

function updateHUD() {
  scoreEl.textContent = String(state.score);
  streakEl.textContent = String(state.streak);
  shakesEl.textContent = String(state.shakesLeft);
  const streakProgress = Math.min(state.streak, 10) / 10;
  streakFill.style.width = `${streakProgress * 100}%`;
}

function setMessage(text, type) {
  messageEl.textContent = text;
  messageEl.classList.remove("success", "error");
  if (type) messageEl.classList.add(type);
}

function applyBonuses() {
  let bonus = 0;
  if (state.shakesUsed === 0) bonus += 50;
  if (state.streak === 3) bonus += 25;
  if (state.streak === 5) bonus += 50;
  if (state.streak === 10) bonus += 100;
  return bonus;
}

function submitWord() {
  const guess = currentGuess();
  if (guess.length !== state.currentWord.length) {
    setMessage("Fill every slot before submitting.", "error");
    return;
  }

  if (guess === state.currentWord) {
    state.streak += 1;
    state.score += 100;
    state.score += applyBonuses();
    setMessage("Ho ho yes!", "success");
    state.solvedCount += 1;
    window.setTimeout(startRound, 700);
  } else {
    state.streak = 0;
    state.score = Math.max(0, state.score - 25);
    setMessage("Ho ho nope. Try again.", "error");
    slotsEl.classList.add("shake");
    window.setTimeout(() => slotsEl.classList.remove("shake"), 300);
  }
  updateHUD();
}

function shakeSack() {
  if (state.shakesLeft <= 0) {
    setMessage("No shakes left!", "error");
    return;
  }
  state.shakesLeft -= 1;
  state.shakesUsed += 1;
  sackEl.classList.add("shake");
  window.setTimeout(() => sackEl.classList.remove("shake"), 400);

  state.tiles.forEach((tile) => {
    if (!tile.inSlot) tile.el.classList.add("blur");
  });
  layoutUnplaced();
  updateHUD();
}

function skipWord() {
  state.streak = 0;
  setMessage("New word incoming.", "");
  window.setTimeout(startRound, 400);
}

function onSackPointerDown(event) {
  shakeDragState.active = true;
  shakeDragState.startX = event.clientX;
  shakeDragState.startY = event.clientY;
  sackEl.setPointerCapture(event.pointerId);
}

function onSackPointerMove(event) {
  if (!shakeDragState.active) return;
  const now = Date.now();
  if (now - shakeDragState.lastShakeAt < SHAKE_DRAG_COOLDOWN_MS) return;

  const dx = Math.abs(event.clientX - shakeDragState.startX);
  const dy = Math.abs(event.clientY - shakeDragState.startY);
  if (dx >= SHAKE_DRAG_THRESHOLD || dy >= SHAKE_DRAG_THRESHOLD) {
    shakeDragState.lastShakeAt = now;
    shakeDragState.startX = event.clientX;
    shakeDragState.startY = event.clientY;
    shakeSack();
  }
}

function onSackPointerUp(event) {
  shakeDragState.active = false;
  sackEl.releasePointerCapture(event.pointerId);
}

function updateShakesForLevel() {
  const level = state.solvedCount + 1;
  if (state.difficulty === "easy") return 2;
  if (state.difficulty === "medium") return 1;
  if (state.difficulty === "hard") return 0;
  if (level <= 3) return 2;
  if (level <= 6) return 1;
  return 0;
}

function startRound() {
  state.currentWord = pickWord();
  state.shakesLeft = updateShakesForLevel();
  state.shakesUsed = 0;
  buildSlots(state.currentWord.length);
  const letters = scrambleWord(state.currentWord);
  if (state.hardMode) letters.push(pickDecoyLetter(state.currentWord));
  renderTiles(letters);
  updateRects();
  layoutUnplaced();
  updateHUD();
  setMessage("Arrange the letters to form a word.", "");
}

function handleResize() {
  updateRects();
  state.tiles.forEach((tile) => {
    if (tile.inSlot && tile.slotIndex !== null) {
      snapToSlot(tile, tile.slotIndex);
    }
  });
}

submitBtn.addEventListener("click", submitWord);
shakeBtn.addEventListener("click", shakeSack);
skipBtn.addEventListener("click", skipWord);
sackEl.addEventListener("pointerdown", onSackPointerDown);
sackEl.addEventListener("pointermove", onSackPointerMove);
sackEl.addEventListener("pointerup", onSackPointerUp);
sackEl.addEventListener("pointercancel", onSackPointerUp);
difficultySelect.addEventListener("change", (event) => {
  state.difficulty = event.target.value;
  state.solvedCount = 0;
  state.streak = 0;
  setMessage("Difficulty updated. New round!", "");
  startRound();
});
hardModeToggle.addEventListener("change", (event) => {
  state.hardMode = event.target.checked;
  state.solvedCount = 0;
  state.streak = 0;
  setMessage(state.hardMode ? "Hard mode: decoy letter added." : "Hard mode off.", "");
  startRound();
});
infoBtn.addEventListener("click", () => {
  infoModal.classList.remove("hidden");
});
closeInfo.addEventListener("click", () => {
  infoModal.classList.add("hidden");
});
infoModal.addEventListener("click", (event) => {
  if (event.target === infoModal) infoModal.classList.add("hidden");
});
window.addEventListener("resize", handleResize);

window.addEventListener("load", () => {
  updateRects();
  startRound();
});
