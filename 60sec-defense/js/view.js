/**
 * view.js
 * Canvasへの描画を担当
 * 画像がない場合は仮の図形を描画する
 */
export class View {
    constructor(canvas, assets) {
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.assets = assets;
    }

    render(game) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. 背景描画
        this.drawBackground();

        // 2. エリアガイド描画
        this.drawAreas(game.areas);

        // 3. 大砲描画
        game.cannons.forEach(c => this.drawCannon(c));

        // 4. 弾薬庫描画
        this.drawAmmoDepot(game.areas.ammo);

        // 5. 敵描画
        game.enemies.forEach(e => this.drawEnemy(e));

        // 6. 弾描画
        game.bullets.forEach(b => this.drawBullet(b));

        // 7. ゴースト猫描画
        game.ghosts.forEach(g => this.drawCat(g, true));

        // 8. プレイヤー猫描画
        if (game.player) this.drawCat(game.player, false);

        // 9. 防衛ライン描画
        this.drawDefenseLine();

        // 10. UIオーバーレイなどはCSSで表示
    }

    drawBackground() {
        // フィールド
        this.ctx.fillStyle = '#2d5a27'; // 草原緑
        this.ctx.fillRect(0, 0, this.width, this.height * 0.65);

        // 城エリア
        this.ctx.fillStyle = '#555'; // 石畳グレー
        this.ctx.fillRect(0, this.height * 0.65, this.width, this.height * 0.35);

        // レーン
        this.ctx.fillStyle = '#4a3c31'; // 土色
        [70, 180, 290].forEach(x => { // [60, 180, 300] -> [70, 180, 290]
            this.ctx.fillRect(x - 20, 0, 40, this.height * 0.65);
        });
    }

    drawDefenseLine() {
        this.ctx.strokeStyle = '#f00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 450);
        this.ctx.lineTo(this.width, 450);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawAreas(areas) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        const drawRect = (area) => {
            this.ctx.fillRect(area.x - area.w / 2, area.y - area.h / 2, area.w, area.h);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(area.x - area.w / 2, area.y - area.h / 2, area.w, area.h);
        };
        drawRect(areas.ammo);
        areas.load.forEach(drawRect);
        areas.fire.forEach(drawRect);
    }

    drawCannon(c) {
        this.ctx.save();
        this.ctx.translate(c.x, c.y);

        // 台座
        this.ctx.fillStyle = '#553';
        this.ctx.fillRect(-20, -20, 40, 40);

        // 砲身
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(-10, -30, 20, 40);

        if (c.loaded) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawAmmoDepot(a) {
        this.ctx.fillStyle = '#853'; // 木箱色
        this.ctx.fillRect(a.x - 20, a.y - 15, 40, 30);
        this.ctx.fillStyle = '#000';
        this.ctx.font = '12px Sans-serif';
        this.ctx.fillText('Ammo', a.x - 15, a.y + 5);
    }

    drawEnemy(e) {
        this.ctx.save();
        this.ctx.translate(e.x, e.y);

        // 仮のネズミ（灰色丸）
        this.ctx.fillStyle = '#aaa';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();

        // 耳
        this.ctx.beginPath();
        this.ctx.arc(-8, -8, 5, 0, Math.PI * 2);
        this.ctx.arc(8, -8, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawBullet(b) {
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawCat(cat, isGhost) {
        this.ctx.save();
        this.ctx.translate(cat.x, cat.y);

        if (isGhost) {
            this.ctx.globalAlpha = 0.5; // 半透明
            this.ctx.filter = 'hue-rotate(180deg)'; // 青白く
        }

        // 仮の猫（オレンジ四角）
        this.ctx.fillStyle = '#f80';
        this.ctx.fillRect(-12, -12, 24, 24);

        // 耳
        this.ctx.beginPath();
        this.ctx.moveTo(-12, -12);
        this.ctx.lineTo(-12, -20);
        this.ctx.lineTo(-4, -12);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(12, -12);
        this.ctx.lineTo(12, -20);
        this.ctx.lineTo(4, -12);
        this.ctx.fill();

        // 向き
        this.ctx.fillStyle = '#000';
        if (cat.dir === 'up') this.ctx.fillRect(-2, -12, 4, 4);
        if (cat.dir === 'down') this.ctx.fillRect(-2, 8, 4, 4);
        if (cat.dir === 'left') this.ctx.fillRect(-12, -2, 4, 4);
        if (cat.dir === 'right') this.ctx.fillRect(8, -2, 4, 4);

        // 持っているもの
        if (cat.holding) {
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(8, -8, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // アクションゲージ
        if (cat.actionTimer > 0) {
            this.ctx.fillStyle = '#0f0';
            this.ctx.fillRect(-15, -25, 30 * Math.min(1, cat.actionTimer), 4);
        }

        this.ctx.restore();
    }

    drawPause() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '30px DotGothic16';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSE', this.width / 2, this.height / 2);
    }
}
