/**
 * main.js
 * Entry Point & Event Wiring
 */

window.addEventListener('DOMContentLoaded', () => {
    // 1. Init System
    let store = StorageManager.load();
    const renderer = new Renderer('game-canvas');
    const uim = new UIManager();
    const audio = new AudioManager();
    const screenMgr = new ScreenManager();
    const game = new GameManager(renderer, uim, store, audio);

    // Init UI Values
    document.getElementById('vol-bgm').value = audio.bgmVolume;
    document.getElementById('vol-se').value = audio.seVolume;

    // Link screen change
    screenMgr.onScreenChange = (screenName) => {
        if (screenName === 'game') {
            requestAnimationFrame(() => {
                renderer.resize();
            });
        }
        if (screenName === 'equip') {
            updateEquipList();
        }
        if (screenName === 'credits') {
            updateCreditsUI();
        }
        if (screenName === 'ranking') {
            updateRankingUI();
        }
        audio.playSE('scene');
    };

    updateWalletDisplay();

    // 3. Navigation Controls
    document.getElementById('btn-slow').addEventListener('click', () => {
        audio.playSE('decide');
        screenMgr.goTo('game');
        game.start('normal', 0.5);
        audio.playBgm();
    });

    document.getElementById('btn-normal').addEventListener('click', () => {
        audio.playSE('decide');
        screenMgr.goTo('game');
        game.start('normal', 1.0);
        audio.playBgm();
    });

    document.getElementById('btn-fast').addEventListener('click', () => {
        audio.playSE('decide');
        screenMgr.goTo('game');
        game.start('normal', 1.5);
        audio.playBgm();
    });

    // Ranking Button
    document.getElementById('btn-ranking').addEventListener('click', () => {
        audio.playSE('decide');
        screenMgr.goTo('ranking');
    });

    document.getElementById('btn-ranking-back').addEventListener('click', () => {
        audio.playSE('cancel');
        screenMgr.goTo('title');
    });

    document.getElementById('btn-gacha').addEventListener('click', () => {
        audio.playSE('decide');
        screenMgr.goTo('gacha');
    });

    document.getElementById('btn-equip').addEventListener('click', () => {
        audio.playSE('decide');
        screenMgr.goTo('equip');
    });

    document.getElementById('btn-credits').addEventListener('click', () => {
        audio.playSE('decide');
        screenMgr.goTo('credits');
    });

    document.getElementById('btn-gacha-back').addEventListener('click', () => {
        audio.playSE('cancel');
        screenMgr.goTo('title');
    });

    document.getElementById('btn-equip-back').addEventListener('click', () => {
        audio.playSE('cancel');
        screenMgr.goTo('title');
    });

    document.getElementById('btn-credits-back').addEventListener('click', () => {
        audio.playSE('cancel');
        audio.stopBgm();
        screenMgr.goTo('title');
    });

    // Audio Controls
    document.getElementById('vol-bgm').addEventListener('input', (e) => {
        audio.setBgmVolume(e.target.value);
    });
    document.getElementById('vol-se').addEventListener('input', (e) => {
        audio.setSeVolume(e.target.value);
    });

    // Credits UI Logic
    function updateCreditsUI() {
        const list = document.getElementById('bgm-list-container');
        if (!list) return;
        list.innerHTML = '';

        const bgmNames = ['Milk Tea', 'Tsubomi', 'Yukidoke'];

        bgmNames.forEach((name, idx) => {
            const div = document.createElement('div');
            div.className = `bgm-item ${audio.currentBgmIndex === idx ? 'active' : ''}`;
            div.innerHTML = `<span>${name}</span> ${audio.currentBgmIndex === idx ? '♪' : ''}`;
            div.addEventListener('click', () => {
                audio.playBgm(idx);
                updateCreditsUI();
            });
            list.appendChild(div);
        });
    }

    // Ranking Logic
    const submitBtn = document.getElementById('btn-ranking-submit');
    const nameInput = document.getElementById('ranking-name');

    submitBtn.addEventListener('click', async () => {
        const d = StorageManager.load();
        const score = d.highScore;
        const name = nameInput.value.trim() || '名無しさん';

        submitBtn.disabled = true;
        submitBtn.textContent = "送信中";

        const success = await RankingManager.submitScore(name, score);

        if (success) {
            audio.playSE('decide');
            // showCustomAlert("送信しました！");
            updateRankingUI(true);
        }

        submitBtn.disabled = false;
        submitBtn.textContent = "送信";
    });

    async function updateRankingUI() {
        const d = StorageManager.load();
        const elMyScore = document.getElementById('ranking-my-score');
        if (elMyScore) elMyScore.textContent = d.highScore || 0;

        const listEl = document.getElementById('ranking-list');
        if (!listEl) return;

        listEl.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">読み込み中...</p>';

        const rankings = await RankingManager.getRanking();
        listEl.innerHTML = '';

        if (!rankings) {
            listEl.innerHTML = '<p style="text-align:center; color:#ff8888; font-size:12px;">読み込み失敗<br>DBが準備されていない可能性があります</p>';
            return;
        }

        if (rankings.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; opacity:0.5;">データがありません</p>';
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        rankings.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:8px 5px; text-align:center; width:30px; color:${r.rank <= 3 ? '#ffd700' : '#fff'}; font-weight:${r.rank <= 3 ? 'bold' : 'normal'};">${r.rank}.</td>
                <td style="padding:8px 5px; text-align:left;">${escapeHtml(r.name)}</td>
                <td style="padding:8px 5px; text-align:right; font-family:monospace; font-size:1.1em; color:#ffff88;">${r.score}</td>
            `;
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            table.appendChild(tr);
        });
        listEl.appendChild(table);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    // ... (How To / Pause / Result logic) ...
    let currentHowToSlide = 0;
    const totalHowToSlides = 2;

    function updateHowToSlide() {
        document.querySelectorAll('.howto-slide').forEach(el => {
            el.classList.add('hidden');
            if (parseInt(el.dataset.slide) === currentHowToSlide) {
                el.classList.remove('hidden');
            }
        });
        document.getElementById('howto-page').textContent = `${currentHowToSlide + 1}/${totalHowToSlides}`;
    }

    document.getElementById('btn-howto').addEventListener('click', () => {
        audio.playSE('decide');
        currentHowToSlide = 0;
        updateHowToSlide();
        document.getElementById('howto-modal').classList.remove('hidden');
    });

    document.getElementById('btn-howto-close').addEventListener('click', () => {
        audio.playSE('cancel');
        document.getElementById('howto-modal').classList.add('hidden');
    });

    document.getElementById('btn-howto-next').addEventListener('click', () => {
        audio.playSE('select');
        currentHowToSlide = (currentHowToSlide + 1) % totalHowToSlides;
        updateHowToSlide();
    });

    document.getElementById('btn-howto-prev').addEventListener('click', () => {
        audio.playSE('select');
        currentHowToSlide = (currentHowToSlide - 1 + totalHowToSlides) % totalHowToSlides;
        updateHowToSlide();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
        audio.playSE('decide');
        game.state = 'paused';
        document.getElementById('pause-modal').classList.remove('hidden');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
        audio.playSE('cancel');
        game.state = 'playing';
        game.lastFrameTime = performance.now();
        game.loop(performance.now());
        document.getElementById('pause-modal').classList.add('hidden');
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
        audio.playSE('cancel');
        audio.stopBgm();
        game.gameOver();
        document.getElementById('pause-modal').classList.add('hidden');
    });

    document.getElementById('btn-result-ok').addEventListener('click', () => {
        audio.playSE('decide');
        document.getElementById('result-modal').classList.add('hidden');
        screenMgr.goTo('title');
        store = StorageManager.load();
        updateWalletDisplay();
        audio.stopBgm();

        // Suggest Ranking? (Optional)
    });

    document.getElementById('btn-gacha-spin').addEventListener('click', () => {
        const cost = GAME_CONFIG.SYSTEM.GACHA_COST;
        store = StorageManager.load();

        if (store.stars >= cost) {
            store.stars -= cost;
            audio.playSE('title');

            const baseItems = GAME_CONFIG.ACCESSORY_BASE;
            const base = baseItems[Math.floor(Math.random() * baseItems.length)];
            const effectsDB = GAME_CONFIG.ACCESSORY_EFFECTS;
            const eff1 = effectsDB[Math.floor(Math.random() * effectsDB.length)];
            const eff2 = effectsDB[Math.floor(Math.random() * effectsDB.length)];

            const newItem = {
                uid: Date.now().toString(36) + Math.random().toString(36).substr(2),
                baseId: base.id,
                effectIds: [eff1.id, eff2.id],
                displayName: `${eff1.name} ${eff2.name} ${base.name}`,
                createdAt: Date.now()
            };

            store.inventory.push(newItem);
            StorageManager.save(store);

            updateWalletDisplay();
            showCustomAlert(`NEW ITEM!\n\n${base.name}\n[${eff1.desc}] & [${eff2.desc}]`);
        } else {
            audio.playSE('cancel');
            showCustomAlert("星が足りません...");
        }
    });

    function updateEquipList() {
        store = StorageManager.load();
        const container = document.querySelector('.equip-list');
        container.innerHTML = '';

        if (store.inventory.length === 0) {
            container.innerHTML = '<p style="opacity:0.6;">アイテムを持っていません。<br>ガチャで手に入れよう！</p>';
            return;
        }

        store.inventory.forEach(item => {
            const isEquipped = store.equippedId === item.uid;

            const base = GAME_CONFIG.ACCESSORY_BASE.find(b => b.id === item.baseId);
            const eff1 = GAME_CONFIG.ACCESSORY_EFFECTS.find(e => e.id === item.effectIds[0]);
            const eff2 = GAME_CONFIG.ACCESSORY_EFFECTS.find(e => e.id === item.effectIds[1]);

            if (!base || !eff1 || !eff2) return;

            const isRare = (eff1.isRare || eff2.isRare);

            const el = document.createElement('div');
            el.className = `equip-item ${isEquipped ? 'equipped' : ''}`;
            el.innerHTML = `
                <div class="equip-icon">${getIconChar(base.type)}</div>
                <div class="equip-info">
                    <div class="equip-name">${base.name}</div>
                    <div class="equip-effects">
                        <span class="eff">${eff1.desc}</span>
                        <span class="eff">${eff2.desc}</span>
                    </div>
                </div>
                ${isEquipped ? '<div class="equip-badge">E</div>' : ''}
                ${isRare ? '<div class="equip-badge rare" style="right: -5px; top: 15px;">R</div>' : ''}
            `;

            el.addEventListener('click', () => {
                audio.playSE('select');
                if (isEquipped) {
                    store.equippedId = null;
                } else {
                    store.equippedId = item.uid;
                }
                StorageManager.save(store);
                updateEquipList();
            });

            // Long Press
            let pressTimer;
            const startPress = () => {
                pressTimer = setTimeout(() => {
                    audio.playSE('decide');
                    showCustomAlert(`${item.displayName}\n\n${eff1.desc}\n${eff2.desc}\n\n${base.desc}`);
                }, 600);
            };
            const endPress = () => clearTimeout(pressTimer);

            el.addEventListener('touchstart', startPress);
            el.addEventListener('touchend', endPress);
            el.addEventListener('mousedown', startPress);
            el.addEventListener('mouseup', endPress);

            container.appendChild(el);
        });
    }

    function getIconChar(type) {
        switch (type) {
            case 'head': return '👒';
            case 'neck': return '🧣';
            case 'ring': return '💍';
            case 'back': return '👼';
            case 'hand': return '🪄';
            default: return '📦';
        }
    }

    function updateWalletDisplay() {
        const d = StorageManager.load();
        const el = document.getElementById('star-wallet');
        if (el) el.textContent = d.stars;
    }

    function showCustomAlert(message) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
        `;

        modal.innerHTML = `
            <div style="background: rgba(20, 20, 40, 0.95); padding: 30px 40px; border-radius: 20px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.1); color: white; max-width: 80%; white-space: pre-wrap;">
                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">${message}</p>
                <button style="background: rgba(255, 215, 0, 0.3); border: 1px solid rgba(255, 215, 0, 0.5); color: #ffd700; padding: 12px 30px; border-radius: 20px; font-size: 14px; cursor: pointer;" id="alert-ok">OK</button>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelector('#alert-ok').addEventListener('click', () => {
            audio.playSE('decide');
            modal.remove();
        });
    }
});
