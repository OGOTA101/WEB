// ===== Game Engine =====
// Core game loop, player logic, boss AI, bullet management

import { getPartById } from './parts.js';
import { STAGES, getScaledHP } from './stages.js';

const CANVAS_W = 360;
const CANVAS_H = 640;
const PLAYER_OFFSET_Y = 60; // Offset above finger
const INVINCIBLE_TIME = 2000;
const REVIVE_TIME = 3000;
const REVIVE_RANGE = 40;
const STOP_THRESHOLD = 200; // ms to consider stopped

export class GameEngine {
    constructor(renderer, soundManager) {
        this.renderer = renderer;
        this.sound = soundManager;
        this.running = false;
        this.paused = false;
        this.stageId = 1;
        this.playerCount = 1;
        this.currentWave = 0;
        this.gameTime = 0;
        this.startTime = 0;
        this.inputDelayEnd = 0;

        // Player
        this.player = null;
        // Remote players (coop)
        this.remotePlayers = [];
        // Bullet Pools (Pre-allocate 1000 each)
        this.maxBullets = 1000;
        this.playerBulletCount = 0;
        this.playerBullets = new Array(this.maxBullets).fill(null).map(() => ({ active: false }));
        this.enemyBulletCount = 0;
        this.enemyBullets = new Array(this.maxBullets).fill(null).map(() => ({ active: false }));
        // Boss
        this.boss = null;
        this.boss2 = null; // For twin bosses
        this.bossMaxHP = 0;
        // Effects
        this.bombActive = null;
        this.clockUpActive = false;
        this.clockUpEnd = 0;

        // Callbacks
        this.onWaveChange = null;
        this.onBossHPChange = null;
        this.onPlayerHPChange = null;
        this.onGameOver = null;
        this.onStageClear = null;
        this.onBombCooldown = null;
        this.onEvadeCooldown = null;

        // State sync callback for multiplayer
        this.onStateUpdate = null;
        this.onGainEnergy = null;
    }

    initPlayer(loadout) {
        const body = getPartById('body', loadout.body);
        const main = getPartById('mainWeapon', loadout.mainWeapon);
        const sub = getPartById('subWeapon', loadout.subWeapon);
        const back = getPartById('backpack', loadout.backpack);
        const acc = getPartById('accessory', loadout.accessory);

        this.player = {
            x: CANVAS_W / 2,
            y: CANVAS_H * 0.8,
            color: body.color,
            hp: body.hp,
            maxHp: body.hp,
            dead: false,
            invincible: false,
            invincibleEnd: 0,
            isStopped: false,
            stoppedSince: 0,
            touching: false,
            showTarget: true,
            jumpProgress: 0,
            jumping: false,
            jumpStart: 0,
            showBits: sub.pattern === 'bits',
            bitsColor: sub.color,
            // Parts
            body, main, sub, back, acc,
            // Timers
            lastMainShot: 0,
            lastSubShot: 0,
            bombCooldownEnd: 0,
            evadeCooldownEnd: 0,
            bombActive: false,
            bombEnd: 0,
            bombRadius: 0,
            // Charge
            chargeStart: 0,
            // Move tracking
            lastMoveTime: 0,
            targetX: CANVAS_W / 2,
            targetY: CANVAS_H * 0.8,
            // Accessory
            lastHealTime: 0,
            // Weapon deploy animation (0 = retracted, 1 = deployed)
            mainDeploy: 0,
            subDeploy: 0,
        };
    }

    _spawnPlayerBullet(props) {
        if (this.playerBulletCount >= this.maxBullets) return;
        const b = this.playerBullets[this.playerBulletCount++];
        b.homing = false; b.pierce = false;
        b.hitTime = 0; // Reset hit state
        Object.assign(b, props);
        b.active = true;
    }

    _spawnEnemyBullet(props) {
        if (this.enemyBulletCount >= this.maxBullets) return;
        const b = this.enemyBullets[this.enemyBulletCount++];
        b.homing = false; b.reflected = false;
        b.hitTime = 0; // Reset hit state
        Object.assign(b, props);
        b.active = true;
    }

    start(stageId, playerCount, loadout) {
        this.stageId = stageId;
        this.playerCount = playerCount;
        this.currentWave = 0;
        this.gameTime = 0;
        this.gameTime = 0;
        this.startTime = Date.now();
        this.playerBulletCount = 0;
        this.enemyBulletCount = 0;
        this.remotePlayers = [];
        this.bombActive = null;
        this.clockUpActive = false;

        this.initPlayer(loadout);

        // Pre-generate sprites to avoid lag
        this.renderer.preloadBulletSprites(this.player);

        this.startWave(0);
        this.running = true;
        this.paused = false;

        // Prevent immediate taps acting as game input right after UI click
        this.inputDelayEnd = Date.now() + 500;
    }

    stop() {
        this.running = false;
        this.paused = false;
        this.running = false;
        this.paused = false;
        this.playerBulletCount = 0;
        this.enemyBulletCount = 0;
        this.boss = null;
        this.boss2 = null;
    }

