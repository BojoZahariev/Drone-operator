const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const DRONE_SIZE = 40;
const DRONE_SPEED = 4;
const TARGET_SIZE = 20;
const NUM_TARGETS = 7;
const ESCAPE_SPEED = 2;
let isDescending = false;
let droneScale = 1.0;
let drone = { x: canvas.width / 2, y: canvas.height / 2, dx: 0, dy: 0 };
let targets = [];
let keysPressed = {};

function handleKeyDown(e) {
    if (e.key === ' ') {
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

    // Draw drone X body
    ctx.strokeStyle = "#696969";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-DRONE_SIZE / 2, -DRONE_SIZE / 2);
    ctx.lineTo(DRONE_SIZE / 2, DRONE_SIZE / 2);
    ctx.moveTo(DRONE_SIZE / 2, -DRONE_SIZE / 2);
    ctx.lineTo(-DRONE_SIZE / 2, DRONE_SIZE / 2);
    ctx.stroke();

    // Draw propellers
    ctx.fillStyle = "#A9A9A9";
    for (let i = 0; i < 4; i++) {
        let angle = (Math.PI / 4) + (i * Math.PI / 2);
        let propX = Math.cos(angle) * DRONE_SIZE * 0.7;
        let propY = Math.sin(angle) * DRONE_SIZE * 0.7;
        ctx.beginPath();
        ctx.arc(propX, propY, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function createTargets() {
    for (let i = 0; i < NUM_TARGETS; i++) {
        targets.push({
            x: Math.random() * (canvas.width - TARGET_SIZE),
            y: Math.random() * (canvas.height - TARGET_SIZE),
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2
        });
    }
}

function moveTargets() {
    for (let target of targets) {
        let dx = target.x + TARGET_SIZE / 2 - drone.x;
        let dy = target.y + TARGET_SIZE / 2 - drone.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
            target.x += (dx / distance) * ESCAPE_SPEED;
            target.y += (dy / distance) * ESCAPE_SPEED;
        } else {
            target.x += target.dx;
            target.y += target.dy;
        }

        if (target.x < 0 || target.x > canvas.width - TARGET_SIZE) target.dx *= -1;
        if (target.y < 0 || target.y > canvas.height - TARGET_SIZE) target.dy *= -1;
    }
}

function drawTargets() {
    ctx.fillStyle = "red";
    for (let target of targets) {
        ctx.fillRect(target.x, target.y, TARGET_SIZE, TARGET_SIZE);
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
        let target = targets[i];
        let dx = drone.x - (target.x + TARGET_SIZE / 2);
        let dy = drone.y - (target.y + TARGET_SIZE / 2);
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < DRONE_SIZE / 2 && isDescending) {
            targets.splice(i, 1);
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    moveDrone();
    moveTargets();
    drawDrone();
    drawTargets();
    checkCollisions();
    if (isDescending && droneScale > 0.6) {
        droneScale -= 0.02;
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