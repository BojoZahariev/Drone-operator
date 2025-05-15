const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreBoard = document.getElementById('scoreBoard');
const explosionSound = document.getElementById('explosionSound');

const DRONE_SIZE = 40;
const DRONE_SPEED = 4;
const TARGET_RADIUS = 15;
const NUM_TARGETS = 7;
const ESCAPE_SPEED = 2;
const PROJECTILE_SPEED = 1.5;
const PROJECTILE_RADIUS = 2;
const SHOOT_INTERVAL = 5000; // Shot interval
let isDescending = false;
let descendStartTime = null;
let droneScale = 1.0;
let score = 0;
let gameActive = true;

let drone = { x: canvas.width / 2, y: canvas.height / 2, dx: 0, dy: 0 };
let targets = [];
let explosions = [];
let projectiles = [];
let keysPressed = {};
let lastShotTimes = {};

let animationFrameId;

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);



// Function to resize the canvas based on viewport size
function resizeCanvas() {
    // Set the canvas element's width and height to 70% of the viewport size
    canvas.width = window.innerWidth * 0.7;
    canvas.height = window.innerHeight * 0.7;
}

// Call the resize function once when the page loads
resizeCanvas();

// Optionally, call resizeCanvas() whenever the window is resized
window.addEventListener('resize', resizeCanvas);

function handleKeyDown(e) {
    if (e.key === ' ') {
        if (!isDescending) descendStartTime = Date.now();
        isDescending = true;
    } else {
        keysPressed[e.key.toLowerCase()] = true;
    }
}

function handleKeyUp(e) {
    if (e.key === ' ') {
        isDescending = false;
        droneScale = 1.0;
    } else {
        keysPressed[e.key.toLowerCase()] = false;
    }
}

function drawDrone() {
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.scale(droneScale, droneScale);

    const spinAngle = performance.now() / 50;
    const armColor = "#222";
    const rotorColor = "#A9A9A9";
    const bladeColor = "rgba(200, 200, 200, 0.7)";

    const bodyWidth = 14;
    const bodyHeight = 30;

    const rotorOffsets = [
        [-DRONE_SIZE / 2, -DRONE_SIZE / 2],
        [DRONE_SIZE / 2, -DRONE_SIZE / 2],
        [-DRONE_SIZE / 2, DRONE_SIZE / 2],
        [DRONE_SIZE / 2, DRONE_SIZE / 2],
    ];

    // Arms from center to rotors
    ctx.strokeStyle = armColor;
    ctx.lineWidth = 3;
    for (let [x, y] of rotorOffsets) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    // Draw octagonal central body
    ctx.fillStyle = "#222";
    ctx.beginPath();
    const w = bodyWidth / 2;
    const h = bodyHeight / 2;
    const cut = 4;

    ctx.moveTo(-w + cut, -h);            // Top-left inward
    ctx.lineTo(w - cut, -h);             // Top-right inward
    ctx.lineTo(w, -h + cut);             // Right-top inward
    ctx.lineTo(w, h - cut);              // Right-bottom inward
    ctx.lineTo(w - cut, h);              // Bottom-right inward
    ctx.lineTo(-w + cut, h);             // Bottom-left inward
    ctx.lineTo(-w, h - cut);             // Left-bottom inward
    ctx.lineTo(-w, -h + cut);            // Left-top inward
    ctx.closePath();
    ctx.fill();

    // Rotors and spinning blades
    for (let [x, y] of rotorOffsets) {
        ctx.fillStyle = rotorColor;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(spinAngle);
        ctx.fillStyle = bladeColor;
        ctx.fillRect(-10, -2, 20, 4); // Horizontal blade
        ctx.fillRect(-2, -10, 4, 20); // Vertical blade
        ctx.restore();
    }

    ctx.restore();
}



function createTargetFromSide() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) {
        x = 0; y = Math.random() * canvas.height;
    } else if (side === 1) {
        x = canvas.width; y = Math.random() * canvas.height;
    } else if (side === 2) {
        x = Math.random() * canvas.width; y = 0;
    } else {
        x = Math.random() * canvas.width; y = canvas.height;
    }
    const id = Math.random().toString(36).substr(2, 9);
    // Stagger the initial shot times so they don't all shoot at once
    lastShotTimes[id] = Date.now() - Math.random() * SHOOT_INTERVAL;
    return { x, y, dx: (Math.random() - 0.5) * 2, dy: (Math.random() - 0.5) * 2, id };
}

function createTargets() {
    for (let i = 0; i < NUM_TARGETS; i++) {
        targets.push(createTargetFromSide());
    }
}

