/* ============================================
   TASKBAR
   ============================================ */

const Taskbar = {
    init() {
        this.updateClock();
        $('start-user-name').textContent = GameManager.state.playerName;
        this.buildStartMenu();
    },

    updateClock() {
        const gt = GameManager.state.gameTime;
        const timeStr = gt.hour.toString().padStart(2,'0') + ':' + gt.minute.toString().padStart(2,'0');
        const day = GameManager.state.currentDay;
        const dateStr = `DAY ${day}/${GameManager.state.totalDays}`;
        
        const clockEl = $('taskbar-clock');
        if (clockEl) {
            clockEl.querySelector('.clock-time').textContent = timeStr;
            clockEl.querySelector('.clock-date').textContent = dateStr;
        }
    },

    buildStartMenu() {
        const list = $('start-apps-list');
        list.innerHTML = '';
        
        const apps = [
            { icon: '💗', label: 'キミコイ', app: 'novel' },
            { icon: '💬', label: 'LIME', app: 'lime' },
            { icon: '🌐', label: 'Googru', app: 'googru' },
            { icon: '📝', label: 'メモ帳', app: 'notepad' },
            { icon: '🕐', label: '時計', app: 'clock' },
            { icon: '📊', label: 'タスクマネージャー', app: 'taskmgr' },
            { icon: '🔊', label: '音量ミキサー', app: 'volume_mixer' },
            { icon: '⚙', label: '設定', app: 'settings' },
            { icon: '🗑️', label: 'ゴミ箱', app: 'recycle' },
            { icon: '💖', label: '推し活', app: 'oshikatsu' },
        ];

        if (GameManager.state.flags.cheat_unlocked) {
            apps.push({ icon: '🔧', label: 'チートツール', app: 'cheat' });
        }

        apps.forEach(a => {
            const item = createElement('div', 'start-app-item');
            item.innerHTML = `<span class="start-app-icon">${a.icon}</span><span>${a.label}</span>`;
            item.onclick = () => {
                this.toggleStartMenu();
                Desktop.openApp(a.app);
            };
            list.appendChild(item);
        });
    },

    toggleStartMenu() {
        const menu = $('start-menu');
        if (menu.style.display === 'none') {
            menu.style.display = '';
            this.buildStartMenu();
        } else {
            menu.style.display = 'none';
        }
    },

    closeAllPopups() {
        $('start-menu').style.display = 'none';
        $('volume-popup').style.display = 'none';
        $('notification-panel').style.display = 'none';
    },

    toggleVolume() {
        const popup = $('volume-popup');
        popup.style.display = popup.style.display === 'none' ? '' : 'none';
        $('start-menu').style.display = 'none';
    },

    toggleNotifications() {
        const panel = $('notification-panel');
        if (panel.style.display === 'none') {
            panel.style.display = '';
            this.renderNotifications();
        } else {
            panel.style.display = 'none';
        }
    },

    renderNotifications() {
        const panel = $('notification-panel');
        const notifs = GameManager.state.notifications;
        if (notifs.length === 0) {
            panel.innerHTML = '<div style="padding:16px;color:#888;text-align:center;">通知はありません</div>';
            return;
        }
        panel.innerHTML = notifs.map((n, idx) => `
            <div class="notification-item ${n.app ? 'clickable' : ''}" onclick="Taskbar.onNotificationClick(${idx})" style="${n.app ? 'cursor:pointer;' : ''}">
                <div class="notif-title">${n.icon || ''} ${n.title}</div>
                <div class="notif-text">${n.text}</div>
                <div class="notif-time">${n.time || ''}</div>
            </div>
        `).join('');
    },

    // ★ 通知クリックで該当アプリを起動
    onNotificationClick(idx) {
        const notif = GameManager.state.notifications[idx];
        if (!notif) return;
        // パネルを閉じる
        $('notification-panel').style.display = 'none';
        // アプリを起動
        if (notif.app) {
            Desktop.openApp(notif.app);
        }
    },

    // ★ 通知追加 - 重複防止機能付き
    addNotification(title, text, icon = '🔔', app = '') {
        const gt = GameManager.state.gameTime;
        const time = gt.hour.toString().padStart(2,'0') + ':' + gt.minute.toString().padStart(2,'0');
        
        // ★ 重複チェック: 同じtitleとtextの組み合わせが既にあればスキップ
        const isDuplicate = GameManager.state.notifications.some(
            n => n.title === title && n.text === text
        );
        if (isDuplicate) return;
        
        GameManager.state.notifications.unshift({ title, text, icon, time, app });
        
        // Update badge
        const badge = $('notification-badge');
        badge.textContent = GameManager.state.notifications.length;
        badge.style.display = '';
        
        // Show toast - クリック可能ならアプリ名を表示
        if (app) {
            showToast(icon + ' ' + title, text, 'lime');
        } else {
            showToast(icon + ' ' + title, text);
        }
    },

    addWindowButton(winData) {
        const btn = createElement('button', 'taskbar-win-btn');
        btn.id = 'tb_' + winData.id;
        btn.innerHTML = `<span>${winData.icon}</span> ${winData.title}`;
        btn.onclick = () => {
            if (winData.minimized) {
                WindowManager.restore(winData.id);
            } else {
                const focused = winData.element.style.zIndex === String(WindowManager.nextZIndex - 1);
                if (focused) {
                    WindowManager.minimize(winData.id);
                } else {
                    WindowManager.focus(winData.id);
                }
            }
        };
        $('taskbar-windows').appendChild(btn);
    },

    removeWindowButton(id) {
        const btn = $('tb_' + id);
        if (btn) btn.remove();
    },

    highlightWindow(id) {
        $$('.taskbar-win-btn').forEach(b => b.classList.remove('active'));
        const btn = $('tb_' + id);
        if (btn) btn.classList.add('active');
    },

    updateWindowButton(id, minimized) {
        const btn = $('tb_' + id);
        if (btn) {
            btn.style.opacity = minimized ? '0.7' : '1';
        }
    },
};

// Close popups on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('#start-menu') && !e.target.closest('#start-button')) {
        $('start-menu').style.display = 'none';
    }
    if (!e.target.closest('#volume-popup') && !e.target.closest('#taskbar-volume')) {
        $('volume-popup').style.display = 'none';
    }
    if (!e.target.closest('#notification-panel') && !e.target.closest('#taskbar-notifications')) {
        $('notification-panel').style.display = 'none';
    }
});
