const CONFIG = {
  targetLevel: Infinity,
  lives: 1,
  stageWidth: 720,
  stageHeight: 480,
  floorHeight: 34,
  baseWidth: 260,
  baseBottom: 76,
  minWidth: 36,
  profileName: "演示友好",
  gameplay: {
    moveSpeedBase: 2.0,
    speedIncreasePerLevel: 0.12,
    maxSpeed: 3.15,
    edgePadding: 10,
    newFloorTopOffset: 82,
    countdownTickMs: 700,
    dropJudgeDelayMs: 260,
    nextFloorDelayMs: 820,
    turnTimeMs: 4200,
    autoDropSafetyMs: 700,
    cameraStepPerFloor: 34,
  },
  motion: {
    hangingSwingBaseDeg: 1.6,
    hangingSwingMaxDeg: 4.8,
    hangingSwingMs: 620,
    towerSwayStartLevel: 4,
    towerSwayBaseDeg: 0.18,
    towerSwayMaxDeg: 2.4,
    towerSwayOffsetWeight: 1.35,
    towerSwayMs: 1450,
    cableLength: 74,
  },
  judgement: {
    perfectRatio: 0.92,
    goodRatio: 0.68,
    normalRatio: 0.34,
    fullEnergyPerfectReduction: 0.08,
    giftPerfectReduction: 0.04,
    minSuccessWidth: 32,
    scrapMinWidth: 5,
  },
  energy: {
    max: 100,
    likeGain: 3,
    commentGain: 7,
    giftGain: 18,
    speedSlowdownAtFull: 0.36,
    giftSlowMultiplier: 0.68,
    giftBoostMs: 2400,
    clearAfterDrop: true,
  },
};

const contributors = [
  { name: "@小橙子", score: 34, action: "gift" },
  { name: "@展馆守护者", score: 22, action: "comment" },
  { name: "@会发光的砖", score: 18, action: "like" },
  { name: "@叠楼达人", score: 12, action: "like" },
];

const phaseNames = {
  waiting: "等待开始",
  countdown: "开工倒计时",
  moving: "楼层移动中",
  dropping: "正在落层",
  judging: "判定中",
  result: "本局结算",
};

let state = createInitialState();
let rafId = 0;
let lastFrame = 0;
let countdownTimer = 0;
let autoTimer = 0;
let turnTimer = 0;
let boostTimer = 0;
let audienceTimer = 0;

const el = {
  phaseText: byId("phaseText"),
  levelText: byId("levelText"),
  targetText: byId("targetText"),
  messageText: byId("messageText"),
  countdownText: byId("countdownText"),
  stage: byId("stage"),
  tower: byId("tower"),
  workers: byId("workers"),
  toastLayer: byId("toastLayer"),
  heightText: byId("heightText"),
  perfectText: byId("perfectText"),
  comboText: byId("comboText"),
  energyText: byId("energyText"),
  energyFill: byId("energyFill"),
  boostText: byId("boostText"),
  tapHint: byId("tapHint"),
  mobileHeightText: byId("mobileHeightText"),
  mobilePerfectText: byId("mobilePerfectText"),
  mobileEnergyText: byId("mobileEnergyText"),
  turnTimerText: byId("turnTimerText"),
  turnTimerFill: byId("turnTimerFill"),
  contributors: byId("contributors"),
  leaderText: byId("leaderText"),
  startBtn: byId("startBtn"),
  likeBtn: byId("likeBtn"),
  commentBtn: byId("commentBtn"),
  giftBtn: byId("giftBtn"),
  dropBtn: byId("dropBtn"),
  autoBtn: byId("autoBtn"),
  resetBtn: byId("resetBtn"),
  resultModal: byId("resultModal"),
  resultTitle: byId("resultTitle"),
  resultHeight: byId("resultHeight"),
  resultPerfect: byId("resultPerfect"),
  resultCombo: byId("resultCombo"),
  resultLeader: byId("resultLeader"),
  resultComment: byId("resultComment"),
  modalResetBtn: byId("modalResetBtn"),
  soundBtn: byId("soundBtn"),
};