    startWave(waveIndex) {
        const stage = STAGES[this.stageId];
        if (!stage || waveIndex >= stage.waves.length) {
            // Stage clear
            if (this.onStageClear) {
                const elapsed = Date.now() - this.startTime;
                this.onStageClear(elapsed);
            }
            this.running = false;
            return;
        }

        this.currentWave = waveIndex;
        this.enemyBulletCount = 0;
        const wave = stage.waves[waveIndex];
        const scaledHP = getScaledHP(wave.hp, this.playerCount);
        this.bossMaxHP = scaledHP;

        this.boss = {
            id: wave.bossId,
            name: wave.name,
            type: wave.type,
            color: wave.color,
            size: wave.size,
            hp: scaledHP,
            maxHp: scaledHP,
            speed: wave.speed,
            x: CANVAS_W / 2,
            y: -60,
            targetY: 80 + wave.size,
            entering: true,
            patterns: wave.patterns,
            patternTimers: wave.patterns.map(() => 0),
            spiralAngle: 0,
            spiralEnd: 0,
            damageFlash: 0,
            chargeRushActive: false,
            chargeRushTarget: null,
            warningActive: false,
            warningY: 0,
            warningStart: 0,
            laserActive: false,
            laserEnd: 0,
            moveTimer: 0,
            moveTimer: 0,
            moveTargetX: CANVAS_W / 2,
            isReturningFromCharge: false,
        };

        if (this.onWaveChange) this.onWaveChange(waveIndex, stage.waves.length);
        if (this.onBossHPChange) this.onBossHPChange(scaledHP, scaledHP);
    }

    // === Input handlers ===
    onTouchStart(x, y) {
        if (!this.player || this.player.dead) return;
        if (Date.now() < this.inputDelayEnd) return; // Ignore input immediately after start
        this.player.touching = true;
        this.player.targetX = x;
        this.player.targetY = y - PLAYER_OFFSET_Y;
        this.player.lastMoveTime = Date.now();
    }

    onTouchMove(x, y) {
        if (!this.player || this.player.dead) return;
        this.player.targetX = x;
        this.player.targetY = y - PLAYER_OFFSET_Y;
        this.player.lastMoveTime = Date.now();
        this.player.isStopped = false;
    }

    onTouchEnd() {
        if (!this.player) return;
        this.player.touching = false;
        this.player.stoppedSince = Date.now();
    }

    onDoubleTap() {
        if (!this.player || this.player.dead) return;
        const now = Date.now();
        if (now < this.player.bombCooldownEnd) return;

        // Activate bomb
        this.player.bombActive = true;
        this.player.bombEnd = now + 500;
        this.player.bombRadius = 0;

        let cd = this.player.body.bombCooldown;
        if (this.player.acc.effect === 'bomb_cooldown') cd *= this.player.acc.value;
        this.player.bombCooldownEnd = now + cd;

        this.sound.playBomb();
        this.renderer.screenShake = 10;

        if (this.player.body.bombType === 'clock_up') {
            this.clockUpActive = true;
            this.clockUpEnd = now + 5000;
        }

        if (this.onBombCooldown) this.onBombCooldown(cd);
    }

    onSwipeUp() {
        if (!this.player || this.player.dead || this.player.jumping) return;
        const now = Date.now();
        if (now < this.player.evadeCooldownEnd) return;

        const back = this.player.back;
        this.player.evadeCooldownEnd = now + back.cooldown;
        this.sound.playEvade();

        if (back.actionType === 'jump') {
            this.player.jumping = true;
            this.player.jumpStart = now;
            this.player.invincible = true;
            this.player.invincibleEnd = now + 1500;
        } else if (back.actionType === 'teleport') {
            this.player.y = Math.max(60, this.player.y - 150);
            this.player.invincible = true;
            this.player.invincibleEnd = now + 500;
            this.renderer.addParticles(this.player.x, this.player.y + 150, back.color, 12, 5);
        } else if (back.actionType === 'reflect') {
            // Reflect nearby enemy bullets
            for (let i = 0; i < this.enemyBulletCount; i++) {
                const b = this.enemyBullets[i];
                const dx = b.x - this.player.x;
                const dy = b.y - this.player.y;
                if (Math.sqrt(dx * dx + dy * dy) < 80) {
                    b.vy = -Math.abs(b.vy || b.speed) * 1.5;
                    b.vx = (b.vx || 0) * -1;
                    b.color = '#00ff88';
                    b.reflected = true;
                }
            }
            this.player.invincible = true;
            this.player.invincibleEnd = now + 300;
        } else if (back.actionType === 'decoy') {
            // Leave decoy and dash back
            this.remotePlayers.push({
                x: this.player.x, y: this.player.y,
                color: this.player.color,
                isDecoy: true, hp: 1, maxHp: 1, dead: false,
                invincible: false, invincibleEnd: 0,
                isStopped: false, jumping: false, jumpProgress: 0,
                showBits: false, showTarget: false, touching: false,
                decoyEnd: now + 3000,
            });
            this.player.y = Math.min(CANVAS_H - 60, this.player.y + 80);
        }

        if (this.onEvadeCooldown) this.onEvadeCooldown(back.cooldown);
    }

    _getClosestBoss(x, y) {
        if (this.boss && this.boss2) {
            const d1 = (this.boss.x - x) ** 2 + (this.boss.y - y) ** 2;
            const d2 = (this.boss2.x - x) ** 2 + (this.boss2.y - y) ** 2;
            return d1 < d2 ? this.boss : this.boss2;
        }
        return this.boss || this.boss2;
    }

    // === Game update ===
    update(dt) {
        if (!this.running || this.paused) return;

        const now = Date.now();
        this.gameTime += dt;

        // FPS Independence (normalize to 60fps)
        const baseTick = dt / 16.666;
        const timeScale = this.clockUpActive && now < this.clockUpEnd ? 0.3 : 1;

        // Player moves normally
        const playerTick = baseTick;
        // Enemies and their bullets move slower if ClockUp
        const enemyTick = baseTick * timeScale;

        this._updatePlayer(now, dt, playerTick);
        if (this.boss) this._updateBossLogic(now, dt * timeScale, enemyTick, this.boss);
        if (this.boss2) this._updateBossLogic(now, dt * timeScale, enemyTick, this.boss2);

        this._updateBullets(playerTick, enemyTick);
        this._checkCollisions(now);
        this._updateRemotePlayers(now);
        this._updateAccessory(now);

        if (this.clockUpActive && now >= this.clockUpEnd) {
            this.clockUpActive = false;
        }
    }

