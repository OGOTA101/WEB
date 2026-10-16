/* ============================================
   WINDOW MANAGER - XP-style window system
   ============================================ */

const WindowManager = {
    windows: [],
    nextZIndex: 100,
    nextId: 1,

    create(options) {
        const {
            title = 'ウィンドウ',
            icon = '📄',
            width = 640,
            height = 480,
            x, y,
            resizable = true,
            content = '',
            onClose = null,
            appId = null,
        } = options;

        const id = 'win_' + this.nextId++;
        const container = $('windows-container');
        
        // Calculate position
        const posX = x !== undefined ? x : 80 + (this.windows.length % 5) * 30;
        const posY = y !== undefined ? y : 40 + (this.windows.length % 5) * 30;

        const win = createElement('div', 'window');
        win.id = id;
        win.dataset.appId = appId || id;
        win.style.left = posX + 'px';
        win.style.top = posY + 'px';
        win.style.width = width + 'px';
        win.style.height = height + 'px';
        win.style.zIndex = this.nextZIndex++;

        win.innerHTML = `
            <div class="window-titlebar" data-winid="${id}">
                <span class="window-icon">${icon}</span>
                <span class="window-title">${title}</span>
                <div class="window-controls">
                    <button class="win-btn win-btn-min" onclick="WindowManager.minimize('${id}')" title="最小化">_</button>
                    <button class="win-btn win-btn-max" onclick="WindowManager.toggleMaximize('${id}')" title="最大化">□</button>
                    <button class="win-btn win-btn-close" onclick="WindowManager.close('${id}')" title="閉じる">✕</button>
                </div>
            </div>
            <div class="window-content" id="${id}_content">${content}</div>
            ${resizable ? `
                <div class="resize-handle n" data-dir="n"></div>
                <div class="resize-handle s" data-dir="s"></div>
                <div class="resize-handle e" data-dir="e"></div>
                <div class="resize-handle w" data-dir="w"></div>
                <div class="resize-handle ne" data-dir="ne"></div>
                <div class="resize-handle nw" data-dir="nw"></div>
                <div class="resize-handle se" data-dir="se"></div>
                <div class="resize-handle sw" data-dir="sw"></div>
            ` : ''}
        `;

        // Events
        const titleBar = win.querySelector('.window-titlebar');
        this.makeDraggable(win, titleBar);
        
        if (resizable) {
            win.querySelectorAll('.resize-handle').forEach(handle => {
                this.makeResizable(win, handle);
            });
        }

        win.addEventListener('mousedown', (e) => {
            this.focus(id);
        });

        container.appendChild(win);

        const winData = {
            id, title, icon, appId: appId || id,
            element: win,
            minimized: false,
            maximized: false,
            onClose,
            prevRect: null,
        };
        this.windows.push(winData);
        this.focus(id);

        // Add taskbar button
        Taskbar.addWindowButton(winData);

        return winData;
    },

    focus(id) {
        this.windows.forEach(w => {
            w.element.classList.toggle('inactive', w.id !== id);
        });
        const win = this.windows.find(w => w.id === id);
        if (win) {
            win.element.style.zIndex = this.nextZIndex++;
            Taskbar.highlightWindow(id);
        }
    },

    minimize(id) {
        const win = this.windows.find(w => w.id === id);
        if (!win) return;
        win.minimized = true;
        win.element.style.display = 'none';
        Taskbar.updateWindowButton(id, true);
    },

    restore(id) {
        const win = this.windows.find(w => w.id === id);
        if (!win) return;
        win.minimized = false;
        win.element.style.display = '';
        this.focus(id);
        Taskbar.updateWindowButton(id, false);
    },

    toggleMaximize(id) {
        const win = this.windows.find(w => w.id === id);
        if (!win) return;
        
        if (win.maximized) {
            // Restore
            win.element.classList.remove('maximized');
            if (win.prevRect) {
                win.element.style.left = win.prevRect.left;
                win.element.style.top = win.prevRect.top;
                win.element.style.width = win.prevRect.width;
                win.element.style.height = win.prevRect.height;
            }
            win.maximized = false;
        } else {
            // Maximize
            win.prevRect = {
                left: win.element.style.left,
                top: win.element.style.top,
                width: win.element.style.width,
                height: win.element.style.height,
            };
            win.element.classList.add('maximized');
            win.maximized = true;
        }
    },

    close(id) {
        const idx = this.windows.findIndex(w => w.id === id);
        if (idx === -1) return;
        
        const win = this.windows[idx];
        if (win.onClose) win.onClose();
        win.element.remove();
        this.windows.splice(idx, 1);
        Taskbar.removeWindowButton(id);
    },

    closeAll() {
        [...this.windows].forEach(w => this.close(w.id));
    },

    getByApp(appId) {
        return this.windows.find(w => w.appId === appId);
    },

    makeDraggable(win, handle) {
        let isDragging = false;
        let startX, startY, origX, origY;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            origX = parseInt(win.style.left) || 0;
            origY = parseInt(win.style.top) || 0;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const maxX = window.innerWidth - 50;
            const maxY = window.innerHeight - 50;
            win.style.left = clamp(origX + dx, -win.offsetWidth + 100, maxX) + 'px';
            win.style.top = clamp(origY + dy, 0, maxY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    },

    makeResizable(win, handle) {
        let isResizing = false;
        let startX, startY, startW, startH, startL, startT;
        const dir = handle.dataset.dir;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startW = win.offsetWidth;
            startH = win.offsetHeight;
            startL = parseInt(win.style.left) || 0;
            startT = parseInt(win.style.top) || 0;
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            if (dir.includes('e')) win.style.width = Math.max(300, startW + dx) + 'px';
            if (dir.includes('s')) win.style.height = Math.max(200, startH + dy) + 'px';
            if (dir.includes('w')) {
                const newW = Math.max(300, startW - dx);
                win.style.width = newW + 'px';
                win.style.left = (startL + startW - newW) + 'px';
            }
            if (dir.includes('n')) {
                const newH = Math.max(200, startH - dy);
                win.style.height = newH + 'px';
                win.style.top = (startT + startH - newH) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    },

    getProcessList() {
        return this.windows.map(w => ({
            id: w.id,
            title: w.title,
            icon: w.icon,
            status: w.minimized ? '最小化' : '実行中',
        }));
    },
};