function byId(id) {
  return document.getElementById(id);
}

function createInitialState() {
  const base = {
    id: "base",
    level: 0,
    x: (CONFIG.stageWidth - CONFIG.baseWidth) / 2,
    width: CONFIG.baseWidth,
    bottom: CONFIG.baseBottom,
    quality: "base",
  };

  return {
    phase: "waiting",
    currentLevel: 0,
    targetLevel: CONFIG.targetLevel,
    floors: [base],
    currentFloor: null,
    scraps: [],
    direction: 1,
    speed: CONFIG.gameplay.moveSpeedBase,
    energy: 0,
    perfectCount: 0,
    comboPerfect: 0,
    maxComboPerfect: 0,
    lives: CONFIG.lives,
    message: "准备开工",
    autoMode: false,
    boostUntil: 0,
    turnStartedAt: 0,
    turnEndsAt: 0,
    lastQuality: "",
    tapHintDismissed: false,
  };
}

function bindEvents() {
  el.startBtn.addEventListener("click", startGame);
  el.dropBtn.addEventListener("click", dropCurrentFloor);
  el.likeBtn.addEventListener("click", () => addEnergy("like", CONFIG.energy.likeGain));
  el.commentBtn.addEventListener("click", () => addEnergy("comment", CONFIG.energy.commentGain));
  el.giftBtn.addEventListener("click", () => addEnergy("gift", CONFIG.energy.giftGain, true));
  el.autoBtn.addEventListener("click", toggleAuto);
  el.resetBtn.addEventListener("click", resetGame);
  el.modalResetBtn.addEventListener("click", resetGame);
  el.soundBtn.addEventListener("click", () => showFloating("♪ 现场气氛升温", 76, 58));
  el.stage.addEventListener("click", handleStageTap);
  window.addEventListener("resize", render);
}

function handleStageTap() {
  state.tapHintDismissed = true;
  if (state.phase === "waiting" || state.phase === "result") {
    startGame();
    return;
  }
  if (state.phase === "moving") dropCurrentFloor();
}

function startGame() {
  if (state.phase !== "waiting" && state.phase !== "result") return;
  el.resultModal.classList.add("hidden");
  state.phase = "countdown";
  state.message = "施工队集合中";
  startAudienceAssist();
  render();

  let count = 3;
  el.countdownText.textContent = `${count}`;
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      el.countdownText.textContent = `${count}`;
      showFloating(`${count}`, 50, 38);
      return;
    }
    clearInterval(countdownTimer);
    el.countdownText.textContent = "开工！";
    spawnCurrentFloor();
  }, CONFIG.gameplay.countdownTickMs);
}

function spawnCurrentFloor() {
  const previous = getTopFloor();
  const width = Math.max(previous.width, CONFIG.minWidth);
  const fromLeft = state.currentLevel % 2 === 0;
  const worldShift = getWorldShift();
  state.currentFloor = {
    id: `floor-${Date.now()}`,
    level: state.currentLevel + 1,
    x: fromLeft ? 12 : CONFIG.stageWidth - width - 12,
    width,
    bottom: CONFIG.stageHeight - CONFIG.gameplay.newFloorTopOffset + worldShift,
    quality: "current",
  };
  state.direction = fromLeft ? 1 : -1;
  state.speed = getMoveSpeed();
  state.phase = "moving";
  state.message = "找准时机，主播落层";
  state.lastQuality = "";
  state.turnStartedAt = performance.now();
  state.turnEndsAt = state.turnStartedAt + CONFIG.gameplay.turnTimeMs;
  render();
  startLoop();
  startTurnTimer();
}

function startLoop() {
  cancelAnimationFrame(rafId);
  lastFrame = performance.now();
  rafId = requestAnimationFrame(tick);
}

