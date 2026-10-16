/* ============================================
   GAME MANAGER - Core Game State
   ============================================ */

const GameManager = {
    state: {
        playerName: 'ユウキ',
        currentDay: 1,
        totalDays: 10,
        loopCount: 0,
        gamePhase: 'title', // title, desktop, novel, skinship, lime, ending
        
        // Parameters
        params: {
            miyu_affection: 50,
            mio_affection: 50,
            koishi_affection: 30,
            sister_affection: 50,
            sister_trust: 50,
            sister_anger: 0,
            sister_darkness: 0,
            friend_affection: 40,
            stress: 0,
            corruption: 0,
            glitch_count: 0,
            curse_level: 0,
        },
        
        // Flags
        flags: {
            cheat_unlocked: false,
            first_play: true,
            met_koishi: false,
            novel_started: false,
            half_moon_started: false,
            seen_endings: [],
        },
        
        // Calendar events
        daySubtitles: {
            1: 'はじまりの日',
            2: '新しい出会い',
            3: '半月参り・一日目',
            4: '不穏な兆し',
            5: 'チートツール解禁',
            6: '加速する日々',
            7: '折り返し地点',
            8: '暗雲',
            9: '裏側の真実',
            10: '覚悟の時',
            11: '交差する想い',
            12: '最後の準備',
            13: '決戦前夜',
            14: '真実の告白',
            15: '最後の日',
        },

        // Game time (in-game clock)
        gameTime: { hour: 8, minute: 0 },
        
        // Novel progress
        novelProgress: {},
        backlog: [],
        
        // Notifications queue
        notifications: [],
        
        // Collected items
        items: [],
        
        // Choice history for personality diagnosis
        choiceHistory: [],
    },

    characters: {},
    scenarios: {},
    masterScenario: [],
    limeMessages: [],
    endings: [],

    async init() {
        console.log('🎮 GameManager initializing...');
        SoundManager.init();
        
        // Load data - master_scenario.csv is the single source of truth for all scenario data
        // characters.csv and endings.csv are kept as constant/config tables
        const [chars, master, endings] = await Promise.all([
            loadCSV('data/characters.csv'),
            loadCSV('data/master_scenario.csv'),
            loadCSV('data/endings.csv'),
        ]);
        
        chars.forEach(c => this.characters[c.id] = c);
        this.masterScenario = master;
        this.endings = endings;
        
        for (let day = 1; day <= 15; day++) {
            const d = day * 1000;
            
            // Build GAME_ADV scenario (ゲーム内キミコイ)
            this.scenarios['day' + day] = master
                .filter(m => {
                    const num = parseInt(m['番号']);
                    const func = m['機能'];
                    return num >= d + 100 && num <= d + 400 && ['GAME_ADV', 'SELECT', 'SYSTEM'].includes(func);
                })
                .map(m => ({
                    id: `d${day}_${m['番号']}`,
                    type: m['機能'] === 'SELECT' ? 'choice' : (m['機能'] === 'SYSTEM' ? 'system' : (m['話者'] ? 'novel' : 'narration')),
                    trigger: m['トリガー'] || 'AUTO',
                    speaker: m['話者'] || '',
                    text: m['テキスト'] || '',
                    emotion: (m['キャラ表示'] || '').split(':')[1] || 'normal',
                    bg: (m['背景'] || '').replace('BG_', '').toLowerCase(),
                    bgm: m['BGM'] || '',
                    se: m['SE'] || '',
                    choices: (m['選択肢'] || '').replace(/[AB]:/g, '').replace(/\//g, '|'),
                    choiceEffects: m['演出'] || '',
                    effects: m['演出'] || '',
                }));

            // Build REAL_ADV scenario (リアル世界イベント)
            this.scenarios['real_day' + day] = master
                .filter(m => {
                    const num = parseInt(m['番号']);
                    const func = m['機能'];
                    return num >= d - 100 && num < d + 100 && ['REAL_ADV', 'REAL_OS', 'LIME', 'SELECT', 'SYSTEM'].includes(func);
                })
                .map(m => {
                    let type = 'novel';
                    if (m['機能'] === 'REAL_OS' || m['機能'] === 'SYSTEM') type = 'system';
                    else if (m['機能'] === 'SELECT') type = 'choice';
                    else if (m['機能'] === 'LIME') type = 'lime';
                    else if (!m['話者']) type = 'narration';
                    
                    return {
                        id: `r${day}_${m['番号']}`,
                        type: type,
                        trigger: m['トリガー'] || 'AUTO',
                        speaker: m['話者'] || '',
                        text: m['テキスト'] || '',
                        emotion: 'normal',
                        bg: (m['背景'] || '').replace('BG_', '').toLowerCase(),
                        bgm: m['BGM'] || '',
                        se: m['SE'] || '',
                        choices: (m['選択肢'] || '').replace(/[AB]:/g, '').replace(/\//g, '|'),
                        effects: m['演出'] || '',
                    };
                });
        }
        
        // Build lime messages from master (LIME entries)
        this.limeMessages = master
            .filter(m => m['機能'] === 'LIME')
            .map(m => {
                const num = parseInt(m['番号']);
                const day = num < 2000 ? 1 : num < 3000 ? 2 : num < 4000 ? 3 : Math.floor(num / 1000);
                return {
                    id: `lm_${m['番号']}`,
                    day: day,
                    sender: m['話者'] === '自分' ? 'player' : (m['話者'] === '大友' ? 'ohtomo' : m['話者']),
                    text: m['テキスト'] || '',
                    timestamp: '',
                    choices: (m['選択肢'] || '').replace(/[AB]:/g, '').replace(/\//g, '|'),
                    affection_change: 0,
                };
            });
        
        console.log('📦 Data loaded:', {
            characters: Object.keys(this.characters).length,
            master_scenario: master.length,
            game_adv_day1: this.scenarios['day1'].length,
            real_adv_day1: this.scenarios['real_day1'].length,
            lime_messages: this.limeMessages.length,
            endings: endings.length,
        });

        // Check for saved games
        if (SaveManager.hasSaves()) {
            $('btn-load').style.display = '';
        }

        // Start boot sequence
        this.startBoot();
    },

    async startBoot() {
        showScreen('boot-screen');
        
        // MADE WITH Unity
        $('boot-logo-unity').style.display = '';
        await sleep(1500);
        
        // Corp logo
        $('boot-logo-unity').style.display = 'none';
        $('boot-logo-corp').style.display = '';
        await sleep(1500);
        
        // Flash effect (horror)
        $('boot-logo-corp').style.display = 'none';
        await sleep(200);
        
        // Brief horror flash
        Effects.flashScreen();
        await sleep(300);
        
        // Title screen
        showScreen('title-screen');
        this.createTitleParticles();
    },

    createTitleParticles() {
        const container = $('title-particles');
        container.innerHTML = '';
        for (let i = 0; i < 30; i++) {
            const p = createElement('div', 'title-particle');
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 3 + 's';
            p.style.animationDuration = (2 + Math.random() * 4) + 's';
            p.style.width = (2 + Math.random() * 4) + 'px';
            p.style.height = p.style.width;
            p.style.opacity = 0.2 + Math.random() * 0.5;
            container.appendChild(p);
        }
    },

    startNewGame() {
        this.resetGame();
        SoundManager.stopBGM();
        showScreen('name-input-screen');
        $('player-name-input').focus();
    },

    resetGame() {
        this.state = {
            playerName: 'ユウキ',
            currentDay: 1,
            totalDays: 10,
            loopCount: 0,
            gamePhase: 'title',
            params: { miyu_affection: 50, mio_affection: 50, koishi_affection: 30, sister_affection: 50, sister_trust: 50, sister_anger: 0, sister_darkness: 0, friend_affection: 40, stress: 0, corruption: 0, glitch_count: 0, curse_level: 0 },
            flags: { cheat_unlocked: false, first_play: true, met_koishi: false, novel_started: false, half_moon_started: false, kimikoi_done_today: false, seen_endings: [] },
            daySubtitles: this.state.daySubtitles,
            gameTime: { hour: 8, minute: 0 },
            novelProgress: {},
            backlog: [],
            notifications: [],
            items: [],
            choiceHistory: []
        };
        // Reset LIME history
        if (typeof LimeApp !== 'undefined') LimeApp.contacts.forEach(c => { c.messages = []; c.unread = 0; });
        if (typeof Taskbar !== 'undefined') Taskbar.notifications = [];
    },

    confirmName() {
        const name = $('player-name-input').value.trim();
        if (!name) {
            showDialog('エラー', '名前を入力してください。');
            return;
        }
        this.state.playerName = name;
        this.state.flags.first_play = false;
        this.startGameDay(1);
    },

    async startGameDay(day) {
        this.state.currentDay = day;
        this.state.gamePhase = 'desktop';
        this.state.gameTime = { hour: 8, minute: 0 };
        
        // Show day transition
        await this.showDayTransition(day);
        
        // Show desktop
        showScreen('desktop-screen');
        Desktop.init();
        Taskbar.init();
        
        // Show HUD
        $('sister-hud').style.display = '';
        this.updateHUD();
        
        // Start clock
        this.startGameClock();
        
        // Trigger day events
        this.triggerDayEvents(day);
    },

    async showDayTransition(day) {
        const overlay = $('day-transition');
        $('day-number').textContent = `DAY ${day}`;
        $('day-subtitle').textContent = this.state.daySubtitles[day] || '';
        overlay.style.display = 'flex';
        await sleep(2000);
        overlay.style.display = 'none';
    },

    triggerDayEvents(day) {
        // Start pc-world ADV events
        const seq = this.scenarios[`real_day${day}`];
        if (seq && seq.length > 0) {
            RealAdvEngine.start(seq);
        }

        // DAY4以降：チートツール解禁
        if (day >= 4 && !this.state.flags.cheat_unlocked) {
            this.state.flags.cheat_unlocked = true;
            setTimeout(() => {
                showToast('🔓 新機能解禁', 'チートツールが使用可能になりました', 'lime');
                Desktop.addIcon('cheat', '🔧', 'チートツール');
            }, 8000);
        }
    },

    startGameClock() {
        if (this._clockInterval) clearInterval(this._clockInterval);
        this._clockInterval = setInterval(() => {
            this.state.gameTime.minute += 1;
            if (this.state.gameTime.minute >= 60) {
                this.state.gameTime.minute = 0;
                this.state.gameTime.hour += 1;
            }
            if (this.state.gameTime.hour >= 24) {
                this.state.gameTime.hour = 0;
            }
            Taskbar.updateClock();
        }, 2000); // 1 game minute = 2 real seconds
    },

    updateHUD() {
        const p = this.state.params;
        $('hud-affection').style.width = clamp(p.sister_affection, 0, 100) + '%';
        $('hud-affection-val').textContent = Math.round(p.sister_affection);
        $('hud-trust').style.width = clamp(p.sister_trust, 0, 100) + '%';
        $('hud-trust-val').textContent = Math.round(p.sister_trust);
        $('hud-anger').style.width = clamp(p.sister_anger, 0, 100) + '%';
        $('hud-anger-val').textContent = Math.round(p.sister_anger);
    },

    modifyParam(key, delta) {
        if (this.state.params[key] !== undefined) {
            this.state.params[key] = clamp(this.state.params[key] + delta, 0, 100);
            this.updateHUD();
            GameEvents.emit('param_changed', key, this.state.params[key]);
        }
    },

    showConfig() {
        showScreen('config-screen');
        $('config-screen').classList.add('active');
        
        // Bind sliders
        ['bgm', 'se', 'voice'].forEach(type => {
            const slider = $(`config-${type}`);
            const val = $(`config-${type}-val`);
            slider.oninput = () => {
                val.textContent = slider.value;
            };
        });
    },

    closeConfig() {
        $('config-screen').classList.remove('active');
        if (this.state.gamePhase === 'desktop') {
            showScreen('desktop-screen');
        } else {
            showScreen('title-screen');
        }
    },

    showSaveScreen() {
        $('save-load-title').textContent = '💾 セーブ';
        this.renderSaveSlots('save');
        $('save-load-screen').classList.add('active');
        Taskbar.closeAllPopups();
    },

    showLoadScreen() {
        $('save-load-title').textContent = '📂 ロード';
        this.renderSaveSlots('load');
        $('save-load-screen').classList.add('active');
    },

    renderSaveSlots(mode) {
        const container = $('save-slots');
        container.innerHTML = '';
        for (let i = 1; i <= 6; i++) {
            const data = SaveManager.getSlot(i);
            const slot = createElement('div', `save-slot ${data ? '' : 'empty'}`);
            slot.innerHTML = `
                <div class="slot-num">スロット ${i}</div>
                <div class="slot-info">${data ? `DAY ${data.currentDay} - ${data.playerName}` : '---空き---'}</div>
                <div class="slot-date">${data ? data.savedAt : ''}</div>
            `;
            slot.onclick = () => {
                if (mode === 'save') {
                    SaveManager.save(i, this.state);
                    showToast('💾 セーブ完了', `スロット${i}にセーブしました`);
                    this.renderSaveSlots(mode);
                } else {
                    if (data) {
                        this.state = { ...this.state, ...data };
                        showToast('📂 ロード完了', `スロット${i}からロードしました`);
                        this.closeSaveLoad();
                        this.startGameDay(data.currentDay);
                    }
                }
            };
            container.appendChild(slot);
        }
    },

    closeSaveLoad() {
        $('save-load-screen').classList.remove('active');
        if (this.state.gamePhase === 'desktop') {
            showScreen('desktop-screen');
        } else {
            showScreen('title-screen');
        }
    },

    async shutdown() {
        Taskbar.closeAllPopups();
        const result = await showDialog(
            'シャットダウン',
            'ゲームを終了しますか？\n（セーブされていないデータは失われます）',
            [{text: 'はい'}, {text: 'いいえ', primary: true}]
        );
        if (result === 0) {
            showScreen('title-screen');
            this.state.gamePhase = 'title';
            if (this._clockInterval) clearInterval(this._clockInterval);
            WindowManager.closeAll();
        }
    },

    // Check ending conditions
    checkEndings() {
        const p = this.state.params;
        const f = this.state.flags;
        
        // Death endings
        if (p.sister_darkness >= 10) return 'end_death_03';
        if (p.corruption >= 8) return 'end_death_08';
        if (p.stress >= 10) return 'end_death_07';
        if (p.glitch_count >= 15) return 'end_death_04';
        
        // Route endings (checked on day 10 for test)
        if (this.state.currentDay >= 10) {
            if (p.sister_anger >= 100) return 'end_death_03';
            if (p.sister_anger >= 50) return 'end_sister';
            if (p.miyu_affection >= 50) return 'end_miyu';
            if (p.friend_affection >= 50) return 'end_friend';
            return 'end_alone';
        }
        return null;
    },

    async triggerEnding(endingId) {
        const ending = this.endings.find(e => e.id === endingId);
        if (!ending) return;
        
        this.state.gamePhase = 'ending';
        this.state.flags.seen_endings.push(endingId);
        
        if (ending.type === 'death') {
            // Death ending - show horror and loop
            Effects.showGlitch('vhs');
            await sleep(1000);
            Effects.triggerJumpscare();
            await sleep(2000);
            Effects.hideGlitch();
            
            await showDialog('DEAD END', `${ending.name}\n\n${ending.description}`, [{text: 'やり直す', primary: true}]);
            this.state.loopCount++;
            this.startGameDay(1);
        } else {
            // Good ending - show diagnosis
            await this.showDiagnosis(ending);
        }
    },

    async showDiagnosis(ending) {
        // Calculate personality score
        const choices = this.state.choiceHistory;
        let kindness = 0, courage = 0, wisdom = 0;
        choices.forEach(c => {
            if (c.type === 'kind') kindness++;
            if (c.type === 'brave') courage++;
            if (c.type === 'smart') wisdom++;
        });
        
        const types = [
            { name: '天使型', desc: '誰にでも優しく、自分を犠牲にしてでも人を助けるタイプ', icon: '😇' },
            { name: '勇者型', desc: '困難に立ち向かう勇気を持ち、行動で示すタイプ', icon: '⚔️' },
            { name: '賢者型', desc: '冷静に物事を分析し、最善の答えを導くタイプ', icon: '🧙' },
            { name: '愛情型', desc: '愛する人のためなら何でもできる情熱的なタイプ', icon: '💕' },
            { name: '探求型', desc: '真実を追い求め、謎を解き明かすことに生きがいを感じるタイプ', icon: '🔍' },
        ];
        
        const type = types[Math.min(Math.floor(Math.random() * types.length), types.length - 1)];
        
        const box = $('diagnosis-result');
        box.innerHTML = `
            <h2 style="color:var(--primary-light);margin-bottom:16px;">🔮 性格診断結果</h2>
            <div style="font-size:24px;margin-bottom:12px;">${ending.name}</div>
            <div style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">${ending.description}</div>
            <hr style="border-color:var(--glass-border);margin:16px 0;">
            <div style="font-size:60px;margin-bottom:12px;">${type.icon}</div>
            <div style="font-size:20px;font-weight:bold;margin-bottom:8px;">${type.name}</div>
            <div style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">${type.desc}</div>
            <button class="title-btn" onclick="GameManager.returnToTitle()" style="margin:0 auto;">
                タイトルに戻る
            </button>
        `;
        
        showScreen('diagnosis-screen');
        $('diagnosis-screen').classList.add('active');
    },

    returnToTitle() {
        $('diagnosis-screen').classList.remove('active');
        showScreen('title-screen');
        this.state.gamePhase = 'title';
        $('btn-load').style.display = '';
    },
};

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    GameManager.init();
});
