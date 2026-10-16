/* ============================================
   MAIN.JS - Utility functions & CSV parser
   ============================================ */

// CSV Parser
function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]);
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h.trim()] = (values[idx] || '').trim();
        });
        data.push(obj);
    }
    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

// Load CSV file
async function loadCSV(path) {
    try {
        // add query parameter to bypass cache
        const res = await fetch(path + '?v=' + Date.now());
        const text = await res.text();
        return parseCSV(text);
    } catch (e) {
        console.error(`Failed to load CSV: ${path}`, e);
        return [];
    }
}

// Utility functions
function $(id) { return document.getElementById(id); }
function $$(sel) { return document.querySelectorAll(sel); }
function createElement(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
}

function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function formatTime(date) {
    return date.getHours().toString().padStart(2, '0') + ':' + 
           date.getMinutes().toString().padStart(2, '0');
}

function formatDate(date) {
    return date.getFullYear() + '/' + 
           (date.getMonth() + 1).toString().padStart(2, '0') + '/' + 
           date.getDate().toString().padStart(2, '0');
}

// Simple event emitter
class EventEmitter {
    constructor() { this.events = {}; }
    on(event, fn) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(fn);
    }
    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(fn => fn(...args));
        }
    }
    off(event, fn) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(f => f !== fn);
        }
    }
}

// Global event bus
const GameEvents = new EventEmitter();

// Toast notification
function showToast(title, body, type = '') {
    const toast = createElement('div', `toast-notification ${type}`);
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-body">${body}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Dialog helper
function showDialog(title, message, buttons = [{text: 'OK', primary: true}]) {
    return new Promise(resolve => {
        const overlay = createElement('div', 'dialog-overlay');
        const box = createElement('div', 'dialog-box');
        box.innerHTML = `
            <div class="dialog-title">
                <span>ℹ️</span>
                <span>${title}</span>
            </div>
            <div class="dialog-body">${message}</div>
            <div class="dialog-buttons">
                ${buttons.map((b, i) => 
                    `<button class="dialog-btn ${b.primary ? 'primary' : ''}" data-idx="${i}">${b.text}</button>`
                ).join('')}
            </div>
        `;
        box.querySelectorAll('.dialog-btn').forEach(btn => {
            btn.onclick = () => {
                overlay.remove();
                resolve(parseInt(btn.dataset.idx));
            };
        });
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    });
}

// Prevent right-click context menu on body
document.addEventListener('contextmenu', e => {
    // Allow within specific areas
    if (!e.target.closest('#desktop-icons') && !e.target.closest('.desktop-icon')) {
        e.preventDefault();
    }
});

// UI helper: make an element draggable (used for HUD)
function makeDraggable(el) {
    if (!el) return;
    let isDragging = false;
    let startX, startY, origX, origY;
    el.style.cursor = 'grab';

    el.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = el.getBoundingClientRect();
        origX = rect.left;
        origY = rect.top;
        el.style.position = 'absolute';
        el.style.right = 'auto'; // reset right constraint
        el.style.transform = 'none'; // reset transform
        el.style.left = origX + 'px';
        el.style.top = origY + 'px';
        el.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        el.style.left = (origX + dx) + 'px';
        el.style.top = (origY + dy) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            el.style.cursor = 'grab';
        }
    });
}

// Make HUD draggable on load
document.addEventListener('DOMContentLoaded', () => {
    makeDraggable(document.getElementById('game-hud'));
});

console.log('🎮 キミと恋する15日 - Web Version loaded');
