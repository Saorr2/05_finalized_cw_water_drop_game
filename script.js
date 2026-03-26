// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
let gameTimer;
let score = 0;
let timeLeft = 30;
let lastDropSize = null;
let WINNING_SCORE = 20;
let OBSTACLE_CHANCE = 0.15;
let BAD_DROP_CHANCE = 0.2;
let DROP_INTERVAL = 700;
let GAME_DURATION = 30;
let MAX_LIVES = 3;
let livesLeft = 3;

// Difficulty settings
const difficultySettings = {
  easy: { winningScore: 10, obstacleChance: 0.1, badDropChance: 0.15, dropInterval: 1000, gameDuration: 40, maxLives: 4 },
  normal: { winningScore: 20, obstacleChance: 0.15, badDropChance: 0.2, dropInterval: 700, gameDuration: 30, maxLives: 3 },
  hard: { winningScore: 30, obstacleChance: 0.25, badDropChance: 0.3, dropInterval: 500, gameDuration: 20, maxLives: 2 }
};

let currentDifficulty = "normal";

const winningMessages = [
  "Amazing work! You helped protect clean water.",
  "You win! Every drop you saved made a difference.",
  "Great job! You're a clean water champion!",
  "Victory! You kept the water flowing clean."
];

const losingMessages = [
  "Nice effort. Try again and save even more drops!",
  "Almost there. Give it another shot!",
  "Keep going. You can hit 20 next round!",
  "Try again! More clean drops are waiting."
];

const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");
const difficultySelector = document.getElementById("difficulty");
const gameContainer = document.getElementById("game-container");
const scoreElement = document.getElementById("score");
const timeElement = document.getElementById("time");
const livesContainer = document.getElementById("lives-container");
const statusMessage = document.getElementById("status-message");

const FAST_PHASE_THRESHOLD = 10;
const FAST_FALL_MULTIPLIER = 0.65;
const CONFETTI_COLORS = ["#FFC907", "#2E9DF7", "#8BD1CB", "#4FCB53", "#FF902A"];

// Update game settings based on selected difficulty
function updateDifficultySettings() {
  const settings = difficultySettings[currentDifficulty];
  WINNING_SCORE = settings.winningScore;
  OBSTACLE_CHANCE = settings.obstacleChance;
  BAD_DROP_CHANCE = settings.badDropChance;
  DROP_INTERVAL = settings.dropInterval;
  GAME_DURATION = settings.gameDuration;
  MAX_LIVES = settings.maxLives;
}

function renderLives() {
  livesContainer.innerHTML = "";
  for (let i = 0; i < livesLeft; i += 1) {
    const lifeDrop = document.createElement("span");
    lifeDrop.className = "life-drop";
    lifeDrop.setAttribute("aria-hidden", "true");
    livesContainer.appendChild(lifeDrop);
  }
}

function removeOneLife() {
  const lastLife = livesContainer.lastElementChild;
  if (lastLife) {
    lastLife.classList.add("life-drop-lost");
    setTimeout(() => {
      lastLife.remove();
    }, 160);
  }
}

function loseLife(reason) {
  if (!gameRunning || livesLeft <= 0) return;

  livesLeft -= 1;
  removeOneLife();

  if (livesLeft <= 0) {
    endGame(reason || "Water reserve depleted.");
  }
}

// Wait for button click to start the game
startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);

// Update difficulty when selector changes
difficultySelector.addEventListener("change", (event) => {
  if (!gameRunning) {
    currentDifficulty = event.target.value;
    updateDifficultySettings();
  }
});

function updateDropDistance() {
  const distance = gameContainer.offsetHeight + 30;
  gameContainer.style.setProperty("--drop-distance", `${distance}px`);
}

