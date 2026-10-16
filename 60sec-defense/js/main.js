/**
 * main.js
 * ゲームのエントリーポイント、メインループ、状態管理
 */
import { Game } from './game.js';
import { View } from './view.js';
import { Input } from './input.js';
import { Assets } from './asset.js';
import { TimeLoop } from './timeLoop.js';

window.onload = () => {
    const canvas = document.getElementById('game-canvas');
    const resizeCanvas = () => {
        // 9:16のアスペクト比を維持して最大化
        const aspect = 9 / 16;
        const windowAspect = window.innerWidth / window.innerHeight;

        let width, height;
        if (windowAspect < aspect) {
            width = window.innerWidth;
            height = width / aspect;
        } else {
            height = window.innerHeight;
            width = height * aspect;
        }

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // 内部解像度は固定
        canvas.width = 360;
        canvas.height = 640;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ゲームシステムの初期化
    const assets = new Assets();
    const view = new View(canvas, assets);
    const timeLoop = new TimeLoop();
    const game = new Game(timeLoop);
    const input = new Input(canvas, game);

    // グローバルなループ変数
    let lastTime = 0;
    let isPaused = false;

    // UI要素の取得
    const ui = {
        screens: {
            title: document.getElementById('screen-title'),
            result: document.getElementById('screen-result'),
            howto: document.getElementById('screen-howto'),
            overlay: document.getElementById('screen-overlay')
        },
        display: {
            wave: document.getElementById('wave-display'),
            defense: document.getElementById('defense-display'),
            time: document.getElementById('time-display'),
            lives: document.getElementById('lives-display')
        }
    };

    // ゲーム状態遷移
    function showScreen(screenId) {
        ui.screens.overlay.classList.remove('hidden');
        Object.values(ui.screens).forEach(s => {
            if (s !== ui.screens.overlay) s.classList.remove('active');
            if (s !== ui.screens.overlay) s.classList.add('hidden');
        });

        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            target.classList.remove('hidden');
        }
    }

    function startGame() {
        ui.screens.overlay.classList.add('hidden');
        game.init();
        isPaused = false;
        requestAnimationFrame(gameLoop);
    }

    // ボタンイベント
    document.getElementById('btn-start').onclick = startGame;
    document.getElementById('btn-howto').onclick = () => showScreen('screen-howto');
    document.getElementById('btn-back-title').onclick = () => showScreen('screen-title');
    document.getElementById('btn-title').onclick = () => showScreen('screen-title');

    document.getElementById('btn-reload').onclick = () => {
        if (game.tryReload()) {
            console.log('Time Loop Reloaded!');
        }
    };

    document.getElementById('btn-pause').onclick = () => {
        isPaused = !isPaused;
        if (isPaused) {
            view.drawPause();
        } else {
            requestAnimationFrame(gameLoop);
        }
    };

    // メインループ
    function gameLoop(timestamp) {
        if (isPaused) return;

        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // 更新と描画
        game.update(deltaTime / 1000); // 秒単位で渡す
        view.render(game);

        // UI更新
        ui.display.wave.textContent = `${game.currentWave}/${game.maxWave}`;
        ui.display.defense.textContent = game.defense;
        ui.display.time.textContent = Math.ceil(game.waveTime);
        ui.display.lives.textContent = game.lives;

        // ゲームオーバー/クリア判定
        if (game.state === 'gameover' || game.state === 'clear') {
            document.getElementById('result-title').textContent = game.state === 'clear' ? "GAME CLEAR!" : "GAME OVER";
            document.getElementById('res-wave').textContent = game.currentWave;
            document.getElementById('res-score').textContent = game.score;
            showScreen('screen-result');
            return;
        }

        requestAnimationFrame(gameLoop);
    }

    // 初期ロード
    assets.loadAll().then(() => {
        showScreen('screen-title');
    });
};
