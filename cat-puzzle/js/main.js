/**
 * main.js
 * Game Controller & Entry Point
 */
window.onload = () => {
    try {
        const canvas = document.getElementById('game-canvas');
        // Ensure canvas size is set before view init
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        const view = new View(canvas, GAME_CONFIG);
        const audio = new AudioManager();
        let game = null;
        let state = 'title'; // title, playing, result

        // UI Elements
        const screens = {
            title: document.getElementById('screen-title'),
            game: document.getElementById('screen-game'),
            ranking: document.getElementById('screen-ranking'),
            credits: document.getElementById('screen-credits')
        };

        const modals = {
            result: document.getElementById('result-modal'),
            pause: document.getElementById('pause-modal'),
            howto: document.getElementById('howto-modal')
        };

        const ui = {
            score: document.getElementById('game-score'),
            resultScore: document.getElementById('result-score'),
            rankingScore: document.getElementById('ranking-my-score')
        };

        // Load Data
        const savedData = Storage.load();
        ui.rankingScore.textContent = savedData.highScore;

        function switchScreen(name) {
            Object.values(screens).forEach(s => s.classList.remove('active'));
            if (screens[name]) screens[name].classList.add('active');
            state = name;
        }

        function startGame() {
            game = new Game(GAME_CONFIG.GRID.ROWS, GAME_CONFIG.GRID.COLS, 5); // Start with 5 colors
            switchScreen('game');
            ui.score.textContent = '0';
            requestAnimationFrame(loop);
        }

        function loop() {
            if (state === 'game' && game) {
                view.render(game);
            }
            requestAnimationFrame(loop);
        }

        // Input Handling
        canvas.addEventListener('click', (e) => {
            if (state !== 'game' || !game) return;

            const pos = view.getGridCoord(e.clientX, e.clientY);
            if (pos.r >= 0 && pos.r < game.rows && pos.c >= 0 && pos.c < game.cols) {
                const res = game.tap(pos.r, pos.c);
                if (res.success) {
                    ui.score.textContent = game.score;
                    audio.playSE('pop');

                    if (res.gameOver) {
                        showResult();
                    }
                }
            }
        });

        function showResult() {
            ui.resultScore.textContent = game.score;
            modals.result.classList.remove('hidden');

            // Save High Score
            if (game.score > savedData.highScore) {
                savedData.highScore = game.score;
                Storage.save(savedData);
                ui.rankingScore.textContent = savedData.highScore;
            }
        }

        // Buttons
        document.getElementById('btn-start').onclick = startGame;

        document.getElementById('btn-ranking').onclick = () => switchScreen('ranking');
        document.getElementById('btn-ranking-back').onclick = () => switchScreen('title');

        document.getElementById('btn-credits').onclick = () => switchScreen('credits');
        document.getElementById('btn-credits-back').onclick = () => switchScreen('title');

        document.getElementById('btn-howto').onclick = () => modals.howto.classList.remove('hidden');
        document.getElementById('btn-howto-close').onclick = () => modals.howto.classList.add('hidden');

        document.getElementById('btn-pause').onclick = () => modals.pause.classList.remove('hidden');
        document.getElementById('btn-resume').onclick = () => modals.pause.classList.add('hidden');
        document.getElementById('btn-quit').onclick = () => {
            modals.pause.classList.add('hidden');
            switchScreen('title');
        };

        document.getElementById('btn-result-ok').onclick = () => {
            modals.result.classList.add('hidden');
            switchScreen('title');
        };

        // Initial Render
        view.render(new Game(GAME_CONFIG.GRID.ROWS, GAME_CONFIG.GRID.COLS, 3)); // Preview on title maybe?
    } catch (e) {
        alert("Game Init Error: " + e.message + "\n" + e.stack);
        console.error(e);
    }
};