    _updatePlayer(now, dt, tick) {
        const p = this.player;
        if (p.dead) return;

        // Invincibility
        if (p.invincible && now >= p.invincibleEnd) {
            p.invincible = false;
        }

        // Jump animation
        if (p.jumping) {
            const elapsed = now - p.jumpStart;
            if (elapsed < 1500) {
                const t = elapsed / 1500;
                p.jumpProgress = t < 0.5 ? t * 2 : 2 - t * 2;
            } else {
                p.jumping = false;
                p.jumpProgress = 0;
            }
        }

        // Movement (FPS independent)
        if (p.touching && !p.jumping) {
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = (p.back.moveSpeed || 4) * tick; // Apply tick
            if (dist > 1) {
                p.x += (dx / dist) * Math.min(speed, dist);
                p.y += (dy / dist) * Math.min(speed, dist);
            }
            // Clamp
            p.x = Math.max(15, Math.min(CANVAS_W - 15, p.x));
            p.y = Math.max(30, Math.min(CANVAS_H - 60, p.y));
        }

        // Stopped detection (only relevant when touching)
        if (!p.touching) {
            p.isStopped = false;
        } else {
            const timeSinceMove = now - p.lastMoveTime;
            if (timeSinceMove > STOP_THRESHOLD) {
                if (!p.isStopped) {
                    p.isStopped = true;
                    p.chargeStart = now;
                }
            } else {
                p.isStopped = false;
            }
        }

        // Bomb logic
        if (p.bombActive) {
            if (now < p.bombEnd) {
                p.bombRadius += 4; // Half radius growth
                // Burst wave: damage & clear bullets
                if (p.body.bombType === 'burst_wave' || p.body.bombType === 'absolute_barrier') {
                    const rSq = p.bombRadius * p.bombRadius; // squared radius
                    const r = p.bombRadius;
                    for (let i = 0; i < this.enemyBulletCount; i++) {
                        const b = this.enemyBullets[i];
                        // Broad phase check
                        if (Math.abs(b.x - p.x) > r || Math.abs(b.y - p.y) > r) continue;

                        const dx = b.x - p.x;
                        const dy = b.y - p.y;
                        if (dx * dx + dy * dy < rSq) {
                            // Bullet expansion effect
                            b.hitTime = now;
                            b.vx = 0; b.vy = 0;
                        }
                    }
                    // Damage boss (stronger)
                    if (p.body.bombType === 'burst_wave') {
                        const checkBombDamage = (b) => {
                            if (b) {
                                const dx = b.x - p.x;
                                const dy = b.y - p.y;
                                if (Math.sqrt(dx * dx + dy * dy) < p.bombRadius + b.size) {
                                    this._damageBoss(15, b);
                                }
                            }
                        };
                        checkBombDamage(this.boss);
                        checkBombDamage(this.boss2);
                    }
                }
                if (p.body.bombType === 'absolute_barrier') {
                    p.invincible = true;
                    p.invincibleEnd = now + 600;
                }
            } else {
                p.bombActive = false;
            }
        }

        if (p.body.bombType === 'omega_laser' && p.bombActive) {
            // Draw will handle visual; damage boss (stronger)
            const laserW = 40;
            const checkLaserDamage = (b) => {
                if (b && Math.abs(b.x - p.x) < laserW + b.size) {
                    this._damageBoss(10, b);
                }
            };
            checkLaserDamage(this.boss);
            checkLaserDamage(this.boss2);
        }
        // Weapon deploy animation
        const deploySpeed = 0.08;
        const mainTarget = (p.touching && !p.jumping) ? 1 : 0;
        const subTarget = (p.touching && p.isStopped && !p.jumping) ? 1 : 0;
        p.mainDeploy += (mainTarget - p.mainDeploy) * deploySpeed;
        p.subDeploy += (subTarget - p.subDeploy) * deploySpeed;
        // Snap to target when very close
        if (Math.abs(p.mainDeploy - mainTarget) < 0.01) p.mainDeploy = mainTarget;
        if (Math.abs(p.subDeploy - subTarget) < 0.01) p.subDeploy = subTarget;

        // Shooting
        if (p.jumping) return; // No shooting while jumping
        if (!p.touching) return; // No shooting when not touching

        // Main weapon fires when touching (normal attack)
        let mainRate = p.main.fireRate;
        if (p.acc.effect === 'fire_rate_up') mainRate *= p.acc.value;
        if (now - p.lastMainShot >= mainRate) {
            this._fireMainWeapon(now);
            p.lastMainShot = now;
        }

        // Sub weapon fires ADDITIONALLY when stopped (strong attack)
        if (p.isStopped) {
            let subRate = p.sub.fireRate;
            if (p.acc.effect === 'fire_rate_up') subRate *= p.acc.value;
            if (now - p.lastSubShot >= subRate) {
                this._fireSubWeapon(now);
                p.lastSubShot = now;
            }
        }
    }

    _fireMainWeapon(now) {
        const p = this.player;
        const pattern = p.main.pattern;
        const damage = p.main.damage;
        const color = p.main.color;

        if (pattern === 'vulcan') {
            this._spawnPlayerBullet({
                x: p.x, y: p.y - 15,
                vx: 0, vy: -10,
                damage, color, radius: 3,
                type: 'normal'
            });
            this.sound.playShoot();
        } else if (pattern === 'spread') {
            const angles = [-0.2, -0.1, 0, 0.1, 0.2];
            for (const a of angles) {
                this._spawnPlayerBullet({
                    x: p.x, y: p.y - 15,
                    vx: Math.sin(a) * 8, vy: -Math.cos(a) * 8,
                    damage: damage * 0.6, color, radius: 2,
                    type: 'normal'
                });
            }
            this.sound.playShoot();
        } else if (pattern === 'homing') {
            const targetBoss = this._getClosestBoss(p.x, p.y);
            const angle = targetBoss ? Math.atan2(targetBoss.y - p.y, targetBoss.x - p.x) : -Math.PI / 2;
            this._spawnPlayerBullet({
                x: p.x, y: p.y - 15,
                vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
                damage, color, radius: 3,
                type: 'missile',
                angle, homing: true
            });
            this.sound.playShoot();
        } else if (pattern === 'cutter') {
            this._spawnPlayerBullet({
                x: p.x, y: p.y - 15,
                vx: 0, vy: -6,
                damage, color, radius: 3,
                type: 'cutter',
                pierce: true
            });
            this.sound.playShoot();
        }
    }

