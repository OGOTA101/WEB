/* ============================================
   NOVEL ENGINE - Visual Novel system
   ============================================ */

const NovelEngine = {
    scenarioData: [],
    currentIndex: 0,
    isTyping: false,
    typeTimer: null,
    backlog: [],
    showingBacklog: false,
    showingChoices: false,
    currentBg: '',
    winId: null,

    // Character emoji map
    charSprites: {
        miyu: { normal: '<img src=\'assets/images/characters/miyu.png\' class=\'char-icon\'>', happy: '<img src=\'assets/images/characters/miyu.png\' class=\'char-icon\'>', sad: '<img src=\'assets/images/characters/miyu.png\' class=\'char-icon\'>', surprised: '<img src=\'assets/images/characters/miyu.png\' class=\'char-icon\'>', wonder: '<img src=\'assets/images/characters/miyu.png\' class=\'char-icon\'>', angry: '<img src=\'assets/images/characters/miyu.png\' class=\'char-icon\'>' },
        mio: { normal: '<img src=\'assets/images/characters/mio.png\' class=\'char-icon\'>', happy: '<img src=\'assets/images/characters/mio.png\' class=\'char-icon\'>', sad: '<img src=\'assets/images/characters/mio.png\' class=\'char-icon\'>', surprised: '<img src=\'assets/images/characters/mio.png\' class=\'char-icon\'>' },
        ohtomo: { normal: '<img src=\'assets/images/characters/ohtomo.png\' class=\'char-icon\'>', happy: '<img src=\'assets/images/characters/ohtomo.png\' class=\'char-icon\'>', angry: '<img src=\'assets/images/characters/ohtomo.png\' class=\'char-icon\'>' },
        koishi: { normal: '<img src=\'assets/images/characters/koishi.png\' class=\'char-icon\'>', happy: '<img src=\'assets/images/characters/koishi.png\' class=\'char-icon\'>', sad: '<img src=\'assets/images/characters/koishi.png\' class=\'char-icon\'>' },
        imouto: { normal: '<img src=\'assets/images/characters/imouto.png\' class=\'char-icon\'>', happy: '<img src=\'assets/images/characters/imouto.png\' class=\'char-icon\'>', sad: '<img src=\'assets/images/characters/imouto.png\' class=\'char-icon\'>', angry: '<img src=\'assets/images/characters/imouto.png\' class=\'char-icon\'>', horror: '👁️' },
    },

    launch() {
        const currentDay = GameManager.state.currentDay;
        const scenario = GameManager.scenarios['day' + currentDay];
        if (!scenario || scenario.length === 0) {
            showToast('⚠️', `シナリオデータ(Day ${currentDay})が見つかりません`);
            return;
        }

        this.scenarioData = scenario;
        this.currentIndex = 0;
        this.backlog = [];

        const win = WindowManager.create({
            title: '💗 キミコイ ～恋するシミュレーション～',
            icon: '💗',
            width: 800,
            height: 550,
            appId: 'novel',
            content: this.buildContent(),
            resizable: true,
            onClose: () => { this.winId = null; },
        });
        this.winId = win.id;
        
        GameManager.state.flags.novel_started = true;
        this.processNext();
    },

    buildContent() {
        return `
            <div class="novel-container" id="novel-main">
                <div class="novel-bg" id="novel-bg"></div>
                <div class="novel-sprites" id="novel-sprites"></div>
                <div class="novel-controls">
                    <button class="novel-ctrl-btn" onclick="NovelEngine.toggleBacklog()">📜 ログ</button>
                    <button class="novel-ctrl-btn" onclick="NovelEngine.skip()">⏩ スキップ</button>
                    <button class="novel-ctrl-btn" onclick="NovelEngine.toggleUI()">👁 UI非表示</button>
                </div>
                <div class="novel-textbox" id="novel-textbox" onclick="NovelEngine.advance()">
                    <div class="novel-speaker" id="novel-speaker"></div>
                    <div class="novel-text" id="novel-text"></div>
                    <div class="novel-click-indicator" id="novel-indicator">クリック ▼</div>
                </div>
                <div class="novel-choices" id="novel-choices" style="display:none;"></div>
                <div class="novel-backlog" id="novel-backlog" style="display:none;">
                    <div class="backlog-close">
                        <button class="novel-ctrl-btn" onclick="NovelEngine.toggleBacklog()">✕ 閉じる</button>
                    </div>
                </div>
            </div>
        `;
    },

    processNext() {
        if (this.currentIndex >= this.scenarioData.length) {
            this.endScenario();
            return;
        }

        const entry = this.scenarioData[this.currentIndex];

        // Process conditional triggers
        if (entry.trigger && entry.trigger.startsWith('CHOICE_')) {
            if (entry.trigger !== this.lastChoice) {
                this.currentIndex++;
                setTimeout(() => this.processNext(), 0);
                return;
            } else {
                // If matched, apply parameter change if any
                if (entry.choiceEffects && entry.choiceEffects.startsWith('PARAM:')) {
                    const parts = entry.choiceEffects.replace('PARAM:', '').split('+');
                    if (parts.length === 2 && GameManager.state.params[parts[0]] !== undefined) {
                        GameManager.modifyParam(parts[0], parseInt(parts[1]));
                    }
                }
            }
        }
        
        switch (entry.type) {
            case 'novel':
                this.showDialogue(entry);
                break;
            case 'narration':
                this.showNarration(entry);
                break;
            case 'choice':
                this.showChoices(entry);
                break;
            case 'system':
                this.processSystem(entry);
                break;
            case 'lime':
                this.processLimeEvent(entry);
                break;
            case 'lime_reply':
                this.processLimeReply(entry);
                break;
            default:
                this.currentIndex++;
                this.processNext();
        }
    },

    showDialogue(entry) {
        // Update background
        if (entry.bg && entry.bg !== this.currentBg) {
            this.currentBg = entry.bg;
            const bgEl = document.getElementById('novel-bg');
            if (bgEl) {
                bgEl.className = 'novel-bg ' + entry.bg;
            }
        }

        // Update sprite
        this.updateSprite(entry.speaker, entry.emotion);

        // Replace <NAME> with player name
        let text = entry.text.replace(/<NAME>/g, GameManager.state.playerName);

        // Speaker
        const char = GameManager.characters[entry.speaker];
        const speakerEl = document.getElementById('novel-speaker');
        if (speakerEl) {
            const isProtagonist = (entry.speaker === '主人公' || entry.speaker === '自分' || entry.speaker === 'player');
            const name = char ? char.nameJp || char.name : entry.speaker;
            const displayName = isProtagonist ? GameManager.state.playerName : name;
            
            if (isProtagonist || (!char && entry.speaker !== '妹ちゃん')) {
                // 主人公や名無しの場合はアイコンを表示しない
                speakerEl.innerHTML = displayName;
            } else {
                const emoji = char ? char.emoji : '';
                speakerEl.innerHTML = emoji ? `<span class="novel-speaker-icon">${emoji}</span> ${displayName}` : displayName;
            }
        }

        // Type text
        this.typeText(text);

        // Add to backlog
        this.backlog.push({
            speaker: char ? (char.nameJp || char.name) : entry.speaker,
            text: text,
        });
    },

    showNarration(entry) {
        let text = entry.text.replace(/<NAME>/g, GameManager.state.playerName);
        
        const speakerEl = document.getElementById('novel-speaker');
        if (speakerEl) speakerEl.innerHTML = '';
        
        this.typeText(text);
        
        this.backlog.push({ speaker: '', text: text });
    },

    typeText(text) {
        const textEl = document.getElementById('novel-text');
        if (!textEl) return;
        
        textEl.innerHTML = '';
        this.isTyping = true;
        
        const indicator = document.getElementById('novel-indicator');
        if (indicator) indicator.style.display = 'none';

        const speed = { slow: 60, normal: 30, fast: 10 };
        const configSpeed = document.getElementById('config-text-speed');
        const delay = speed[configSpeed ? configSpeed.value : 'normal'] || 30;

        let i = 0;
        const chars = [...text];
        
        if (this.typeTimer) clearInterval(this.typeTimer);
        
        this.typeTimer = setInterval(() => {
            if (i >= chars.length) {
                clearInterval(this.typeTimer);
                this.isTyping = false;
                if (indicator) indicator.style.display = '';
                return;
            }
            const span = document.createElement('span');
            span.textContent = chars[i];
            span.className = 'char';
            span.style.animationDelay = '0s';
            textEl.appendChild(span);
            i++;
        }, delay);
    },

    advance() {
        if (this.showingChoices || this.showingBacklog) return;
        
        if (this.isTyping) {
            // Fast-forward
            clearInterval(this.typeTimer);
            this.isTyping = false;
            const textEl = document.getElementById('novel-text');
            if (textEl) {
                const entry = this.scenarioData[this.currentIndex];
                if (entry) {
                    let text = (entry.text || '').replace(/<NAME>/g, GameManager.state.playerName);
                    textEl.textContent = text;
                }
            }
            const indicator = document.getElementById('novel-indicator');
            if (indicator) indicator.style.display = '';
            return;
        }

        this.currentIndex++;
        this.processNext();
    },

    showChoices(entry) {
        this.showingChoices = true;
        const choicesStr = entry.choices || '';
        const choices = choicesStr.split('|').map(c => c.trim()).filter(c => c);
        
        const container = document.getElementById('novel-choices');
        if (!container) return;
        container.innerHTML = '';
        container.style.display = 'flex';
        
        choices.forEach((choice, idx) => {
            const btn = createElement('button', 'novel-choice-btn', choice);
            btn.onclick = () => {
                this.selectChoice(idx, choice, entry);
            };
            container.appendChild(btn);
        });
    },

    selectChoice(idx, text, entry) {
        this.showingChoices = false;
        const container = document.getElementById('novel-choices');
        if (container) container.style.display = 'none';
        
        // Record choice
        GameManager.state.choiceHistory.push({ text, idx, day: GameManager.state.currentDay });
        
        const charCode = String.fromCharCode(65 + idx); // A, B, C
        this.lastChoice = `CHOICE_${charCode}`;

        this.backlog.push({ speaker: '選択', text: `→ ${text}` });
        
        this.currentIndex++;
        this.processNext();
    },

    processSystem(entry) {
        const text = entry.text;
        
        if (text === 'MADE_WITH_UNITY' || text === 'SAKURA_GAMES_LOGO' || text === 'KIMIKOI_TITLE_SCREEN') {
            // Skip system entries
            this.currentIndex++;
            this.processNext();
            return;
        }
        
        if (text.endsWith('_END') || text === 'ENDING_CHECK') {
            this.endDay();
            return;
        }

        // Effects
        if (entry.effects) {
            if (entry.effects.includes('flash')) Effects.flashScreen();
            if (entry.effects.includes('glitch')) Effects.showGlitch('scanlines');
        }

        this.currentIndex++;
        this.processNext();
    },

    processLimeEvent(entry) {
        // Trigger LIME notification
        LimeApp.receiveMessage(entry.speaker, entry.text.replace(/<NAME>/g, GameManager.state.playerName));
        Taskbar.addNotification('LIME', `${entry.speaker}: ${entry.text}`, '💬');
        
        this.currentIndex++;
        this.processNext();
    },

    processLimeReply(entry) {
        // Show choices as LIME reply options - just skip for now
        this.currentIndex++;
        this.processNext();
    },

    updateSprite(speaker, emotion) {
        const spritesEl = document.getElementById('novel-sprites');
        if (!spritesEl) return;
        
        const sprites = this.charSprites[speaker];
        if (!sprites) {
            spritesEl.innerHTML = '';
            return;
        }
        
        const emoji = sprites[emotion] || sprites.normal || '👤';
        spritesEl.innerHTML = `<div class="novel-sprite active">${emoji}</div>`;
    },

    toggleBacklog() {
        this.showingBacklog = !this.showingBacklog;
        const backlogEl = document.getElementById('novel-backlog');
        if (!backlogEl) return;
        
        if (this.showingBacklog) {
            backlogEl.style.display = '';
            backlogEl.innerHTML = `
                <div class="backlog-close">
                    <button class="novel-ctrl-btn" onclick="NovelEngine.toggleBacklog()">✕ 閉じる</button>
                </div>
                ${this.backlog.map(e => `
                    <div class="backlog-entry">
                        ${e.speaker ? `<div class="backlog-speaker">${e.speaker}</div>` : ''}
                        <div class="backlog-text">${e.text}</div>
                    </div>
                `).join('')}
            `;
            backlogEl.scrollTop = backlogEl.scrollHeight;
        } else {
            backlogEl.style.display = 'none';
        }
    },

    skip() {
        // Skip through text quickly
        if (this.isTyping) {
            clearInterval(this.typeTimer);
            this.isTyping = false;
        }
        this.currentIndex++;
        if (this.currentIndex < this.scenarioData.length) {
            this.processNext();
        }
    },

    toggleUI() {
        const textbox = document.getElementById('novel-textbox');
        if (textbox) {
            textbox.style.display = textbox.style.display === 'none' ? '' : 'none';
        }
    },

    async endDay() {
        const day = GameManager.state.currentDay;
        showToast('📅', `DAY ${day} 終了`);
        
        // キミコイのウィンドウを自動で閉じる
        if (this.winId) {
            WindowManager.close(this.winId);
            this.winId = null;
        }
        
        if (day < 10) {
            setTimeout(() => {
                // 日付を更新
                GameManager.state.currentDay = day + 1;
                if (typeof Taskbar !== 'undefined') {
                    Taskbar.updateClock();
                }
                
                // 次の日のリアルタイムイベント（LIME等）を開始する
                // ゲーム進行はユーザーがアイコンから再起動することで行う
                GameManager.startRealDay(day + 1);
            }, 1000);
        } else {
            // End of test loop (day 10)
            const ending = GameManager.checkEndings();
            if (ending) {
                GameManager.triggerEnding(ending);
            } else {
                // Default ending fallback
                GameManager.triggerEnding('end_alone');
            }
        }
    },

    endScenario() {
        showToast('📖', 'シナリオ終了');
        this.endDay();
    },
};
