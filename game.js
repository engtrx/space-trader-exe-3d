// ==========================================
// محرك Space Trader 3D - النسخة الاحترافية
// ==========================================

const scene = new THREE.Scene();
// ضباب فضائي لزيادة العمق
scene.fog = new THREE.FogExp2(0x000000, 0.001);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- الإضاءة ---
const ambientLight = new THREE.AmbientLight(0x111133, 1.5); // إضاءة زرقاء خافتة
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(-100, 100, -200);
scene.add(sunLight);

const engineLight = new THREE.PointLight(0x00ffff, 2, 50);
camera.add(engineLight);
engineLight.position.set(0, -1, -2);

// --- بناء السديم والنجوم ---
const starGeometry = new THREE.BufferGeometry();
const starCount = 5000;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 3000;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 3000;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 3000;

    // ألوان النجوم (أزرق، أبيض، أصفر)
    const color = new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.8, Math.random() * 0.5 + 0.5);
    starColors[i * 3] = color.r;
    starColors[i * 3 + 1] = color.g;
    starColors[i * 3 + 2] = color.b;
}

starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
const starMaterial = new THREE.PointsMaterial({ size: 2, vertexColors: true, transparent: true, opacity: 0.8 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// --- بناء المركبة الفضائية (الشخصية) ---
const shipGroup = new THREE.Group();

// جسم المركبة
const bodyGeo = new THREE.CylinderGeometry(0.1, 0.5, 4, 8);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.9, roughness: 0.2 });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.rotation.x = Math.PI / 2;
body.position.set(0, -0.5, -2);
shipGroup.add(body);

// الأجنحة
const wingGeo = new THREE.BoxGeometry(3, 0.1, 0.8);
const wingMat = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.8, roughness: 0.4 });
const wing = new THREE.Mesh(wingGeo, wingMat);
wing.position.set(0, -0.5, -1.5);
shipGroup.add(wing);

// المحركات (وهج أزرق)
const engineGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
const engineMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
const engineL = new THREE.Mesh(engineGeo, engineMat);
engineL.rotation.x = Math.PI / 2;
engineL.position.set(-1, -0.5, -0.8);
shipGroup.add(engineL);
const engineR = engineL.clone();
engineR.position.set(1, -0.5, -0.8);
shipGroup.add(engineR);

// أسلحة الليزر
const gunGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const gunL = new THREE.Mesh(gunGeo, gunMat);
gunL.rotation.x = Math.PI / 2;
gunL.position.set(-1.5, -0.5, -2);
shipGroup.add(gunL);
const gunR = gunL.clone();
gunR.position.set(1.5, -0.5, -2);
shipGroup.add(gunR);

camera.add(shipGroup);
scene.add(camera);

// --- المحطة الفضائية العملاقة ---
const stationGroup = new THREE.Group();
const stationMat = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.9, roughness: 0.1 });
const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });

const ring1 = new THREE.Mesh(new THREE.TorusGeometry(20, 1, 16, 100), stationMat);
const ring2 = new THREE.Mesh(new THREE.TorusGeometry(15, 0.5, 16, 100), stationMat);
ring2.rotation.x = Math.PI / 2;
const core = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), glowMat);

stationGroup.add(ring1);
stationGroup.add(ring2);
stationGroup.add(core);
stationGroup.position.set(0, 0, -400);
scene.add(stationGroup);

// --- حالة اللعبة ---
let fuel = 100;
let credits = 0;
let cargo = 0;
let maxCargo = 20;
let isGameOver = false;
let atStation = false;
let speedMultiplier = 1;

// الحركة الانسيابية (Smoothness)
const mouseSensitivity = 0.002;
let targetRotX = 0;
let targetRotY = 0;
let targetVelZ = 0;
let targetVelX = 0;

const lasers = [];
const asteroids = [];
const explosionParticles = [];

// --- إطلاق النار ---
window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !isGameOver && !atStation) shoot();
});

function shoot() {
    const laserGeo = new THREE.CylinderGeometry(0.05, 0.05, 6);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0055, blending: THREE.AdditiveBlending, transparent: true });
    const laser = new THREE.Mesh(laserGeo, laserMat);
    
    laser.rotation.x = Math.PI / 2;
    laser.position.set(camera.position.x, camera.position.y - 0.5, camera.position.z - 2);
    
    // اتجاه الليزر بناءً على اتجاه الكاميرا
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    laser.userData.vel = dir.multiplyScalar(5);
    
    scene.add(laser);
    lasers.push(laser);
}

// --- الكويكبات ---
function spawnAsteroid() {
    if (isGameOver) return;
    // هندسة أكثر تعقيداً للكويكب
    const geo = new THREE.DodecahedronGeometry(Math.random() * 4 + 1, 1);
    const mat = new THREE.MeshStandardMaterial({ 
        color: 0x667788, 
        flatShading: true, 
        roughness: 0.9,
        metalness: 0.2
    });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 150, -100 - Math.random() * 200);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    
    // إضافة سرعة دورانية
    rock.userData.rotSpeed = { x: Math.random() * 0.02, y: Math.random() * 0.02 };
    scene.add(rock);
    asteroids.push(rock);
}
setInterval(spawnAsteroid, 1500);

