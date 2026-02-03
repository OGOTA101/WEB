/**
 * 3D Crane Game - メインゲームモジュール (改良版)
 * Three.js + Cannon-es による物理演算ベースのクレーンゲーム
 * 修正内容:
 * - 3Dモデルのクオリティ向上（詳細なクレーン、景品）
 * - アームの貫通防止（床との衝突判定）
 * - 景品の掴み機能改善
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ========================================
// ゲーム定数
// ========================================
const CONFIG = {
    // 資金システム
    INITIAL_BALANCE: 2000,
    PLAY_COST: 100,

    // タイマー
    PLAY_TIME: 30,

    // クレーン設定
    CRANE_SPEED: 0.04,
    CRANE_BOUNDS: {
        minX: -1.6, maxX: 1.6,
        minZ: -1.2, maxZ: 1.2
    },
    DROP_HEIGHT: 2.0,      // アームの降下距離
    MIN_CLAW_HEIGHT: 0.4,  // 爪の最低高度（床に接触しない）
    CLAW_OPEN_ANGLE: Math.PI / 5,
    CLAW_CLOSE_ANGLE: Math.PI / 10,
    CLAW_SPEED: 0.08,
    GRAB_RADIUS: 0.5,      // 掴み判定半径

    // 物理設定
    GRAVITY: -12,
    TIME_STEP: 1 / 60,

    // 景品設定
    PRIZES: [
        { name: 'ピンクのうさぎ', emoji: '🐰', value: 50, color: 0xff69b4, size: 0.12, mass: 0.3, shape: 'sphere' },
        { name: '青いクマ', emoji: '🐻', value: 100, color: 0x4169e1, size: 0.14, mass: 0.5, shape: 'box' },
        { name: '黄色いヒヨコ', emoji: '🐥', value: 80, color: 0xffd700, size: 0.10, mass: 0.2, shape: 'sphere' },
        { name: '緑のカエル', emoji: '🐸', value: 120, color: 0x32cd32, size: 0.13, mass: 0.4, shape: 'box' },
        { name: 'オレンジの猫', emoji: '🐱', value: 150, color: 0xff8c00, size: 0.15, mass: 0.6, shape: 'box' },
        { name: '紫のタコ', emoji: '🐙', value: 200, color: 0x9932cc, size: 0.16, mass: 0.7, shape: 'sphere' },
        { name: 'レア！虹色ユニコーン', emoji: '🦄', value: 500, color: 0xff1493, size: 0.18, mass: 1.0, shape: 'box' },
        { name: '超レア！金のドラゴン', emoji: '🐉', value: 1000, color: 0xffd700, size: 0.22, mass: 1.5, shape: 'box' },
    ],
    INITIAL_PRIZE_COUNT: 12
};

// ゲーム状態
const STATE = {
    LOADING: 'loading',
    TITLE: 'title',
    IDLE: 'idle',
    MOVING: 'moving',
    DROPPING: 'dropping',
    GRABBING: 'grabbing',
    RISING: 'rising',
    RETURNING: 'returning',
    RELEASING: 'releasing',
    GAMEOVER: 'gameover'
};

// ========================================
// グローバル変数
// ========================================
let scene, camera, renderer, controls;
let world;
let crane, craneArm, clawBaseGroup, claws = [];
let prizes = [];
let dropZone;

let gameState = STATE.LOADING;
let playerName = 'ゲスト';
let balance = CONFIG.INITIAL_BALANCE;
let prizesWon = [];
let totalEarned = 0;
let totalSpent = 0;
let timer = CONFIG.PLAY_TIME;
let timerInterval = null;

let keys = { up: false, down: false, left: false, right: false };
let grabbedPrizes = [];
let craneStartPosition = { x: 0, z: 0 };

// クレーンの動作用変数
let armExtension = 0;  // アームの伸び具合 (0 = 縮んでいる, 1 = 最大伸長)
let clawAngle = 0;     // 爪の開き具合

// DOM要素
let elements = {};

// ========================================
// 初期化
// ========================================
async function init() {
    cacheElements();
    updateLoadingProgress(10, 'シーンを初期化中...');

    initThree();
    updateLoadingProgress(30, '物理エンジンを初期化中...');

    initPhysics();
    updateLoadingProgress(50, 'クレーンを構築中...');

    createCabinet();
    createHighQualityCrane();
    updateLoadingProgress(70, '景品を配置中...');

    createDropZone();
    spawnInitialPrizes();
    updateLoadingProgress(90, '仕上げ中...');

    setupEventListeners();

    animate();

    updateLoadingProgress(100, '準備完了！');

    await delay(500);
    showScreen('title');
}

function cacheElements() {
    elements = {
        loadingScreen: document.getElementById('loading-screen'),
        loadingProgress: document.getElementById('loading-progress'),
        loadingText: document.getElementById('loading-text'),
        titleScreen: document.getElementById('title-screen'),
        gameScreen: document.getElementById('game-screen'),
        gameoverScreen: document.getElementById('gameover-screen'),
        playerNameInput: document.getElementById('player-name'),
        startBtn: document.getElementById('start-btn'),
        balanceDisplay: document.getElementById('balance-display'),
        playerDisplay: document.getElementById('player-display'),
        stateDisplay: document.getElementById('state-display'),
        timerContainer: document.getElementById('timer-container'),
        timerDisplay: document.getElementById('timer-display'),
        prizesCount: document.getElementById('prizes-count'),
        totalEarnedDisplay: document.getElementById('total-earned-display'),
        prizesList: document.getElementById('prizes-list'),
        actionBtn: document.getElementById('action-btn'),
        retryBtn: document.getElementById('retry-btn'),
        prizePopup: document.getElementById('prize-popup'),
        popupPrizeName: document.getElementById('popup-prize-name'),
        popupPrizeValue: document.getElementById('popup-prize-value'),
        btnUp: document.getElementById('btn-up'),
        btnDown: document.getElementById('btn-down'),
        btnLeft: document.getElementById('btn-left'),
        btnRight: document.getElementById('btn-right'),
        resultPrizes: document.getElementById('result-prizes'),
        resultEarned: document.getElementById('result-earned'),
        resultSpent: document.getElementById('result-spent'),
        resultBalance: document.getElementById('result-balance')
    };
}

function updateLoadingProgress(percent, text) {
    elements.loadingProgress.style.width = percent + '%';
    elements.loadingText.textContent = text;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// Three.js 初期化
// ========================================
function initThree() {
    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-container');

    // シーン
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 8, 18);

    // カメラ
    camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 4.5, 6);
    camera.lookAt(0, 0.5, 0);

    // レンダラー
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // コントロール
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0.8, 0);

    setupLighting();
    window.addEventListener('resize', onWindowResize);
}

function setupLighting() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    // メインライト
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 12, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 30;
    mainLight.shadow.camera.left = -8;
    mainLight.shadow.camera.right = 8;
    mainLight.shadow.camera.top = 8;
    mainLight.shadow.camera.bottom = -8;
    mainLight.shadow.bias = -0.0005;
    scene.add(mainLight);

    // フィルライト（紫系）
    const fillLight = new THREE.DirectionalLight(0x8b5cf6, 0.4);
    fillLight.position.set(-5, 6, -5);
    scene.add(fillLight);

    // リムライト（ピンク系）
    const rimLight = new THREE.DirectionalLight(0xff69b4, 0.3);
    rimLight.position.set(0, 3, -8);
    scene.add(rimLight);

    // スポットライト（景品を照らす）
    const spotLight = new THREE.SpotLight(0xffffff, 1.5);
    spotLight.position.set(0, 5, 0);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.decay = 1;
    spotLight.distance = 12;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);
    scene.add(spotLight.target);
    spotLight.target.position.set(0, 0, 0);
}

function onWindowResize() {
    const container = document.getElementById('game-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ========================================
// 物理エンジン初期化
// ========================================
function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, CONFIG.GRAVITY, 0);
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 15;

    // マテリアル設定
    const floorMaterial = new CANNON.Material('floor');
    const prizeMaterial = new CANNON.Material('prize');

    const floorPrizeContact = new CANNON.ContactMaterial(floorMaterial, prizeMaterial, {
        friction: 0.7,
        restitution: 0.2
    });
    world.addContactMaterial(floorPrizeContact);

    const prizePrizeContact = new CANNON.ContactMaterial(prizeMaterial, prizeMaterial, {
        friction: 0.5,
        restitution: 0.3
    });
    world.addContactMaterial(prizePrizeContact);

    world.defaultContactMaterial.friction = 0.5;
    world.defaultContactMaterial.restitution = 0.2;
}

// ========================================
// ゲームキャビネット作成（高品質版）
// ========================================
function createCabinet() {
    const cabinetGroup = new THREE.Group();

    // 床面（グラデーション風）
    const floorGeometry = new THREE.BoxGeometry(4.5, 0.15, 3.5);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.3,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -0.075;
    floor.receiveShadow = true;
    cabinetGroup.add(floor);

    // 床面プレート（装飾）
    const plateGeometry = new THREE.BoxGeometry(4.2, 0.02, 3.2);
    const plateMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d3748,
        roughness: 0.2,
        metalness: 0.5,
        emissive: 0x1a1a2e,
        emissiveIntensity: 0.1
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.y = 0.01;
    plate.receiveShadow = true;
    cabinetGroup.add(plate);

    // 物理ボディ（床）
    const floorBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(2.25, 0.1, 1.75)),
        position: new CANNON.Vec3(0, -0.1, 0),
        material: new CANNON.Material('floor')
    });
    world.addBody(floorBody);

    // ガラス壁の作成
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x88c8ff,
        transparent: true,
        opacity: 0.15,
        roughness: 0.05,
        metalness: 0,
        transmission: 0.9,
        thickness: 0.1,
        side: THREE.DoubleSide
    });

    // 背面壁
    createWall(cabinetGroup, glassMaterial, 4.5, 3.2, 0.08, 0, 1.6, -1.75, 0);

    // 左壁
    createWall(cabinetGroup, glassMaterial, 0.08, 3.2, 3.5, -2.25, 1.6, 0, 0);

    // 右壁
    createWall(cabinetGroup, glassMaterial, 0.08, 3.2, 3.5, 2.25, 1.6, 0, 0);

    // フレーム（金属風）
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        roughness: 0.3,
        metalness: 0.8
    });

    // 上部フレーム
    createFrame(cabinetGroup, frameMaterial, 4.7, 0.12, 0.12, 0, 3.25, -1.75);
    createFrame(cabinetGroup, frameMaterial, 4.7, 0.12, 0.12, 0, 3.25, 1.75);
    createFrame(cabinetGroup, frameMaterial, 0.12, 0.12, 3.6, -2.35, 3.25, 0);
    createFrame(cabinetGroup, frameMaterial, 0.12, 0.12, 3.6, 2.35, 3.25, 0);

    // 縦フレーム
    createFrame(cabinetGroup, frameMaterial, 0.1, 3.3, 0.1, -2.3, 1.6, -1.7);
    createFrame(cabinetGroup, frameMaterial, 0.1, 3.3, 0.1, 2.3, 1.6, -1.7);
    createFrame(cabinetGroup, frameMaterial, 0.1, 3.3, 0.1, -2.3, 1.6, 1.7);
    createFrame(cabinetGroup, frameMaterial, 0.1, 3.3, 0.1, 2.3, 1.6, 1.7);

    // LEDストリップ（装飾）
    const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xff69b4 });
    const ledGeometry = new THREE.BoxGeometry(4.6, 0.03, 0.03);
    const ledTop = new THREE.Mesh(ledGeometry, ledMaterial);
    ledTop.position.set(0, 3.3, 1.8);
    cabinetGroup.add(ledTop);

    const ledBottom = new THREE.Mesh(ledGeometry, ledMaterial);
    ledBottom.position.set(0, 0.02, 1.8);
    cabinetGroup.add(ledBottom);

    // 物理壁
    addPhysicsWall(0, 1.6, -1.79, 2.25, 1.6, 0.04); // 背面
    addPhysicsWall(-2.29, 1.6, 0, 0.04, 1.6, 1.75); // 左
    addPhysicsWall(2.29, 1.6, 0, 0.04, 1.6, 1.75);  // 右
    addPhysicsWall(0, 0.3, 1.79, 2.25, 0.3, 0.04);  // 前面（低い）

    scene.add(cabinetGroup);
}

function createWall(parent, material, w, h, d, x, y, z, ry) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    parent.add(mesh);
}

function createFrame(parent, material, w, h, d, x, y, z) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
}

function addPhysicsWall(x, y, z, hw, hh, hd) {
    const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(hw, hh, hd)),
        position: new CANNON.Vec3(x, y, z)
    });
    world.addBody(body);
}

// ========================================
// 高品質クレーン作成
// ========================================
function createHighQualityCrane() {
    crane = new THREE.Group();

    // レールシステム（上部）
    const railMaterial = new THREE.MeshStandardMaterial({
        color: 0x718096,
        metalness: 0.9,
        roughness: 0.2
    });

    // X軸レール
    const railXGeom = new THREE.CylinderGeometry(0.04, 0.04, 4.2, 16);
    const railX = new THREE.Mesh(railXGeom, railMaterial);
    railX.rotation.z = Math.PI / 2;
    railX.position.set(0, 3.1, 0);
    scene.add(railX);

    // Z軸レール（左右）
    const railZGeom = new THREE.CylinderGeometry(0.03, 0.03, 3.2, 12);
    const railZ1 = new THREE.Mesh(railZGeom, railMaterial);
    railZ1.rotation.x = Math.PI / 2;
    railZ1.position.set(-2.0, 3.1, 0);
    scene.add(railZ1);

    const railZ2 = railZ1.clone();
    railZ2.position.set(2.0, 3.1, 0);
    scene.add(railZ2);

    // キャリッジ（移動台車）
    const carriageGroup = new THREE.Group();

    const carriageMaterial = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.7,
        roughness: 0.3
    });

    // メインボディ
    const carriageBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.5),
        carriageMaterial
    );
    carriageBody.castShadow = true;
    carriageGroup.add(carriageBody);

    // モーターハウジング
    const motorHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.8, roughness: 0.2 })
    );
    motorHousing.position.y = -0.16;
    motorHousing.castShadow = true;
    carriageGroup.add(motorHousing);

    carriageGroup.position.y = 3.0;
    crane.add(carriageGroup);

    // アーム部分（伸縮可能）
    craneArm = new THREE.Group();

    // メインアームパイプ
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0xa0aec0,
        metalness: 0.8,
        roughness: 0.2
    });

    const armPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.04, 1.0, 12),
        armMaterial
    );
    armPipe.position.y = -0.5;
    armPipe.name = 'armPipe';
    craneArm.add(armPipe);

    // インナーパイプ（伸縮部分）
    const innerPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.03, 0.8, 10),
        new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.9, roughness: 0.15 })
    );
    innerPipe.position.y = -0.9;
    innerPipe.name = 'innerPipe';
    craneArm.add(innerPipe);

    craneArm.position.y = 2.84;
    crane.add(craneArm);

    // 爪ベースグループ
    clawBaseGroup = new THREE.Group();

    // 爪のジョイント（ハブ）
    const clawHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0xe67e22, metalness: 0.7, roughness: 0.3 })
    );
    clawHub.castShadow = true;
    clawBaseGroup.add(clawHub);

    // 爪を作成（3本）
    const clawMaterial = new THREE.MeshStandardMaterial({
        color: 0xf39c12,
        metalness: 0.6,
        roughness: 0.3
    });

    claws = [];
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const clawGroup = new THREE.Group();
        clawGroup.rotation.y = angle;

        // 爪の上部（ヒンジ部分）
        const hingeGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8);
        const hinge = new THREE.Mesh(hingeGeom, clawMaterial);
        hinge.rotation.z = Math.PI / 2;
        hinge.position.set(0.1, -0.02, 0);
        clawGroup.add(hinge);

        // 爪本体（湾曲形状）
        const fingerGroup = new THREE.Group();
        fingerGroup.position.set(0.1, -0.05, 0);

        // 上部セグメント
        const upperSegment = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.15, 0.025),
            clawMaterial
        );
        upperSegment.position.y = -0.075;
        fingerGroup.add(upperSegment);

        // 下部セグメント（曲がり）
        const lowerSegment = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.12, 0.025),
            clawMaterial
        );
        lowerSegment.position.set(0.03, -0.19, 0);
        lowerSegment.rotation.z = -0.3;
        fingerGroup.add(lowerSegment);

        // 先端（丸み）
        const tip = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 8, 8),
            clawMaterial
        );
        tip.position.set(0.05, -0.28, 0);
        fingerGroup.add(tip);

        fingerGroup.name = 'finger';
        clawGroup.add(fingerGroup);
        clawGroup.name = 'clawGroup';

        claws.push(clawGroup);
        clawBaseGroup.add(clawGroup);
    }

    clawBaseGroup.position.y = 1.9;
    clawBaseGroup.name = 'clawBase';
    crane.add(clawBaseGroup);

    // 初期位置
    crane.position.set(0, 0, 0);
    scene.add(crane);

    // 初期状態で爪を少し開く
    clawAngle = CONFIG.CLAW_OPEN_ANGLE * 0.5;
    updateClawVisual();
}

function updateClawVisual() {
    claws.forEach(clawGroup => {
        const finger = clawGroup.getObjectByName('finger');
        if (finger) {
            finger.rotation.z = clawAngle;
        }
    });
}

// ========================================
// ドロップゾーン作成
// ========================================
function createDropZone() {
    const dropZoneGroup = new THREE.Group();

    // 排出口ベース
    const baseGeometry = new THREE.BoxGeometry(1.0, 0.08, 0.7);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.4,
        metalness: 0.3,
        emissive: 0x059669,
        emissiveIntensity: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.04;
    base.receiveShadow = true;
    dropZoneGroup.add(base);

    // 枠
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        metalness: 0.6,
        roughness: 0.3
    });

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.05), frameMaterial);
    frameTop.position.set(0, 0.11, -0.35);
    dropZoneGroup.add(frameTop);

    // グロー効果
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.8), glowMaterial);
    glow.position.y = 0.12;
    dropZoneGroup.add(glow);

    dropZoneGroup.position.set(1.7, 0, 1.3);
    scene.add(dropZoneGroup);

    dropZone = dropZoneGroup;

    // ラベル
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = '#10b981';
    ctx.roundRect(0, 0, 256, 64, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁 取り出し口', 128, 44);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true });
    const labelGeometry = new THREE.PlaneGeometry(0.9, 0.22);
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(1.7, 0.3, 1.65);
    label.rotation.x = -0.4;
    scene.add(label);
}

// ========================================
// 景品生成（高品質版）
// ========================================
function spawnInitialPrizes() {
    for (let i = 0; i < CONFIG.INITIAL_PRIZE_COUNT; i++) {
        setTimeout(() => spawnPrize(), i * 100);
    }
}

function spawnPrize() {
    // ランダムに景品タイプを選択（レア度に応じた確率）
    const rand = Math.random();
    let prizeType;
    if (rand < 0.01) {
        prizeType = CONFIG.PRIZES[7]; // 超レア 1%
    } else if (rand < 0.05) {
        prizeType = CONFIG.PRIZES[6]; // レア 4%
    } else {
        prizeType = CONFIG.PRIZES[Math.floor(Math.random() * 6)]; // 通常 95%
    }

    // ランダムな位置（中央寄り）
    const x = (Math.random() - 0.5) * 2.5;
    const y = 1.5 + Math.random() * 0.5;
    const z = (Math.random() - 0.5) * 2.0 - 0.2;

    // 高品質メッシュ作成
    let geometry;
    if (prizeType.shape === 'box') {
        geometry = new THREE.BoxGeometry(
            prizeType.size * 1.6,
            prizeType.size * 1.4,
            prizeType.size * 1.2
        );
    } else {
        geometry = new THREE.SphereGeometry(prizeType.size, 24, 24);
    }

    const material = new THREE.MeshStandardMaterial({
        color: prizeType.color,
        roughness: 0.35,
        metalness: 0.15,
        emissive: prizeType.color,
        emissiveIntensity: 0.08
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // 物理ボディ作成
    let shape;
    if (prizeType.shape === 'box') {
        shape = new CANNON.Box(new CANNON.Vec3(
            prizeType.size * 0.8,
            prizeType.size * 0.7,
            prizeType.size * 0.6
        ));
    } else {
        shape = new CANNON.Sphere(prizeType.size);
    }

    const body = new CANNON.Body({
        mass: prizeType.mass,
        shape: shape,
        position: new CANNON.Vec3(x, y, z),
        linearDamping: 0.4,
        angularDamping: 0.4,
        material: new CANNON.Material('prize')
    });
    world.addBody(body);

    const prize = {
        mesh,
        body,
        type: prizeType,
        grabbed: false,
        grabOffset: new THREE.Vector3()
    };

    prizes.push(prize);
    return prize;
}

// ========================================
// イベントリスナー
// ========================================
function setupEventListeners() {
    elements.startBtn.addEventListener('click', startGame);
    elements.retryBtn.addEventListener('click', retryGame);
    elements.actionBtn.addEventListener('click', handleAction);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // D-Pad
    const dpadButtons = [
        { el: elements.btnUp, key: 'up' },
        { el: elements.btnDown, key: 'down' },
        { el: elements.btnLeft, key: 'left' },
        { el: elements.btnRight, key: 'right' }
    ];

    dpadButtons.forEach(({ el, key }) => {
        el.addEventListener('mousedown', () => { keys[key] = true; el.classList.add('active'); });
        el.addEventListener('mouseup', () => { keys[key] = false; el.classList.remove('active'); });
        el.addEventListener('mouseleave', () => { keys[key] = false; el.classList.remove('active'); });
        el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; el.classList.add('active'); });
        el.addEventListener('touchend', () => { keys[key] = false; el.classList.remove('active'); });
    });
}

function onKeyDown(e) {
    switch (e.code) {
        case 'ArrowUp': case 'KeyW':
            keys.up = true;
            elements.btnUp?.classList.add('active');
            break;
        case 'ArrowDown': case 'KeyS':
            keys.down = true;
            elements.btnDown?.classList.add('active');
            break;
        case 'ArrowLeft': case 'KeyA':
            keys.left = true;
            elements.btnLeft?.classList.add('active');
            break;
        case 'ArrowRight': case 'KeyD':
            keys.right = true;
            elements.btnRight?.classList.add('active');
            break;
        case 'Space':
            e.preventDefault();
            handleAction();
            break;
    }
}

function onKeyUp(e) {
    switch (e.code) {
        case 'ArrowUp': case 'KeyW':
            keys.up = false;
            elements.btnUp?.classList.remove('active');
            break;
        case 'ArrowDown': case 'KeyS':
            keys.down = false;
            elements.btnDown?.classList.remove('active');
            break;
        case 'ArrowLeft': case 'KeyA':
            keys.left = false;
            elements.btnLeft?.classList.remove('active');
            break;
        case 'ArrowRight': case 'KeyD':
            keys.right = false;
            elements.btnRight?.classList.remove('active');
            break;
    }
}

// ========================================
// 画面遷移
// ========================================
function showScreen(screenName) {
    elements.loadingScreen.classList.add('hidden');
    elements.titleScreen.classList.add('hidden');
    elements.gameScreen.classList.add('hidden');
    elements.gameoverScreen.classList.add('hidden');

    switch (screenName) {
        case 'loading':
            elements.loadingScreen.classList.remove('hidden');
            gameState = STATE.LOADING;
            break;
        case 'title':
            elements.titleScreen.classList.remove('hidden');
            gameState = STATE.TITLE;
            break;
        case 'game':
            elements.gameScreen.classList.remove('hidden');
            gameState = STATE.IDLE;
            break;
        case 'gameover':
            elements.gameoverScreen.classList.remove('hidden');
            gameState = STATE.GAMEOVER;
            break;
    }
}

// ========================================
// ゲーム開始
// ========================================
function startGame() {
    playerName = elements.playerNameInput.value.trim() || 'ゲスト';
    balance = CONFIG.INITIAL_BALANCE;
    prizesWon = [];
    totalEarned = 0;
    totalSpent = 0;

    updateHUD();
    elements.playerDisplay.textContent = playerName;
    elements.prizesList.innerHTML = '';

    // クレーンを初期位置に
    crane.position.set(0, 0, 0);
    armExtension = 0;
    clawAngle = CONFIG.CLAW_OPEN_ANGLE * 0.5;
    updateArmVisual();
    updateClawVisual();

    showScreen('game');
    setGameState(STATE.IDLE);
}

function retryGame() {
    // 景品をリセット
    prizes.forEach(prize => {
        scene.remove(prize.mesh);
        world.removeBody(prize.body);
    });
    prizes = [];
    grabbedPrizes = [];

    spawnInitialPrizes();

    // クレーン位置リセット
    crane.position.set(0, 0, 0);
    armExtension = 0;
    clawAngle = CONFIG.CLAW_OPEN_ANGLE * 0.5;
    updateArmVisual();
    updateClawVisual();

    startGame();
}

// ========================================
// アクション処理
// ========================================
function handleAction() {
    switch (gameState) {
        case STATE.IDLE:
            if (balance >= CONFIG.PLAY_COST) {
                insertCoin();
            }
            break;
        case STATE.MOVING:
            startDrop();
            break;
    }
}

function insertCoin() {
    balance -= CONFIG.PLAY_COST;
    totalSpent += CONFIG.PLAY_COST;
    updateHUD();

    craneStartPosition = { x: crane.position.x, z: crane.position.z };

    setGameState(STATE.MOVING);
    startTimer();
}

function startTimer() {
    timer = CONFIG.PLAY_TIME;
    elements.timerDisplay.textContent = timer;
    elements.timerContainer.classList.remove('hidden');
    elements.timerContainer.classList.remove('timer-warning');

    timerInterval = setInterval(() => {
        timer--;
        elements.timerDisplay.textContent = timer;

        if (timer <= 10) {
            elements.timerContainer.classList.add('timer-warning');
        }

        if (timer <= 0) {
            clearInterval(timerInterval);
            if (gameState === STATE.MOVING) {
                startDrop();
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    elements.timerContainer.classList.add('hidden');
}

// ========================================
// クレーン動作
// ========================================
function updateCraneMovement() {
    if (gameState !== STATE.MOVING) return;

    let dx = 0, dz = 0;

    if (keys.up) dz -= CONFIG.CRANE_SPEED;
    if (keys.down) dz += CONFIG.CRANE_SPEED;
    if (keys.left) dx -= CONFIG.CRANE_SPEED;
    if (keys.right) dx += CONFIG.CRANE_SPEED;

    crane.position.x = Math.max(CONFIG.CRANE_BOUNDS.minX, Math.min(CONFIG.CRANE_BOUNDS.maxX, crane.position.x + dx));
    crane.position.z = Math.max(CONFIG.CRANE_BOUNDS.minZ, Math.min(CONFIG.CRANE_BOUNDS.maxZ, crane.position.z + dz));
}

function startDrop() {
    stopTimer();
    // 爪を少し開いた状態で降下開始
    clawAngle = CONFIG.CLAW_OPEN_ANGLE;
    updateClawVisual();
    setGameState(STATE.DROPPING);
}

function updateArmVisual() {
    // アームの伸縮を視覚的に反映
    const armPipe = craneArm.getObjectByName('armPipe');
    const innerPipe = craneArm.getObjectByName('innerPipe');

    if (armPipe && innerPipe) {
        // innerPipeの位置を下げる
        innerPipe.position.y = -0.9 - armExtension * 0.8;
        innerPipe.scale.y = 1 + armExtension * 0.3;
    }

    // 爪ベースの位置を更新
    clawBaseGroup.position.y = 1.9 - armExtension * CONFIG.DROP_HEIGHT;
}

function updateDropSequence() {
    switch (gameState) {
        case STATE.DROPPING:
            // 爪の最低高度を計算（床に触れない）
            const currentClawHeight = clawBaseGroup.position.y + crane.position.y;
            const targetExtension = 1.0; // 最大伸長

            if (armExtension < targetExtension && currentClawHeight > CONFIG.MIN_CLAW_HEIGHT) {
                armExtension += 0.015;
                armExtension = Math.min(armExtension, targetExtension);
                updateArmVisual();
            } else {
                // 床に近づいたら停止
                setGameState(STATE.GRABBING);
            }
            break;

        case STATE.GRABBING:
            // 爪を閉じる
            if (clawAngle > CONFIG.CLAW_CLOSE_ANGLE) {
                clawAngle -= CONFIG.CLAW_SPEED;
                clawAngle = Math.max(clawAngle, CONFIG.CLAW_CLOSE_ANGLE);
                updateClawVisual();
            } else {
                // 掴み判定
                grabNearbyPrizes();
                setTimeout(() => setGameState(STATE.RISING), 300);
            }
            break;

        case STATE.RISING:
            // 上昇
            if (armExtension > 0) {
                armExtension -= 0.012;
                armExtension = Math.max(armExtension, 0);
                updateArmVisual();

                // 掴んだ景品を移動
                updateGrabbedPrizes();
            } else {
                setGameState(STATE.RETURNING);
            }
            break;

        case STATE.RETURNING:
            // 排出口へ移動
            const targetX = 1.7;
            const targetZ = 1.3;
            let reachedTarget = true;

            if (Math.abs(crane.position.x - targetX) > 0.03) {
                crane.position.x += (targetX - crane.position.x) * 0.06;
                reachedTarget = false;
            }
            if (Math.abs(crane.position.z - targetZ) > 0.03) {
                crane.position.z += (targetZ - crane.position.z) * 0.06;
                reachedTarget = false;
            }

            updateGrabbedPrizes();

            if (reachedTarget) {
                setGameState(STATE.RELEASING);
            }
            break;

        case STATE.RELEASING:
            // 爪を開く
            if (clawAngle < CONFIG.CLAW_OPEN_ANGLE) {
                clawAngle += CONFIG.CLAW_SPEED;
                clawAngle = Math.min(clawAngle, CONFIG.CLAW_OPEN_ANGLE);
                updateClawVisual();
            } else {
                releaseGrabbedPrizes();
                setTimeout(() => {
                    checkPrizeCapture();
                    returnToStart();
                }, 800);
                setGameState(STATE.IDLE); // 一時的にIDLEに
            }
            break;
    }
}

function grabNearbyPrizes() {
    // 爪の位置を取得
    const clawWorldPos = new THREE.Vector3();
    clawBaseGroup.getWorldPosition(clawWorldPos);
    clawWorldPos.y -= 0.25; // 爪の先端位置

    prizes.forEach(prize => {
        if (prize.grabbed) return;

        const prizePos = new THREE.Vector3().copy(prize.mesh.position);
        const distance = prizePos.distanceTo(clawWorldPos);

        if (distance < CONFIG.GRAB_RADIUS) {
            // 掴む確率（重さと距離に依存）
            const distanceFactor = 1 - (distance / CONFIG.GRAB_RADIUS);
            const massFactor = 1 - (prize.type.mass / 2.5);
            const grabChance = distanceFactor * massFactor * 0.85 + 0.15;

            if (Math.random() < grabChance) {
                prize.grabbed = true;
                prize.body.mass = 0;
                prize.body.velocity.set(0, 0, 0);
                prize.body.angularVelocity.set(0, 0, 0);
                prize.body.updateMassProperties();

                // 掴んだ時のオフセットを記録
                prize.grabOffset.subVectors(prizePos, clawWorldPos);

                grabbedPrizes.push(prize);
            }
        }
    });
}

function updateGrabbedPrizes() {
    const clawWorldPos = new THREE.Vector3();
    clawBaseGroup.getWorldPosition(clawWorldPos);
    clawWorldPos.y -= 0.2;

    grabbedPrizes.forEach((prize, index) => {
        // 落下判定（確率で落とす - 重いものほど落ちやすい）
        if (gameState === STATE.RISING && Math.random() < 0.003 * prize.type.mass) {
            dropPrize(prize);
            return;
        }

        // 位置を更新
        const targetPos = clawWorldPos.clone();
        targetPos.y -= 0.15 + index * 0.1;

        prize.mesh.position.lerp(targetPos, 0.3);
        prize.body.position.copy(prize.mesh.position);
    });
}

function dropPrize(prize) {
    prize.grabbed = false;
    prize.body.mass = prize.type.mass;
    prize.body.updateMassProperties();
    prize.body.wakeUp();
    grabbedPrizes = grabbedPrizes.filter(p => p !== prize);
}

function releaseGrabbedPrizes() {
    grabbedPrizes.forEach(prize => {
        prize.grabbed = false;
        prize.body.mass = prize.type.mass;
        prize.body.updateMassProperties();
        prize.body.velocity.set(0, -1.5, 0);
        prize.body.wakeUp();
    });
    grabbedPrizes = [];
}

function checkPrizeCapture() {
    // 排出口エリア
    const dropZoneBounds = {
        minX: 1.2, maxX: 2.2,
        minY: -0.3, maxY: 0.8,
        minZ: 0.9, maxZ: 1.7
    };

    const toRemove = [];

    prizes.forEach((prize, index) => {
        const pos = prize.mesh.position;
        if (pos.x >= dropZoneBounds.minX && pos.x <= dropZoneBounds.maxX &&
            pos.y >= dropZoneBounds.minY && pos.y <= dropZoneBounds.maxY &&
            pos.z >= dropZoneBounds.minZ && pos.z <= dropZoneBounds.maxZ) {

            capturePrize(prize);
            toRemove.push(index);
        }
    });

    // 逆順で削除
    toRemove.reverse().forEach(index => {
        prizes.splice(index, 1);
    });
}

function capturePrize(prize) {
    showPrizePopup(prize.type);

    balance += prize.type.value;
    totalEarned += prize.type.value;
    prizesWon.push(prize.type);

    scene.remove(prize.mesh);
    world.removeBody(prize.body);

    updateHUD();
    addPrizeToList(prize.type);

    // 景品補充
    if (prizes.length < 5) {
        for (let i = 0; i < 4; i++) {
            setTimeout(() => spawnPrize(), i * 200);
        }
    }
}

function showPrizePopup(prizeType) {
    elements.popupPrizeName.textContent = `${prizeType.emoji} ${prizeType.name}`;
    elements.popupPrizeValue.textContent = `+¥${prizeType.value}`;
    elements.prizePopup.classList.remove('hidden');

    setTimeout(() => {
        elements.prizePopup.classList.add('hidden');
    }, 2500);
}

function addPrizeToList(prizeType) {
    const item = document.createElement('div');
    item.className = 'prize-item';
    item.innerHTML = `
        <span class="prize-item-icon">${prizeType.emoji}</span>
        <div class="prize-item-info">
            <div class="prize-item-name">${prizeType.name}</div>
            <div class="prize-item-value">¥${prizeType.value}</div>
        </div>
    `;
    elements.prizesList.prepend(item);
}

function returnToStart() {
    const returnInterval = setInterval(() => {
        let reachedStart = true;

        if (Math.abs(crane.position.x - craneStartPosition.x) > 0.03) {
            crane.position.x += (craneStartPosition.x - crane.position.x) * 0.12;
            reachedStart = false;
        }
        if (Math.abs(crane.position.z - craneStartPosition.z) > 0.03) {
            crane.position.z += (craneStartPosition.z - crane.position.z) * 0.12;
            reachedStart = false;
        }

        if (reachedStart) {
            clearInterval(returnInterval);
            crane.position.x = craneStartPosition.x;
            crane.position.z = craneStartPosition.z;

            // 爪を少し開いた状態に戻す
            clawAngle = CONFIG.CLAW_OPEN_ANGLE * 0.5;
            updateClawVisual();

            if (balance < CONFIG.PLAY_COST) {
                gameOver();
            } else {
                setGameState(STATE.IDLE);
            }
        }
    }, 16);
}

// ========================================
// ゲーム状態管理
// ========================================
function setGameState(newState) {
    gameState = newState;
    updateStateDisplay();
    updateActionButton();
}

function updateStateDisplay() {
    const stateNames = {
        [STATE.IDLE]: '待機中 - コイン投入してね！',
        [STATE.MOVING]: '操作中 - 位置を決めて！',
        [STATE.DROPPING]: '降下中...',
        [STATE.GRABBING]: 'つかみ中...',
        [STATE.RISING]: '上昇中...',
        [STATE.RETURNING]: '移動中...',
        [STATE.RELEASING]: '解放中...'
    };
    elements.stateDisplay.textContent = stateNames[gameState] || '';
}

function updateActionButton() {
    const btn = elements.actionBtn;
    const text = btn.querySelector('.action-text');
    const cost = btn.querySelector('.action-cost');

    switch (gameState) {
        case STATE.IDLE:
            text.textContent = 'コイン投入';
            cost.textContent = '¥100';
            cost.style.display = 'block';
            btn.disabled = balance < CONFIG.PLAY_COST;
            btn.classList.remove('drop');
            break;
        case STATE.MOVING:
            text.textContent = '決定！';
            cost.style.display = 'none';
            btn.disabled = false;
            btn.classList.add('drop');
            break;
        default:
            text.textContent = '...';
            cost.style.display = 'none';
            btn.disabled = true;
            btn.classList.remove('drop');
    }
}

function updateHUD() {
    elements.balanceDisplay.textContent = `¥${balance.toLocaleString()}`;
    elements.prizesCount.textContent = prizesWon.length;
    elements.totalEarnedDisplay.textContent = `¥${totalEarned.toLocaleString()}`;
}

// ========================================
// ゲームオーバー
// ========================================
function gameOver() {
    setGameState(STATE.GAMEOVER);

    elements.resultPrizes.textContent = `${prizesWon.length}個`;
    elements.resultEarned.textContent = `¥${totalEarned.toLocaleString()}`;
    elements.resultSpent.textContent = `¥${totalSpent.toLocaleString()}`;

    const netBalance = totalEarned - totalSpent;
    elements.resultBalance.textContent = `${netBalance >= 0 ? '+' : ''}¥${netBalance.toLocaleString()}`;
    elements.resultBalance.style.color = netBalance >= 0 ? '#10b981' : '#ef4444';

    showScreen('gameover');
}

// ========================================
// アニメーションループ
// ========================================
function animate() {
    requestAnimationFrame(animate);

    // 物理更新
    world.step(CONFIG.TIME_STEP);

    // 景品の位置を物理に同期
    prizes.forEach(prize => {
        if (!prize.grabbed) {
            prize.mesh.position.copy(prize.body.position);
            prize.mesh.quaternion.copy(prize.body.quaternion);
        }
    });

    // クレーン操作
    updateCraneMovement();
    updateDropSequence();

    // コントロール更新
    controls.update();

    // レンダリング
    renderer.render(scene, camera);
}

// ========================================
// 起動
// ========================================
init();
