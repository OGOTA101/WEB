export class Assets {
    constructor() {
        this.images = {};
    }

    async loadAll() {
        // 画像がない場合は何もしない（今回は仮実装）
        // 画像生成ができたらここで読み込む
        return Promise.resolve();
    }

    get(name) {
        return this.images[name];
    }
}
