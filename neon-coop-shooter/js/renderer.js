import Phaser from 'phaser';

// ===== Renderer (Phaser 3) =====
// Draws player, bullets, bosses, effects using Phaser 3 Scene API with neon style

export class Renderer {
    constructor(canvas, updateCallback) {
        this.canvas = canvas;
        this.W = canvas.width || 360;
        this.H = canvas.height || 640;
        this.screenShake = 0;
        this.mobileMode = false;

        this.pools = {
            sprite: [],
            graphics: [],
            text: [],
            particleSprite: []
        };
        this.poolIndices = {
            sprite: 0,
            graphics: 0,
            text: 0,
            particleSprite: 0
        };

        this.maxParticles = 1000;
        this.particleCount = 0;
        this.particles = new Array(this.maxParticles).fill(null).map(() => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, decay: 0, color: '#fff', size: 0 }));

        this.spriteCache = {};

        const config = {
            type: Phaser.WEBGL,
            canvas: this.canvas,
            width: this.W,
            height: this.H,
            backgroundColor: '#05050d',
            resolution: window.devicePixelRatio || 1,
            transparent: false,
            clearBeforeRender: true,
            disableContextMenu: true,
            scene: {
                create: this._createScene.bind(this),
                update: updateCallback
            }
        };

        this.app = new Phaser.Game(config);
        this.scene = null;
    }

    _createScene() {
        this.scene = this.app.scene.scenes[0];

        // 1. Scene Graph
        this.bgLayer = this.scene.add.container(0, 0);
        this.titleBgLayer = this.scene.add.container(0, 0);
        this.bossBackLayer = this.scene.add.container(0, 0);
        this.particleLayer = this.scene.add.container(0, 0);
        this.bulletLayer = this.scene.add.container(0, 0);
        this.playerLayer = this.scene.add.container(0, 0);
        this.effectLayer = this.scene.add.container(0, 0);
        this.uiLayer = this.scene.add.container(0, 0);

        this.bgGraphics = this.scene.add.graphics();
        this.bgLayer.add(this.bgGraphics);
        this.drawGrid();
    }

    setMobileMode(enabled) {
        this.mobileMode = enabled;
        this.maxParticles = enabled ? 200 : 1000;
        // Not clearing cache fully to avoid lag, let existing textures persist
    }

    drawGrid() {
        if (!this.scene) return;
        this.bgGraphics.clear();
        this.bgGraphics.lineStyle(1, 0x00f0ff, 0.03);
        const gridSize = 40;
        for (let x = 0; x < this.W; x += gridSize) {
            this.bgGraphics.moveTo(x, 0); this.bgGraphics.lineTo(x, this.H);
        }
        for (let y = 0; y < this.H; y += gridSize) {
            this.bgGraphics.moveTo(0, y); this.bgGraphics.lineTo(this.W, y);
        }
    }

    resize(w, h, scale = 1) {
        this.W = w;
        this.H = h;
        if (this.app) {
            this.app.scale.resize(w * scale, h * scale);
            if (this.scene) {
                this.scene.cameras.main.setZoom(scale);
            }
        }
        this.drawGrid();
    }

    getGenericTexture(key, size, colorHex, blur, shapeFn) {
        if (!this.scene) return null;
        if (this.mobileMode) blur = 0;

        if (this.scene.textures.exists(key)) {
            return key;
        }

        const pad = Math.max(blur * 3, 10);
        const w = size + pad * 2;
        const h = size + pad * 2;

        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');

        ctx.translate(w / 2, h / 2);
        if (blur > 0) {
            ctx.shadowColor = colorHex;
            ctx.shadowBlur = blur;
        }
        ctx.fillStyle = colorHex;
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 1;

        shapeFn(ctx);

        this.scene.textures.addCanvas(key, c);
        return key;
    }

    getColorInt(hex) {
        if (!hex) return 0xffffff;
        if (hex.startsWith('#')) return parseInt(hex.slice(1), 16);
        return 0xffffff; // fallback
    }

    // --- Pooling ---
    getSprite(layer) {
        let i = this.poolIndices.sprite++;
        if (i >= this.pools.sprite.length) {
            let s = this.scene.add.sprite(0, 0, '');
            s.setOrigin(0.5);
            this.pools.sprite.push(s);
        }
        let s = this.pools.sprite[i];
        if (s.parentContainer !== layer) {
            layer.add(s);
        }
        s.setVisible(true);
        s.setAlpha(1);
        s.setTint(0xffffff);
        s.setScale(1);
        s.setRotation(0);
        s.setBlendMode(Phaser.BlendModes.NORMAL);
        return s;
    }

    getParticleSprite() {
        let i = this.poolIndices.particleSprite++;
        if (i >= this.pools.particleSprite.length) {
            let s = this.scene.add.sprite(0, 0, '');
            s.setOrigin(0.5);
            this.pools.particleSprite.push(s);
            this.particleLayer.add(s);
        }
        let s = this.pools.particleSprite[i];
        s.setVisible(true);
        s.setAlpha(1);
        s.setTint(0xffffff);
        s.setScale(1);
        s.setRotation(0);
        return s;
    }

    getGraphics(layer) {
        let i = this.poolIndices.graphics++;
        if (i >= this.pools.graphics.length) {
            let g = this.scene.add.graphics();
            this.pools.graphics.push(g);
        }
        let g = this.pools.graphics[i];
        if (g.parentContainer !== layer) layer.add(g);
        g.setVisible(true);
        g.setAlpha(1);
        g.clear();
        return g;
    }

    getText() {
        let i = this.poolIndices.text++;
        if (i >= this.pools.text.length) {
            let t = this.scene.add.text(0, 0, '', {
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 20,
                color: '#ffffff',
                align: 'center',
                shadow: {
                    offsetX: 0,
                    offsetY: 0,
                    color: '#000000',
                    blur: 4,
                    stroke: false,
                    fill: true
                }
            });
            t.setOrigin(0.5);
            this.pools.text.push(t);
            this.uiLayer.add(t);
        }
        let t = this.pools.text[i];
        t.setVisible(true);
        t.setAlpha(1);
        return t;
    }

    // Called at start of draw frame
    clear() {
        if (!this.scene) return;
        this.titleBgLayer.setVisible(false);
        for (let k in this.poolIndices) this.poolIndices[k] = 0;
    }

    // Called at end of draw frame
    resetTransform() {
        if (!this.scene) return;
        // Hide unused pooled objects
        for (let k in this.pools) {
            const arr = this.pools[k];
            const max = this.poolIndices[k];
            for (let i = max; i < arr.length; i++) {
                if (arr[i].visible !== false) {
                    arr[i].setVisible(false);
                }
            }
        }
    }

    applyShake() {
        if (!this.scene) return;
        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake;
            const sy = (Math.random() - 0.5) * this.screenShake;
            this.scene.cameras.main.scrollX = -sx;
            this.scene.cameras.main.scrollY = -sy;
            this.screenShake *= 0.9;
            if (this.screenShake < 0.5) this.screenShake = 0;
        } else {
            this.scene.cameras.main.scrollX = 0;
            this.scene.cameras.main.scrollY = 0;
        }
    }

    // ==== Player Rendering ====

    drawPlayer(player, time) {
        if (!this.scene) return;
        if (player.dead) {
            this._drawDeadPlayer(player.x, player.y, player.color, time);
            return;
        }

        let scale = 1;
        let baseAlpha = player.isRemote ? 0.4 : 1;
        let alpha = baseAlpha;
        if (player.jumpProgress > 0) {
            scale = 1 + player.jumpProgress * 0.5;
            alpha = baseAlpha * (1 - player.jumpProgress * 0.6);
        }

        const invincibleAlpha = player.invincible ? baseAlpha * (0.4 + Math.sin(time * 0.02) * 0.3) : alpha;

        const dMain = Math.round((player.mainDeploy || 0) * 10);
        const dSub = Math.round((player.subDeploy || 0) * 10);
        const jumpState = player.jumping ? 1 : 0;

        const bId = player.body ? player.body.id : 'std';
        const mId = player.main ? player.main.id : 'std';
        const sId = player.sub ? player.sub.id : 'std';
        const bpId = player.back ? player.back.id : 'std';
        const aId = player.acc ? player.acc.id : 'std';

        // LAYER 1: Backpack
        if (player.back) {
            const key = `pt_back_${bpId}_${player.back.color}_${jumpState}`;
            const tex = this.getGenericTexture(key, 40, player.back.color, 4, (ctx) => {
                const pMock = { back: player.back, jumping: jumpState > 0 };
                this._drawBackpack(ctx, pMock, 1000);
            });
            if (tex) {
                const s = this.getSprite(this.playerLayer);
                s.setTexture(tex);
                s.setPosition(player.x, player.y); s.setScale(scale); s.setAlpha(invincibleAlpha);
            }
        }

        // LAYER 2: Body
        if (player.body) {
            const key = `pt_body_${bId}_${player.body.color}`;
            const tex = this.getGenericTexture(key, 40, player.body.color, 15, (ctx) => {
                const pMock = { body: player.body };
                this._drawBody(ctx, pMock, 1000);
            });
            if (tex) {
                const s = this.getSprite(this.playerLayer);
                s.setTexture(tex);
                s.setPosition(player.x, player.y); s.setScale(scale); s.setAlpha(invincibleAlpha);
            }
        }

        // LAYER 3: Main Weapon
        if (player.main) {
            const key = `pt_main_${mId}_${player.main.color}_${dMain}`;
            const tex = this.getGenericTexture(key, 50, player.main.color, 6, (ctx) => {
                const pMock = { main: player.main, mainDeploy: dMain / 10 };
                this._drawMainWeapon(ctx, pMock, 1000);
            });
            if (tex) {
                const s = this.getSprite(this.playerLayer);
                s.setTexture(tex);
                s.setPosition(player.x, player.y); s.setScale(scale); s.setAlpha(invincibleAlpha);
            }
        }

        // LAYER 4: Sub Weapon
        if (player.sub) {
            const stoppedState = (player.isStopped && !player.jumpProgress) ? 1 : 0;
            const key = `pt_sub_${sId}_${player.sub.color}_${dSub}_${stoppedState}`;
            const tex = this.getGenericTexture(key, 80, player.sub.color, 6, (ctx) => {
                const pMock = { sub: player.sub, subDeploy: dSub / 10, isStopped: stoppedState > 0, jumpProgress: 0 };
                this._drawSubWeapon(ctx, pMock, 1000);
            });
            if (tex) {
                const s = this.getSprite(this.playerLayer);
                s.setTexture(tex);
                s.setPosition(player.x, player.y); s.setScale(scale); s.setAlpha(invincibleAlpha);
            }
        }

        // LAYER 5: Accessory
        if (player.acc && player.acc.effect !== 'none') {
            const key = `pt_acc_${aId}_${player.acc.color}`;
            const tex = this.getGenericTexture(key, 60, player.acc.color, 4, (ctx) => {
                const pMock = { acc: player.acc };
                this._drawAccessory(ctx, pMock, 1000);
            });
            if (tex) {
                const s = this.getSprite(this.playerLayer);
                s.setTexture(tex);
                s.setPosition(player.x, player.y); s.setScale(scale); s.setAlpha(invincibleAlpha);
                if (player.acc.effect === 'revive_speed' || player.acc.effect === 'radar' || player.acc.effect === 'auto_heal') {
                    s.setRotation(time * 0.002);
                } else if (player.acc.effect === 'fire_rate_up') {
                    s.y += Math.sin(time * 0.003) * 4;
                }
            }
        }

        // Hitbox
        const g = this.getGraphics(this.playerLayer);
        g.fillStyle(0xffffff);
        g.fillRect(player.x - 1, player.y - 1, 2, 2);

        if (player.showTarget && player.touching) {
            this._drawCrosshairPhaser(player.x, player.y);
        }
    }

    drawRemotePlayer(rp, time) {
        rp.isRemote = true;
        this.drawPlayer(rp, time);

        // Draw basic bullets for remote players
        if (rp.bullets && rp.bullets.length > 0) {
            for (const b of rp.bullets) {
                const tex = this.getGenericTexture(`pb_normal_${b.color}_3`, 6, b.color, 6, c => {
                    c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
                });
                if (tex) {
                    const s = this.getSprite(this.bulletLayer);
                    s.setTexture(tex);
                    s.setPosition(b.x, b.y);
                    s.setAlpha(0.4); // Remote bullets are semi-transparent
                }
            }
        }

        // Draw revive gauge if active
        if (rp.dead && rp.reviveProgress && rp.reviveProgress > 0) { // REVIVE_TIME corresponds to REVIVE_TIME in game.js, pass roughly progress %
            const pct = Math.min(1, rp.reviveProgress / 3000); // 3000 is REVIVE_TIME
            const g = this.getGraphics(this.effectLayer);
            g.lineStyle(4, 0x333333, 0.8);
            g.strokeCircle(rp.x, rp.y, 30);

            g.lineStyle(4, 0x00ff88, 1);
            g.beginPath();
            g.arc(rp.x, rp.y, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            g.strokePath();

            // Draw plus icon
            g.fillStyle(0x00ff88, 1);
            g.fillRect(rp.x - 2, rp.y - 12, 4, 10);
            g.fillRect(rp.x - 5, rp.y - 9, 10, 4);
        }
    }

    _drawDeadPlayer(x, y, color, time) {
        if (!this.scene) return;
        const tex = this.getGenericTexture(`dead_${color}`, 40, color, 10, (ctx) => {
            ctx.strokeStyle = color;
            ctx.strokeRect(-8, -8, 16, 16);
            ctx.beginPath();
            ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
            ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
            ctx.stroke();
        });
        if (tex) {
            const s = this.getSprite(this.effectLayer);
            s.setTexture(tex);
            s.setPosition(x, y);
            s.setAlpha(0.3 + Math.sin(time * 0.003) * 0.15);
        }
    }

    _drawCrosshairPhaser(x, y) {
        const ty = y - 60;
        const g = this.getGraphics(this.effectLayer);
        g.lineStyle(1, 0x00f0ff, 0.5);
        g.strokeCircle(x, ty, 10);
        g.beginPath();
        g.moveTo(x - 15, ty); g.lineTo(x - 6, ty);
        g.moveTo(x + 6, ty); g.lineTo(x + 15, ty);
        g.moveTo(x, ty - 15); g.lineTo(x, ty - 6);
        g.moveTo(x, ty + 6); g.lineTo(x, ty + 15);
        g.strokePath();
    }

    // ==== Bullets ====
    drawBullet(bullet) {
        if (!this.scene) return;
        if (bullet.hitTime) {
            const time = Date.now() - bullet.hitTime;
            const scale = 1 + time / 50;
            const alpha = Math.max(0, 1 - time / 100);

            const tex = this.getGenericTexture(`explosion_white`, 20, '#ffffff', 10, (c) => {
                c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill();
            });
            if (tex) {
                const s = this.getSprite(this.effectLayer);
                s.setTexture(tex);
                s.setPosition(bullet.x, bullet.y);
                s.setScale(scale);
                s.setAlpha(alpha);
            }
            return;
        }

        const color = bullet.color || '#00f0ff';
        const type = bullet.type || 'normal';

        if (type === 'beam') {
            const g = this.getGraphics(this.bulletLayer);
            g.fillStyle(this.getColorInt(color), 0.7);
            g.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height, bullet.width, bullet.height);
            return;
        }

        const r = bullet.radius || 3;
        const key = `pb_${type}_${color}_${r}`;
        let tex = null;

        if (type === 'cutter') {
            tex = this.getGenericTexture(key, 20, color, 6, (c) => {
                c.fillRect(-1, -10, 2, 20);
                c.fillStyle = '#fff'; c.globalAlpha = 0.6; c.fillRect(-0.5, -9, 1, 18);
            });
        } else if (type === 'missile') {
            tex = this.getGenericTexture(key, 12, color, 6, c => c.fillRect(-2, -4, 4, 8));
        } else if (type === 'sniper') {
            tex = this.getGenericTexture(key, 24, color, 6, c => c.fillRect(-1, -12, 2, 24));
        } else {
            tex = this.getGenericTexture(key, r * 2, color, 6, c => {
                c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
            });
        }

        if (tex) {
            const s = this.getSprite(this.bulletLayer);
            s.setTexture(tex);
            s.setPosition(bullet.x, bullet.y);
            if (type === 'missile') s.setRotation(bullet.angle || 0);
        }
    }

    drawEnemyBullet(bullet) {
        if (!this.scene) return;
        if (bullet.hitTime) return;
        const color = bullet.color || '#ff2244';
        const r = bullet.radius || 4;
        const key = `eb_${color}_${r}`;

        const tex = this.getGenericTexture(key, r * 2, color, 5, (c) => {
            c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
        });

        if (tex) {
            const s = this.getSprite(this.bulletLayer);
            s.setTexture(tex);
            s.setPosition(bullet.x, bullet.y);
        }
    }

    drawBoss(boss, time) {
        if (!this.scene) return;
        const pulse = Math.sin(time * 0.003) * 3;
        const color = boss.color || '#ff2244';
        const key = `boss_${boss.type}_${color}`;

        const tex = this.getGenericTexture(key, boss.size, color, 20, (ctx) => {
            const s = boss.size;
            if (boss.type === 'fortress') {
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = Math.PI / 3 * i - Math.PI / 2;
                    ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
                }
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowBlur = 0; ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.shadowColor = color; ctx.shadowBlur = 15;
                ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            } else if (boss.type === 'mech') {
                ctx.fillRect(-s * 0.4, -s * 0.6, s * 0.8, s * 1.2);
                ctx.fillRect(-s * 0.8, -s * 0.3, s * 0.3, s * 0.15);
                ctx.fillRect(s * 0.5, -s * 0.3, s * 0.3, s * 0.15);
                ctx.fillStyle = '#fff'; ctx.shadowColor = color; ctx.shadowBlur = 10;
                ctx.fillRect(-6, -s * 0.6 - 10, 12, 10);
                ctx.fillStyle = color; ctx.fillRect(-3, -s * 0.6 - 7, 6, 4);
            } else {
                ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, -s * 0.3);
                ctx.lineTo(s, s * 0.5); ctx.lineTo(0, s); ctx.lineTo(-s, s * 0.5);
                ctx.lineTo(-s * 0.8, -s * 0.3); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.shadowBlur = 0; ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.shadowColor = color; ctx.shadowBlur = 12;
                ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
            }
        });

        if (tex) {
            const sprite = this.getSprite(this.bossBackLayer);
            sprite.setTexture(tex);
            sprite.setPosition(boss.x, boss.y);
            const sMod = 1 + (pulse / boss.size);
            sprite.setScale(sMod);
        }

        if (boss.damageFlash > 0) {
            const g = this.getGraphics(this.effectLayer);
            const sMod = 1 + (pulse / boss.size);
            g.fillStyle(0xffffff, boss.damageFlash);
            g.fillRect(boss.x - boss.size * sMod, boss.y - boss.size * sMod, boss.size * 2 * sMod, boss.size * 2 * sMod);
            boss.damageFlash -= 0.05;
        }
    }

    drawWarningLine(y, alpha) {
        if (!this.scene) return;
        const g = this.getGraphics(this.effectLayer);
        g.lineStyle(2, 0xff2244, alpha);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(this.W, y);
        g.strokePath();
    }

    drawLaser(x, y, width, height, color) {
        if (!this.scene) return;
        const g = this.getGraphics(this.effectLayer);
        const cInt = this.getColorInt(color);
        g.fillStyle(cInt, 0.5);
        g.fillRect(x - width / 2, y - height, width, height);
        g.fillStyle(0xffffff, 0.8);
        g.fillRect(x - width / 4, y - height, width / 2, height);
    }

    addParticles(x, y, color, count = 8, speed = 3) {
        for (let i = 0; i < count; i++) {
            if (this.particleCount >= this.maxParticles) break;
            const p = this.particles[this.particleCount++];
            const angle = Math.random() * Math.PI * 2;
            const spd = speed * (0.5 + Math.random());
            p.active = true; p.x = x; p.y = y;
            p.vx = Math.cos(angle) * spd; p.vy = Math.sin(angle) * spd;
            p.life = 1; p.decay = 0.02 + Math.random() * 0.02;
            p.color = color; p.size = 2 + Math.random() * 3;
        }
    }

    updateParticles() {
        if (!this.scene) return;
        for (let i = 0; i < this.particleCount; i++) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particleCount--;
                const temp = this.particles[i];
                this.particles[i] = this.particles[this.particleCount];
                this.particles[this.particleCount] = temp;
                i--;
                continue;
            }

            const sizeInt = Math.ceil(p.size);
            const key = `pt_${p.color}_${sizeInt}`;
            const tex = this.getGenericTexture(key, sizeInt, p.color, 4, (c) => {
                c.fillRect(-sizeInt / 2, -sizeInt / 2, sizeInt, sizeInt);
            });

            if (tex) {
                const s = this.getParticleSprite();
                s.setTexture(tex);
                s.setPosition(p.x, p.y);
                s.setAlpha(Math.max(0, p.life));
            }
        }
    }

    drawBombEffect(x, y, radius, color) {
        if (!this.scene) return;
        const g = this.getGraphics(this.effectLayer);
        g.fillStyle(this.getColorInt(color), 0.2);
        g.lineStyle(2, this.getColorInt(color), 1);
        g.fillCircle(x, y, radius);
        g.strokeCircle(x, y, radius);
    }

    drawText(txt, x, y, size = 20, color = '#fff', align = 'center') {
        if (!this.scene) return;
        const textObj = this.getText();
        textObj.setText(txt);
        textObj.setPosition(x, y);
        textObj.setFontSize(size);
        textObj.setColor(color);
        textObj.setAlign(align);
        textObj.setOrigin(align === 'center' ? 0.5 : (align === 'left' ? 0 : 1), 0.5);
    }

    preloadBulletSprites(player) {
    }

    // ==== TITLE BACKGROUND ====
    drawTitleBackground(time, loadout, gameMode) {
        this.clear();
        if (!this.scene) return;
        this.titleBgLayer.setVisible(true);

        const g = this.getGraphics(this.titleBgLayer);

        const count = 15;
        for (let i = 0; i < count; i++) {
            const x = (Math.sin(time * 0.0003 + i * 2.1) * 0.5 + 0.5) * this.W;
            const y = (Math.cos(time * 0.0004 + i * 1.7) * 0.5 + 0.5) * this.H;
            const size = 2 + Math.sin(time * 0.002 + i) * 1.5;
            const alpha = 0.2 + Math.sin(time * 0.001 + i * 0.5) * 0.15;
            g.fillStyle(0x00f0ff, alpha);
            g.fillRect(x - size / 2, y - size / 2, size, size);
        }

        if (loadout) {
            const mockPlayer = {
                x: this.W / 2, y: this.H * 0.55,
                color: loadout.body ? loadout.body.color : '#fff',
                isStopped: true, invincible: false, dead: false, jumpProgress: 0,
                jumping: false, touching: false, showTarget: false,
                mainDeploy: 0, subDeploy: 0,
                body: loadout.body, main: loadout.mainWeapon, sub: loadout.subWeapon,
                back: loadout.backpack, acc: loadout.accessory
            };

            const originalLayer = this.playerLayer;

            // Generate a specialized container just for title mech to easily scale it
            // Rather than rewriting drawPlayer, just alter the global playerLayer momentarily
            // Phaser scenes keep objects where they are put. Since we clear everything next frame, this is ok!

            const titleContainer = this.scene.add.container(0, 0);
            titleContainer.setScale(3);
            titleContainer.setAlpha(0.35);
            this.titleBgLayer.add(titleContainer);

            this.playerLayer = titleContainer;
            this.drawPlayer(mockPlayer, time);
            this.playerLayer = originalLayer;
        }

        this.resetTransform();
    }

    // ==== NATIVE CANVAS 2D EXPORTS (Used by Customize Screen UI) ====

    _drawBody(ctx, player, time) {
        const body = player.body;
        const color = body ? body.color : player.color;
        const bodyId = body ? body.id : 'standard_frame';
        const size = 14;

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;

        if (bodyId === 'fortress_frame') {
            ctx.fillRect(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4);
            ctx.fillStyle = '#05050d'; ctx.shadowBlur = 0;
            ctx.fillRect(-size / 2 + 1, -size / 2 + 1, size - 2, size - 2);
            ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
            ctx.fillRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6);
        } else {
            ctx.fillRect(-size / 2, -size / 2, size, size);
        }

        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';

        if (bodyId === 'standard_frame') {
            ctx.beginPath(); ctx.moveTo(0, -size / 2 + 2); ctx.lineTo(0, size / 2 - 2);
            ctx.moveTo(-size / 2 + 2, 0); ctx.lineTo(size / 2 - 2, 0); ctx.stroke();
        } else if (bodyId === 'assault_frame') {
            ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(0, -5); ctx.lineTo(4, 4); ctx.stroke();
        } else if (bodyId === 'fortress_frame') {
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
        } else if (bodyId === 'speedster_frame') {
            ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(0, -5);
            ctx.moveTo(5, 3); ctx.lineTo(0, -5); ctx.stroke();
            ctx.strokeStyle = color + '66'; ctx.beginPath();
            ctx.moveTo(-3, 5); ctx.lineTo(-3, 10); ctx.moveTo(3, 5); ctx.lineTo(3, 10); ctx.stroke();
        }

        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; ctx.fillRect(-2, -2, 4, 4);
    }

    _drawMainWeapon(ctx, player, time) {
        const main = player.main;
        if (!main) return;
        const color = main.color;
        const pattern = main.pattern;
        const d = player.mainDeploy !== undefined ? player.mainDeploy : 1;
        const retractY = (1 - d) * 8;
        const weaponAlpha = 0.3 + d * 0.7;

        ctx.save();
        ctx.globalAlpha *= weaponAlpha;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;

        if (pattern === 'vulcan') {
            ctx.fillRect(-4, -15 + retractY, 2, 10);
            ctx.fillRect(2, -15 + retractY, 2, 10);
        } else if (pattern === 'spread') {
            ctx.beginPath(); ctx.moveTo(-2, -8 + retractY); ctx.lineTo(-6, -16 + retractY);
            ctx.lineTo(6, -16 + retractY); ctx.lineTo(2, -8 + retractY); ctx.closePath(); ctx.fill();
        } else if (pattern === 'homing') {
            ctx.fillRect(-5, -14 + retractY, 3, 6);
            ctx.fillRect(-1, -14 + retractY, 3, 6);
            ctx.fillRect(3, -14 + retractY, 3, 6);
        } else if (pattern === 'cutter') {
            ctx.fillRect(-4, -14 + retractY, 8, 4);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = (0.5 + Math.sin(time * 0.01) * 0.3) * weaponAlpha;
            ctx.fillRect(-3, -13 + retractY, 6, 2);
        }
        ctx.restore();
    }

    _drawSubWeapon(ctx, player, time) {
        const sub = player.sub;
        if (!sub) return;
        const color = sub.color;
        const pattern = sub.pattern;
        const stopped = player.isStopped && !player.jumpProgress;
        const d = player.subDeploy !== undefined ? player.subDeploy : (stopped ? 1 : 0);
        const subAlpha = 0.25 + d * 0.75;
        const bob = Math.sin(time * 0.004) * 2;

        ctx.save(); ctx.globalAlpha *= subAlpha;

        if (pattern === 'sniper') {
            const offsetX = 4 + d * 8 + bob * 0.5;
            const slideY = d * -6;
            ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6;
            ctx.fillRect(-offsetX - 3, -4 + slideY, 3, 10);
            ctx.fillRect(offsetX, -4 + slideY, 3, 10);
            if (d > 0.5) {
                const extAlpha = (d - 0.5) * 2;
                ctx.globalAlpha = subAlpha * extAlpha;
                ctx.fillRect(-offsetX - 2, -8 + slideY, 2, 6); ctx.fillRect(offsetX + 1, -8 + slideY, 2, 6);
            }
        } else if (pattern === 'bits') {
            const baseOffset = 4 + d * 12 + (stopped ? d * 6 : 0);
            const positions = [{ x: -baseOffset, y: -6 + bob }, { x: -baseOffset, y: 6 + bob * 0.5 }, { x: baseOffset, y: -6 - bob }, { x: baseOffset, y: 6 - bob * 0.5 }];
            ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6;
            for (const pos of positions) {
                ctx.fillRect(pos.x - 3, pos.y - 3, 6, 6);
                if (d > 0.3) {
                    ctx.strokeStyle = color + '44'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(pos.x, pos.y); ctx.stroke();
                    ctx.shadowBlur = 6;
                }
            }
        } else if (pattern === 'charge') {
            const lanceX = 4 + d * 6;
            const lanceLen = 6 + d * (stopped ? 22 : 12);
            ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
            ctx.fillRect(lanceX, -lanceLen + bob, 4, lanceLen);
            if (stopped && d > 0.5) {
                const chargeT = Math.min(1, (Date.now() - (player.chargeStart || 0)) / 2000);
                ctx.globalAlpha = (0.3 + chargeT * 0.5) * subAlpha;
                ctx.fillStyle = '#fff';
                ctx.fillRect(lanceX, -lanceLen + bob, 4, lanceLen * chargeT);
            }
        } else if (pattern === 'repair') {
            const offsetX = 4 + d * 10 + bob * 0.5;
            ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6;
            ctx.fillRect(-offsetX - 1, -3, 3, 6); ctx.fillRect(-offsetX - 3, -1, 7, 2);
            ctx.fillRect(offsetX - 2, -3, 3, 6); ctx.fillRect(offsetX - 4, -1, 7, 2);
            if (stopped && d > 0.5) {
                ctx.strokeStyle = color + '66'; ctx.lineWidth = 1; ctx.shadowBlur = 4;
                ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(time * 0.005) * 3, 0, Math.PI * 2); ctx.stroke();
            }
        }
        ctx.restore();
    }

    _drawBackpack(ctx, player, time) {
        const back = player.back;
        if (!back) return;
        const color = back.color;
        const actionType = back.actionType;

        ctx.globalAlpha = 0.45; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 4;

        if (actionType === 'jump') {
            ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-9, 14); ctx.lineTo(9, 14); ctx.lineTo(6, 6); ctx.closePath(); ctx.fill();
            if (player.jumping) {
                ctx.globalAlpha = 0.6 + Math.sin(time * 0.02) * 0.2; ctx.fillStyle = '#fff';
                ctx.fillRect(-4, 14, 8, 6 + Math.random() * 4);
            }
        } else if (actionType === 'teleport') {
            ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(0, 8, 8, 0, Math.PI); ctx.stroke();
        } else if (actionType === 'reflect') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = Math.PI / 3 * i - Math.PI / 2; ctx.lineTo(Math.cos(a) * 6, 8 + Math.sin(a) * 6);
            }
            ctx.closePath(); ctx.fill();
        } else if (actionType === 'decoy') {
            ctx.fillRect(-8, 6, 4, 5); ctx.fillRect(4, 6, 4, 5);
        }
        ctx.globalAlpha = 1;
    }

    _drawAccessory(ctx, player, time) {
        const acc = player.acc;
        if (!acc || acc.effect === 'none') return;
        const color = acc.color;
        ctx.shadowColor = color;

        if (acc.effect === 'fire_rate_up') {
            const bobY = Math.sin(time * 0.003) * 4;
            ctx.fillStyle = color; ctx.shadowBlur = 4;
            ctx.fillRect(-18, -2 + bobY, 3, 3); ctx.fillRect(16, -2 - bobY, 3, 3);
        } else if (acc.effect === 'auto_heal') {
            ctx.fillStyle = color; ctx.shadowBlur = 3;
            for (let i = 0; i < 6; i++) {
                const a = time * 0.001 + i * 1.05; const r = 12 + Math.sin(time * 0.002 + i) * 4;
                ctx.globalAlpha = 0.3 + Math.sin(time * 0.003 + i) * 0.2;
                ctx.fillRect(Math.cos(a) * r - 1, Math.sin(a) * r - 1, 2, 2);
            }
            ctx.globalAlpha = 1;
        } else if (acc.effect === 'radar') {
            const scanAngle = (time * 0.003) % (Math.PI * 2);
            ctx.strokeStyle = color + '55'; ctx.lineWidth = 1; ctx.shadowBlur = 4;
            const fanStart = -Math.PI / 2 - 0.4; const fanEnd = -Math.PI / 2 + 0.4;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 25, fanStart, fanEnd); ctx.closePath(); ctx.stroke();
            const sweepA = fanStart + (Math.sin(scanAngle) * 0.5 + 0.5) * (fanEnd - fanStart);
            ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(sweepA) * 25, Math.sin(sweepA) * 25); ctx.stroke();
        } else if (acc.effect === 'revive_speed') {
            const rot = time * 0.002; ctx.save(); ctx.rotate(rot);
            ctx.fillStyle = color; ctx.shadowBlur = 5;
            ctx.fillRect(-1, -6, 2, 12); ctx.fillRect(-6, -1, 12, 2);
            ctx.restore();
        } else if (acc.effect === 'bomb_cooldown') {
            const pulse = Math.sin(time * 0.005);
            ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.shadowBlur = 4;
            ctx.globalAlpha = 0.4 + pulse * 0.2;
            ctx.beginPath(); ctx.arc(0, 0, 16 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
}
