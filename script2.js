const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const explosionSound = document.getElementById("explosionSound");

const DRONE_WIDTH = 16;
const DRONE_HEIGHT = 50;
const TARGET_RADIUS = 20;
const BULLET_SPEED = 0.3;
const TARGET_SPEED = 0.8;

let drone = { x: 50, y: canvas.height - 60, width: DRONE_WIDTH, height: DRONE_HEIGHT };
let targets = [];
let bullets = [];
let score = 0;
let gameOver = false;
let lastShotTime = new Map();
let keysPressed = {};
let isDescending = false;
let descendStartTime = null;
let droneScale = 1.0;

function spawnTarget() {
    const side = Math.floor(Math.random() * 4);
    let x, y, dx, dy;
    if (side === 0) { x = 0; y = Math.random() * canvas.height; dx = 1; dy = 0; }
    else if (side === 1) { x = canvas.width; y = Math.random() * canvas.height; dx = -1; dy = 0; }
    else if (side === 2) { x = Math.random() * canvas.width; y = 0; dx = 0; dy = 1; }
    else { x = Math.random() * canvas.width; y = canvas.height; dx = 0; dy = -1; }
    const target = { x, y, dx, dy };
    targets.push(target);
    lastShotTime.set(target, Date.now() - Math.random() * 5000);
}

function drawDrone() {
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.scale(droneScale, droneScale);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-DRONE_WIDTH / 2, -DRONE_HEIGHT / 2, DRONE_WIDTH, DRONE_HEIGHT);

    ctx.strokeStyle = "#696969";
    ctx.lineWidth = 3;
    const armLength = 30;
    for (let angle of [45, 135, 225, 315]) {
        let rad = angle * Math.PI / 180;
        let x = Math.cos(rad) * armLength;
        let y = Math.sin(rad) * armLength;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#A9A9A9";
        ctx.fill();
    }
    ctx.restore();
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
        ctx.arc(target.x, target.y, TARGET_RADIUS * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        ctx.fillStyle = "black";
        ctx.font = "bold 18px Arial";
        ctx.fillText("Z", target.x, target.y);
    }
}

function drawBullets() {
    ctx.fillStyle = "black";
    for (let bullet of bullets) {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateBullets() {
    bullets.forEach(bullet => {
        bullet.x += bullet.dx * BULLET_SPEED;
        bullet.y += bullet.dy * BULLET_SPEED;
    });
    bullets = bullets.filter(b => b.x >= 0 && b.x <= canvas.width && b.y >= 0 && b.y <= canvas.height);
}

function checkBulletCollision() {
    for (let bullet of bullets) {
        if (Math.abs(bullet.x - drone.x) < DRONE_WIDTH / 2 && Math.abs(bullet.y - drone.y) < DRONE_HEIGHT / 2) {
            document.getElementById("gameOver").style.display = "block";
            gameOver = true;
        }
    }
}

function maybeShoot() {
    const now = Date.now();
    for (let target of targets) {
        if (now - lastShotTime.get(target) > 5000) {
            if (Math.random() < 0.4) {
                const dx = drone.x - target.x;
                const dy = drone.y - target.y;
                const mag = Math.sqrt(dx * dx + dy * dy);
                bullets.push({ x: target.x, y: target.y, dx: dx / mag, dy: dy / mag });
                lastShotTime.set(target, now);
            }
        }
    }
}

function moveTargets() {
    for (let target of targets) {
        target.x += target.dx * TARGET_SPEED;
        target.y += target.dy * TARGET_SPEED;

        if (target.x < 0 || target.x > canvas.width) target.dx *= -1;
        if (target.y < 0 || target.y > canvas.height) target.dy *= -1;
    }
}

function handleMovement() {
    if (keysPressed["ArrowUp"] || keysPressed["w"]) drone.y -= 2;
    if (keysPressed["ArrowDown"] || keysPressed["s"]) drone.y += 2;
    if (keysPressed["ArrowLeft"] || keysPressed["a"]) drone.x -= 2;
    if (keysPressed["ArrowRight"] || keysPressed["d"]) drone.x += 2;
}

function drawScore() {
    document.getElementById("scoreBoard").innerText = `Score: ${score}`;
}

function checkDroneCollisions() {
    if (!isDescending) return;
    for (let i = targets.length - 1; i >= 0; i--) {
        let t = targets[i];
        let dx = drone.x - t.x;
        let dy = drone.y - t.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < TARGET_RADIUS + DRONE_WIDTH / 2) {
            explosionSound.currentTime = 0;
            explosionSound.play();

            targets.splice(i, 1);
            score++;
            spawnTarget();
            drone = { x: 50, y: canvas.height - 60, width: DRONE_WIDTH, height: DRONE_HEIGHT };
            break;
        }
    }
}

function gameLoop() {
    if (gameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    handleMovement();
    moveTargets();
    updateBullets();
    maybeShoot();
    checkBulletCollision();
    checkDroneCollisions();

    if (isDescending) {
        if (Date.now() - descendStartTime > 2000) isDescending = false;
        else droneScale = Math.max(0.6, droneScale - 0.01);
    } else if (droneScale < 1.0) {
        droneScale += 0.01;
    }

    drawDrone();
    drawTargets();
    drawBullets();
    drawScore();
    requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (e) => {
    keysPressed[e.key] = true;
    if (e.key === " ") {
        if (!isDescending) descendStartTime = Date.now();
        isDescending = true;
    }
});

document.addEventListener("keyup", (e) => {
    keysPressed[e.key] = false;
    if (e.key === " ") {
        isDescending = false;
        droneScale = 1.0;
    }
});

for (let i = 0; i < 5; i++) spawnTarget();
gameLoop();