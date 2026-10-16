/* ============================================
   DESKTOP - Icons, wallpaper, context menu, recycle bin D&D
   ============================================ */

const Desktop = {
    icons: [],
    gridSize: 80,
    iconsVisible: true,

    // 重要アプリ = ゲーム進行に必須なため完全削除不可
    protectedApps: ['novel', 'lime', 'googru', 'recycle'],

    defaultIcons: [
        { id: 'kimikoi', emoji: '💗', label: 'キミコイ', app: 'novel' },
        { id: 'lime', emoji: '💬', label: 'LIME', app: 'lime' },
        { id: 'googru', emoji: '🌐', label: 'Googru', app: 'googru' },
        { id: 'notepad', emoji: '📝', label: 'メモ帳', app: 'notepad' },
        { id: 'recycle', emoji: '🗑️', label: 'ゴミ箱', app: 'recycle' },
        { id: 'oshikatsu', emoji: '💖', label: '推し活', app: 'oshikatsu' },
        { id: 'settings', emoji: '⚙', label: '設定', app: 'settings' },
    ],

    wallpapers: [
        { name: 'XP Default', style: 'linear-gradient(135deg, #245edb 0%, #3a8bea 30%, #6db3f2 60%, #245edb 100%)' },
        { name: '夕焼け', style: 'linear-gradient(180deg, #ff6b35 0%, #f7c59f 30%, #ffecd2 50%, #2d3436 70%, #000000 100%)' },
        { name: '桜', style: 'linear-gradient(135deg, #ffc0cb 0%, #ffb7c5 25%, #ffe4e1 50%, #fff5ee 75%, #ffc0cb 100%)' },
        { name: '深夜', style: 'linear-gradient(180deg, #0a0020 0%, #1a1040 30%, #2d1b69 60%, #0a0020 100%)' },
        { name: '海', style: 'linear-gradient(180deg, #87ceeb 0%, #4682b4 30%, #00688b 50%, #004d73 70%, #003050 100%)' },
        { name: 'ホラー', style: 'linear-gradient(180deg, #1a0000 0%, #330000 30%, #1a0000 60%, #0d0000 100%)' },
    ],

    currentWallpaper: 0,

    init() {
        this.renderIcons();
        this.setupContextMenu();
        this.setupRubberBand();
        this.setupRecycleBinDrop();
        this.setupDesktopDrop();
    },

    renderIcons() {
        const container = $('desktop-icons');
        container.innerHTML = '';
        this.icons = [];

        this.defaultIcons.forEach((iconDef, idx) => {
            this.createIcon(iconDef, idx);
        });
    },

    createIcon(iconDef, index) {
        const container = $('desktop-icons');
        const icon = createElement('div', 'desktop-icon');
        icon.id = 'icon_' + iconDef.id;
        icon.dataset.app = iconDef.app;
        icon.dataset.id = iconDef.id;
        icon.draggable = true;

        // Grid position
        const col = Math.floor(index / 8);
        const row = index % 8;
        icon.style.left = (10 + col * this.gridSize) + 'px';
        icon.style.top = (10 + row * this.gridSize) + 'px';

        icon.innerHTML = `
            <span class="icon-image">${iconDef.emoji}</span>
            <span class="icon-label">${iconDef.label}</span>
        `;

        // Double click to open
        icon.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.openApp(iconDef.app, iconDef);
        });

        // Single click to select
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            $$('.desktop-icon').forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
        });

        // Right click
        icon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showIconContextMenu(e, iconDef);
        });

        // Drag start (for D&D to recycle bin)
        icon.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', iconDef.id);
            e.dataTransfer.effectAllowed = 'move';
            icon.classList.add('dragging');
        });
        icon.addEventListener('dragend', () => {
            icon.classList.remove('dragging');
        });

        // (Custom mousedown drag removed in favor of native HTML5 dragging on desktop container)

        container.appendChild(icon);
        this.icons.push({ ...iconDef, element: icon });
    },

    // ゴミ箱アイコンへのドロップ設定
    setupRecycleBinDrop() {
        const observeRecycleBin = () => {
            const recycleEl = document.getElementById('icon_recycle');
            if (!recycleEl) { setTimeout(observeRecycleBin, 200); return; }

            recycleEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                recycleEl.classList.add('drop-target');
            });
            recycleEl.addEventListener('dragleave', () => {
                recycleEl.classList.remove('drop-target');
            });
            recycleEl.addEventListener('drop', (e) => {
                e.preventDefault();
                recycleEl.classList.remove('drop-target');
                const iconId = e.dataTransfer.getData('text/plain');
                if (iconId && iconId !== 'recycle') {
                    this.deleteIcon(iconId);
                }
            });
        };
        observeRecycleBin();
    },

    addIcon(id, emoji, label, app) {
        if (this.icons.find(i => i.id === id)) return;
        const iconDef = { id, emoji, label, app: app || id };
        this.defaultIcons.push(iconDef);
        this.createIcon(iconDef, this.icons.length);
    },

    openApp(appName, iconDef) {
        // Check if already open
        const existing = WindowManager.getByApp(appName);
        if (existing) {
            if (existing.minimized) {
                WindowManager.restore(existing.id);
            } else {
                WindowManager.focus(existing.id);
            }
            return;
        }

        switch (appName) {
            case 'novel': 
                if (GameManager.state.flags.kimikoi_done_today) {
                    showToast('⚠️', '今日はもうキミコイで遊んだ。また明日。');
                } else {
                    NovelEngine.launch(); 
                }
                break;
            case 'lime': LimeApp.launch(); break;
            case 'googru': GoogruApp.launch(); break;
            case 'notepad': Apps.launchNotepad(iconDef); break;
            case 'recycle': Apps.launchRecycleBin(); break;
            case 'oshikatsu': Apps.launchOshikatsu(); break;
            case 'settings': Apps.launchSettings(); break;
            case 'taskmgr': Apps.launchTaskManager(); break;
            case 'clock': Apps.launchClock(); break;
            case 'cheat': Apps.launchCheat(); break;
            case 'folder': Apps.launchFolder(iconDef); break;
            default:
                showToast('⚠️', `${appName} は準備中です`);
        }
    },

    // ★ ドラッグでリアルタイム移動（クリック不要、マウスについてくる）
    makeIconDraggable(icon) {
        let isDragging = false;
        let startX, startY, origX, origY;

        icon.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            origX = parseInt(icon.style.left) || 0;
            origY = parseInt(icon.style.top) || 0;

            const onMove = (ev) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    isDragging = true;
                    // リアルタイムでマウスについてくる（グリッドスナップなし）
                    icon.style.left = (origX + dx) + 'px';
                    icon.style.top = (origY + dy) + 'px';
                }
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (isDragging) {
                    // ドロップ時にグリッドにスナップ
                    let nx = parseInt(icon.style.left) || 0;
                    let ny = parseInt(icon.style.top) || 0;
                    nx = Math.round(nx / this.gridSize) * this.gridSize + 10;
                    ny = Math.round(ny / this.gridSize) * this.gridSize + 10;
                    icon.style.left = nx + 'px';
                    icon.style.top = ny + 'px';
                }
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    },

    setupContextMenu() {
        const menu = $('desktop-context-menu');

        $('desktop-icons').addEventListener('contextmenu', (e) => {
            if (e.target.closest('.desktop-icon')) return;
            e.preventDefault();
            // Build context menu dynamically with submenu
            menu.innerHTML = `
                <div class="ctx-item" onclick="Desktop.toggleIcons()">🔄 表示切替</div>
                <div class="ctx-item" onclick="Desktop.alignIcons()">📐 アイコン整列</div>
                <div class="ctx-separator"></div>
                <div class="ctx-item" onclick="Desktop.changeWallpaper()">🖼 壁紙変更</div>
                <div class="ctx-separator"></div>
                <div class="ctx-submenu-wrap">
                    <div class="ctx-item ctx-has-sub">📄 新規作成 ▸</div>
                    <div class="ctx-submenu">
                        <div class="ctx-item" onclick="Desktop.newNotepad()">📝 メモ帳</div>
                        <div class="ctx-item" onclick="Desktop.newFolder()">📁 フォルダ</div>
                    </div>
                </div>
            `;
            menu.style.display = 'block';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
        });

        document.addEventListener('click', () => {
            menu.style.display = 'none';
            const iconMenu = document.querySelector('.icon-context-menu');
            if (iconMenu) iconMenu.remove();
        });
    },

    showIconContextMenu(e, iconDef) {
        // Remove existing
        const existing = document.querySelector('.icon-context-menu');
        if (existing) existing.remove();

        const isProtected = this.protectedApps.includes(iconDef.app) || iconDef.id === 'recycle';
        const menu = createElement('div', 'context-menu icon-context-menu');
        menu.innerHTML = `
            <div class="ctx-item" data-action="open">📂 開く</div>
            <div class="ctx-separator"></div>
            ${isProtected ? '' : '<div class="ctx-item" data-action="delete">🗑️ ゴミ箱へ削除</div>'}
            <div class="ctx-item" data-action="rename">✏️ 名前の変更</div>
            <div class="ctx-separator"></div>
            <div class="ctx-item" data-action="props">📋 プロパティ</div>
        `;
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';

        menu.querySelectorAll('.ctx-item').forEach(item => {
            item.onclick = () => {
                const action = item.dataset.action;
                if (action === 'open') this.openApp(iconDef.app, iconDef);
                if (action === 'delete') this.deleteIcon(iconDef.id);
                if (action === 'rename') this.renameIcon(iconDef.id);
                if (action === 'props') this.showProps(iconDef);
                menu.remove();
            };
        });

        document.body.appendChild(menu);
    },

    deleteIcon(id) {
        const icon = this.icons.find(i => i.id === id);
        if (!icon || id === 'recycle') return;
        if (this.protectedApps.includes(icon.app)) {
            showToast('⚠️', `${icon.label} は重要アプリです。ゴミ箱から復元できます。`);
        }

        icon.element.remove();
        this.icons = this.icons.filter(i => i.id !== id);
        this.defaultIcons = this.defaultIcons.filter(i => i.id !== id);

        Apps.recycleBinItems.push({
            id: icon.id,
            emoji: icon.emoji,
            label: icon.label,
            app: icon.app,
            isProtected: this.protectedApps.includes(icon.app),
        });

        this.updateRecycleBinIcon();
        Apps.refreshRecycleBin();
    },

    updateRecycleBinIcon() {
        const ri = document.querySelector('#icon_recycle .icon-label');
        if (ri) ri.textContent = Apps.recycleBinItems.length > 0 ? `ゴミ箱 (${Apps.recycleBinItems.length})` : 'ゴミ箱';
        const img = document.querySelector('#icon_recycle .icon-image');
        if (img) img.textContent = Apps.recycleBinItems.length > 0 ? '🗑️' : '🗑️';
    },

    async renameIcon(id) {
        const icon = this.icons.find(i => i.id === id);
        if (!icon) return;

        const label = icon.element.querySelector('.icon-label');
        const input = createElement('input');
        input.type = 'text';
        input.value = label.textContent;
        input.style.cssText = 'width:70px;font-size:11px;text-align:center;background:#fff;border:1px solid #00f;';
        label.replaceWith(input);
        input.focus();
        input.select();

        input.addEventListener('blur', () => {
            const newLabel = createElement('span', 'icon-label', input.value || icon.label);
            icon.label = input.value || icon.label;
            input.replaceWith(newLabel);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
        });
    },

    showProps(iconDef) {
        const isProtected = this.protectedApps.includes(iconDef.app);
        showDialog(`${iconDef.emoji} ${iconDef.label} のプロパティ`, `
            <b>名前:</b> ${iconDef.label}<br>
            <b>種類:</b> アプリケーション<br>
            <b>サイズ:</b> ${randomInt(100, 9999)} KB<br>
            <b>作成日:</b> 2024/01/01<br>
            ${isProtected ? '<b style="color:#c00">⚠ このアプリはゲーム進行に必須のため完全削除できません</b>' : ''}
        `);
    },

    // ★ 表示切替バグ修正 - 確実にトグルできるように
    toggleIcons() {
        const container = $('desktop-icons');
        this.iconsVisible = !this.iconsVisible;
        this.icons.forEach(icon => {
            icon.element.style.display = this.iconsVisible ? '' : 'none';
        });
        showToast('🔄', this.iconsVisible ? 'アイコンを表示しました' : 'アイコンを非表示にしました');
    },

    alignIcons() {
        this.icons.forEach((icon, idx) => {
            const col = Math.floor(idx / 8);
            const row = idx % 8;
            icon.element.style.left = (10 + col * this.gridSize) + 'px';
            icon.element.style.top = (10 + row * this.gridSize) + 'px';
        });
    },

    changeWallpaper() {
        this.currentWallpaper = (this.currentWallpaper + 1) % this.wallpapers.length;
        $('desktop-wallpaper').style.background = this.wallpapers[this.currentWallpaper].style;
        showToast('🖼 壁紙変更', `壁紙を「${this.wallpapers[this.currentWallpaper].name}」に変更しました`);
    },

    setWallpaper(index) {
        this.currentWallpaper = index;
        $('desktop-wallpaper').style.background = this.wallpapers[index].style;
    },

    // ★ 新規フォルダ作成
    newFolder() {
        const id = 'folder_' + Date.now();
        this.addIcon(id, '📁', '新しいフォルダ', 'folder');
        showToast('📁', '新しいフォルダを作成しました');
    },

    // ★ 新規メモ帳ファイル作成
    newNotepad() {
        const id = 'notepad_' + Date.now();
        this.addIcon(id, '📝', '新しいメモ.txt', 'notepad');
        showToast('📝', '新しいメモ帳を作成しました');
    },

    setupRubberBand() {
        const container = $('desktop-icons');
        let isSelecting = false;
        let startX, startY, rubberBand;

        container.addEventListener('mousedown', (e) => {
            if (e.target.closest('.desktop-icon') || e.button !== 0) return;
            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;

            rubberBand = createElement('div');
            rubberBand.id = 'rubber-band';
            container.appendChild(rubberBand);

            $$('.desktop-icon').forEach(i => i.classList.remove('selected'));
        });

        document.addEventListener('mousemove', (e) => {
            if (!isSelecting || !rubberBand) return;
            const x = Math.min(e.clientX, startX);
            const y = Math.min(e.clientY, startY);
            const w = Math.abs(e.clientX - startX);
            const h = Math.abs(e.clientY - startY);
            rubberBand.style.left = x + 'px';
            rubberBand.style.top = y + 'px';
            rubberBand.style.width = w + 'px';
            rubberBand.style.height = h + 'px';

            const rect = { x, y, w, h };
            this.icons.forEach(icon => {
                const ir = icon.element.getBoundingClientRect();
                const intersects = !(ir.right < rect.x || ir.left > rect.x + rect.w ||
                                     ir.bottom < rect.y || ir.top > rect.y + rect.h);
                icon.element.classList.toggle('selected', intersects);
            });
        });

        document.addEventListener('mouseup', () => {
            isSelecting = false;
            if (rubberBand) {
                rubberBand.remove();
                rubberBand = null;
            }
        });
    },

    // ネイティブHTML5ドラッグ＆ドロップでデスクトップ上のアイコンを移動する
    setupDesktopDrop() {
        const area = document.getElementById('desktop-icons');
        area.addEventListener('dragover', (e) => {
            // Check if drop target is recycle bin; if so, don't allow general desktop move drop
            if (e.target.closest('#icon_recycle')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        area.addEventListener('drop', (e) => {
            if (e.target.closest('#icon_recycle')) return;
            e.preventDefault();
            const iconId = e.dataTransfer.getData('text/plain');
            if (iconId) {
                const icon = document.getElementById('icon_' + iconId);
                if (icon) {
                    let rect = area.getBoundingClientRect();
                    let nx = e.clientX - rect.left - 32; // -32 for half icon width/height offset
                    let ny = e.clientY - rect.top - 32;
                    nx = Math.max(10, Math.round(nx / this.gridSize) * this.gridSize + 10);
                    ny = Math.max(10, Math.round(ny / this.gridSize) * this.gridSize + 10);
                    icon.style.left = nx + 'px';
                    icon.style.top = ny + 'px';
                }
            }
        });
    },
};