function moveTargets() {
    for (let target of targets) {
        let dx = target.x - drone.x;
        let dy = target.y - drone.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
            target.x += (dx / distance) * ESCAPE_SPEED;
            target.y += (dy / distance) * ESCAPE_SPEED;
        } else {
            target.x += target.dx;
            target.y += target.dy;
        }

        target.x = Math.max(TARGET_RADIUS, Math.min(canvas.width - TARGET_RADIUS, target.x));
        target.y = Math.max(TARGET_RADIUS, Math.min(canvas.height - TARGET_RADIUS, target.y));

        if (target.x <= TARGET_RADIUS || target.x >= canvas.width - TARGET_RADIUS) target.dx *= -1;
        if (target.y <= TARGET_RADIUS || target.y >= canvas.height - TARGET_RADIUS) target.dy *= -1;
    }
}

function shootProjectiles() {
    const now = Date.now();
    for (let target of targets) {
        if (now - lastShotTimes[target.id] > SHOOT_INTERVAL) {
            const dx = drone.x - target.x;
            const dy = drone.y - target.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            projectiles.push({
                x: target.x,
                y: target.y,
                dx: (dx / distance) * PROJECTILE_SPEED,
                dy: (dy / distance) * PROJECTILE_SPEED
            });

            lastShotTimes[target.id] = now;
        }
    }
}

function moveProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            projectiles.splice(i, 1);
        }
    }
}

function drawProjectiles() {
    ctx.fillStyle = "red";
    for (let p of projectiles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawTargets() {
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const currentTime = Date.now();

    for (let target of targets) {
        // Draw the target itself (red circle with white inner circle)
        ctx.beginPath();
        ctx.arc(target.x, target.y, TARGET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "red";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(target.x, target.y, TARGET_RADIUS * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        // Draw the "Z" text inside the target
        ctx.fillStyle = "black";
        ctx.font = "bold 18px Arial";
        ctx.fillText("Z", target.x, target.y);

        // Initialize speech delay timer if not already done
        if (!target.speechDelayStartTime) {
            // Random delay between 0 and 10 seconds for each target to start speaking
            target.speechDelayStartTime = currentTime + Math.random() * 15000;  // Random delay per target
        }

        if (!target.speechBubbleText) {
            target.speechBubbleText = '';  // Initialize speech bubble text if it doesn't exist
        }

        if (!target.speechBubbleStartTime) {
            target.speechBubbleStartTime = 0;  // No speech bubble initially
        }

        // Check if enough time has passed (10 seconds after the random delay)
        if (currentTime >= target.speechDelayStartTime) {
            // If no speech bubble is already being shown, start a new one
            if (!target.speechBubbleStartTime) {
                const speechWords = ['Блят!', 'Пиздец!', 'Ебать!', 'На Берлин!'];
                target.speechBubbleText = speechWords[Math.floor(Math.random() * speechWords.length)];
                target.speechBubbleStartTime = currentTime;  // Set speech bubble start time
            }
        }

        // Only show the speech bubble for 1 second after the target starts speaking
        if (target.speechBubbleStartTime && currentTime - target.speechBubbleStartTime <= 1000) {
            // Draw the speech bubble (above the target)
            const bubbleX = target.x;
            const bubbleY = target.y - TARGET_RADIUS - 25; // Position the bubble slightly above the target
            const bubbleWidth = 80;
            const bubbleHeight = 30;

            // Draw bubble background (rounded rectangle)
            ctx.beginPath();
            ctx.moveTo(bubbleX - bubbleWidth / 2, bubbleY);
            ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY);
            ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight);
            ctx.lineTo(bubbleX - bubbleWidth / 2, bubbleY + bubbleHeight);
            ctx.closePath();
            ctx.fillStyle = "white";
            ctx.fill();
            ctx.strokeStyle = "black";
            ctx.stroke();

            // Draw the speech bubble text
            ctx.fillStyle = "black";
            ctx.font = "bold 14px Arial";
            ctx.fillText(target.speechBubbleText, bubbleX, bubbleY + bubbleHeight / 2); // Center the text vertically
        }

        // Reset the timer after speech bubble disappears (1 second)
        if (target.speechBubbleStartTime && currentTime - target.speechBubbleStartTime > 1000) {
            // After 1 second, reset the speech bubble start time for the next cycle
            target.speechBubbleStartTime = 0;  // Reset the speech bubble start time
            target.speechDelayStartTime = currentTime + 10000;  // Reset the random delay for the next cycle (10 seconds)
        }
    }
}






function drawExplosions() {
    const now = Date.now();

    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        const age = now - exp.time;
        const life = 1000;
        if (age > life) {
            explosions.splice(i, 1);
            continue;
        }

        const progress = age / life;
        const easedProgress = Math.pow(progress, 0.6); // Expands quickly at first
        const maxRadius = 60; // Slightly larger final size
        const radius = maxRadius * easedProgress;
        const alpha = 1 - progress;

        const layers = [
            { color: `rgba(255, 255, 255, ${alpha})`, scale: 0.3 },
            { color: `rgba(255, 255, 0, ${alpha * 0.8})`, scale: 0.6 },
            { color: `rgba(255, 140, 0, ${alpha * 0.6})`, scale: 0.85 },
            { color: `rgba(255, 0, 0, ${alpha * 0.4})`, scale: 1 },
        ];

        for (let layer of layers) {
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, radius * layer.scale, 0, Math.PI * 2);
            ctx.fillStyle = layer.color;
            ctx.fill();
        }
    }
}


