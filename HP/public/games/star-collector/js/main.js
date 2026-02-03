/**
 * main.js
 * Entry Point & Event Wiring
 */

window.addEventListener('DOMContentLoaded', () => {
    // 1. Init System
    const store = StorageManager.load();
    const renderer = new Renderer('game-canvas');
    const uim = new UIManager();
    const sceneMgr = new SceneManager();
    const game = new GameManager(renderer, uim, store);

    // 2. Setup UI Values
    updateWalletDisplay();

    // 3. Navigation Controls

    // START GAME
    document.getElementById('start-trigger').addEventListener('click', () => {
        sceneMgr.goTo('game');
        game.start('normal');
    });

    // START ENDLESS
    document.getElementById('start-endless-trigger').addEventListener('click', () => {
        sceneMgr.goTo('game'); // Use same canvas
        game.start('endless');
    });

    // NAVIGATION VIA BUTTONS (Back buttons)
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sceneMgr.goTo('home');
            // Also ensure game stops if running?
            // Usually handled by Pause -> Quit flow.
        });
    });

    // Swipe / Screen Edge Navigation (Simple implementation)
    // For now, let's rely on the "Buttons" in the Home scene to act as triggers 
    // since we don't have swipe logic implemented fully yet.
    // Wait, the Home scene has text "Left", "Right". Let's make them clickable zones or invisible buttons.
    // Actually, I'll add invisible overlay buttons on Home for navigation.

    // Let's add simple click-to-move for Home
    // Not optimal but works for MVP.
    // Better: Add transparent buttons over the areas in index.html?
    // User requested "Rotate".
    // I will add keydown listener for arrow keys for debug/PC.
    window.addEventListener('keydown', (e) => {
        if (sceneMgr.currentPos.x === 0 && sceneMgr.currentPos.y === 0) {
            if (e.key === 'ArrowRight') sceneMgr.goTo('game'); // Actually this starts game? No, just moves view.
            if (e.key === 'ArrowLeft') sceneMgr.goTo('equip');
            if (e.key === 'ArrowUp') sceneMgr.goTo('gacha');
            if (e.key === 'ArrowDown') sceneMgr.goTo('endless');
        } else {
            // Return to home on Esc or specific key?
            if (e.key === 'Escape') sceneMgr.goTo('home');
        }
    });

    // Touch Swipe Logic for Home
    let touchStartX = 0;
    let touchStartY = 0;
    document.getElementById('scene-home').addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    });
    document.getElementById('scene-home').addEventListener('touchend', e => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        const dy = e.changedTouches[0].screenY - touchStartY;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            if (Math.abs(dx) > 50) {
                if (dx < 0) sceneMgr.goTo('game'); // Swipe Left -> view moves Right
                else sceneMgr.goTo('equip');       // Swipe Right -> view moves Left
            }
        } else {
            // Vertical
            if (Math.abs(dy) > 50) {
                if (dy < 0) sceneMgr.goTo('endless'); // Swipe Up -> view moves down
                else sceneMgr.goTo('gacha');          // Swipe Down -> view moves up
            }
        }
    });

    // 4. Pause / Result UI
    document.getElementById('btn-pause').addEventListener('click', () => {
        game.state = 'paused';
        document.getElementById('pause-modal').classList.remove('hidden');
    });

    document.getElementById('btn-colse-pause')

    document.getElementById('btn-resume').addEventListener('click', () => {
        game.state = 'playing';
        game.lastFrameTime = performance.now(); // Reset delta
        game.loop(performance.now());
        document.getElementById('pause-modal').classList.add('hidden');
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
        game.gameOver(); // Should go to result or just quit? 
        // Spec says: "Quit -> Result".
        document.getElementById('pause-modal').classList.add('hidden');
    });

    document.getElementById('btn-result-ok').addEventListener('click', () => {
        document.getElementById('result-modal').classList.add('hidden');
        sceneMgr.goTo('home');
        updateWalletDisplay();
    });

    // 5. Gacha System (Simple)
    document.getElementById('btn-gacha-spin').addEventListener('click', () => {
        const cost = 100;
        const data = StorageManager.load();
        if (data.stars >= cost) {
            data.stars -= cost;
            // Unlock random item
            const cat = ['head', 'neck', 'aura'][Math.floor(Math.random() * 3)];
            const item = ITEM_DB[cat][Math.floor(Math.random() * ITEM_DB[cat].length)];

            if (!data.inventory.includes(item.id)) {
                data.inventory.push(item.id);
                alert(`New Item: ${item.name} Get!`);
            } else {
                alert(`Duplicate... (${item.name})`);
                // Maybe partial refund?
            }
            StorageManager.save(data);
            updateWalletDisplay();
        } else {
            alert("Not enough stars...");
        }
    });

    function updateWalletDisplay() {
        const data = StorageManager.load();
        const el = document.getElementById('star-wallet');
        if (el) el.textContent = data.stars;
    }
});
