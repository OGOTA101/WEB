/* ============================================
   APPS - All other applications
   ============================================ */
const Apps = {
    recycleBinItems: [],
    _tmgrInterval: null,
    _clockAppInterval: null,
    // ★ メモ帳保存用ストレージ
    notepadData: {},

    // ★ メモ帳 - 保存機能付き
    launchNotepad(iconDef) {
        const noteId = (iconDef && iconDef.id) || 'notepad';
        const savedText = this.notepadData[noteId] || '';
        const title = (iconDef && iconDef.label) || 'メモ帳';

        WindowManager.create({
            title: title, icon: '📝', width: 500, height: 380, appId: 'notepad',
            content: `<div class="notepad-container">
                <div class="window-menubar">
                    <span class="menu-item" onclick="Apps.saveNotepad('${noteId}')">💾 保存(S)</span>
                    <span class="menu-item" onclick="Apps.saveNotepadAs('${noteId}')">📄 名前を付けて保存</span>
                    <span class="menu-item">編集(E)</span>
                </div>
                <textarea class="notepad-textarea" id="notepad-text-${noteId}" placeholder="ここに入力...">${savedText}</textarea>
                <div class="window-statusbar">
                    <span id="notepad-chars-${noteId}">文字数: ${savedText.length}</span>
                    <span id="notepad-saved-${noteId}" style="color:#080;margin-left:12px;display:none;">✓ 保存済み</span>
                </div>
            </div>`,
        });
        setTimeout(() => {
            const ta = document.getElementById('notepad-text-' + noteId);
            if (ta) {
                ta.addEventListener('input', () => {
                    const c = document.getElementById('notepad-chars-' + noteId);
                    if (c) c.textContent = `文字数: ${ta.value.length}`;
                    const s = document.getElementById('notepad-saved-' + noteId);
                    if (s) s.style.display = 'none';
                });
                // Ctrl+S で保存
                ta.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        Apps.saveNotepad(noteId);
                    }
                });
            }
        }, 100);
    },

    saveNotepad(noteId) {
        const ta = document.getElementById('notepad-text-' + noteId);
        if (!ta) return;
        this.notepadData[noteId] = ta.value;
        // LocalStorageにも保存
        try {
            const allData = JSON.parse(localStorage.getItem('kimikoi_notepad') || '{}');
            allData[noteId] = ta.value;
            localStorage.setItem('kimikoi_notepad', JSON.stringify(allData));
        } catch(e) {}
        const s = document.getElementById('notepad-saved-' + noteId);
        if (s) { s.style.display = ''; setTimeout(() => { if (s) s.style.display = 'none'; }, 2000); }
        showToast('💾', `${noteId} を保存しました`);
    },

    saveNotepadAs(noteId) {
        showDialog('名前を付けて保存', '保存しました。（この機能はデモです）');
        this.saveNotepad(noteId);
    },

    // 起動時にLocalStorageからメモ帳データをロード
    loadNotepadData() {
        try {
            const allData = JSON.parse(localStorage.getItem('kimikoi_notepad') || '{}');
            this.notepadData = allData;
        } catch(e) {}
    },

    launchTaskManager() {
        const win = WindowManager.create({
            title: 'タスクマネージャー', icon: '📊', width: 450, height: 380, appId: 'taskmgr',
            content: `<div class="taskmgr-container"><div class="taskmgr-tabs"><div class="taskmgr-tab active">アプリケーション</div><div class="taskmgr-tab">プロセス</div></div><div class="taskmgr-list"><div class="taskmgr-header"><span>タスク</span><span>CPU</span><span>メモリ</span></div><div id="taskmgr-processes"></div></div><div class="taskmgr-footer"><button class="taskmgr-btn" onclick="Apps.endTask()">タスクの終了</button></div></div>`,
        });
        const updateProcs = () => {
            const el = document.getElementById('taskmgr-processes');
            if (el) el.innerHTML = WindowManager.getProcessList().map(p => `<div class="taskmgr-row" onclick="this.classList.toggle('selected')" data-id="${p.id}"><span>${p.icon} ${p.title}</span><span>${randomInt(0,15)}%</span><span>${randomInt(10,200)} MB</span></div>`).join('') || '<div style="padding:8px;color:#888;">タスクなし</div>';
        };
        updateProcs();
        this._tmgrInterval = setInterval(updateProcs, 2000);
        win.onClose = () => { if (this._tmgrInterval) clearInterval(this._tmgrInterval); };
    },

    async endTask() {
        const sel = document.querySelector('.taskmgr-row.selected');
        if (!sel) { showDialog('タスクマネージャー', 'タスクを選択してください。'); return; }
        const r = await showDialog('タスクマネージャー', 'このプログラムを終了しますか？', [{text:'終了'},{text:'キャンセル',primary:true}]);
        if (r === 0) WindowManager.close(sel.dataset.id);
    },

    /* ===== ゴミ箱 ===== */
    launchRecycleBin() {
        const win = WindowManager.create({
            title: 'ゴミ箱', icon: '🗑️', width: 500, height: 400, appId: 'recycle',
            content: this.buildRecycleBin(),
        });
        
        // Setup drop inside folder window
        const winEl = document.getElementById(win.id);
        if(!winEl) return;
        const bodyEl = winEl.querySelector('.window-body');
        
        bodyEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            bodyEl.style.backgroundColor = 'rgba(255,0,0,0.1)';
        });
        bodyEl.addEventListener('dragleave', (e) => {
            bodyEl.style.backgroundColor = '';
        });
        bodyEl.addEventListener('drop', (e) => {
            e.preventDefault();
            bodyEl.style.backgroundColor = '';
            const iconId = e.dataTransfer.getData('text/plain');
            if (iconId && iconId !== 'recycle') {
                Desktop.deleteIcon(iconId);
            }
        });
    },

    buildRecycleBin() {
        const items = this.recycleBinItems;
        return `<div class="recycle-container">
            <div class="recycle-toolbar">
                <button class="recycle-toolbar-btn" onclick="Apps.restoreSelected()">📤 復元</button>
                <button class="recycle-toolbar-btn" onclick="Apps.restoreAll()">📤 すべて復元</button>
                <button class="recycle-toolbar-btn" onclick="Apps.emptyRecycleBin()">🗑️ ゴミ箱を空にする</button>
            </div>
            <div class="recycle-list" id="recycle-list">
                ${items.length === 0
                    ? '<div style="padding:16px;color:#888;text-align:center;">🗑️ ゴミ箱は空です</div>'
                    : items.map((item, idx) => `
                        <div class="recycle-item ${item.isProtected ? 'protected' : ''}" onclick="this.classList.toggle('selected')" data-idx="${idx}">
                            <span class="recycle-item-icon">${item.emoji}</span>
                            <span>${item.label}</span>
                            ${item.isProtected ? '<span class="recycle-protected-badge">🔒 保護</span>' : ''}
                        </div>
                    `).join('')}
            </div>
            <div class="recycle-status">アイテム数: ${items.length}${items.filter(i => i.isProtected).length > 0 ? ' (🔒 保護: ' + items.filter(i => i.isProtected).length + ')' : ''}</div>
        </div>`;
    },

    restoreSelected() {
        const sel = document.querySelector('.recycle-item.selected');
        if (!sel) { showToast('📤', '復元するアイテムを選択してください'); return; }
        const idx = parseInt(sel.dataset.idx);
        const item = this.recycleBinItems[idx];
        if (item) {
            Desktop.addIcon(item.id, item.emoji, item.label, item.app);
            this.recycleBinItems.splice(idx, 1);
            this.refreshRecycleBin();
            showToast('📤', `${item.label} を復元しました`);
        }
    },

    restoreAll() {
        if (this.recycleBinItems.length === 0) return;
        this.recycleBinItems.forEach(item => {
            Desktop.addIcon(item.id, item.emoji, item.label, item.app);
        });
        showToast('📤', `${this.recycleBinItems.length}個のアイテムを復元しました`);
        this.recycleBinItems = [];
        this.refreshRecycleBin();
    },

    async emptyRecycleBin() {
        if (this.recycleBinItems.length === 0) {
            showToast('🗑️', 'ゴミ箱は既に空です');
            return;
        }

        const deletable = this.recycleBinItems.filter(i => !i.isProtected);
        const protectedItems = this.recycleBinItems.filter(i => i.isProtected);

        if (deletable.length === 0) {
            showDialog('ゴミ箱', '🔒 ゴミ箱内のアイテムはすべてゲーム進行に必須のため完全に削除できません。\n復元してください。');
            return;
        }

        const msg = protectedItems.length > 0
            ? `${deletable.length}個のアイテムを完全に削除します。\n\n🔒 以下の${protectedItems.length}個は保護されているため削除されません:\n${protectedItems.map(i => `  • ${i.emoji} ${i.label}`).join('\n')}`
            : `${deletable.length}個のアイテムを完全に削除しますか？\nこの操作は取り消せません。`;

        const r = await showDialog('ゴミ箱を空にする', msg, [{ text: '削除' }, { text: 'キャンセル', primary: true }]);
        if (r === 0) {
            this.recycleBinItems = protectedItems;
            this.refreshRecycleBin();
            showToast('🗑️', `${deletable.length}個を完全に削除しました`);
        }
    },

    refreshRecycleBin() {
        const win = WindowManager.getByApp('recycle');
        if (win) {
            const contentEl = document.getElementById(win.id + '_content');
            if (contentEl) contentEl.innerHTML = this.buildRecycleBin();
        }
        Desktop.updateRecycleBinIcon();
    },

    /* ===== フォルダ ===== */
    launchFolder(iconDef) {
        const name = (iconDef && iconDef.label) || '新しいフォルダ';
        WindowManager.create({
            title: name, icon: '📁', width: 500, height: 350, appId: 'folder',
            content: `<div style="padding:24px;text-align:center;color:#888;">
                <div style="font-size:48px;margin-bottom:12px;">📂</div>
                <p>このフォルダは空です</p>
                <p style="font-size:12px;margin-top:8px;">ここにファイルをドラッグ&ドロップ</p>
            </div>`,
        });
    },

    /* ===== 時計 ===== */
    launchClock() {
        const win = WindowManager.create({
            title: '時計', icon: '🕐', width: 350, height: 300, appId: 'clock',
            content: `<div class="clock-container"><div class="clock-display" id="clock-display">00:00:00</div><div class="clock-date-display" id="clock-date-display">DAY 1</div></div>`,
        });
        this._clockAppInterval = setInterval(() => {
            const d = document.getElementById('clock-display'), gt = GameManager.state.gameTime;
            if (d) d.textContent = `${gt.hour.toString().padStart(2,'0')}:${gt.minute.toString().padStart(2,'0')}:00`;
            const dd = document.getElementById('clock-date-display');
            if (dd) dd.textContent = `DAY ${GameManager.state.currentDay}`;
        }, 1000);
        win.onClose = () => { if (this._clockAppInterval) clearInterval(this._clockAppInterval); };
    },

    /* ===== 推し活 ===== */
    launchOshikatsu() {
        WindowManager.create({
            title: '推し活', icon: '💖', width: 400, height: 400, appId: 'oshikatsu',
            content: `<div class="oshikatsu-container"><div class="oshikatsu-header">💖 推し活アプリ 💖</div><div class="oshikatsu-content"><div class="oshikatsu-section"><h3>🖼 壁紙デザイン変更</h3><div class="wallpaper-grid">${Desktop.wallpapers.map((wp,idx)=>`<div class="wallpaper-option ${idx===Desktop.currentWallpaper?'selected':''}" style="background:${wp.style}" onclick="Desktop.setWallpaper(${idx});this.parentElement.querySelectorAll('.wallpaper-option').forEach(w=>w.classList.remove('selected'));this.classList.add('selected');"></div>`).join('')}</div></div></div></div>`,
        });
    },

    /* ===== 設定 ===== */
    launchSettings() {
        WindowManager.create({
            title: '設定', icon: '⚙', width: 450, height: 380, appId: 'settings',
            content: `<div class="settings-container"><div class="settings-group"><h3>🔊 サウンド</h3><div class="settings-row"><label>BGM</label><input type="range" min="0" max="100" value="70"></div><div class="settings-row"><label>SE</label><input type="range" min="0" max="100" value="80"></div></div><div class="settings-group"><h3>📝 テキスト速度</h3><div class="settings-row"><label>速度</label><select onchange="document.getElementById('config-text-speed').value=this.value"><option value="slow">遅い</option><option value="normal" selected>普通</option><option value="fast">速い</option></select></div></div><div class="settings-group"><h3>🌐 言語</h3><div class="settings-row"><label>言語</label><select><option>日本語</option><option>English</option><option>中文</option></select></div></div></div>`,
        });
    },

    /* ===== チートツール ===== */
    launchCheat() {
        if (!GameManager.state.flags.cheat_unlocked) { showToast('🔒', '4日目以降に解禁'); return; }
        const p = GameManager.state.params;
        WindowManager.create({
            title: '⚠ チートツール', icon: '🔧', width: 500, height: 420, appId: 'cheat',
            content: `<div class="cheat-container"><div class="cheat-title">⚠ CHEAT TOOL ⚠</div><div class="cheat-param-list">${Object.entries(p).map(([k,v])=>`<div class="cheat-param-row"><span class="cheat-param-name">${k}</span><div class="cheat-param-val"><input type="range" min="0" max="100" value="${v}" oninput="GameManager.state.params['${k}']=parseInt(this.value);this.nextElementSibling.textContent=this.value;GameManager.updateHUD();"><span>${v}</span></div></div>`).join('')}</div><div style="margin-top:12px;"><button class="cheat-btn" onclick="Apps.cheatMaxAll()">全MAX</button> <button class="cheat-btn" onclick="Apps.cheatResetAll()">リセット</button></div><div class="cheat-cmd" style="margin-top:8px;"><span style="color:#0ff;">&gt;</span><input class="cheat-input" id="cheat-cmd-input" placeholder="コマンド..." onkeydown="if(event.key==='Enter')Apps.cheatExec(this.value)"><button class="cheat-btn" onclick="Apps.cheatExec(document.getElementById('cheat-cmd-input').value)">実行</button></div></div>`,
        });
    },
    cheatMaxAll() {
        Object.keys(GameManager.state.params).forEach(k => { GameManager.state.params[k] = k.includes('anger')||k.includes('darkness')||k.includes('stress')||k.includes('corruption')?0:100; });
        GameManager.updateHUD(); showToast('🔧','全MAX');
    },
    cheatResetAll() {
        Object.keys(GameManager.state.params).forEach(k => { GameManager.state.params[k] = 50; });
        GameManager.updateHUD(); showToast('🔧','リセット');
    },
    cheatExec(cmd) {
        if (!cmd) return;
        if (cmd.startsWith('jump ')) { const d = parseInt(cmd.split(' ')[1]); if (d>=1&&d<=15) GameManager.startGameDay(d); }
        else if (cmd==='glitch') { Effects.showGlitch('vhs'); setTimeout(()=>Effects.hideGlitch(),3000); }
        else if (cmd==='jumpscare') Effects.triggerJumpscare();
        else showToast('🔧', `不明: ${cmd}`);
    },
};

// 起動時にメモ帳データをロード
window.addEventListener('DOMContentLoaded', () => {
    Apps.loadNotepadData();
});
