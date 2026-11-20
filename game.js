// --- إعدادات اللعبة الأساسية ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// إضاءة فضائية
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0x00ffff, 1);
dirLight.position.set(0, 10, 50);
scene.add(dirLight);

// --- نظام النجوم (Warp Speed) ---
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 3000;
const starPositions = new Float32Array(starsCount * 3);
for(let i=0; i < starsCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 2000;
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starsMaterial = new THREE.PointsMaterial({color: 0xffffff, size: 1.5});
const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

// --- مركبة اللاعب (Cockpit) ---
// نبني هيكل المركبة برمجياً ليكون أمام الكاميرا
const cockpitGroup = new THREE.Group();
const dashGeo = new THREE.BoxGeometry(4, 0.5, 2);
const dashMat = new THREE.MeshStandardMaterial({color: 0x222222, metalness: 0.8});
const dashboard = new THREE.Mesh(dashGeo, dashMat);
dashboard.position.set(0, -1.5, -2);
cockpitGroup.add(dashboard);

// أسلحة الليزر
const gunGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5);
const gunMat = new THREE.MeshStandardMaterial({color: 0x555555});
const gun1 = new THREE.Mesh(gunGeo, gunMat);
gun1.rotation.x = Math.PI / 2;
gun1.position.set(-1.5, -1.2, -2.5);
cockpitGroup.add(gun1);
const gun2 = gun1.clone();
gun2.position.set(1.5, -1.2, -2.5);
cockpitGroup.add(gun2);

camera.add(cockpitGroup);
scene.add(camera);

// --- حالة اللعبة (State) ---
let fuel = 100;
let credits = 0;
let cargo = 0;
const maxCargo = 20;
let isGameOver = false;
let atStation = false;

const lasers = [];
const asteroids = [];

// --- المحطة الفضائية ---
const stationGeo = new THREE.TorusGeometry(15, 2, 16, 100);
const stationMat = new THREE.MeshStandardMaterial({color: 0x00ffff, emissive: 0x005555, wireframe: true});
const station = new THREE.Mesh(stationGeo, stationMat);
station.position.set(0, 0, -300);
scene.add(station);

// --- إنشاء الكويكبات (للتعدين) ---
function spawnAsteroid() {
    if (isGameOver) return;
    const geo = new THREE.IcosahedronGeometry(Math.random() * 3 + 1, 0);
    const mat = new THREE.MeshStandardMaterial({color: 0x888888, flatShading: true});
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(
        (Math.random() - 0.5) * 150,
        (Math.random() - 0.5) * 100,
        -100 - Math.random() * 150
    );
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.isAsteroid = true;
    scene.add(rock);
    asteroids.push(rock);
}
setInterval(spawnAsteroid, 2000);

// --- إطلاق النار ---
document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !isGameOver && !atStation) {
        shoot();
    }
});

function shoot() {
    const laserGeo = new THREE.CylinderGeometry(0.1, 0.1, 4);
    const laserMat = new THREE.MeshBasicMaterial({color: 0xff0000});
    const laser = new THREE.Mesh(laserGeo, laserMat);
    laser.rotation.x = Math.PI / 2;
    laser.position.set(camera.position.x, camera.position.y - 1, camera.position.z - 2);
    
    // توجيه الليزر للأمام بناءً على دوران الكاميرا
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    laser.userData.velocity = direction.multiplyScalar(3);
    
    scene.add(laser);
    lasers.push(laser);
}

// --- تحكم الماوس (التصويب) ---
document.addEventListener('mousemove', (e) => {
    if (isGameOver || atStation) return;
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    camera.rotation.y = -x * 0.3; // حركة محدودة
    camera.rotation.x = -y * 0.3;
});

// --- لوحة المفاتيح (الحركة للأمام والخلف) ---
const keys = {};
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

// --- تحديث واجهة المستخدم ---
function updateUI() {
    document.getElementById('fuel-val').innerText = Math.max(0, Math.floor(fuel)) + '%';
    document.getElementById('credits-val').innerText = credits + ' CR';
    document.getElementById('cargo-val').innerText = cargo + '/' + maxCargo;
}

// --- نظام التجارة (الوظائف التي تستدعيها الأزرار في HTML) ---
window.sellOre = function() {
    if (cargo > 0) {
        credits += cargo * 50;
        cargo = 0;
        updateUI();
        alert('تم بيع الشحنة بنجاح!');
    } else {
        alert('ليس لديك شحنة لبيعها!');
    }
};

window.buyFuel = function() {
    if (fuel < 100) {
        const needed = 100 - fuel;
        const cost = needed * 20;
        if (credits >= cost) {
            credits -= cost;
            fuel = 100;
            updateUI();
            alert('تم تعبئة الوقود بالكامل!');
        } else {
            alert('رصيدك غير كافٍ لشراء الوقود!');
        }
    } else {
        alert('خزان الوقود ممتلئ بالفعل.');
    }
};

window.closeStation = function() {
    atStation = false;
    document.getElementById('station-ui').classList.add('hidden');
    // إعادة المحطة بعيداً حتى لا تفتح مجدداً فوراً
    station.position.z = -300 - Math.random() * 200;
};

// --- حلقة اللعبة (Game Loop) ---
function animate() {
    if (isGameOver) return;
    requestAnimationFrame(animate);

    // تحريك النجوم للخلف لمحاكاة السرعة
    stars.position.z += 2;
    if (stars.position.z > 500) stars.position.z = 0;

    // استهلاك الوقود
    if (!atStation) {
        fuel -= 0.05; // يستهلك الوقود مع الوقت
        if (fuel <= 0) {
            fuel = 0;
            gameOver("نفد الوقود! أنت عالق في الفضاء السحيق.");
        }
    }

    // حركة المركبة (للأمام والخلف)
    if (keys['KeyW'] && fuel > 0) camera.position.z -= 1;
    if (keys['KeyS'] && fuel > 0) camera.position.z += 1;
    if (keys['KeyA'] && fuel > 0) camera.position.x -= 1;
    if (keys['KeyD'] && fuel > 0) camera.position.x += 1;

    // تحريك المحطة (لتقترب منك)
    station.rotation.z += 0.01;
    station.rotation.x += 0.005;

    // التحقق من الاقتراب من المحطة
    if (!atStation && camera.position.distanceTo(station.position) < 40) {
        atStation = true;
        document.getElementById('station-ui').classList.remove('hidden');
    }

    // معالجة الليزر
    for (let i = lasers.length - 1; i >= 0; i--) {
        let l = lasers[i];
        l.position.add(l.userData.velocity);
        
        // إزالة الليزر إذا ابتعد كثيراً
        if (l.position.z < -500) {
            scene.remove(l);
            lasers.splice(i, 1);
            continue;
        }

        // تصادم الليزر مع الكويكبات
        for (let j = asteroids.length - 1; j >= 0; j--) {
            let a = asteroids[j];
            if (l.position.distanceTo(a.position) < 4) {
                // تدمير الكويكب
                scene.remove(a);
                asteroids.splice(j, 1);
                scene.remove(l);
                lasers.splice(i, 1);
                
                // جمع الخام (إذا كانت هناك مساحة)
                if (cargo < maxCargo) {
                    cargo++;
                    updateUI();
                }
                break;
            }
        }
    }

    // تحديث الواجهة باستمرار
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

// بدء اللعبة
updateUI();
animate();
