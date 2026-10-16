/**
 * timeLoop.js
 * タイムループシステムの中核
 * プレイヤーの行動記録と、ゴースト猫の再生を管理
 */
export class TimeLoop {
    constructor() {
        this.records = []; // 過去の行動ログの配列（最大2つ）
        this.currentRecord = []; // 現在のプレイの記録中ログ
        this.startTime = 0;
    }

    startRecording() {
        this.currentRecord = [];
        this.startTime = Date.now();
    }

    // アクションを記録
    recordAction(type, data) {
        const time = Date.now() - this.startTime;
        this.currentRecord.push({
            time: time,
            type: type,
            ...data
        });
    }

    // 現在の位置情報を定期的に記録（移動補間用）
    recordPosition(x, y, direction) {
        // データ量を減らすため、一定間隔または変化があった時のみ記録するなどの最適化が必要だが
        // まずは毎フレーム記録に近い形で実装してみる（長時間のプレイではないので）
        this.recordAction('move', { x, y, direction });
    }

    // ゲームリセット（リロード）時に現在の記録を保存
    saveRecord() {
        if (this.currentRecord.length > 0) {
            // 終了時刻を記録
            this.recordAction('end', {});

            // 過去のログとして保存
            this.records.push([...this.currentRecord]);

            // 最大2匹まで（古いものを消すか、仕様に合わせて調整）
            // 仕様では「最大2匹（初期+2回リトライ）」なので、recordsには最大2つ入る
        }
        this.currentRecord = [];
    }

    // 全ゴーストの行動を取得（現在の経過時間に合わせて）
    getGhostActions(currentTime) {
        // 各レコード（ゴースト）について、現在の時間に対応するアクションを抽出
        // 実際にはGameクラス側で、フレームごとに「この時間にやるべきアクション」を問い合わせる形にする

        let actions = [];

        this.records.forEach((record, ghostIndex) => {
            // 処理済みのインデックスを保持する必要がある
            if (!this.ghostCursors) this.ghostCursors = new Array(this.records.length).fill(0);

            let cursor = this.ghostCursors[ghostIndex];

            while (cursor < record.length) {
                const action = record[cursor];
                if (action.time <= currentTime) {
                    actions.push({ ghostIndex, action });
                    cursor++;
                } else {
                    break;
                }
            }
            this.ghostCursors[ghostIndex] = cursor;
        });

        return actions;
    }

    resetPlayback() {
        this.ghostCursors = new Array(this.records.length).fill(0);
        this.startTime = Date.now(); // 再生開始時刻もリセット
    }

    // 現在のゴースト数（残機消費数）
    getGhostCount() {
        return this.records.length;
    }

    clearAll() {
        this.records = [];
        this.currentRecord = [];
    }
}
