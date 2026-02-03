/**
 * ranking.js
 * Firebase Firestore Ranking System
 */

const RankingManager = {
    db: null,

    init() {
        try {
            if (firebase.apps.length > 0) {
                this.db = firebase.firestore();
                console.log("RankingManager initialized.");
            } else {
                console.error("Firebase not found.");
            }
        } catch (e) {
            console.error("Firebase init error:", e);
        }
    },

    async submitScore(name, score) {
        if (!this.db) this.init();
        if (!this.db) return false;

        if (!name) name = "名無しさん";

        try {
            await this.db.collection("scores").add({
                name: name,
                score: parseInt(score),
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use Server Time
            });
            return true;
        } catch (e) {
            console.error("Error submitting score: ", e);
            alert("スコア送信に失敗しました。\n(Firestoreが無効、またはオフラインの可能性があります)");
            return false;
        }
    },

    async getRanking(limit = 20) {
        if (!this.db) this.init();
        if (!this.db) return [];

        try {
            const q = this.db.collection("scores")
                .orderBy("score", "desc")
                .limit(limit);

            const querySnapshot = await q.get();
            const list = [];
            let rank = 1;
            querySnapshot.forEach((doc) => {
                const d = doc.data();
                d.rank = rank++;
                list.push(d);
            });
            return list;
        } catch (e) {
            console.error("Error getting ranking: ", e);
            return null;
        }
    }
};
