// --- إعداد الصوت (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playLaserSound() {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playExplosionSound() {
    const bufferSize = audioCtx.sampleRate * 0.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    noise.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noise.start();
}

// --- إعدادات Three.js ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.001);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// الإضاءة
scene.add(new THREE.AmbientLight(0x111133, 1.5));
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(-100, 100, -200);
scene.add(sunLight);

// النجوم
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(5000 * 3);
for (let i = 0; i < 15000; i++) starPos[i] = (Math.random() - 0.5) * 3000;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 2, color: 0xffffff, transparent: true, opacity: 0.8 }));
scene.add(stars);

// --- المركبة (Cockpit) ---
const shipGroup = new THREE.Group();

// الهيكل
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.5, 4, 8), new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.9, roughness: 0.2 }));
body.rotation.x = Math.PI / 2;
body.position.set(0, -0.5, -2);
shipGroup.add(body);

// الدرع (Sphere شفاف حول المركبة)
const shield = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.15 })
);
shield.position.set(0, -0.5, -2);
shipGroup.add(shield);

// المحركات
const engineL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
engineL.rotation.x = Math.PI / 2;
engineL.position.set(-1, -0.5, -0.8);
shipGroup.add(engineL);
const engineR = engineL.clone();
engineR.position.set(1, -0.5, -0.8);
shipGroup.add(engineR);

camera.add(shipGroup);
scene.add(camera);

// المحطة
const stationGroup = new THREE.Group();
const ring1 = new THREE.Mesh(new THREE.TorusGeometry(20, 1, 16, 100), new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.9 }));
const ring2 = new THREE.Mesh(new THREE.TorusGeometry(15, 0.5, 16, 100), new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.9 }));
ring2.rotation.x = Math.PI / 2;
stationGroup.add(ring1, ring2);
stationGroup.position.set(0, 0, -400);
scene.add(stationGroup);

// المتغيرات
let fuel = 100, credits = 0, cargo = 0, maxCargo = 20, isGameOver = false, atStation = false;
const lasers = [], asteroids = [], particles = [];
let targetRotX = 0, targetRotY = 0, targetVelZ = 0, targetVelX = 0;

// إطلاق النار
window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !isGameOver && !atStation) {
        playLaserSound();
        const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6), new THREE.MeshBasicMaterial({ color: 0xff0055, blending: THREE.AdditiveBlending }));
        laser.rotation.x = Math.PI / 2;
        laser.position.set(camera.position.x, camera.position.y - 0.5, camera.position.z - 2);
        laser.userData.vel = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(5);
        scene.add(laser);
        lasers.push(laser);
    }
});

// الكويكبات
setInterval(() => {
    if (isGameOver) return;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(Math.random() * 4 + 1, 1), new THREE.MeshStandardMaterial({ color: 0x667788, flatShading: true }));
    rock.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 150, -100 - Math.random() * 200);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.userData.rot = { x: Math.random() * 0.02, y: Math.random() * 0.02 };
    scene.add(rock);
    asteroids.push(rock);
}, 1500);

// انفجار
function explode(pos) {
    playExplosionSound();
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        p.position.copy(pos);
        p.userData.vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(Math.random() * 2 + 1);
        p.userData.life = 1.0;
        scene.add(p);
        particles.push(p);
    }
}

document.addEventListener('mousemove', (e) => {
    if (isGameOver || atStation) return;
    targetRotY = -((e.clientX / window.innerWidth) * 2 - 1) * 0.5;
    targetRotX = -((e.clientY / window.innerHeight) * 2 - 1) * 0.5;
});

const keys = {};
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

// التجارة
window.sellOre = () => { if (cargo > 0) { credits += cargo * 50; cargo = 0; updateUI(); } };
window.buyFuel = () => { if (fuel < 100 && credits >= (100 - fuel) * 20) { credits -= (100 - fuel) * 20; fuel = 100; updateUI(); } };
window.closeStation = () => { atStation = false; document.getElementById('station-ui').classList.add('hidden'); stationGroup.position.z = -400 - Math.random() * 300; };

function updateUI() {
    document.getElementById('fuel-val').innerText = Math.max(0, Math.floor(fuel)) + '%';
    document.getElementById('credits-val').innerText = credits + ' CR';
    document.getElementById('cargo-val').innerText = cargo + '/' + maxCargo;
}

let lastTime = performance.now();
function animate(time) {
    requestAnimationFrame(animate);
    if (isGameOver) return;
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    // حركة سلسة
    camera.rotation.y += (targetRotY - camera.rotation.y) * 5 * dt;
    camera.rotation.x += (targetRotX - camera.rotation.x) * 5 * dt;

    if (keys['KeyW'] && fuel > 0) targetVelZ = -30; else if (keys['KeyS'] && fuel > 0) targetVelZ = 30; else targetVelZ = 0;
    if (keys['KeyA'] && fuel > 0) targetVelX = -20; else if (keys['KeyD'] && fuel > 0) targetVelX = 20; else targetVelX = 0;

    camera.position.z += targetVelZ * dt;
    camera.position.x += targetVelX * dt;

    if (!atStation) fuel -= 0.03;
    if (fuel <= 0) { fuel = 0; gameOver("نفد الوقود!"); }

    // تأثير الدرع
    shield.rotation.y += 0.5 * dt;
    shield.rotation.x += 0.3 * dt;

    stars.position.z += (50 + Math.abs(targetVelZ)) * dt;
    if (stars.position.z > 1000) stars.position.z = 0;
    stationGroup.rotation.y += 0.2 * dt;

    if (!atStation && camera.position.distanceTo(stationGroup.position) < 60) {
        atStation = true;
        document.getElementById('station-ui').classList.remove('hidden');
    }

    // الليزر والكويكبات
    for (let i = lasers.length - 1; i >= 0; i--) {
        let l = lasers[i];
        l.position.add(l.userData.vel);
        if (l.position.z < -600) { scene.remove(l); lasers.splice(i, 1); continue; }
        for (let j = asteroids.length - 1; j >= 0; j--) {
            let a = asteroids[j];
            if (l.position.distanceTo(a.position) < a.scale.x + 2) {
                explode(a.position);
                scene.remove(a); asteroids.splice(j, 1);
                scene.remove(l); lasers.splice(i, 1);
                if (cargo < maxCargo) { cargo++; updateUI(); }
                break;
            }
        }
    }

    for (let a of asteroids) {
        a.rotation.x += a.userData.rot.x;
        a.rotation.y += a.userData.rot.y;
        a.position.z += 5 * dt;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.position.add(p.userData.vel);
        p.userData.life -= dt;
        p.scale.multiplyScalar(0.95);
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    updateUI();
    renderer.render(scene, camera);
}

function gameOver(reason) {
    isGameOver = true;
    document.getElementById('game-over').classList.remove('hidden');
    document.querySelector('#game-over h1').innerText = "انتهت المهمة";
    document.querySelector('#game-over p').innerText = reason;
    document.getElementById('final-score').innerText = credits;
}

updateUI();
requestAnimationFrame(animate);