    _fireSubWeapon(now) {
        const p = this.player;
        const pattern = p.sub.pattern;
        const damage = p.sub.damage;
        const color = p.sub.color;

        if (pattern === 'sniper') {
            // Fire from left and right side sub weapon positions
            const offsetX = 12;
            // Left cannon
            this._spawnPlayerBullet({
                x: p.x - offsetX, y: p.y - 10,
                vx: 0, vy: -18,
                damage, color, radius: 3,
                type: 'sniper'
            });
            // Right cannon
            this._spawnPlayerBullet({
                x: p.x + offsetX, y: p.y - 10,
                vx: 0, vy: -18,
                damage, color, radius: 3,
                type: 'sniper'
            });
            this.sound.playShootSub();
        } else if (pattern === 'bits') {
            // Fire from left/right bit positions (matching visual layout)
            const offsetX = 22;
            const positions = [
                { x: p.x - offsetX, y: p.y - 6 },
                { x: p.x - offsetX, y: p.y + 6 },
                { x: p.x + offsetX, y: p.y - 6 },
                { x: p.x + offsetX, y: p.y + 6 },
            ];
            for (const pos of positions) {
                const targetBoss = this._getClosestBoss(pos.x, pos.y);
                if (targetBoss) {
                    const ta = Math.atan2(targetBoss.y - pos.y, targetBoss.x - pos.x);
                    this._spawnPlayerBullet({
                        x: pos.x, y: pos.y,
                        vx: Math.cos(ta) * 7, vy: Math.sin(ta) * 7,
                        damage: damage, color, radius: 2,
                        type: 'normal'
                    });
                }
            }
            this.sound.playShootSub();
        } else if (pattern === 'charge') {
            // Fire from right-side lance position
            const chargeTime = now - p.chargeStart;
            const chargeLevel = Math.min(chargeTime / 2000, 1);
            const beamWidth = 8 + chargeLevel * 20;
            this._spawnPlayerBullet({
                x: p.x + 12, y: p.y - 20,
                vx: 0, vy: -12,
                damage: damage * chargeLevel, color, radius: 3,
                type: 'beam',
                width: beamWidth,
                height: 30
            });
            this.sound.playShootSub();
        } else if (pattern === 'repair') {
            // Heal instead of attack
            if (p.hp < p.maxHp) {
                p.hp = Math.min(p.maxHp, p.hp + p.sub.healAmount);
                if (this.onPlayerHPChange) this.onPlayerHPChange(p.hp, p.maxHp);
            }
            // Heal nearby allies
            for (const rp of this.remotePlayers) {
                if (rp.isDecoy) continue;
                const dx = rp.x - p.x;
                const dy = rp.y - p.y;
                if (Math.sqrt(dx * dx + dy * dy) < 100) {
                    // Signal heal via sync
                }
            }
        }
    }

    _updateBossLogic(now, dt, tick, boss) {
        if (!boss) return;

        // Entrance
        if (boss.entering) {
            boss.y += 2 * tick;
            if (boss.y >= boss.targetY) {
                boss.entering = false;
                boss.isReturningFromCharge = false;
                boss.y = boss.targetY;
            }
            return;
        }

        // Movement
        boss.moveTimer += dt;
        if (boss.moveTimer > 2000) {
            boss.moveTargetX = 60 + Math.random() * (CANVAS_W - 120);
            boss.moveTimer = 0;
        }
        const mdx = boss.moveTargetX - boss.x;
        const moveStep = boss.speed * tick;
        if (Math.abs(mdx) > moveStep) {
            boss.x += Math.sign(mdx) * moveStep;
        }

        // Charge rush
        if (boss.chargeRushActive) {
            boss.y += 10 * tick;
            if (boss.y > CANVAS_H + 60) {
                boss.chargeRushActive = false;
                boss.y = -60;
                boss.entering = true;
                boss.isReturningFromCharge = true;
                boss.targetY = 80 + boss.size;
            }
            return;
        }

        // Attack patterns
        for (let i = 0; i < boss.patterns.length; i++) {
            const pat = boss.patterns[i];
            boss.patternTimers[i] += dt;

            if (boss.patternTimers[i] >= pat.interval) {
                boss.patternTimers[i] = 0;
                this._bossAttack(boss, pat, now);
            }
        }
    }

