/* ============================================
   Real World ADV Engine - For PC environment
   ============================================ */

const RealAdvEngine = {
    scenarioData: [],
    currentIndex: 0,
    isTyping: false,
    typeTimer: null,
    inChoices: false,
    lastChoice: '', 

    start(scenario) {
        this.scenarioData = scenario || [];
        this.currentIndex = 0;
        this.lastChoice = '';
        this.inChoices = false;
        if (this.scenarioData.length > 0) {
            this.processNext();
        }
    },

    processNext() {
        if (this.currentIndex >= this.scenarioData.length) {
            this.hide();
            return;
        }

        const entry = this.scenarioData[this.currentIndex];

        // Check if skipping this branch
        if (entry.trigger && entry.trigger.startsWith('CHOICE_')) {
            if (entry.trigger !== this.lastChoice) {
                this.currentIndex++;
                setTimeout(() => this.processNext(), 0);
                return;
            }
        }

        switch (entry.type) {
            case 'novel':
            case 'narration':
                this.showText(entry);
                break;
            case 'choice':
                this.showChoices(entry);
                break;
            case 'lime':
                this.processLime(entry);
                break;
            case 'system':
                this.processSystem(entry);
                break;
            default:
                this.currentIndex++;
                setTimeout(() => this.processNext(), 0);
        }
    },

    hide() {
        const container = document.getElementById('real-adv-container');
        if (container) container.style.display = 'none';
    },

    showText(entry) {
        this.inChoices = false;
        const container = document.getElementById('real-adv-container');
        if (container) container.style.display = 'block';

        const speakerEl = document.getElementById('real-adv-speaker');
        if (speakerEl) {
            if (entry.speaker) {
                speakerEl.innerHTML = (entry.speaker === '主人公' || entry.speaker === '自分' || entry.speaker === 'player')
                    ? GameManager.state.playerName 
                    : entry.speaker;
                speakerEl.style.display = 'block';
            } else {
                speakerEl.style.display = 'none';
            }
        }

        this.typeText(entry.text.replace(/<NAME>/g, GameManager.state.playerName));
    },

    typeText(text) {
        const textEl = document.getElementById('real-adv-text');
        if (!textEl) return;
        
        textEl.innerHTML = '';
        this.isTyping = true;
        
        let index = 0;
        clearInterval(this.typeTimer);
        
        const speed = GameManager.state.config.textSpeed === 'fast' ? 15 : 
                      GameManager.state.config.textSpeed === 'slow' ? 60 : 30;

        this.typeTimer = setInterval(() => {
            if (index < text.length) {
                const span = document.createElement('span');
                span.className = 'char';
                span.textContent = text[index];
                textEl.appendChild(span);
                index++;
            } else {
                clearInterval(this.typeTimer);
                this.isTyping = false;
            }
        }, speed);
    },

    skipTyping() {
        clearInterval(this.typeTimer);
        this.isTyping = false;
        const entry = this.scenarioData[this.currentIndex];
        const textEl = document.getElementById('real-adv-text');
        if (textEl && entry) {
            textEl.innerHTML = entry.text.replace(/<NAME>/g, GameManager.state.playerName);
        }
    },

    advance() {
        if (this.inChoices) return;
        
        if (this.isTyping) {
            this.skipTyping();
            return;
        }

        const entry = this.scenarioData[this.currentIndex];
        if (entry && (entry.type === 'novel' || entry.type === 'narration' || entry.type === 'system')) {
            this.currentIndex++;
            this.processNext();
        }
    },

    processSystem(entry) {
        this.hide();

        const cmd = entry.effects || entry.text;

        switch (cmd) {
            case 'OPEN_LIME':
                if (!WindowManager.windows.find(w => w.appId === 'lime')) {
                    LimeApp.launch();
                }
                setTimeout(() => {
                    this.currentIndex++;
                    this.processNext();
                }, 1000);
                break;
            case 'OPEN_NOVEL':
                NovelEngine.launch();
                break;
            case 'DAY_START':
                // Stop processing! Player must launch games manually.
                return;
            default:
                this.currentIndex++;
                this.processNext();
                break;
        }
    },

    processLime(entry) {
        this.hide();
        this.inChoices = false;

        const senderId = entry.speaker === '大友' ? 'ohtomo' : 
                         (entry.speaker === '自分' || entry.speaker === '主人公' ? 'player' : entry.speaker);

        if (senderId === 'player') {
            // Already sent by the user selecting a choice, but if it comes up here directly:
            // Wait, if it's trigger="CHOICE_A", the choice logic in showChoices triggers LimeApp.sendReply.
            // If we just reach here directly, it means it's a forced reply without choosing, or we just clicked choice.
            // Usually, showChoices callback does the sendReply. We just skip doing it again visually if needed.
            setTimeout(() => {
                this.currentIndex++;
                this.processNext();
            }, 1000);
        } else {
            LimeApp.receiveMessage(senderId, entry.text.replace(/<NAME>/g, GameManager.state.playerName));
            
            const delay = Math.max(1500, entry.text.length * 100);
            setTimeout(() => {
                this.currentIndex++;
                this.processNext();
            }, delay);
        }
    },

    showChoices(entry) {
        this.hide();
        this.inChoices = true;

        const prev = this.scenarioData[this.currentIndex - 1];
        if (prev && prev.type === 'lime') {
            const contactId = prev.speaker === '大友' ? 'ohtomo' : prev.speaker;
            const choices = entry.choices.split('|').map(c => c.trim()).filter(c => c);
            
            LimeApp.showReplyOptionsForAdv(contactId, choices, (choiceText, choiceIndex) => {
                const charCode = String.fromCharCode(65 + choiceIndex); // A, B, C
                this.lastChoice = `CHOICE_${charCode}`;
                
                LimeApp.sendReply(contactId, choiceText, false);
                
                this.currentIndex++;
                setTimeout(() => this.processNext(), 1500);
            });
            
            if (!WindowManager.windows.find(w => w.appId === 'lime')) {
                LimeApp.launch();
            }
        } else {
            const choiceHtml = entry.choices.split('|').map((c, i) => {
                return `<button class="novel-choice-btn" onclick="RealAdvEngine.selectChoice(${i})">${c}</button>`;
            }).join('');
            
            const div = document.createElement('div');
            div.className = 'novel-choices';
            div.id = 'real-adv-choices';
            div.innerHTML = choiceHtml;
            document.body.appendChild(div);
            div.style.zIndex = '7000';
        }
    },

    selectChoice(index) {
        const charCode = String.fromCharCode(65 + index);
        this.lastChoice = `CHOICE_${charCode}`;
        const choicesEl = document.getElementById('real-adv-choices');
        if (choicesEl) {
            choicesEl.remove();
        }
        this.currentIndex++;
        this.processNext();
    }
};