function tick(now) {
  const delta = Math.min(32, now - lastFrame) / 16.67;
  lastFrame = now;
  if (state.phase === "moving" && state.currentFloor) {
    const floor = state.currentFloor;
    floor.x += state.speed * state.direction * delta;
    if (floor.x <= CONFIG.gameplay.edgePadding) {
      floor.x = CONFIG.gameplay.edgePadding;
      state.direction = 1;
    }
    if (floor.x + floor.width >= CONFIG.stageWidth - CONFIG.gameplay.edgePadding) {
      floor.x = CONFIG.stageWidth - floor.width - CONFIG.gameplay.edgePadding;
      state.direction = -1;
    }
    renderTower();
    renderTurnTimer();
    rafId = requestAnimationFrame(tick);
  }
}

function dropCurrentFloor() {
  if (state.phase !== "moving" || !state.currentFloor) return;
  stopTurnTimer();
  cancelAnimationFrame(rafId);
  state.phase = "dropping";
  state.message = "楼层下落中";
  const top = getTopFloor();
  state.currentFloor.bottom = top.bottom + CONFIG.floorHeight;
  render();
  setTimeout(judgeCurrentFloor, CONFIG.gameplay.dropJudgeDelayMs);
}

function judgeCurrentFloor() {
  if (!state.currentFloor) return;
  state.phase = "judging";
  const previous = getTopFloor();
  const current = state.currentFloor;
  const overlapStart = Math.max(previous.x, current.x);
  const overlapEnd = Math.min(previous.x + previous.width, current.x + current.width);
  const overlapWidth = Math.max(0, overlapEnd - overlapStart);
  const ratio = overlapWidth / current.width;
  const perfectThreshold = getPerfectThreshold();

  let quality = "fail";
  if (ratio >= perfectThreshold) quality = "perfect";
  else if (ratio >= CONFIG.judgement.goodRatio) quality = "good";
  else if (ratio >= CONFIG.judgement.normalRatio) quality = "normal";

  if (quality === "fail" || overlapWidth < CONFIG.judgement.minSuccessWidth) {
    handleFail(current);
    return;
  }

  const scrapLeftWidth = Math.max(0, overlapStart - current.x);
  const scrapRightWidth = Math.max(0, current.x + current.width - overlapEnd);
  if (scrapLeftWidth > CONFIG.judgement.scrapMinWidth) addScrap(current.x, scrapLeftWidth, current.bottom);
  if (scrapRightWidth > CONFIG.judgement.scrapMinWidth) addScrap(overlapEnd, scrapRightWidth, current.bottom);

  current.x = overlapStart;
  current.width = overlapWidth;
  current.quality = quality;
  state.floors.push(current);
  state.currentFloor = null;
  state.currentLevel += 1;
  if (CONFIG.energy.clearAfterDrop) state.energy = 0;
  state.lastQuality = quality;

  if (quality === "perfect") {
    state.perfectCount += 1;
    state.comboPerfect += 1;
    state.maxComboPerfect = Math.max(state.maxComboPerfect, state.comboPerfect);
    state.message = "Perfect！整层保留";
    celebrate("Perfect!", "perfect");
  } else if (quality === "good") {
    state.comboPerfect = 0;
    state.message = "Good！稳稳叠上";
    celebrate("Good!", "good");
  } else {
    state.comboPerfect = 0;
    state.message = "有点歪，但稳住了";
    shakeStage();
    showFloating("稳住了！", 48, 35);
  }

  maybeMilestone();
  render();
  setTimeout(spawnCurrentFloor, CONFIG.gameplay.nextFloorDelayMs);
}

function handleFail(current) {
  current.quality = "fail-piece";
  state.scraps.push({ ...current, id: `scrap-${Date.now()}` });
  state.currentFloor = null;
  state.energy = 0;
  state.comboPerfect = 0;
  state.lives -= 1;
  state.lastQuality = "fail";
  state.message = "塌了！展馆需要重建";
  shakeStage();
  showFloating("塌了！", 50, 35);
  render();
  setTimeout(() => finishGame(false), 820);
}