// --- الانفجارات ---
function createExplosion(position) {
    for (let i = 0; i < 20; i++) {
        const pGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const pMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xffaa00 : 0xff0000 });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.copy(position);
        
        // اتجاه عشوائي
        const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(Math.random() * 2 + 1);
        p.userData.vel = vel;
        p.userData.life = 1.0;
        
        scene.add(p);
        explosionParticles.push(p);
    }
}

// --- الماوس (الانسيابية) ---
document.addEventListener('mousemove', (e) => {
    if (isGameOver || atStation) return;
    // حساب الموقع المستهدف بدلاً من الحركة المباشرة
    targetRotY = -((e.clientX / window.innerWidth) * 2 - 1) * 0.5;
    targetRotX = -((e.clientY / window.innerHeight) * 2 - 1) * 0.5;
});

// --- لوحة المفاتيح ---
const keys = {};
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

// --- التجارة ---
window.sellOre = function() {
    if (cargo > 0) { credits += cargo * 50; cargo = 0; updateUI(); alert('تم بيع الشحنة!'); }
    else alert('لا يوجد خام!');
};
window.buyFuel = function() {
    if (fuel < 100) {
        let cost = (100 - fuel) * 20;
        if (credits >= cost) { credits -= cost; fuel = 100; updateUI(); alert('تم التزود بالوقود!'); }
        else alert('رصيد غير كافٍ!');
    } else alert('ممتلئ!');
};
window.closeStation = function() {
    atStation = false;
    document.getElementById('station-ui').classList.add('hidden');
    stationGroup.position.z = -400 - Math.random() * 300;
};

function updateUI() {
    document.getElementById('fuel-val').innerText = Math.max(0, Math.floor(fuel)) + '%';
    document.getElementById('credits-val').innerText = credits + ' CR';
    document.getElementById('cargo-val').innerText = cargo + '/' + maxCargo;
}

// --- حلقة اللعبة الرئيسية (Game Loop) ---
let lastTime = performance.now();

function animate(time) {
    requestAnimationFrame(animate);
    if (isGameOver) return;

    const dt = (time - lastTime) / 1000;
    lastTime = time;

    // 1. حركة الكاميرا الانسيابية (Lerp)
    camera.rotation.y += (targetRotY - camera.rotation.y) * 5 * dt;
    camera.rotation.x += (targetRotX - camera.rotation.x) * 5 * dt;

    // 2. الحركة للأمام والخلف
    if (keys['KeyW'] && fuel > 0) targetVelZ = -30;
    else if (keys['KeyS'] && fuel > 0) targetVelZ = 30;
    else targetVelZ = 0;

    // 3. الحركة يمين ويسار
    if (keys['KeyA'] && fuel > 0) targetVelX = -20;
    else if (keys['KeyD'] && fuel > 0) targetVelX = 20;
    else targetVelX = 0;

    // تطبيق الحركة الانسيابية
    camera.position.z += targetVelZ * dt;
    camera.position.x += targetVelX * dt;

    // استهلاك الوقود
    if (!atStation) fuel -= 0.03;
    if (fuel <= 0) { fuel = 0; gameOver("نفد الوقود!"); }

    // 4. تدوير النجوم والمحطة
    stars.position.z += (50 + Math.abs(targetVelZ)) * dt;
    if (stars.position.z > 1000) stars.position.z = 0;
    
    stationGroup.rotation.y += 0.2 * dt;
    stationGroup.rotation.x += 0.1 * dt;

    // 5. التقارب من المحطة
    if (!atStation && camera.position.distanceTo(stationGroup.position) < 60) {
        atStation = true;
        document.getElementById('station-ui').classList.remove('hidden');
    }

    // 6. تحديث الليزر
    for (let i = lasers.length - 1; i >= 0; i--) {
        let l = lasers[i];
        l.position.add(l.userData.vel);
        if (l.position.z < -600) { scene.remove(l); lasers.splice(i, 1); continue; }

        // التصادم
        for (let j = asteroids.length - 1; j >= 0; j--) {
            let a = asteroids[j];
            if (l.position.distanceTo(a.position) < a.scale.x + 2) {
                createExplosion(a.position);
                scene.remove(a); asteroids.splice(j, 1);
                scene.remove(l); lasers.splice(i, 1);
                if (cargo < maxCargo) { cargo++; updateUI(); }
                break;
            }
        }
    }

    // 7. تحديث الكويكبات (الدوران)
    for (let a of asteroids) {
        a.rotation.x += a.userData.rotSpeed.x;
        a.rotation.y += a.userData.rotSpeed.y;
        a.position.z += 5 * dt; // الكويكبات تتحرك نحوك
    }

    // 8. تحديث جزيئات الانفجار
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        let p = explosionParticles[i];
        p.position.add(p.userData.vel);
        p.userData.life -= dt;
        p.scale.multiplyScalar(0.95);
        if (p.userData.life <= 0) {
            scene.remove(p);
            explosionParticles.splice(i, 1);
        }
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

// بدء
updateUI();
requestAnimationFrame(animate);
