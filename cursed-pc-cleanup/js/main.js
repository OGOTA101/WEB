import { ADV_SCENARIOS } from "./data/adv_data.js";
import { ICONS, FILE_SYSTEM } from "./data/icons_fs.js";
import { calculateTotalDeletable, isFolderEmptyOrDeleted } from "./system/utils.js";
import { getIconUrl, bringToFront, toggleMaximizeWindow, createOSWindow } from "./components/window.js";

document.addEventListener("DOMContentLoaded", () => {
    const screens = {
        title: document.getElementById('screen-title'),
        adv: document.getElementById('screen-adv'),
        desk: document.getElementById('screen-desk'),
        pc: document.getElementById('screen-pc'),
        phone: document.getElementById('screen-phone'),
        result: document.getElementById('screen-result')
    };

    function showScreen(name) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        if (screens[name]) screens[name].classList.add('active');
        state.screen = name;
    }

    let state = {
        screen: 'title',
        advIndex: 0,
        currentAdvTexts: ADV_SCENARIOS.オープニング,
        onAdvComplete: () => showScreen('desk'),
        pcOn: false,
        trashFiles: [],
        deletedCount: 0, // Total files permanently deleted
        totalDeletable: 0, // Calculated on boot
        permanentlyDeletedIds: [],
        cursedDeleted: false,
        cleanupAlive: true,
        maxZ: 10,
        dragInfo: null,
        ghostEl: null,
        userTime: null,
        maxWinStates: {}, // stores origin dims for maxed windows
        selectionActive: false,
        selectionContext: null
    };

    // UI Bindings
    document.getElementById('btn-start').addEventListener('click', () => {
        showScreen('adv');
        showAdvLine();
    });

    const advText = document.getElementById('adv-text');
    document.getElementById('screen-adv').addEventListener('click', () => {
        state.advIndex++;
        if (state.advIndex < state.currentAdvTexts.length) {
            showAdvLine();
        } else {
            if (state.onAdvComplete) state.onAdvComplete();
        }
    });

    function showAdvLine() {
        if (!state.currentAdvTexts[state.advIndex]) return;
        advText.innerHTML = state.currentAdvTexts[state.advIndex].replace(/\n/g, '<br>');
    }

    document.getElementById('monitor-clickable').addEventListener('click', () => {
        showScreen('pc');
    });
    document.getElementById('smartphone-clickable').addEventListener('click', () => {
        showScreen('phone');
    });

    document.getElementById('btn-close-phone').addEventListener('click', () => {
        showScreen('desk');
    });

    document.getElementById('btn-report').addEventListener('click', () => {
        evaluateResult();
    });

    document.getElementById('btn-pc-power').addEventListener('click', () => {
        document.getElementById('pc-power-overlay').classList.add('hidden');
        document.getElementById('desk-pc-off').style.display = 'none';
        document.getElementById('desk-pc-on').style.display = 'block';
        state.pcOn = true;
        bootPC();
    });

    document.getElementById('btn-back-desk').addEventListener('click', () => {
        showScreen('desk');
    });

    // OS Logic
    const desktopEl = document.getElementById('os-desktop');
    const windowsEl = document.getElementById('os-windows');

    state.totalDeletable = calculateTotalDeletable();
    console.log("Total Deletable Entities:", state.totalDeletable);

    FILE_SYSTEM["root"].children.forEach(fileId => {
        const file = FILE_SYSTEM[fileId];
        if (file.x !== undefined) {
            createIcon(fileId, file, desktopEl);
        }
    });
    // Do not open task manager initially

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointerdown', onGlobalPointerDown);

    setupTrayIcons();
    setupDesktopContextMenu();
    function createIcon(id, file, parentEl) {
        const div = document.createElement('div');
        div.className = parentEl === desktopEl ? 'desktop-icon' : 'window-icon';
        div.dataset.id = id;
        div.innerHTML = `<img src="${getIconUrl(file, state)}"><span>${file.name}</span>`;
        if (file.x !== undefined && parentEl === desktopEl) {
            if (file.type === 'trash') {
                div.style.left = '20px';
                div.style.top = '20px';
            } else {
                const maxX = Math.max(100, window.innerWidth - 100);
                const maxY = Math.max(100, window.innerHeight - 100);
                const randomX = 10 + Math.floor(Math.random() * maxX);
                const randomY = 10 + Math.floor(Math.random() * maxY);

                if (Math.random() > 0.2) {
                    div.style.left = randomX + 'px';
                    div.style.top = randomY + 'px';
                } else {
                    const noiseX = (Math.random() * 60 - 30);
                    const noiseY = (Math.random() * 60 - 30);
                    div.style.left = Math.max(10, file.x + noiseX) + 'px';
                    div.style.top = Math.max(10, file.y + noiseY) + 'px';
                }
            }
        }

        let touchStartTimer = null;

        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e.clientX, e.clientY, id, parentEl, parentEl === desktopEl);
        });

        div.addEventListener('pointerdown', (e) => {
            if (e.button === 2) return; // ignore right click for drag
            e.stopPropagation();
            if (file.type === 'trash') {
                openWindow(id);
                return;
            }

            if (!div.classList.contains('selected')) {
                document.querySelectorAll('.desktop-icon.selected, .window-icon.selected').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
            }

            const selectedEls = document.querySelectorAll('.selected');
            const dragIds = Array.from(selectedEls).map(el => el.getAttribute('data-id'));

            bringToFront(div.closest('.os-window') || div, state);

            state.dragInfo = {
                ids: dragIds,
                els: Array.from(selectedEls),
                startX: e.clientX,
                startY: e.clientY,
                origLeft: Array.from(selectedEls).map(el => parseInt(el.style.left || 0)),
                origTop: Array.from(selectedEls).map(el => parseInt(el.style.top || 0)),
                parent: parentEl,
                isDesktop: parentEl === desktopEl,
                isClick: true
            };
            try { div.setPointerCapture(e.pointerId); } catch (ex) { }

            // simulate long press for context menu (only when single clicking)
            if (dragIds.length === 1) {
                touchStartTimer = setTimeout(() => {
                    if (state.dragInfo && state.dragInfo.isClick) {
                        showContextMenu(e.clientX, e.clientY, id, parentEl, state.dragInfo.isDesktop);
                        state.dragInfo = null; // stop drag
                    }
                }, 600);
            }
        });

        div.addEventListener('dblclick', (e) => {
            if (touchStartTimer) clearTimeout(touchStartTimer);
            e.stopPropagation();
            openWindow(id);
        });

        // double tap for mobile
        let lastTap = 0;
        div.addEventListener('touchstart', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                openWindow(id);
                if (touchStartTimer) clearTimeout(touchStartTimer);
                e.preventDefault();
            }
            lastTap = currentTime;
        }, { passive: false });

        parentEl.appendChild(div);
    }

    function showContextMenu(x, y, id, parentEl, isDesktop) {
        const file = FILE_SYSTEM[id];
        if (file.type === 'folder' || file.type === 'locked') return;
        const menu = document.createElement('div');
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.background = '#c0c0c0';
        menu.style.border = '2px solid';
        menu.style.borderColor = '#dfdfdf #000 #000 #dfdfdf';
        menu.style.color = '#000';
        menu.style.padding = '5px';
        menu.style.cursor = 'pointer';
        menu.style.zIndex = '10000';
        menu.innerHTML = 'ごみ箱へ移動';
        menu.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            tryMoveToTrash(id, parentEl, isDesktop);
            menu.remove();
        });
        document.body.appendChild(menu);

        setTimeout(() => {
            const hideMenu = () => { menu.remove(); document.removeEventListener('pointerdown', hideMenu); };
            document.addEventListener('pointerdown', hideMenu);
        }, 50);
    }

    let selectStartX = 0, selectStartY = 0;
    let selectionBoxEl = document.createElement('div');
    selectionBoxEl.id = 'selection-box';
    document.body.appendChild(selectionBoxEl);

    function getIntersection(r1, r2) {
        return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
    }

    function onGlobalPointerDown(e) {
        if (e.target.closest('.os-window-btn') || e.target.closest('.os-taskbar') || e.target.closest('.context-menu')) return;
        const clickedIcon = e.target.closest('.desktop-icon, .window-icon');
        if (!clickedIcon) {
            document.querySelectorAll('.desktop-icon.selected, .window-icon.selected').forEach(el => el.classList.remove('selected'));

            const contentArea = e.target.closest('.os-window-content');
            if (e.target.id === 'os-desktop' || contentArea) {
                state.selectionActive = true;
                state.selectionContext = contentArea || desktopEl;
                selectStartX = e.clientX;
                selectStartY = e.clientY;
                selectionBoxEl.style.left = selectStartX + 'px';
                selectionBoxEl.style.top = selectStartY + 'px';
                selectionBoxEl.style.width = '0px';
                selectionBoxEl.style.height = '0px';
                selectionBoxEl.style.display = 'block';
            }
        }
    }

    function onPointerMove(e) {
        if (state.selectionActive) {
            let cx = e.clientX;
            let cy = e.clientY;
            selectionBoxEl.style.left = Math.min(selectStartX, cx) + 'px';
            selectionBoxEl.style.top = Math.min(selectStartY, cy) + 'px';
            selectionBoxEl.style.width = Math.abs(cx - selectStartX) + 'px';
            selectionBoxEl.style.height = Math.abs(cy - selectStartY) + 'px';

            const boxRect = selectionBoxEl.getBoundingClientRect();
            const icons = state.selectionContext.querySelectorAll('.desktop-icon, .window-icon');
            icons.forEach(icon => {
                if (getIntersection(boxRect, icon.getBoundingClientRect())) {
                    icon.classList.add('selected');
                } else {
                    icon.classList.remove('selected');
                }
            });
            return;
        }

        if (!state.dragInfo) return;
        const dx = e.clientX - state.dragInfo.startX;
        const dy = e.clientY - state.dragInfo.startY;

        if (state.dragInfo.isClick && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
            state.dragInfo.isClick = false;
            // Ghost drag
            state.ghostEl = document.createElement('div');
            state.ghostEl.className = 'icon-ghost';
            if (state.dragInfo.ids.length > 1) {
                state.ghostEl.innerHTML = `<img src="${ICONS.txt}" style="width:40px;height:40px;"><span style="color:#fff;text-shadow:1px 1px 2px #000;margin-top:5px;display:block;">${state.dragInfo.ids.length} 個のアイテム</span>`;
            } else {
                state.ghostEl.innerHTML = state.dragInfo.els[0].innerHTML;
            }
            state.ghostEl.style.position = 'fixed';
            state.ghostEl.style.opacity = '0.7';
            state.ghostEl.style.zIndex = '9999';
            state.ghostEl.style.pointerEvents = 'none';
            document.body.appendChild(state.ghostEl);
            state.dragInfo.els.forEach(el => el.style.opacity = '0.3');
        }

        if (!state.dragInfo.isClick && state.ghostEl) {
            state.ghostEl.style.left = (e.clientX - 35) + 'px';
            state.ghostEl.style.top = (e.clientY - 40) + 'px';
        }
    }

    function onPointerUp(e) {
        if (state.selectionActive) {
            state.selectionActive = false;
            selectionBoxEl.style.display = 'none';
        }

        if (!state.dragInfo) return;
        const info = state.dragInfo;
        state.dragInfo = null;

        if (state.ghostEl) {
            state.ghostEl.remove();
            state.ghostEl = null;
        }

        info.els.forEach(el => el.style.opacity = '1');

        if (info.isClick) return;

        info.els.forEach(el => el.style.display = 'none');
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        info.els.forEach(el => el.style.display = '');

        const isTrashDrop = targetEl && (
            targetEl.closest('.desktop-icon[data-id="trash"]') ||
            targetEl.closest('#folder-trash') ||
            (targetEl.closest('.os-window-header') && targetEl.closest('.os-window-header').innerText.includes('ごみ箱'))
        );

        if (isTrashDrop) {
            info.ids.forEach(did => {
                const el = document.querySelector(`[data-id="${did}"]`);
                if (el) {
                    tryMoveToTrash(did, el.parentNode, el.parentNode.id === 'os-desktop');
                }
            });
            updateTrashIcon();
        } else if (info.ids.length >= 1 && info.els[0].parentNode.id === 'os-desktop' && (!targetEl || targetEl.id === 'os-desktop')) {
            info.els.forEach((el, idx) => {
                const dx = e.clientX - info.startX;
                const dy = e.clientY - info.startY;
                el.style.left = (info.origLeft[idx] + dx) + 'px';
                el.style.top = (info.origTop[idx] + dy) + 'px';
            });
        }
    }

    function tryMoveToTrash(id, parentEl, isDesktop) {
        if (id === 'cleanup' || id === 'sys_info') {
            alertSysError("システムファイルまたはショートカットは削除できません。");
            return;
        }

        const file = FILE_SYSTEM[id];
        if (!file) return;

        if (file.type === 'locked') {
            alertSysError("アクセスが拒否されました。対象フォルダーはロックされています。");
            return;
        }

        if (file.type === 'folder') {
            if (!isFolderEmptyOrDeleted(id, state)) {
                alertSysError("対象のフォルダーは空ではありません。中のファイルを削除してからやり直してください。");
                return;
            }
        }

        if (file.type === 'app_task') {
            alertSysError("別のプログラムがこのファイルを利用しています。");
            return;
        }

        if (!state.trashFiles.includes(id) && !state.permanentlyDeletedIds.includes(id)) {
            state.trashFiles.push(id);
            const el = parentEl.querySelector(`[data-id="${id}"]`);
            if (el) el.remove();
            updateTrashIcon();
            if (!isDesktop) renderTrashWindow();
        }
    }

    function alertSysError(msg) {
        const winId = 'sys-err-' + (++state.maxZ);
        const win = document.createElement('div');
        win.className = 'os-window';
        win.id = winId;
        win.style.left = '30%';
        win.style.top = '30%';
        win.style.zIndex = state.maxZ;
        win.innerHTML = `
                <div class="os-window-header" style="background:#800000; color:#fff;">
                    <span class="os-window-title">システム エラー</span>
                    <div class="os-window-controls">
                        <div class="os-window-btn close-btn" id="close-${winId}">X</div>
                    </div>
                </div>
                <div class="os-window-content" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 20px; background:#c0c0c0;">
                    <p style="text-align:center; color:#000;">${msg}</p>
                    <button style="color:black; margin-top:10px; padding:2px 15px; cursor:pointer;">OK</button>
                </div>
            `;
        const closeSys = (e) => { e.stopPropagation(); win.remove(); };
        win.querySelector(`#close-${winId}`).addEventListener('pointerdown', closeSys);
        win.querySelector('button').addEventListener('click', closeSys);
        windowsEl.appendChild(win);
    }

    function confirmSysDialog(msg, onConfirm) {
        const winId = 'sys-confirm-' + (++state.maxZ);
        const win = document.createElement('div');
        win.className = 'os-window';
        win.id = winId;
        win.style.left = '35%';
        win.style.top = '35%';
        win.style.zIndex = state.maxZ;
        win.innerHTML = `
                <div class="os-window-header" style="background:#000080; color:#fff;">
                    <span class="os-window-title">確認</span>
                    <div class="os-window-controls">
                        <div class="os-window-btn close-btn" id="close-${winId}">X</div>
                    </div>
                </div>
                <div class="os-window-content" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 20px; background:#c0c0c0;">
                    <p style="text-align:center; color:#000;">${msg}</p>
                    <div style="display:flex; gap:10px; margin-top:15px;">
                        <button id="btn-yes-${winId}" style="color:black; padding:2px 15px; cursor:pointer;">はい(Y)</button>
                        <button id="btn-no-${winId}" style="color:black; padding:2px 15px; cursor:pointer;">いいえ(N)</button>
                    </div>
                </div>
            `;
        windowsEl.appendChild(win);

        const closeSys = (e) => { e.stopPropagation(); win.remove(); };
        win.querySelector(`#close-${winId}`).addEventListener('pointerdown', closeSys);
        win.querySelector(`#btn-no-${winId}`).addEventListener('click', closeSys);
        win.querySelector(`#btn-yes-${winId}`).addEventListener('click', (e) => {
            closeSys(e);
            onConfirm();
        });
    }

    function updateTrashIcon() {
        const trashEl = document.querySelector('.desktop-icon[data-id="trash"] img');
        if (trashEl) {
            if (state.trashFiles.length > 5) {
                trashEl.src = ICONS.trash;
            } else if (state.trashFiles.length > 0) {
                trashEl.src = ICONS.trash;
            } else {
                trashEl.src = ICONS.trashEmpty;
            }
        }
        renderTrashWindow();
    }

    function openWindow(id) {
        const existing = document.getElementById('win-' + id);
        if (existing) {
            bringToFront(existing, state);
            return;
        }

        const file = FILE_SYSTEM[id];
        if (!file) return;

        let contentHTML = '';

        if (['txt', 'cursed', 'img', 'audio', 'video', 'doc', 'xls', 'pdf'].includes(file.type)) {
            contentHTML = `<div class="text-file-content">${file.content}</div>`;
            if (file.type === 'cursed') {
                applyGlitch();
            }
        } else if (file.type === 'app_task') {
            const runningWindows = Array.from(document.querySelectorAll('.os-window')).map(w => {
                const wid = w.id.replace('win-', '');
                if (FILE_SYSTEM[wid]) return { id: wid, name: FILE_SYSTEM[wid].name, el: w };
                return null;
            }).filter(Boolean);

            let tableRows = `
                    <tr class="task-row task-sys" style="background:#eee; cursor:default;"><td style="padding:2px;">explorer.exe</td><td style="padding:2px; text-align:right;">24,192 K</td></tr>
                    <tr class="task-row task-sys-target" style="background:#fdd; font-weight:bold; cursor:pointer;" data-id="sys"><td style="padding:2px;">CleanupSys.exe</td><td style="padding:2px; text-align:right;">999,999 K</td></tr>
            `;

            runningWindows.forEach(w => {
                if (w.id !== 'cleanup') {
                    tableRows += `<tr class="task-row task-app" style="cursor:pointer;" data-id="${w.id}">
                        <td style="padding:2px;">${w.name}</td>
                        <td style="padding:2px; text-align:right;">${Math.floor(Math.random() * 2000 + 500)} K</td>
                    </tr>`;
                }
            });

            contentHTML = `<div style="padding:15px; text-align:left;">
                <h3 style="color:#000; margin-top:0;">Windows タスクマネージャー</h3>
                <div style="background:#fff; border:1px solid #777; height:150px; overflow-y:auto; color:#000;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <tr style="background:#ddd; border-bottom:1px solid #777; position:sticky; top:0;">
                            <th style="padding:2px; text-align:left;">イメージ名</th>
                            <th style="padding:2px; text-align:right;">メモリ使用量</th>
                        </tr>
                        ${tableRows}
                        <tr class="task-row task-sys" style="background:#fff; cursor:default;"><td style="padding:2px;">taskmgr.exe</td><td style="padding:2px; text-align:right;">1,024 K</td></tr>
                    </table>
                </div>
                <p style="color:red; font-size:12px; margin:5px 0 0 0;">警告: CleanupSys.exe を終了するとシステムが不安定になります。</p>
                <div style="text-align:right; margin-top:10px;">
                    <button class="kill-btn" style="color:black; padding:2px 10px; cursor:pointer;" disabled>プロセスの終了</button>
                </div>
            </div>`;
        } else if (file.type === 'app') {
            if (id === 'sys_info') {
                contentHTML = `<div style="padding:15px;">
                    <h3 style="color:#000; border-bottom:1px solid #ccc; padding-bottom:5px;">システム プロパティ</h3>
                    <div style="display:flex; gap:10px; align-items:flex-start; margin-top:10px;">
                        <div style="font-size:30px; line-height:1;">🖳</div>
                        <div style="font-size:12px;">
                            <p><strong>システム:</strong><br>Microsoft Windows 98 Second Edition<br>4.10.2222 A</p>
                            <p><strong>登録先:</strong><br>Unknown User<br>00000-OEM-0000000-00000</p>
                            <p><strong>コンピューター:</strong><br>Pentium(r) III Processor<br>128.0MB RAM</p>
                        </div>
                    </div>
                </div>`;
            } else {
                contentHTML = `<div style="padding:15px; text-align:center;">
                    <p>アプリケーションを起動できません。<br>システム構成を確認してください。</p>
                </div>`;
            }
        } else if (file.type === 'folder') {
            contentHTML = `<div class="folder-items" id="folder-${id}" style="display:flex; flex-wrap:wrap; gap:5px; padding:5px;"></div>`;
        } else if (file.type === 'locked') {
            contentHTML = `<div class="password-prompt">
                <p>このフォルダーは保護されています。<br>パスワードを入力してください。</p>
                <input type="password" id="pass-${id}">
                <button id="btn-pass-${id}" style="color:black; cursor:pointer;">解除</button>
                <div id="pass-msg-${id}" style="color:red; margin-top:5px;"></div>
            </div>`;
        } else if (file.type === 'trash') {
            contentHTML = `<div class="trash-controls" style="background:#efefef; padding:5px; border-bottom:1px solid #ccc; display:flex;">
                <button id="btn-empty-trash" style="color:black; cursor:pointer; display:flex; align-items:center; gap:5px; padding:2px 5px;"><img src="${ICONS.trashEmpty}" style="width:16px;">ごみ箱を空にする(B)</button>
            </div>
            <div class="folder-items" id="folder-trash" style="display:flex; flex-wrap:wrap; gap:5px; padding:10px; background:#fff; height:100px; flex:1; align-content:flex-start;"></div>`;
        } // 100px min height to let flex take over usually

        const win = createOSWindow(id, file, contentHTML, state, windowsEl);
        bringToFront(win, state);

        // Taskbar item
        const tbItem = document.createElement('div');
        tbItem.className = 'taskbar-item active';
        tbItem.id = 'tb-' + id;
        tbItem.innerHTML = `<img src="${getIconUrl(file, state)}" style="width:14px; height:14px; margin-right:5px;"><span>${file.name}</span>`;
        document.getElementById('taskbar-apps').appendChild(tbItem);

        tbItem.addEventListener('click', () => {
            if (win.style.display === 'none') {
                win.style.display = 'flex';
                bringToFront(win, state);
            } else {
                if (win.style.zIndex == state.maxZ) {
                    win.style.display = 'none'; // minimize if it's already on top and clicked
                    tbItem.classList.remove('active');
                } else {
                    bringToFront(win, state);
                }
            }
        });

        // Taskbar item Context Menu
        tbItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showTaskbarContextMenu(e.clientX, e.clientY, win, tbItem, id);
        });

        win.addEventListener('pointerdown', () => bringToFront(win, state));

        let isDraggingWin = false;
        let winDrag = { startX: 0, startY: 0, initX: 0, initY: 0 };
        const header = win.querySelector(`#header-${id}`);
        header.addEventListener('pointerdown', (e) => {
            isDraggingWin = true;
            winDrag.startX = e.clientX;
            winDrag.startY = e.clientY;
            winDrag.initX = win.offsetLeft;
            winDrag.initY = win.offsetTop;
            try { header.setPointerCapture(e.pointerId); } catch (ex) { }
        });
        header.addEventListener('pointermove', (e) => {
            if (!isDraggingWin) return;
            win.style.left = (winDrag.initX + e.clientX - winDrag.startX) + 'px';
            win.style.top = (winDrag.initY + e.clientY - winDrag.startY) + 'px';
        });
        header.addEventListener('pointerup', () => { isDraggingWin = false; });

        // Window Controls
        win.querySelector(`#min-${id}`).addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            win.style.display = 'none';
            tbItem.classList.remove('active');
        });

        win.querySelector(`#max-${id}`).addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            toggleMaximizeWindow(win, id, state);
        });

        win.querySelector(`#close-${id}`).addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            win.remove();
            tbItem.remove();
            delete state.maxWinStates[id];
        });

        if (file.type === 'app_task') {
            let selectedTaskId = null;
            let selectedRow = null;
            const killBtn = win.querySelector('.kill-btn');

            win.querySelectorAll('.task-row[data-id]').forEach(row => {
                row.addEventListener('click', (e) => {
                    if (selectedRow) {
                        selectedRow.style.background = selectedRow.classList.contains('task-sys-target') ? '#fdd' : '#fff';
                        selectedRow.style.color = '#000';
                    }
                    selectedRow = e.currentTarget;
                    selectedRow.style.background = '#000080';
                    selectedRow.style.color = '#fff';
                    selectedTaskId = selectedRow.dataset.id;
                    killBtn.disabled = false;
                });
            });

            killBtn.addEventListener('click', () => {
                if (selectedTaskId === 'sys') {
                    triggerGameOver();
                } else if (selectedTaskId) {
                    const targetWin = document.getElementById('win-' + selectedTaskId);
                    const targetTb = document.getElementById('tb-' + selectedTaskId);
                    if (targetWin) targetWin.remove();
                    if (targetTb) targetTb.remove();
                    delete state.maxWinStates[selectedTaskId];
                    if (selectedRow) selectedRow.remove();
                    selectedTaskId = null;
                    killBtn.disabled = true;
                }
            });
        }

        if (file.type === 'folder') {
            const container = win.querySelector(`#folder-${id}`);
            file.children.forEach(childId => {
                if (!state.trashFiles.includes(childId) && !state.permanentlyDeletedIds.includes(childId)) {
                    createIcon(childId, FILE_SYSTEM[childId], container);
                }
            });
        }

        if (file.type === 'locked') {
            win.querySelector(`#btn-pass-${id}`).addEventListener('click', () => {
                const val = win.querySelector(`#pass-${id}`).value;
                if (val === file.password) {
                    FILE_SYSTEM[id].type = 'folder';
                    win.remove();
                    openWindow(id);
                } else {
                    win.querySelector(`#pass-msg-${id}`).innerText = 'パスワードが違います';
                }
            });
        }

        if (file.type === 'trash') {
            win.style.height = '300px';
            win.style.display = 'flex';
            win.style.flexDirection = 'column';
            const contentDiv = win.querySelector('.os-window-content');
            if (contentDiv) {
                contentDiv.style.flex = '1';
                contentDiv.style.display = 'flex';
                contentDiv.style.flexDirection = 'column';
                contentDiv.style.padding = '0';
            }

            win.querySelector('#btn-empty-trash').addEventListener('click', () => {
                if (state.trashFiles.length === 0) return;

                confirmSysDialog("これらの項目を完全に削除しますか？", () => {
                    if (state.trashFiles.includes('cursed_file')) {
                        state.cursedDeleted = true;
                    }

                    state.deletedCount += state.trashFiles.length;
                    state.trashFiles.forEach(tid => {
                        if (!state.permanentlyDeletedIds.includes(tid)) {
                            state.permanentlyDeletedIds.push(tid);
                        }
                    });

                    state.trashFiles = [];
                    updateTrashIcon();
                });
            });
            renderTrashWindow();
        }
    }

    function removeContextMenus() {
        document.querySelectorAll('.context-menu').forEach(el => el.remove());
    }

    function showTaskbarContextMenu(x, y, win, tbItem, id) {
        removeContextMenus();
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = x + 'px';
        menu.style.top = (y - 80) + 'px'; // open upwards above taskbar
        menu.innerHTML = `
            <div class="menu-item" id="ctx-restore-${id}">元に戻す</div>
            <div class="menu-item" id="ctx-min-${id}">最小化</div>
            <div class="menu-item" id="ctx-max-${id}">最大化</div>
            <div class="menu-separator"></div>
            <div class="menu-item" id="ctx-close-${id}">閉じる</div>
        `;
        document.body.appendChild(menu);

        menu.querySelector(`#ctx-restore-${id}`).addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            win.style.display = 'flex';
            bringToFront(win, state);
            menu.remove();
        });
        menu.querySelector(`#ctx-min-${id}`).addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            win.style.display = 'none';
            tbItem.classList.remove('active');
            menu.remove();
        });
        menu.querySelector(`#ctx-max-${id}`).addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            toggleMaximizeWindow(win, id, state);
            menu.remove();
        });
        menu.querySelector(`#ctx-close-${id}`).addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            win.remove();
            tbItem.remove();
            delete state.maxWinStates[id];
            menu.remove();
        });

        setTimeout(() => {
            const hideMenu = () => { menu.remove(); document.removeEventListener('pointerdown', hideMenu); };
            document.addEventListener('pointerdown', hideMenu);
        }, 50);
    }

    function setupDesktopContextMenu() {
        desktopEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (e.target !== desktopEl) return; // Only trigger on blank desktop

            removeContextMenus();
            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            menu.innerHTML = `
                <div class="menu-item" id="ctx-desk-refresh">最新の情報に更新</div>
                <div class="menu-item" id="ctx-desk-arrange">アイコンの整列</div>
                <div class="menu-separator"></div>
                <div class="menu-item" id="ctx-desk-new">新規作成</div>
                <div class="menu-separator"></div>
                <div class="menu-item" id="ctx-desk-prop">プロパティ</div>
            `;
            document.body.appendChild(menu);

            menu.querySelector('#ctx-desk-refresh').addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                // Simple flicker effect
                desktopEl.style.opacity = '0.5';
                setTimeout(() => desktopEl.style.opacity = '1', 100);
                menu.remove();
            });

            menu.querySelector('#ctx-desk-arrange').addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                menu.remove();
            });

            setTimeout(() => {
                const hideMenu = () => { menu.remove(); document.removeEventListener('pointerdown', hideMenu); };
                document.addEventListener('pointerdown', hideMenu);
            }, 50);
        });

        // Taskbar Context Menu
        const taskbarEl = document.getElementById('os-taskbar');
        taskbarEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (e.target.closest('.taskbar-item') || e.target.closest('.tray-icon') || e.target.id === 'start-button') return;
            removeContextMenus();
            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.left = e.clientX + 'px';
            menu.style.top = (e.clientY - 40) + 'px';
            menu.innerHTML = `<div class="menu-item" id="ctx-taskmgr">タスクマネージャー</div>`;
            document.body.appendChild(menu);

            menu.querySelector('#ctx-taskmgr').addEventListener('pointerdown', (evt) => {
                evt.stopPropagation();
                menu.remove();
                openWindow("cleanup");
            });

            setTimeout(() => {
                const hideMenu = () => { menu.remove(); document.removeEventListener('pointerdown', hideMenu); };
                document.addEventListener('pointerdown', hideMenu);
            }, 50);
        });

        // Start Button Logic
        const startBtn = document.getElementById('start-button');
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const existingMenu = document.getElementById('start-menu');
            if (existingMenu) {
                existingMenu.remove();
                startBtn.classList.remove('active');
                return;
            }

            const menu = document.createElement('div');
            menu.id = 'start-menu';
            menu.style.position = 'absolute';
            menu.style.bottom = '40px';
            menu.style.left = '0';
            menu.style.width = '200px';
            menu.style.background = '#c0c0c0';
            menu.style.border = '2px solid';
            menu.style.borderColor = '#fff #808080 #808080 #fff';
            menu.style.zIndex = '10000';
            menu.style.padding = '2px';
            menu.style.display = 'flex';
            menu.style.flexDirection = 'row';

            menu.innerHTML = `
                <div style="width:30px; background: linear-gradient(to top, #000080, #1084d0); color:#fff; writing-mode:vertical-rl; text-orientation:upright; text-align:right; font-weight:bold; padding:5px 0; font-family:sans-serif; letter-spacing:2px; font-size:16px; user-select:none;">
                    Windows 98
                </div>
                <div style="flex:1; display:flex; flex-direction:column; background:#c0c0c0;">
                    <button class="start-menu-item" style="text-align:left; border:none; background:none; padding:8px 5px; width:100%; cursor:pointer; font-size:12px; display:flex; align-items:center; border-bottom:1px solid #aaa;"><span style="font-size:20px; margin-right:5px; color:#d00;">🖥</span> 電源を切る(U)...</button>
                    <button class="start-menu-item" style="text-align:left; border:none; background:none; padding:8px 5px; width:100%; cursor:pointer; font-size:12px; display:flex; align-items:center;"><span style="font-size:20px; margin-right:5px; color:#c0c0c0;">⚙</span> 設定(S)</button>
                </div>
            `;

            document.getElementById('screen-pc').appendChild(menu);
            startBtn.classList.add('active');

            const powerBtn = menu.querySelectorAll('.start-menu-item')[0];
            powerBtn.addEventListener('click', () => {
                menu.remove();
                startBtn.classList.remove('active');
                state.pcOn = false;
                document.getElementById('desk-pc-off').style.display = 'block';
                document.getElementById('desk-pc-on').style.display = 'none';
                showScreen('desk');
                document.getElementById('pc-power-overlay').classList.remove('hidden');
            });

            setTimeout(() => {
                const hideStartMenu = () => {
                    const m = document.getElementById('start-menu');
                    if (m) {
                        m.remove();
                        startBtn.classList.remove('active');
                    }
                    document.removeEventListener('pointerdown', hideStartMenu);
                };
                document.addEventListener('pointerdown', hideStartMenu);
            }, 50);
        });
    }

    function setupTrayIcons() {
        const trayIcons = document.querySelectorAll('.tray-icon');
        const tbTime = document.getElementById('taskbar-time');

        // Volume Icon (Assume it's the 4th icon, title="音量")
        if (trayIcons[3]) {
            trayIcons[3].addEventListener('click', (e) => {
                e.stopPropagation();
                openDummyTrayPopup('音量コントロール', `<div style="padding:10px;text-align:center;">
                    <p>マスター音量</p>
                    <input type="range" orient="vertical" min="0" max="100" value="50" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 8px; height: 100px;">
                </div>`, e.clientX, e.clientY);
            });
        }

        // Network Icon (Assume it's the 2nd icon, title="ネットワーク")
        if (trayIcons[1]) {
            trayIcons[1].addEventListener('click', (e) => {
                e.stopPropagation();
                openDummyTrayPopup('ローカル エリア接続', `<div style="padding:10px; font-size:12px;">
                    <p>状態: 接続</p>
                    <p>速度: 100.0 Mbps</p>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <div>送信<br><span id="net-tx">1,234</span></div>
                        <div>受信<br><span id="net-rx">5,678</span></div>
                    </div>
                </div>`, e.clientX, e.clientY);

                // Simple animation
                setInterval(() => {
                    const tx = document.getElementById('net-tx');
                    const rx = document.getElementById('net-rx');
                    if (tx && rx) {
                        tx.innerText = (parseInt(tx.innerText.replace(/,/g, '')) + Math.floor(Math.random() * 10)).toLocaleString();
                        rx.innerText = (parseInt(rx.innerText.replace(/,/g, '')) + Math.floor(Math.random() * 50)).toLocaleString();
                    }
                }, 1000);
            });
        }

        if (tbTime) {
            tbTime.addEventListener('click', (e) => {
                e.stopPropagation();
                openDummyTrayPopup('日付と時刻のプロパティ', `<div style="padding:10px; text-align:center;">
                    <p>システム時刻を変更しますか？</p>
                    <input type="time" id="dummy-time-input" value="12:00">
                    <button id="btn-apply-time" style="margin-top:10px; color:#000; padding:2px 15px; font-size:12px; cursor:pointer;">適用</button>
                    <p style="font-size:10px; color:#666; margin-top:5px;">※実際には環境に影響しません</p>
                </div>`, e.clientX, e.clientY);

                setTimeout(() => {
                    const btn = document.getElementById('btn-apply-time');
                    if (btn) {
                        btn.addEventListener('click', () => {
                            const input = document.getElementById('dummy-time-input');
                            if (input && input.value) {
                                state.userTime = input.value;
                                alertSysError("システム時刻を手動で変更しました。");
                            }
                        });
                    }
                }, 100);
            });
        }
    }

    function openDummyTrayPopup(title, contentHTML, x, y) {
        // Close existing popups
        document.querySelectorAll('.tray-popup').forEach(el => el.remove());

        const popup = document.createElement('div');
        popup.className = 'os-window tray-popup';
        popup.style.width = '200px';
        popup.style.height = 'auto';
        popup.style.left = Math.max(0, Math.min(x - 100, window.innerWidth - 220)) + 'px';
        popup.style.top = (y - 200) + 'px'; // open upwards
        popup.style.zIndex = ++state.maxZ;

        popup.innerHTML = `
            <div class="os-window-header">
                <span class="os-window-title">${title}</span>
                <div class="os-window-controls">
                    <div class="os-window-btn close-btn" onclick="this.closest('.tray-popup').remove()">X</div>
                </div>
            </div>
            <div class="os-window-content" style="background:#c0c0c0;">
                ${contentHTML}
            </div>
        `;
        windowsEl.appendChild(popup);
    }

    function renderTrashWindow() {
        const trashContainer = document.getElementById('folder-trash');
        if (trashContainer) {
            trashContainer.innerHTML = '';
            state.trashFiles.forEach(childId => {
                const file = FILE_SYSTEM[childId];
                if (file) {
                    // Create using real icons
                    createIcon(childId, file, trashContainer);
                }
            });
        }
    }

    function triggerGameOver() {
        if (!state.cleanupAlive) return;
        state.cleanupAlive = false;
        applyGlitch();
        setTimeout(() => {
            triggerEndingSequence("結末A：意識の同化（ゲームオーバー）", "あなたは「クリーンアップウェア」を停止させ、エラーを引き起こした。<br>エラー修正のため、PCの自浄作用により、あなたの意識は不要データとして処理・変換され、このPCの中に永遠に保存されることになった。", 0, [
                "「警告が出たけど、邪魔だから消してやる」",
                "タスクマネージャーからプロセスを強制終了した。",
                "……その途端、画面が激しく乱れ始めた。",
                "【致命的なエラーが発生しました。不要データを抽出・変換します】",
                "画面から伸びた無数の黒いノイズが、あなたを包み込む……"
            ]);
        }, 500);
    }

    function applyGlitch() {
        if (!document.querySelector('.noise-overlay')) {
            const noise = document.createElement('div');
            noise.className = 'noise-overlay';
            document.getElementById('screen-pc').appendChild(noise);
        }
        document.getElementById('os-desktop').classList.add('glitch');
    }

    function evaluateResult() {
        if (!state.pcOn) {
            triggerEndingSequence("結末：仕事放棄", "PCを起動すらさせず、完了報告をした。<br>後日、報酬が振り込まれることはなく、あなたの部屋の扉を叩く不自然な音が聞こえるようになった。", 0, [
                "PCを触る気にもなれず、完了報告だけを済ませた。",
                "……楽な仕事でよかった。",
                "だが、数日後。",
                "深夜、誰もいないはずの玄関からノックの音が鳴り続けている。"
            ]);
            return;
        }

        if (!state.cleanupAlive) {
            return;
        }

        let deleteTargets = state.totalDeletable || 1;
        let cleanRatio = Math.min(100, Math.floor((state.deletedCount / deleteTargets) * 100));

        if (state.cursedDeleted && cleanRatio === 100) {
            triggerEndingSequence("結末C：生還（トゥルーエンド）", `システムクリーン度: 100%<br>完全にデータを消去することに成功した。<br>無事に莫大な報酬を受け取った。`, 100, [
                "「……よし、これで完全にすべてのファイルが消えたはずだ」",
                "これにてミッションコンプリート。",
                "その数日後、口座には目を疑うような額の報酬が振り込まれていた。",
                "あの不気味なPCのことは忘れて、自由な生活を楽しもう。"
            ]);
        } else if (state.cursedDeleted) {
            triggerEndingSequence("結末B：残留する呪い（ノーマルエンド）", `システムクリーン度: ${cleanRatio}%<br>呪いのファイルは消したが、消し忘れのファイルがある状態で完了報告をした。`, cleanRatio, [
                "「やっかいなファイルは粗方消したし、この辺で報告しておくか」",
                "作業完了を報告し、端末の電源を落とした。",
                "報酬は振り込まれたが……",
                "数日後、あなたのスマホに見知らぬ文字列からメッセージが届いた。",
                "『ミツケタ、ノニ……マダ……ノコッテル……』"
            ]);
        } else {
            triggerEndingSequence("結末A：仕事失敗（バッドエンド）", `システムクリーン度: ${cleanRatio}%<br>肝心の呪いデータに手を出す前に完了報告をしてしまった。`, cleanRatio, [
                "「よくわからないけど、これでいいや」",
                "適当に報告を済ませ、眠りについた。",
                "……真夜中、PCが勝手に起動する音がした。",
                "画面には無数の顔が浮かんでいた……。",
                "『オマエ　モ　データ　ニ　シテヤル』"
            ]);
        }
    }

    function triggerEndingSequence(title, desc, ratio, advLines) {
        document.getElementById('os-windows').innerHTML = ''; // close all windows
        document.getElementById('os-taskbar').style.display = 'none'; // hide taskbar if needed
        document.getElementById('pc-power-overlay').classList.add('hidden'); // Fix z-indexing overlap sometimes

        state.currentAdvTexts = advLines;
        state.advIndex = 0;
        state.onAdvComplete = () => showResultGauged(title, desc, ratio);

        showScreen('adv');
        showAdvLine();
    }

    function showResultGauged(title, desc, ratio) {
        document.getElementById('result-title').innerText = title;
        document.getElementById('result-desc').innerHTML = desc;

        let gaugeHTML = '';
        if (ratio !== undefined && ratio >= 0) {
            gaugeHTML = `
                <div style="margin-top: 2vw; width: 60%; margin-left: auto; margin-right: auto; text-align: left;">
                    <div style="width: 100%; height: 2vw; background: #333; border: 2px solid #555; border-radius: 5px; overflow: hidden; position: relative;">
                        <div id="gauge-fill-anim" style="width: 0%; height: 100%; background: #333; box-shadow: none;"></div>
                        <div id="gauge-text-anim" style="position: absolute; top:0; left: 0; width: 100%; text-align: center; color: #fff; font-weight: bold; line-height: 2vw; text-shadow: 1px 1px 2px #000;">0%</div>
                    </div>
                </div>
            `;
        }

        const gContainer = document.getElementById('result-gauge-container');
        if (gContainer) gContainer.innerHTML = gaugeHTML;

        showScreen('result');

        if (ratio !== undefined && ratio > 0) {
            const fillEl = document.getElementById('gauge-fill-anim');
            const textEl = document.getElementById('gauge-text-anim');
            let currentVal = 0;
            const inc = ratio > 50 ? 2 : 1;

            let intv = setInterval(() => {
                currentVal += inc;
                if (currentVal >= ratio) {
                    currentVal = ratio;
                    clearInterval(intv);
                }
                if (fillEl && textEl) {
                    fillEl.style.width = currentVal + '%';
                    textEl.innerText = currentVal + '%';
                    const color = currentVal === 100 ? '#3f3' : (currentVal >= 50 ? '#ff3' : '#f33');
                    fillEl.style.background = color;
                    fillEl.style.boxShadow = `0 0 10px ${color}`;
                }
            }, 30);
        }
    }

    document.getElementById('btn-retry').addEventListener('click', () => {
        location.reload();
    });

    setInterval(() => {
        if (state.userTime) {
            // Static override if user successfully "applied" time
            const tbTime = document.getElementById('taskbar-time');
            if (tbTime) tbTime.innerText = state.userTime;
            return;
        }

        const d = new Date();
        const tbTime = document.getElementById('taskbar-time');
        if (tbTime) {
            tbTime.innerText =
                d.getHours().toString().padStart(2, '0') + ":" +
                d.getMinutes().toString().padStart(2, '0');
        }
    }, 1000);

    function openDummyTrayPopup(title, content, x, y) {
        const winId = 'tray-popup-' + (++state.maxZ);
        const win = document.createElement('div');
        win.className = 'os-window';
        win.id = winId;
        win.style.zIndex = state.maxZ;
        win.style.width = '200px';

        let html = `
            <div class="os-window-header">
                <span class="os-window-title">${title}</span>
                <div class="os-window-controls">
                    <div class="os-window-btn close-btn" id="close-${winId}">X</div>
                </div>
            </div>
            <div class="os-window-content" style="background:#fff; color:#000;">
                ${content}
            </div>
        `;
        win.innerHTML = html;
        win.style.opacity = '0';
        windowsEl.appendChild(win);

        win.querySelector(`#close-${winId}`).addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            win.remove();
        });

        requestAnimationFrame(() => {
            const rect = win.getBoundingClientRect();
            // Use desktop bounds instead of window bounds for container clamping
            const containerWidth = desktopEl.clientWidth || window.innerWidth;
            const containerHeight = desktopEl.clientHeight || window.innerHeight;

            let finalX = x;
            let finalY = y - rect.height;

            if (finalX + rect.width > containerWidth) {
                finalX = containerWidth - rect.width - 10;
            }
            if (finalY < 0) {
                finalY = containerHeight - 40 - rect.height;
            }
            if (finalY + rect.height > containerHeight) {
                finalY = containerHeight - rect.height - 40;
            }

            win.style.left = Math.max(0, finalX) + 'px';
            win.style.top = Math.max(0, finalY) + 'px';
            win.style.opacity = '1';
        });
    }

    function setupTrayIcons() {
        const trayIcons = document.querySelectorAll('.tray-icon');
        const tbTime = document.getElementById('taskbar-time');

        if (trayIcons[3]) {
            trayIcons[3].addEventListener('click', (e) => {
                e.stopPropagation();
                openDummyTrayPopup('音量コントロール', `<div style="padding:10px;text-align:center;">
                    <p>マスター音量</p>
                    <input type="range" orient="vertical" min="0" max="100" value="50" style="writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 8px; height: 100px;">
                </div>`, e.clientX, e.clientY);
            });
        }

        if (trayIcons[1]) {
            trayIcons[1].addEventListener('click', (e) => {
                e.stopPropagation();
                openDummyTrayPopup('ローカル エリア接続', `<div style="padding:10px; font-size:12px;">
                    <p>状態: 接続</p>
                    <p>速度: 100.0 Mbps</p>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <div>送信<br><span id="net-tx">1,234</span></div>
                        <div>受信<br><span id="net-rx">5,678</span></div>
                    </div>
                </div>`, e.clientX, e.clientY);

                setInterval(() => {
                    const tx = document.getElementById('net-tx');
                    const rx = document.getElementById('net-rx');
                    if (tx && rx) {
                        tx.innerText = (parseInt(tx.innerText.replace(/,/g, '')) + Math.floor(Math.random() * 10)).toLocaleString();
                        rx.innerText = (parseInt(rx.innerText.replace(/,/g, '')) + Math.floor(Math.random() * 50)).toLocaleString();
                    }
                }, 1000);
            });
        }

        if (tbTime) {
            tbTime.addEventListener('click', (e) => {
                e.stopPropagation();
                openDummyTrayPopup('日付と時刻のプロパティ', `<div style="padding:10px; text-align:center;">
                    <p>システム時刻を変更しますか？</p>
                    <input type="time" id="dummy-time-input" value="12:00">
                    <button id="btn-apply-time" style="margin-top:10px;">適用</button>
                    <p style="font-size:10px; color:#666; margin-top:5px;">※実際には環境に影響しません</p>
                </div>`, e.clientX, e.clientY);

                setTimeout(() => {
                    const btn = document.getElementById('btn-apply-time');
                    if (btn) {
                        btn.addEventListener('click', () => {
                            const input = document.getElementById('dummy-time-input');
                            if (input && input.value) {
                                state.userTime = input.value;
                                alertSysError("システム時刻を手動で変更しました。");
                            }
                        });
                    }
                }, 100);
            });
        }
    }

    function setupDesktopContextMenu() {
        desktopEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (e.target !== desktopEl) return;

            removeContextMenus();
            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            menu.innerHTML = `
                <div class="menu-item" id="ctx-desk-refresh">最新の情報に更新</div>
                <div class="menu-item" id="ctx-desk-arrange">アイコンの整列</div>
                <div class="menu-separator"></div>
                <div class="menu-item" id="ctx-desk-new">新規作成</div>
                <div class="menu-separator"></div>
                <div class="menu-item" id="ctx-desk-prop">プロパティ</div>
            `;
            document.body.appendChild(menu);

            menu.querySelector('#ctx-desk-refresh').addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                desktopEl.style.opacity = '0.5';
                setTimeout(() => desktopEl.style.opacity = '1', 100);
                menu.remove();
            });

            menu.querySelector('#ctx-desk-arrange').addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                menu.remove();
                arrangeIcons();
            });

            setTimeout(() => {
                const hideMenu = () => { menu.remove(); document.removeEventListener('pointerdown', hideMenu); };
                document.addEventListener('pointerdown', hideMenu);
            }, 50);
        });
    }

    function arrangeIcons() {
        const icons = Array.from(document.querySelectorAll('.desktop-icon'));
        let startX = 20;
        let startY = 20;
        const paddingX = 90;
        const paddingY = 90;
        const maxH = desktopEl.clientHeight - 100;

        icons.sort((a, b) => {
            return a.querySelector('span').innerText.localeCompare(b.querySelector('span').innerText);
        });

        icons.forEach(icon => {
            icon.style.left = startX + 'px';
            icon.style.top = startY + 'px';
            startY += paddingY;
            if (startY > maxH) {
                startY = 20;
                startX += paddingX;
            }
        });
    }
});