function handleTimeout() {
  if (state.phase !== "moving" || !state.currentFloor) return;
  stopTurnTimer();
  cancelAnimationFrame(rafId);
  const timedOutFloor = state.currentFloor;
  timedOutFloor.quality = "timeout-piece";
  state.scraps.push({ ...timedOutFloor, id: `timeout-${Date.now()}` });
  state.currentFloor = null;
  state.energy = 0;
  state.comboPerfect = 0;
  state.lives -= 1;
  state.lastQuality = "fail";
  state.message = "超时未落层，楼层失控";
  showFloating("超时！", 50, 35);
  render();
  setTimeout(() => finishGame(false), 820);
}

function finishGame(success) {
  stopTurnTimer();
  stopAudienceAssist();
  cancelAnimationFrame(rafId);
  state.phase = "result";
  state.message = success ? "冲顶成功，全场庆祝" : "本局结束，挑战终止";
  if (success) {
    el.stage.classList.add("success");
    burstConfetti();
  }
  render();
  setTimeout(() => showResult(success), success ? 800 : 300);
}

function resetGame() {
  clearInterval(countdownTimer);
  stopTurnTimer();
  stopAudienceAssist();
  clearTimeout(boostTimer);
  cancelAnimationFrame(rafId);
  state = createInitialState();
  el.resultModal.classList.add("hidden");
  el.stage.classList.remove("success", "shake");
  el.workers.classList.remove("celebrate");
  el.toastLayer.innerHTML = "";
  render();
}

function toggleAuto() {
  state.autoMode = !state.autoMode;
  el.autoBtn.textContent = state.autoMode ? "关闭自动" : "自动模式";
  if (state.autoMode) showFloating("自动落层已开启", 48, 58);
  render();
}

function startTurnTimer() {
  stopTurnTimer();
  renderTurnTimer();
  if (state.autoMode) {
    const autoDelay = Math.max(600, CONFIG.gameplay.turnTimeMs - CONFIG.gameplay.autoDropSafetyMs);
    autoTimer = setTimeout(() => {
      if (state.phase === "moving") dropCurrentFloor();
    }, autoDelay);
  }
  turnTimer = setInterval(() => {
    if (state.phase !== "moving") {
      stopTurnTimer();
      return;
    }
    renderTurnTimer();
    if (performance.now() >= state.turnEndsAt) handleTimeout();
  }, 80);
}

function stopTurnTimer() {
  clearTimeout(autoTimer);
  clearInterval(turnTimer);
}

function renderTurnTimer() {
  if (state.phase !== "moving") {
    el.turnTimerFill.style.width = "0%";
    el.turnTimerText.textContent = state.phase === "waiting" ? "等待开工" : "本层计时";
    el.turnTimerFill.parentElement.parentElement.classList.remove("warning");
    return;
  }
  const remaining = Math.max(0, state.turnEndsAt - performance.now());
  const progress = Math.max(0, Math.min(1, remaining / CONFIG.gameplay.turnTimeMs));
  el.turnTimerFill.style.width = `${progress * 100}%`;
  el.turnTimerText.textContent = `主播操作 ${Math.ceil(remaining / 1000)} 秒`;
  el.turnTimerFill.parentElement.parentElement.classList.toggle("warning", progress <= 0.35);
}

function addEnergy(type, amount, strongBoost = false) {
  if (state.phase === "result") return;
  const names = {
    like: ["@会发光的砖", "点赞助力", "♥"],
    comment: ["@展馆守护者", "弹幕助力", "弹"],
    gift: ["@小橙子", "礼物助力", "✦"],
  };
  state.energy = Math.min(CONFIG.energy.max, state.energy + amount);
  const contributor = contributors.find((item) => item.name === names[type][0]);
  if (contributor) {
    contributor.score += amount;
    contributor.action = type;
  }
  state.speed = getMoveSpeed();
  if (strongBoost) {
    state.boostUntil = Date.now() + CONFIG.energy.giftBoostMs;
    clearTimeout(boostTimer);
    boostTimer = setTimeout(render, CONFIG.energy.giftBoostMs + 50);
  }
  showFloating(`${names[type][1]} +${amount}`, 22 + Math.random() * 54, 68);
  spawnParticles(names[type][2], type === "gift" ? 14 : 8);
  pulseWorkers();
  render();
}