function moveDrone() {
    if (!gameActive) return;

    if (keysPressed['w'] || keysPressed['arrowup']) drone.y -= DRONE_SPEED;
    if (keysPressed['s'] || keysPressed['arrowdown']) drone.y += DRONE_SPEED;
    if (keysPressed['a'] || keysPressed['arrowleft']) drone.x -= DRONE_SPEED;
    if (keysPressed['d'] || keysPressed['arrowright']) drone.x += DRONE_SPEED;
    drone.x = Math.max(DRONE_SIZE, Math.min(canvas.width - DRONE_SIZE, drone.x));
    drone.y = Math.max(DRONE_SIZE, Math.min(canvas.height - DRONE_SIZE, drone.y));
}

function checkCollisions() {
    if (!gameActive) return;

    for (let i = targets.length - 1; i >= 0; i--) {
        let t = targets[i];
        let dx = drone.x - t.x;
        let dy = drone.y - t.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < DRONE_SIZE / 2 + TARGET_RADIUS && isDescending) {
            explosions.push({ x: t.x, y: t.y, time: Date.now() });
            explosionSound.currentTime = 0;
            explosionSound.play();

            for (let j = targets.length - 1; j >= 0; j--) {
                if (i !== j) {
                    let t2 = targets[j];
                    let d2 = Math.hypot(t2.x - t.x, t2.y - t.y);
                    if (d2 <= 5) {
                        explosions.push({ x: t2.x, y: t2.y, time: Date.now() });
                        targets.splice(j, 1);
                        targets.push(createTargetFromSide());
                        score++;
                    }
                }
            }
            targets.splice(i, 1);
            targets.push(createTargetFromSide());
            drone = { x: 40, y: canvas.height - 40, dx: 0, dy: 0 };
            score++;
            scoreBoard.textContent = "Score: " + score;
        }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        let dx = drone.x - p.x;
        let dy = drone.y - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < DRONE_SIZE / 2 + PROJECTILE_RADIUS) {
            document.getElementById('gameOver').style.display = 'block';
            document.getElementById('restartBtn').style.display = 'block';
            gameActive = false;
            return;
        }
    }
}

function gameLoop() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    moveDrone();
    moveTargets();
    shootProjectiles();
    moveProjectiles();
    drawDrone();
    drawTargets();
    drawProjectiles();
    drawExplosions();
    checkCollisions();

    if (isDescending) {
        if (Date.now() - descendStartTime > 2000) {
            isDescending = false;
            droneScale = 1.0;
        } else if (droneScale > 0.6) {
            droneScale -= 0.02;
        }
    } else if (droneScale < 1.0) {
        droneScale += 0.02;
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

function initializeGame() {

    createTargets();
    gameLoop();
}




document.getElementById('restartBtn').addEventListener('click', () => {

    // Cancel previous animation frame to prevent stacking
    cancelAnimationFrame(animationFrameId);

    // Reset state
    gameActive = true;
    score = 0;
    scoreBoard.textContent = "Score: 0";
    drone = { x: canvas.width / 2, y: canvas.height / 2, dx: 0, dy: 0 };
    projectiles = [];
    explosions = [];
    targets = [];
    keysPressed = {};
    lastShotTimes = {};
    createTargets();
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    gameLoop(); // Start fresh loop
});


document.getElementById('startButton').addEventListener('click', function () {
    // Hide the landing screen and show the game canvas
    document.getElementById('landing-screen').style.display = 'none';
    document.getElementById('gameCanvasDiv').style.display = 'block';
    document.getElementById('startButton').style.display = 'none';

    // Start the game by initializing it
    initializeGame();
});

