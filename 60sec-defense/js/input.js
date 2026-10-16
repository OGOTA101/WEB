/**
 * input.js
 * タップ入力を処理し、ゲーム内の移動ターゲットを設定する
 */
export class Input {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;

        this.canvas.addEventListener('mousedown', this.handleInput.bind(this));
        this.canvas.addEventListener('touchstart', this.handleInput.bind(this), { passive: false });
    }

    handleInput(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;

        if (e.type === 'touchstart') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // キャンバス内の座標に変換（スケーリング考慮）
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        // ゲームロジックへ入力座標を送信
        this.game.handleInput(x, y);
    }
}