function startAudienceAssist() {
  stopAudienceAssist();
  const assistTypes = [
    ["like", CONFIG.energy.likeGain],
    ["comment", CONFIG.energy.commentGain],
    ["gift", CONFIG.energy.giftGain],
  ];

  const tickAssist = () => {
    if (state.phase === "result" || state.phase === "waiting") return;
    if (state.phase === "moving" || state.phase === "countdown") {
      const [type, amount] = assistTypes[Math.floor(Math.random() * assistTypes.length)];
      addEnergy(type, amount, type === "gift" && Math.random() > 0.45);
    }
    audienceTimer = setTimeout(tickAssist, 1800 + Math.random() * 2200);
  };

  audienceTimer = setTimeout(tickAssist, 1200);
}

function stopAudienceAssist() {
  clearTimeout(audienceTimer);
}

function getMoveSpeed() {
  const levelBonus = state.currentLevel * CONFIG.gameplay.speedIncreasePerLevel;
  const energyBonus = state.energy / CONFIG.energy.max;
  const giftSlow = Date.now() < state.boostUntil ? CONFIG.energy.giftSlowMultiplier : 1;
  const speed = (CONFIG.gameplay.moveSpeedBase + levelBonus)
    * (1 - energyBonus * CONFIG.energy.speedSlowdownAtFull)
    * giftSlow;
  return Math.min(CONFIG.gameplay.maxSpeed, Math.max(0.8, speed));
}

function getPerfectThreshold() {
  const energyBonus = state.energy / CONFIG.energy.max;
  const energyReduction = energyBonus * CONFIG.judgement.fullEnergyPerfectReduction;
  const giftReduction = Date.now() < state.boostUntil ? CONFIG.judgement.giftPerfectReduction : 0;
  return Math.max(0.78, CONFIG.judgement.perfectRatio - energyReduction - giftReduction);
}

function getTopFloor() {
  return state.floors[state.floors.length - 1];
}

function addScrap(x, width, bottom) {
  state.scraps.push({
    id: `scrap-${Date.now()}-${Math.random()}`,
    x,
    width,
    bottom,
    quality: "fail-piece",
  });
  setTimeout(() => {
    state.scraps = state.scraps.slice(-5);
    renderTower();
  }, 1100);
}

function maybeMilestone() {
  const text = {
    3: "展馆亮灯！",
    5: "施工队庆祝！",
    8: "金色光效启动！",
    10: "突破 10 层！",
  }[state.currentLevel];
  if (!text) return;
  showFloating(text, 45, 22);
  pulseWorkers();
  if (state.currentLevel >= 8) burstConfetti();
}

function celebrate(text) {
  showFloating(text, 46, 32);
  pulseWorkers();
  spawnParticles("★", 10);
}

function shakeStage() {
  el.stage.classList.remove("shake");
  void el.stage.offsetWidth;
  el.stage.classList.add("shake");
}

function pulseWorkers() {
  el.workers.classList.remove("celebrate");
  void el.workers.offsetWidth;
  el.workers.classList.add("celebrate");
}

function showFloating(text, xPercent, yPercent) {
  const node = document.createElement("div");
  node.className = "float-text";
  node.textContent = text;
  node.style.left = `${xPercent}%`;
  node.style.top = `${yPercent}%`;
  el.toastLayer.appendChild(node);
  setTimeout(() => node.remove(), 1200);
}

function spawnParticles(char, count) {
  for (let i = 0; i < count; i += 1) {
    const node = document.createElement("div");
    node.className = "particle";
    node.textContent = char;
    node.style.left = `${18 + Math.random() * 64}%`;
    node.style.top = `${48 + Math.random() * 30}%`;
    node.style.animationDelay = `${Math.random() * 0.25}s`;
    el.toastLayer.appendChild(node);
    setTimeout(() => node.remove(), 1300);
  }
}

