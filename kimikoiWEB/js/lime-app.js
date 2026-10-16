/* ============================================
   LIME APP - Messaging application
   ============================================ */

const LimeApp = {
    contacts: [
        { id: 'ohtomo', name: '大友', emoji: '<img src=\'assets/images/characters/ohtomo.png\' class=\'char-icon\'>', messages: [], unread: 0 },
        { id: 'koishi', name: '恋石さん', emoji: '<img src=\'assets/images/characters/koishi.png\' class=\'char-icon\'>', messages: [], unread: 0 },
        { id: 'imouto', name: '妹ちゃん', emoji: '<img src=\'assets/images/characters/imouto.png\' class=\'char-icon\'>', messages: [], unread: 0 },
    ],
    activeContact: null,
    winId: null,

    launch() {
        const win = WindowManager.create({
            title: 'LIME',
            icon: '💬',
            width: 600,
            height: 450,
            appId: 'lime',
            content: this.buildContent(),
            onClose: () => { this.winId = null; },
        });
        this.winId = win.id;
        this.renderContacts();
        if (this.contacts[0]) this.selectContact(this.contacts[0].id);
    },

    buildContent() {
        return `
            <div class="lime-container">
                <div class="lime-sidebar" id="lime-contacts"></div>
                <div class="lime-chat" id="lime-chat">
                    <div class="lime-chat-header" id="lime-chat-header">
                        <span class="lime-chat-avatar">💬</span>
                        <span class="lime-chat-name">チャットを選択</span>
                    </div>
                    <div class="lime-messages" id="lime-messages"></div>
                    <div class="lime-reply-area" id="lime-reply-area" style="display:none;"></div>
                </div>
            </div>
        `;
    },

    renderContacts() {
        const container = document.getElementById('lime-contacts');
        if (!container) return;
        container.innerHTML = '';
        
        this.contacts.forEach(c => {
            const lastMsg = c.messages.length > 0 ? c.messages[c.messages.length - 1].text : '';
            const el = createElement('div', `lime-contact ${this.activeContact === c.id ? 'active' : ''}`);
            el.innerHTML = `
                <span class="lime-contact-avatar">${c.emoji}</span>
                <div class="lime-contact-info">
                    <div class="lime-contact-name">${c.name}</div>
                    <div class="lime-contact-preview">${lastMsg.substring(0, 20)}</div>
                </div>
                ${c.unread > 0 ? `<span class="lime-contact-badge">${c.unread}</span>` : ''}
            `;
            el.onclick = () => this.selectContact(c.id);
            container.appendChild(el);
        });
    },

    selectContact(id) {
        this.activeContact = id;
        const contact = this.contacts.find(c => c.id === id);
        if (!contact) return;
        
        contact.unread = 0;
        
        const header = document.getElementById('lime-chat-header');
        if (header) {
            header.innerHTML = `
                <span class="lime-chat-avatar">${contact.emoji}</span>
                <span class="lime-chat-name">${contact.name}</span>
            `;
        }
        
        this.renderMessages();
        this.renderContacts();
    },

    renderMessages() {
        const container = document.getElementById('lime-messages');
        if (!container) return;
        
        const contact = this.contacts.find(c => c.id === this.activeContact);
        if (!contact) return;
        
        container.innerHTML = contact.messages.map(m => `
            <div class="lime-msg ${m.sent ? 'sent' : 'received'}">
                ${m.text}
                <div class="lime-msg-time">${m.time || ''}</div>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    },

    receiveMessage(contactId, text) {
        let contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
            const char = GameManager.characters[contactId];
            contact = {
                id: contactId,
                name: char ? (char.nameJp || char.name) : contactId,
                emoji: char ? char.emoji : '👤',
                messages: [],
                unread: 0,
            };
            this.contacts.push(contact);
        }
        
        const gt = GameManager.state.gameTime;
        const time = gt.hour.toString().padStart(2,'0') + ':' + gt.minute.toString().padStart(2,'0');
        
        contact.messages.push({
            text: text.replace(/<NAME>/g, GameManager.state.playerName),
            sent: false,
            time: time,
        });
        contact.unread++;
        
        // ★ 通知を追加（appパラメーター付きでクリック可能に）
        Taskbar.addNotification('LIME', `${contact.name}: ${text}`, '💬', 'lime');
        
        // Update UI if window is open
        if (this.winId) {
            this.renderContacts();
            if (this.activeContact === contactId) {
                this.renderMessages();
                // do not auto-show reply options during RealADV sequences
                // this.showReplyOptions(contactId);
            }
        }
    },

    showReplyOptions(contactId) {
        const replyArea = document.getElementById('lime-reply-area');
        if (!replyArea) return;
        
        // Find matching LIME data for current day
        const limeData = GameManager.limeMessages.filter(m => 
            m.sender === contactId && 
            parseInt(m.day) === GameManager.state.currentDay
        );
        
        const lastMsg = limeData.find(m => m.choices);
        if (lastMsg && lastMsg.choices) {
            const choices = lastMsg.choices.split('|').map(c => c.trim()).filter(c => c);
            replyArea.style.display = '';
            replyArea.innerHTML = choices.map(c => 
                `<button class="lime-reply-btn" onclick="LimeApp.sendReply('${contactId}', '${c.replace(/'/g, "\\'")}')">${c}</button>`
            ).join('');
        } else {
            replyArea.style.display = '';
            replyArea.innerHTML = `
                <button class="lime-reply-btn" onclick="LimeApp.sendReply('${contactId}', 'うん！')">うん！</button>
                <button class="lime-reply-btn" onclick="LimeApp.sendReply('${contactId}', 'そうだね')">そうだね</button>
            `;
        }
    },

    showReplyOptionsForAdv(contactId, choices, callback) {
        const replyArea = document.getElementById('lime-reply-area');
        if (!replyArea) return;
        
        replyArea.style.display = '';
        replyArea.innerHTML = choices.map((c, i) => {
            // Need a distinct window id or global callback bridge.
            // Since we can't easily inline a callback in HTML string, let's attach it to window
            const safeC = c.replace(/'/g, "\\'");
            return `<button class="lime-reply-btn" onclick="LimeApp.handleAdvChoice('${contactId}', '${safeC}', ${i})">${c}</button>`;
        }).join('');
        
        this.advCallback = callback;
    },

    handleAdvChoice(contactId, text, index) {
        if (this.advCallback) {
            this.advCallback(text, index);
            this.advCallback = null;
        }
    },

    sendReply(contactId, text, autoReply = true) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) return;
        
        const gt = GameManager.state.gameTime;
        const time = gt.hour.toString().padStart(2,'0') + ':' + gt.minute.toString().padStart(2,'0');
        
        contact.messages.push({
            text: text,
            sent: true,
            time: time,
        });
        
        const replyArea = document.getElementById('lime-reply-area');
        if (replyArea) replyArea.style.display = 'none';
        
        this.renderMessages();
        
        // Auto-reply after delay (only if requested)
        if (autoReply) {
            setTimeout(() => {
                const replies = ['なるほど～', 'うんうん', 'そうそう！', 'www'];
                this.receiveMessage(contactId, replies[randomInt(0, replies.length - 1)]);
            }, 2000 + randomInt(0, 3000));
        }
    },
};
