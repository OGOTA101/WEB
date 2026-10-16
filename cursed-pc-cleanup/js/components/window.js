import { ICONS, FILE_SYSTEM } from "../data/icons_fs.js";

// Common window creation Logic
export function createOSWindow(id, file, contentHTML, state, windowsEl) {
    state.maxZ++;
    const win = document.createElement('div');
    win.id = 'win-' + id;
    win.className = 'os-window';
    win.style.left = (50 + Math.random() * 50) + 'px';
    win.style.top = (50 + Math.random() * 50) + 'px';
    win.style.zIndex = state.maxZ;

    win.innerHTML = `
        <div class="os-window-header" id="header-${id}">
            <div class="os-window-title"><img src="${getIconUrl(file, state)}" style="width:14px; height:14px; vertical-align:middle; margin-right:5px;">${file.name}</div>
            <div class="os-window-controls">
                <div class="os-window-btn min-btn" id="min-${id}">_</div>
                <div class="os-window-btn max-btn" id="max-${id}">□</div>
                <div class="os-window-btn close-btn" id="close-${id}">X</div>
            </div>
        </div>
        <div class="os-window-content">
            ${contentHTML}
        </div>
    `;

    windowsEl.appendChild(win);
    return win;
}

export function bringToFront(win, state) {
    state.maxZ++;
    win.style.zIndex = state.maxZ;
    document.querySelectorAll('.os-window-header').forEach(h => h.classList.add('inactive'));
    const header = win.querySelector('.os-window-header');
    if (header) header.classList.remove('inactive');

    document.querySelectorAll('.taskbar-item').forEach(tb => tb.classList.remove('active'));
    if (win.id && win.id.startsWith('win-')) {
        const id = win.id.replace('win-', '');
        const tbItem = document.getElementById('tb-' + id);
        if (tbItem) tbItem.classList.add('active');
    }
}

export function getIconUrl(file, state) {
    if (file.type === 'trash') return state.trashFiles.length > 0 ? ICONS.trash : ICONS.trashEmpty;
    if (file.type === 'app' || file.type === 'app_task') return ICONS.app;
    if (file.type === 'locked') return ICONS.locked;
    if (file.type === 'folder') return ICONS.folder;
    if (file.type === 'img') return ICONS.img;
    if (file.type === 'audio') return ICONS.audio;
    if (file.type === 'video') return ICONS.video;
    if (file.type === 'doc') return ICONS.doc;
    if (file.type === 'xls') return ICONS.xls;
    if (file.type === 'pdf') return ICONS.pdf;
    return ICONS.txt;
}

export function toggleMaximizeWindow(win, id, state) {
    let winState = state.maxWinStates[id];
    if (!winState) {
        winState = { isMax: false, left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
        state.maxWinStates[id] = winState;
    }
    if (!winState.isMax) {
        winState.left = win.style.left; winState.top = win.style.top; winState.width = win.style.width; winState.height = win.style.height;
        win.style.left = '0'; win.style.top = '0';
        win.style.width = '100%'; win.style.height = 'calc(100% - 40px)';
        win.style.resize = 'none'; // prevent css resize while full
    } else {
        win.style.left = winState.left; win.style.top = winState.top;
        win.style.width = winState.width; win.style.height = winState.height;
        win.style.resize = 'both';
    }
    winState.isMax = !winState.isMax;
}