function burstConfetti() {
  ["★", "✦", "●", "◆"].forEach((char) => spawnParticles(char, 8));
}

function showResult(success) {
  const leader = getLeader();
  el.resultTitle.textContent = success ? "展馆建设成功" : "展馆建设中断";
  el.resultHeight.textContent = `${state.currentLevel} 层`;
  el.resultPerfect.textContent = `${state.perfectCount} 次`;
  el.resultCombo.textContent = `${state.maxComboPerfect} 连`;
  el.resultLeader.textContent = leader.name;
  el.resultComment.textContent = success
    ? "展馆冲顶成功，直播间施工队全员高光。"
    : state.currentLevel >= 7
      ? "差点封神，再稳一点就能冲顶。"
      : "塌房预警，但第一版施工经验已经到手。";
  el.resultModal.classList.remove("hidden");
}

function getLeader() {
  return [...contributors].sort((a, b) => b.score - a.score)[0];
}

function render() {
  document.body.dataset.phase = state.phase;
  el.phaseText.textContent = phaseNames[state.phase];
  el.levelText.textContent = state.currentLevel;
  el.targetText.textContent = Number.isFinite(state.targetLevel) ? state.targetLevel : "∞";
  el.messageText.textContent = state.message;
  el.heightText.textContent = `${state.currentLevel} 层`;
  el.perfectText.textContent = `${state.perfectCount} 次`;
  el.comboText.textContent = `${state.maxComboPerfect} 连`;
  el.energyText.textContent = `${state.energy} / 100`;
  el.energyFill.style.width = `${state.energy}%`;
  el.mobileHeightText.textContent = state.currentLevel;
  el.mobilePerfectText.textContent = state.perfectCount;
  el.mobileEnergyText.textContent = state.energy;
  el.boostText.textContent = Date.now() < state.boostUntil
    ? "礼物加成中，Perfect 容错扩大。"
    : "能量越高，移动越稳。";
  if (state.phase === "waiting") el.countdownText.textContent = "点击开始";
  if (state.phase === "moving") el.countdownText.textContent = "楼层移动中";
  if (state.phase === "result") el.countdownText.textContent = "本局结算";
  el.tapHint.textContent = state.phase === "moving" ? "点击屏幕落层" : "点击屏幕开始";
  const shouldShowTapHint = !state.tapHintDismissed && (state.phase === "waiting" || state.phase === "moving");
  el.tapHint.classList.toggle("hidden", !shouldShowTapHint);
  renderTurnTimer();
  el.dropBtn.disabled = state.phase !== "moving";
  el.startBtn.disabled = state.phase !== "waiting" && state.phase !== "result";
  el.likeBtn.disabled = state.phase === "result";
  el.commentBtn.disabled = state.phase === "result";
  el.giftBtn.disabled = state.phase === "result";
  el.autoBtn.textContent = state.autoMode ? "关闭自动" : "自动模式";
  el.autoBtn.classList.toggle("active", state.autoMode);
  renderTower();
  renderContributors();
}

function renderTower() {
  const stageRect = el.stage.getBoundingClientRect();
  const scaleX = stageRect.width / CONFIG.stageWidth;
  const scaleY = stageRect.height / CONFIG.stageHeight;
  const settledFloors = [...state.floors, ...state.scraps];
  const worldShift = getWorldShift();
  const cameraStep = getCameraStep();
  const towerSway = getTowerSway();
  el.stage.style.setProperty("--world-shift-px", `${worldShift * scaleY}px`);
  el.stage.style.setProperty("--ground-actor-opacity", `${Math.max(0, 1 - cameraStep / 120)}`);

  const settledHtml = settledFloors.map((floor) => renderFloor(floor, scaleX, scaleY, worldShift)).join("");
  const currentHtml = state.currentFloor ? renderFloor(state.currentFloor, scaleX, scaleY, worldShift) : "";

  el.tower.innerHTML = `
    <div class="settled-stack" style="transform: translateX(${towerSway.x}px) rotate(${towerSway.angle}deg)">
      ${settledHtml}
    </div>
    ${currentHtml}
  `;
}

