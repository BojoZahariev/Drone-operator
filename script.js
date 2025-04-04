const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreBoard = document.getElementById('scoreBoard');
const explosionSound = document.getElementById('explosionSound');

const DRONE_SIZE = 40;
const DRONE_SPEED = 4;
const TARGET_RADIUS = 15;
const NUM_TARGETS = 7;
const ESCAPE_SPEED = 2;
let isDescending = false;
let descendStartTime = null;
let droneScale = 1.0;
let score = 0;

let drone = { x: canvas.width / 2, y: canvas.height / 2, dx: 0, dy: 0 };
let targets = [];
let explosions = [];
let keysPressed = {};

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

    ctx.fillStyle = "#2F4F4F";
    ctx.fillRect(-10, -15, 20, 30);

    ctx.strokeStyle = "#696969";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(-DRONE_SIZE / 2, -DRONE_SIZE / 2);
    ctx.lineTo(-10, -15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(DRONE_SIZE / 2, -DRONE_SIZE / 2);
    ctx.lineTo(10, -15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-DRONE_SIZE / 2, DRONE_SIZE / 2);
    ctx.lineTo(-10, 15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(DRONE_SIZE / 2, DRONE_SIZE / 2);
    ctx.lineTo(10, 15);
    ctx.stroke();

    ctx.fillStyle = "#A9A9A9";
    const offsets = [
        [-DRONE_SIZE / 2, -DRONE_SIZE / 2],
        [DRONE_SIZE / 2, -DRONE_SIZE / 2],
        [-DRONE_SIZE / 2, DRONE_SIZE / 2],
        [DRONE_SIZE / 2, DRONE_SIZE / 2],
    ];
    for (let [x, y] of offsets) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
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
    return { x, y, dx: (Math.random() - 0.5) * 2, dy: (Math.random() - 0.5) * 2 };
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

        if (target.x < 0 || target.x > canvas.width) target.dx *= -1;
        if (target.y < 0 || target.y > canvas.height) target.dy *= -1;
    }
}

function drawTargets() {
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let target of targets) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, TARGET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "red";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(target.x, target.y, TARGET_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        ctx.fillStyle = "black";
        ctx.font = "bold 18px Arial";
        ctx.fillText("Z", target.x, target.y);
    }
}


function drawExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        if (Date.now() - exp.time > 1000) {
            explosions.splice(i, 1);
        } else {
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, 30, 0, Math.PI * 2);
            ctx.fillStyle = "orange";
            ctx.fill();
        }
    }
}

function moveDrone() {
    if (keysPressed['w'] || keysPressed['arrowup']) drone.y -= DRONE_SPEED;
    if (keysPressed['s'] || keysPressed['arrowdown']) drone.y += DRONE_SPEED;
    if (keysPressed['a'] || keysPressed['arrowleft']) drone.x -= DRONE_SPEED;
    if (keysPressed['d'] || keysPressed['arrowright']) drone.x += DRONE_SPEED;
    drone.x = Math.max(DRONE_SIZE, Math.min(canvas.width - DRONE_SIZE, drone.x));
    drone.y = Math.max(DRONE_SIZE, Math.min(canvas.height - DRONE_SIZE, drone.y));
}

function checkCollisions() {
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
            break;
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    moveDrone();
    moveTargets();
    drawDrone();
    drawTargets();
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

    requestAnimationFrame(gameLoop);
}

function initializeGame() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    createTargets();
    gameLoop();
}

initializeGame();