function startGame() {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  // Apply difficulty settings
  updateDifficultySettings();
  
  gameRunning = true;
  score = 0;
  timeLeft = GAME_DURATION;
  livesLeft = MAX_LIVES;
  lastDropSize = null;
  scoreElement.textContent = score;
  timeElement.textContent = timeLeft;
  renderLives();
  statusMessage.textContent = `Catch ${WINNING_SCORE} drops to win! Difficulty: ${currentDifficulty.toUpperCase()}`;
  startButton.disabled = true;
  difficultySelector.disabled = true;

  gameContainer.querySelectorAll(".water-drop, .float-points, .confetti-piece").forEach((el) => el.remove());
  updateDropDistance();

  // Create new drops frequently to keep the game active
  dropMaker = setInterval(createDrop, DROP_INTERVAL);

  gameTimer = setInterval(() => {
    timeLeft -= 1;
    timeElement.textContent = timeLeft;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function createDrop() {
  if (!gameRunning) return;

  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  const isObstacle = Math.random() < OBSTACLE_CHANCE;
  const isBadDrop = !isObstacle && Math.random() < BAD_DROP_CHANCE;
  drop.className = `water-drop${isObstacle ? " obstacle-drop" : isBadDrop ? " bad-drop" : ""}`;

  // Mix small, medium, and large drops for more engaging gameplay.
  const dropSize = getRandomDropSize();
  drop.style.width = `${dropSize}px`;
  drop.style.height = `${dropSize}px`;

  // Position the drop randomly across the game width
  const gameWidth = gameContainer.offsetWidth;
  const xPosition = Math.random() * Math.max(10, gameWidth - dropSize);
  drop.style.left = xPosition + "px";

  // In the final seconds, all drops fall faster to increase difficulty.
  const baseDuration = isObstacle
    ? Math.random() * 1.1 + 2.2
    : Math.random() * 1.7 + 2.8;
  const speedAdjustedDuration = timeLeft <= FAST_PHASE_THRESHOLD
    ? baseDuration * FAST_FALL_MULTIPLIER
    : baseDuration;
  drop.style.animationDuration = `${speedAdjustedDuration.toFixed(2)}s`;

  // Add the new drop to the game screen
  gameContainer.appendChild(drop);

  drop.addEventListener("click", (event) => {
    if (!gameRunning) return;

    const points = isObstacle ? -3 : isBadDrop ? -2 : 1;
    score = Math.max(0, score + points);
    scoreElement.textContent = score;

    scoreElement.classList.remove("score-pop", "score-good", "score-bad");
    void scoreElement.offsetWidth;
    scoreElement.classList.add("score-pop", points > 0 ? "score-good" : "score-bad");

    if (isObstacle) {
      loseLife("An obstacle drained your water reserve.");
    } else if (isBadDrop) {
      loseLife("Dirty water reduced your reserve.");
    }

    showFloatingPoints(event.clientX, event.clientY, points);
    drop.remove();
  });

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    if (!gameRunning) return;

    drop.remove(); // Clean up drops that weren't caught
  });
}

function getRandomDropSize() {
  const isSmallScreen = gameContainer.offsetWidth < 700;
  const minSize = isSmallScreen ? 44 : 40;
  const maxSize = isSmallScreen ? 84 : 78;

  let nextSize = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;

  // Prevent consecutive drops from having the same size.
  if (lastDropSize !== null && nextSize === lastDropSize) {
    nextSize = nextSize === maxSize ? nextSize - 1 : nextSize + 1;
  }

  lastDropSize = nextSize;
  return nextSize;
}

function showFloatingPoints(clientX, clientY, points) {
  const floatLabel = document.createElement("div");
  const containerRect = gameContainer.getBoundingClientRect();

  floatLabel.className = `float-points ${points > 0 ? "float-good" : "float-bad"}`;
  floatLabel.textContent = points > 0 ? `+${points}` : `${points}`;
  floatLabel.style.left = `${clientX - containerRect.left}px`;
  floatLabel.style.top = `${clientY - containerRect.top}px`;

  gameContainer.appendChild(floatLabel);
  floatLabel.addEventListener("animationend", () => floatLabel.remove());
}

function getRandomMessage(messageArray) {
  const randomIndex = Math.floor(Math.random() * messageArray.length);
  return messageArray[randomIndex];
}

function endGame(reason) {
  gameRunning = false;
  clearInterval(dropMaker);
  clearInterval(gameTimer);

  startButton.disabled = false;
  difficultySelector.disabled = false;
  startButton.textContent = "Play Again";

  const isWinner = score >= WINNING_SCORE;
  const selectedMessage = isWinner
    ? getRandomMessage(winningMessages)
    : getRandomMessage(losingMessages);

  const endingPrefix = reason
    ? `${reason} Final score: ${score}.`
    : `Time's up! Final score: ${score}.`;

  statusMessage.textContent = `${endingPrefix} ${selectedMessage}`;

  if (isWinner) {
    launchConfettiBurst();
  }
}

function resetGame() {
  gameRunning = false;
  clearInterval(dropMaker);
  clearInterval(gameTimer);

  score = 0;
  timeLeft = GAME_DURATION;
  livesLeft = MAX_LIVES;
  scoreElement.textContent = score;
  timeElement.textContent = timeLeft;
  renderLives();
  scoreElement.classList.remove("score-pop", "score-good", "score-bad");

  startButton.disabled = false;
  difficultySelector.disabled = false;
  startButton.textContent = "Start Game";
  statusMessage.textContent = "Game reset. Press Start Game when you're ready!";

  gameContainer.querySelectorAll(".water-drop, .float-points, .confetti-piece").forEach((el) => el.remove());
  updateDropDistance();
}

function launchConfettiBurst() {
  const particleCount = Math.max(40, Math.floor(gameContainer.offsetWidth / 8));

  for (let i = 0; i < particleCount; i += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    const size = Math.floor(Math.random() * 7) + 8;
    const left = `${Math.random() * 100}%`;
    const drift = `${(Math.random() - 0.5) * 220}px`;
    const duration = `${(Math.random() * 0.9 + 1.8).toFixed(2)}s`;
    const delay = `${(Math.random() * 0.22).toFixed(2)}s`;
    const rotation = `${Math.floor(Math.random() * 540)}deg`;
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

    piece.style.left = left;
    piece.style.width = `${size}px`;
    piece.style.height = `${Math.floor(size * 0.6)}px`;
    piece.style.backgroundColor = color;
    piece.style.setProperty("--confetti-drift", drift);
    piece.style.setProperty("--confetti-rotate", rotation);
    piece.style.animationDuration = duration;
    piece.style.animationDelay = delay;

    gameContainer.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

window.addEventListener("resize", updateDropDistance);
updateDropDistance();

// Initialize with default difficulty
updateDifficultySettings();
renderLives();