function renderFloor(floor, scaleX, scaleY, worldShift) {
    const left = floor.x * scaleX;
    const width = floor.width * scaleX;
    const bottom = (floor.bottom - worldShift) * scaleY;
    const height = (floor.level === 0 ? 42 : CONFIG.floorHeight) * scaleY;
    const classes = ["floor"];
    if (floor.level === 0) classes.push("base");
    if (floor.quality) classes.push(floor.quality);
    if (floor === state.currentFloor) classes.push("current");
    const tilt = floor === state.currentFloor ? getHangingSwingAngle() : 0;
    const cableLength = CONFIG.motion.cableLength * scaleY;
    const rigging = floor === state.currentFloor ? `<span class="crane-line"></span>` : "";
    return `<div class="${classes.join(" ")}" style="left:${left}px; bottom:${bottom}px; width:${width}px; height:${height}px; --floor-tilt:${tilt}deg; --cable-length:${cableLength}px">${rigging}</div>`;
}

function getCameraStep() {
  return state.currentLevel * CONFIG.gameplay.cameraStepPerFloor;
}

function getWorldShift() {
  const isMobileLayout = window.matchMedia("(max-width: 980px)").matches;
  if (!isMobileLayout) return 0;
  return getCameraStep();
}

function getHangingSwingAngle() {
  if (state.phase !== "moving" || !state.currentFloor) return 0;
  const speedRatio = Math.min(1, state.speed / CONFIG.gameplay.maxSpeed);
  const amplitude = CONFIG.motion.hangingSwingBaseDeg
    + (CONFIG.motion.hangingSwingMaxDeg - CONFIG.motion.hangingSwingBaseDeg) * speedRatio;
  const time = performance.now() / CONFIG.motion.hangingSwingMs;
  return Math.sin(time * Math.PI * 2) * amplitude;
}

function getTowerSway() {
  const active = state.phase === "moving" || state.phase === "dropping" || state.phase === "judging";
  if (!active || state.currentLevel < CONFIG.motion.towerSwayStartLevel) {
    return { angle: 0, x: 0 };
  }

  const floors = state.floors.filter((floor) => floor.level > 0);
  if (!floors.length) return { angle: 0, x: 0 };

  const offsetTotal = floors.reduce((total, floor, index) => {
    const previous = index === 0 ? state.floors[0] : floors[index - 1];
    const currentCenter = floor.x + floor.width / 2;
    const previousCenter = previous.x + previous.width / 2;
    return total + Math.abs(currentCenter - previousCenter);
  }, 0);
  const offsetRatio = Math.min(1, offsetTotal / Math.max(1, floors.length * CONFIG.baseWidth * 0.24));
  const heightRatio = Math.min(1, (state.currentLevel - CONFIG.motion.towerSwayStartLevel + 1) / 12);
  const amplitude = Math.min(
    CONFIG.motion.towerSwayMaxDeg,
    CONFIG.motion.towerSwayBaseDeg
      + heightRatio * 0.9
      + offsetRatio * CONFIG.motion.towerSwayOffsetWeight,
  );
  const wave = Math.sin((performance.now() / CONFIG.motion.towerSwayMs) * Math.PI * 2);
  return {
    angle: wave * amplitude,
    x: wave * amplitude * 0.7,
  };
}

function renderContributors() {
  const sorted = [...contributors].sort((a, b) => b.score - a.score);
  const leader = sorted[0];
  el.leaderText.textContent = leader.name;
  el.contributors.innerHTML = sorted.map((item, index) => {
    const action = item.action === "gift" ? "礼物" : item.action === "comment" ? "弹幕" : "点赞";
    return `<li><strong>${index + 1}</strong><span>${item.name}<small>${action}助力</small></span><b>${item.score}</b></li>`;
  }).join("");
}

bindEvents();
render();