    _bossAttack(boss, pat, now) {
        if (pat.type === 'radial') {
            for (let i = 0; i < pat.bullets; i++) {
                const angle = (Math.PI * 2 / pat.bullets) * i;
                this._spawnEnemyBullet({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(angle) * pat.speed,
                    vy: Math.sin(angle) * pat.speed,
                    color: pat.color, radius: 4
                });
            }
        } else if (pat.type === 'aimed') {
            const targets = [this.player, ...this.remotePlayers].filter(p => p && !p.dead && !p.isDecoy);
            for (const target of targets) {
                const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
                for (let i = 0; i < pat.bullets; i++) {
                    const spread = (i - Math.floor(pat.bullets / 2)) * 0.15;
                    this._spawnEnemyBullet({
                        x: boss.x, y: boss.y,
                        vx: Math.cos(angle + spread) * pat.speed,
                        vy: Math.sin(angle + spread) * pat.speed,
                        color: pat.color, radius: 4
                    });
                }
            }
        } else if (pat.type === 'spiral') {
            if (!boss.spiralEnd || now > boss.spiralEnd) {
                boss.spiralEnd = now + pat.duration;
                boss.spiralAngle = 0;
            }
        } else if (pat.type === 'ring') {
            for (let i = 0; i < pat.bullets; i++) {
                const angle = (Math.PI * 2 / pat.bullets) * i + (now * 0.001);
                this._spawnEnemyBullet({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(angle) * pat.speed,
                    vy: Math.sin(angle) * pat.speed,
                    color: pat.color, radius: 5
                });
            }
        } else if (pat.type === 'laser_warning') {
            boss.warningActive = true;
            boss.warningY = this.player.y;
            boss.warningStart = now;
            setTimeout(() => {
                if (this.boss === boss || this.boss2 === boss) {
                    boss.warningActive = false;
                    boss.laserActive = true;
                    boss.laserEnd = now + 2000;
                    // Damage player if in laser area
                }
            }, pat.duration);
        } else if (pat.type === 'charge_rush') {
            boss.warningActive = true;
            boss.warningStart = now;
            setTimeout(() => {
                if (this.boss === boss || this.boss2 === boss) {
                    boss.warningActive = false;
                    boss.chargeRushActive = true;
                }
            }, pat.warning);
        } else if (pat.type === 'homing') {
            // Homing missiles that track the player
            const targets = [this.player, ...this.remotePlayers].filter(p => p && !p.dead && !p.isDecoy);
            for (let i = 0; i < pat.bullets; i++) {
                const spreadAngle = (i - Math.floor(pat.bullets / 2)) * 0.5;
                const angle = Math.PI / 2 + spreadAngle; // Downward + spread
                this._spawnEnemyBullet({
                    x: boss.x, y: boss.y + boss.size,
                    vx: Math.cos(angle) * pat.speed,
                    vy: Math.sin(angle) * pat.speed,
                    color: pat.color, radius: 6,
                    homing: true,
                    turnRate: pat.turnRate || 0.03,
                    speed: pat.speed,
                    lifetime: 5000,
                    spawnTime: now,
                });
            }
        }

        // Spiral continuous fire
        if (boss.spiralEnd && now < boss.spiralEnd) {
            for (const p2 of boss.patterns) {
                if (p2.type === 'spiral') {
                    boss.spiralAngle += 0.15;
                    for (let j = 0; j < (p2.bullets || 1); j++) {
                        const a = boss.spiralAngle + j * Math.PI;
                        this._spawnEnemyBullet({
                            x: boss.x, y: boss.y,
                            vx: Math.cos(a) * p2.speed,
                            vy: Math.sin(a) * p2.speed,
                            color: p2.color, radius: 4
                        });
                    }
                }
            }
        }
    }

    _updateBullets(playerTick, enemyTick) {
        // Player bullets
        for (let i = 0; i < this.playerBulletCount; i++) {
            const b = this.playerBullets[i];

            // Homing
            if (b.homing) {
                const targetBoss = this._getClosestBoss(b.x, b.y);
                if (targetBoss) {
                    const angle = Math.atan2(targetBoss.y - b.y, targetBoss.x - b.x);
                    b.vx += Math.cos(angle) * 0.3 * playerTick;
                    b.vy += Math.sin(angle) * 0.3 * playerTick;
                    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                    if (speed > 8) {
                        b.vx = (b.vx / speed) * 8;
                        b.vy = (b.vy / speed) * 8;
                    }
                    b.angle = Math.atan2(b.vy, b.vx);
                }
            }

            // Hit effect removal
            if (b.hitTime > 0) {
                if (Date.now() - b.hitTime > 100) {
                    // Swap Remove
                    this.playerBulletCount--;
                    const temp = this.playerBullets[i];
                    this.playerBullets[i] = this.playerBullets[this.playerBulletCount];
                    this.playerBullets[this.playerBulletCount] = temp;
                    temp.active = false;
                    i--;
                }
                continue;
            }

            b.x += b.vx * playerTick;
            b.y += b.vy * playerTick;

            if (b.x < -20 || b.x > CANVAS_W + 20 || b.y < -30 || b.y > CANVAS_H + 20) {
                // Swap Remove
                this.playerBulletCount--;
                const temp = this.playerBullets[i];
                this.playerBullets[i] = this.playerBullets[this.playerBulletCount];
                this.playerBullets[this.playerBulletCount] = temp;
                temp.active = false;
                i--;
            }
        }

        // Enemy bullets
        const now = Date.now();
        for (let i = 0; i < this.enemyBulletCount; i++) {
            const b = this.enemyBullets[i];

            // Homing enemy missile tracking
            if (b.homing && this.player && !this.player.dead) {
                // Expire after lifetime
                if (now - b.spawnTime > b.lifetime) {
                    this.enemyBulletCount--;
                    const temp = this.enemyBullets[i];
                    this.enemyBullets[i] = this.enemyBullets[this.enemyBulletCount];
                    this.enemyBullets[this.enemyBulletCount] = temp;
                    temp.active = false;
                    i--;
                    continue;
                }
                // Homing logic: Throttle usage (calc every 3-4 frames based on index)
                if (this.player.y < b.y) {
                    // Stop homing if below player
                } else if ((now + i * 3) % 4 === 0) {
                    const targetAngle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
                    const currentAngle = Math.atan2(b.vy, b.vx);
                    let angleDiff = targetAngle - currentAngle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    const turn = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), b.turnRate * 4 * enemyTick);
                    const newAngle = currentAngle + turn;
                    b.vx = Math.cos(newAngle) * b.speed;
                    b.vy = Math.sin(newAngle) * b.speed;
                }
            }

            // Hit effect removal
            if (b.hitTime > 0) {
                if (now - b.hitTime > 100) {
                    // Swap Remove
                    this.enemyBulletCount--;
                    const temp = this.enemyBullets[i];
                    this.enemyBullets[i] = this.enemyBullets[this.enemyBulletCount];
                    this.enemyBullets[this.enemyBulletCount] = temp;
                    temp.active = false;
                    i--;
                }
                continue;
            }

            b.x += b.vx * enemyTick;
            b.y += b.vy * enemyTick;

            if (b.x < -20 || b.x > CANVAS_W + 20 || b.y < -30 || b.y > CANVAS_H + 30) {
                // Swap Remove
                this.enemyBulletCount--;
                const temp = this.enemyBullets[i];
                this.enemyBullets[i] = this.enemyBullets[this.enemyBulletCount];
                this.enemyBullets[this.enemyBulletCount] = temp;
                temp.active = false;
                i--;
            }
        }
    }

    _checkCollisions(now) {
        const p = this.player;
        if (!p) return;

        // Player bullets vs boss/boss2
        const checkBulletsAgainstBoss = (targetBoss) => {
            if (!targetBoss || targetBoss.entering) return;
            const bossX = targetBoss.x;
            const bossY = targetBoss.y;
            const bossR = targetBoss.size;

            for (let i = 0; i < this.playerBulletCount; i++) {
                const b = this.playerBullets[i];
                if (b.hitTime) continue; // Already hitting

                // Broad phase (rough check)
                const range = bossR + (b.radius || 3) + 4; // +4 margin
                if (Math.abs(b.y - bossY) > range) continue;
                if (Math.abs(b.x - bossX) > range) continue;

                const dx = b.x - bossX;
                const dy = b.y - bossY;
                const distSq = dx * dx + dy * dy;
                const hitR = bossR + (b.radius || 3);

                if (distSq < hitR * hitR) {
                    this._damageBoss(b.damage, targetBoss);
                    if (!b.pierce) {
                        b.hitTime = now;
                    }
                }
            }
        };

        checkBulletsAgainstBoss(this.boss);
        checkBulletsAgainstBoss(this.boss2);

        // Enemy bullets vs player (1px hitbox)
        if (!p.dead && !p.invincible && !p.jumping) {
            const px = p.x;
            const py = p.y;

            for (let i = 0; i < this.enemyBulletCount; i++) {
                const b = this.enemyBullets[i];
                if (b.reflected) continue;

                // Broad phase! 
                // Enemy bullets cover screen, check proximity first
                const hitR = (b.radius || 4) + 1;
                if (Math.abs(b.y - py) > hitR) continue;
                if (Math.abs(b.x - px) > hitR) continue;

                const dx = b.x - px;
                const dy = b.y - py;
                const distSq = dx * dx + dy * dy;

                if (distSq < hitR * hitR && !b.hitTime) { // 1px hitbox optimization
                    // Hit logic
                    this._damagePlayer(now);
                    b.hitTime = now;

                    // Break loop after one hit? 
                    // No, if we continue we might hit multiple bullets in one frame?
                    // But if we break, we process other bullets next frame.
                    // Given invincibility, it's fine.
                    // But we MUST mark this bullet as hit.
                    // And break because player handles only 1 damage event efficiently per frame usually?
                    // Original code broke.
                    break;
                }
            }
        }

        // Reflected bullets vs boss
        const checkReflectedAgainstBoss = (targetBoss) => {
            if (!targetBoss || targetBoss.entering) return;
            for (let i = 0; i < this.enemyBulletCount; i++) {
                const b = this.enemyBullets[i];
                if (!b.reflected || b.hitTime) continue;

                const dx = b.x - targetBoss.x;
                const dy = b.y - targetBoss.y;
                if (dx * dx + dy * dy < targetBoss.size * targetBoss.size) {
                    this._damageBoss(15, targetBoss);
                    b.hitTime = now;
                    b.vx = 0; b.vy = 0;
                }
            }
        };

        checkReflectedAgainstBoss(this.boss);
        checkReflectedAgainstBoss(this.boss2);

        // Boss charge rush vs player
        const checkChargeRush = (b) => {
            if (b && b.chargeRushActive && !p.dead && !p.invincible && !p.jumping) {
                const dx = b.x - p.x;
                const dy = b.y - p.y;
                const hitR = b.size + 10;
                if (dx * dx + dy * dy < hitR * hitR) {
                    this._damagePlayer(now);
                }
            }
        };
        checkChargeRush(this.boss);
        checkChargeRush(this.boss2);

        // Laser vs player
        const checkLaser = (b) => {
            if (b && b.laserActive && now < b.laserEnd) {
                if (!p.dead && !p.invincible && !p.jumping) {
                    if (Math.abs(p.y - b.warningY) < 20) {
                        this._damagePlayer(now);
                    }
                }
            }
        };
        checkLaser(this.boss);
        checkLaser(this.boss2);

        // Boss Body vs Player (Collision)
        const checkBossCollision = (b) => {
            if (b && !b.entering && !p.dead && !p.jumping) {
                const dx = b.x - p.x;
                const dy = b.y - p.y;
                const distSq = dx * dx + dy * dy;
                const collisionDist = b.size + 15; // boss radius + player radius approx

                if (distSq < collisionDist * collisionDist) {
                    // Damage
                    if (!p.invincible) {
                        this._damagePlayer(now);
                    }
                    // Push back (prevent overlapping)
                    const dist = Math.sqrt(distSq); // Only calc sqrt if collision happened
                    const angle = Math.atan2(dy, dx);
                    const pushDist = collisionDist - dist + 2; // +2 for extra separation
                    p.x -= Math.cos(angle) * pushDist;
                    p.y -= Math.sin(angle) * pushDist;
                }
            }
        };

        checkBossCollision(this.boss);
        checkBossCollision(this.boss2);
    }
    _damageBoss(amount, targetBoss = this.boss) {
        if (!targetBoss || targetBoss.hp <= 0) return;
        targetBoss.hp -= amount;
        targetBoss.damageFlash = 0.5;
        this.sound.playHit();

        // If a clone is hit, also damage main boss so they share HP visually/functionally?
        // Wait, if it's a clone, its HP dropping is fine, but we also want the main boss HP to reflect overall progress.
        // Easiest way: reduce main boss HP as well if clone is hit, and vice versa?
        // If we reduce main boss HP when clone is hit, main boss handles the death logic.
        if (targetBoss === this.boss2) {
            if (this.boss) {
                this.boss.hp -= amount;
                this.boss.damageFlash = 0.5;
            }
        } else if (targetBoss === this.boss) {
            if (this.boss2) {
                this.boss2.hp -= amount;
                this.boss2.damageFlash = 0.5;
            }
        }

        if (this.boss.splitAtHalfHP && !this.boss.hasSplit && this.boss.hp <= this.boss.maxHp / 2) {
            this.boss.hasSplit = true;
            this.boss2 = JSON.parse(JSON.stringify(this.boss)); // Clone
            this.boss2.x = this.boss.x - 50;
            this.boss.x = this.boss.x + 50;
            this.boss2.hp = this.boss.hp; // Share HP in a way? Or independent HP? Independent for now.
            // But we want a shared HP bar. Let's just make boss2 visual/bullet emitting only, and boss 1 takes all damage!
            // Actually, independent boss2 is easier.
            // Wait, updateBossHP uses this.boss.hp. If we have boss2, HP bar won't reflect it well.
            // Let's just give boss2 its own HP, but they share the max. For UI, we sum them?
            // Safer: boss2 is an invincible clone that dies when boss 1 dies!
            this.boss2.isClone = true;
            this.boss2.hp = 1; // dummy
        }

        if (this.onBossHPChange) this.onBossHPChange(Math.max(0, this.boss.hp), this.boss.maxHp);

        if (this.boss.hp <= 0) {
            this._bossDefeated();
        }
    }

    _bossDefeated() {
        const boss = this.boss;
        this.boss = null; // Null immediately to prevent re-triggering
        this.boss2 = null;
        this.enemyBulletCount = 0; // Clear all enemy bullets

        // Big explosion visual
        this.renderer.addParticles(boss.x, boss.y, boss.color, 60, 8); // Main burst
        this.renderer.addParticles(boss.x, boss.y, '#ffffff', 40, 10); // Bright flash
        this.renderer.screenShake = 25;
        this.sound.playBossDeath();

        // Secondary explosions
        setTimeout(() => this.renderer.addParticles(boss.x + (Math.random() - 0.5) * 40, boss.y + (Math.random() - 0.5) * 40, boss.color, 20, 6), 200);
        setTimeout(() => this.renderer.addParticles(boss.x + (Math.random() - 0.5) * 40, boss.y + (Math.random() - 0.5) * 40, '#fff', 20, 5), 400);
        setTimeout(() => this.renderer.addParticles(boss.x, boss.y, boss.color, 30, 4), 600);

        // Award energy via callback
        if (this.onGainEnergy) {
            this.onGainEnergy(50);
        }

        setTimeout(() => {
            this.startWave(this.currentWave + 1);
            if (this.onWaveChangeMultiplayer) this.onWaveChangeMultiplayer(this.currentWave);
        }, 2500);
    }

    _damagePlayer(now) {
        const p = this.player;
        p.hp--;
        p.invincible = true;
        p.invincibleEnd = now + INVINCIBLE_TIME;
        this.sound.playDamage();
        this.renderer.screenShake = 8;
        this.renderer.addParticles(p.x, p.y, '#ff2244', 10, 4);

        if (this.onPlayerHPChange) this.onPlayerHPChange(p.hp, p.maxHp);

        if (p.hp <= 0) {
            p.dead = true;
            p.invincible = false;
            // Note: game over check moved to _updateRemotePlayers so it works for multiplayer too
        }
    }

    _updateRemotePlayers(now) {
        // Remove expired decoys
        for (let i = this.remotePlayers.length - 1; i >= 0; i--) {
            const rp = this.remotePlayers[i];
            if (rp.isDecoy && now > rp.decoyEnd) {
                this.renderer.addParticles(rp.x, rp.y, rp.color, 6, 3);
                this.remotePlayers.splice(i, 1);
            }
        }

        // Revive logic: check if alive player is near dead ally
        // (This is for local coop simulation; real coop uses sync)
        if (!this.player.dead) {
            let reviving = false;
            for (const rp of this.remotePlayers) {
                if (rp.dead && !rp.isDecoy) {
                    const dx = rp.x - this.player.x;
                    const dy = rp.y - this.player.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 80) { // REVIVE_RANGE = 80
                        reviving = true;
                        rp.reviveProgress = (rp.reviveProgress || 0) + 16.6; // Assuming 60fps dt
                        if (rp.reviveProgress >= 3000) { // REVIVE_TIME = 3000ms
                            // Mark target as revived so it stays in state payload
                            this.player.revivingTarget = rp.id;
                            this.player.revivingTargetEnd = now + 500;
                            rp.reviveProgress = 0; // Prevent spamming
                            this.sound.playEvade();
                        }
                    } else {
                        rp.reviveProgress = 0;
                    }
                }
            }
        }

        // Game Over logic for Multiplayer
        if (!this.gameOverTriggered && this.player.dead) {
            const hasAliveAlly = this.remotePlayers.some(rp => !rp.dead && !rp.isDecoy);
            if (!hasAliveAlly) {
                this.gameOverTriggered = true;
                setTimeout(() => {
                    if (this.onGameOver) this.onGameOver();
                }, 1000);
            }
        }
    }

    _updateAccessory(now) {
        const p = this.player;
        if (p.dead) return;
        if (p.acc.effect === 'auto_heal') {
            if (now - p.lastHealTime > (p.acc.interval || 5000)) {
                if (p.hp < p.maxHp) {
                    p.hp = Math.min(p.maxHp, p.hp + p.acc.value);
                    if (this.onPlayerHPChange) this.onPlayerHPChange(p.hp, p.maxHp);
                }
                p.lastHealTime = now;
            }
        }
    }

    // === Draw frame ===
    draw(time) {
        const r = this.renderer;
        r.clear();
        r.applyShake();

        // Boss
        const drawBossEntity = (b) => {
            if (b) {
                r.drawBoss(b, time);

                // Warning line
                if (b.warningActive) {
                    const elapsed = Date.now() - b.warningStart;
                    const alpha = Math.sin(elapsed * 0.01) * 0.5 + 0.5;
                    r.drawWarningLine(b.warningY, alpha);
                }

                // Laser
                if (b.laserActive && Date.now() < b.laserEnd) {
                    r.drawLaser(b.x, b.y + b.size, 30, CANVAS_H, b.color);
                }
            }
        };

        drawBossEntity(this.boss);
        drawBossEntity(this.boss2);

        // Enemy bullets
        for (let i = 0; i < this.enemyBulletCount; i++) {
            r.drawEnemyBullet(this.enemyBullets[i]);
        }

        // Player bullets
        for (let i = 0; i < this.playerBulletCount; i++) {
            r.drawBullet(this.playerBullets[i]);
        }

        // Remote players / decoys
        for (const rp of this.remotePlayers) {
            r.drawRemotePlayer(rp, time);
        }

        // Player
        if (this.player) {
            r.drawPlayer(this.player, time);

            // Bomb effect
            if (this.player.bombActive) {
                if (this.player.body.bombType === 'omega_laser') {
                    r.drawLaser(this.player.x, this.player.y, 40, this.player.y, this.player.body.color);
                } else {
                    r.drawBombEffect(this.player.x, this.player.y, this.player.bombRadius, this.player.body.color);
                }
            }
        }

        // Particles
        r.updateParticles();

        // Wave transition text
        if (this.boss && this.boss.entering && !this.boss.isReturningFromCharge) {
            const stage = STAGES[this.stageId];
            r.drawText(
                `WAVE ${this.currentWave + 1}/${stage.waves.length}`,
                CANVAS_W / 2, CANVAS_H / 2 - 30,
                18, '#fff'
            );
            r.drawText(
                this.boss.name,
                CANVAS_W / 2, CANVAS_H / 2 + 10,
                24, this.boss.color
            );
        }

        r.resetTransform();
    }

    // === Multiplayer sync helpers ===
    getPlayerState() {
        if (!this.player) return null;

        // Pack simple bullet positions to render minimal player bullets for remotes
        const activeBullets = this.playerBullets
            .filter(b => b.active && b.type === 'normal')
            .map(b => ({ x: Math.round(b.x), y: Math.round(b.y), color: b.color }))
            .slice(0, 10); // cap to save bandwidth

        const state = {
            x: this.player.x,
            y: this.player.y,
            hp: this.player.hp,
            dead: this.player.dead,
            isStopped: this.player.isStopped,
            jumping: this.player.jumping,
            jumpProgress: this.player.jumpProgress,
            invincible: this.player.invincible,
            color: this.player.color,
            showBits: this.player.showBits,
            bitsColor: this.player.bitsColor,
            bullets: activeBullets,
            mainDeploy: this.player.mainDeploy,
            subDeploy: this.player.subDeploy,
            partIds: {
                body: this.player.body.id,
                main: this.player.main.id,
                sub: this.player.sub.id,
                back: this.player.back.id,
                acc: this.player.acc.id
            }
        };

        if (this.player.revivingTarget && Date.now() < this.player.revivingTargetEnd) {
            state.revivingTarget = this.player.revivingTarget;
        }

        return state;
    }

    applyRemotePlayerState(id, state) {
        let rp = this.remotePlayers.find(r => r.id === id);
        if (!rp) {
            rp = { id, ...state, showTarget: false, touching: false, reviveProgress: 0 };
            this.remotePlayers.push(rp);
        } else {
            // Keep local reviveProgress when adopting overrides
            const revLocal = rp.reviveProgress;
            Object.assign(rp, state);
            if (state.dead && revLocal > 0) rp.reviveProgress = revLocal;
        }

        if (state.partIds) {
            rp.body = getPartById('body', state.partIds.body);
            rp.main = getPartById('mainWeapon', state.partIds.main);
            rp.sub = getPartById('subWeapon', state.partIds.sub);
            rp.back = getPartById('backpack', state.partIds.back);
            rp.acc = getPartById('accessory', state.partIds.acc);
        }

        // Check if remote revived me
        if (state.revivingTarget === this.player.id && this.player.dead) {
            this.player.dead = false;
            this.player.hp = Math.floor(this.player.maxHp * 0.5); // Revive with half HP
            this.player.invincible = true;
            this.player.invincibleEnd = Date.now() + 2000;
            this.sound.playEvade(); // specific revive noise or evade noise
            // Apply UI
            if (this.onPlayerHPChange) this.onPlayerHPChange(this.player.hp, this.player.maxHp);
        }
    }

    applyBossHP(hp) {
        if (this.boss) {
            this.boss.hp = hp;
            if (this.onBossHPChange) this.onBossHPChange(hp, this.boss.maxHp);
            if (hp <= 0 && this.boss.hp > 0) {
                this._bossDefeated();
            }
        }
    }

    removeRemotePlayer(id) {
        this.remotePlayers = this.remotePlayers.filter(r => r.id !== id);
    }
}
