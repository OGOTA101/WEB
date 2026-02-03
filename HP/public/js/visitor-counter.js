// Firebase SDKの読み込み (v9 Modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    onValue, 
    push, 
    onDisconnect, 
    set, 
    serverTimestamp,
    runTransaction,
    child,
    get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ==========================================
// Firebase設定の自動取得
// Firebase Hosting環境では /__/firebase/init.json から設定を取得可能
// ==========================================
async function getFirebaseConfig() {
    try {
        const response = await fetch('/__/firebase/init.json');
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn("Firebase init.json not found, falling back to manual config or dummy mode.");
    }
    
    // フォールバック設定（ローカル開発時などでinit.jsonがない場合用）
    // 必要に応じてここに手動で設定を入れることも可能です
    return {
        // apiKey: "API_KEY",
        // ...
    };
}

(async function main() {
    const firebaseConfig = await getFirebaseConfig();

    // 設定が空（API Keyがない）場合は警告を出してダミーデータを表示
    if (!firebaseConfig || !firebaseConfig.apiKey) {
        console.warn("Visitor Counter: Firebase config is missing or could not be loaded.");
        // ダミー表示
        const els = ['stat-online', 'stat-today', 'stat-total'];
        els.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.textContent = "-";
        });
        return;
    }

    initVisitorCounter(firebaseConfig);
})();

function initVisitorCounter(config) {
    // Firebaseの初期化
    const app = initializeApp(config);
    const db = getDatabase(app);

    // DOM要素の取得
    const onlineEl = document.getElementById('stat-online');
    const todayEl = document.getElementById('stat-today');
    const totalEl = document.getElementById('stat-total');

    // 1. 現在の訪問人数 (Online Status)
    // .info/connected はクライアントがサーバーに接続されているかを示す特別なパス
    const connectedRef = ref(db, ".info/connected");
    const onlineRef = ref(db, "status/online");
    
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            // 接続されたら、onlineリストに自分を追加
            const myConRef = push(onlineRef);
            
            // 切断時（タブを閉じるなど）に自動的に削除されるように設定
            onDisconnect(myConRef).remove();
            
            // 自分の値をセット
            set(myConRef, {
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent
            });
        }
    });

    // オンライン人数の監視と表示更新
    onValue(onlineRef, (snap) => {
        const count = snap.size; // 子ノードの数をカウント
        onlineEl.textContent = count || 0;
    });

    // 2. 今日の訪問人数 & 3. 総合訪問人数
    // セッションストレージを使って、リロードでの過剰なカウントアップを防ぐ
    const sessionKey = 'sg_visited_session_' + new Date().toDateString();
    const hasVisitedThisSession = sessionStorage.getItem(sessionKey);

    const todayStr = getTodayString();
    const dailyRef = ref(db, `stats/daily/${todayStr}`);
    const totalRef = ref(db, `stats/total`);

    if (!hasVisitedThisSession) {
        // まだカウントしていない場合のみインクリメント
        
        // 総合カウントアップ
        runTransaction(totalRef, (currentValue) => {
            return (currentValue || 0) + 1;
        });

        // 今日のカウントアップ
        runTransaction(dailyRef, (currentValue) => {
            return (currentValue || 0) + 1;
        });

        // カウント済みフラグを立てる
        sessionStorage.setItem(sessionKey, 'true');
    }

    // 表示の更新（リアルタイム監視）
    onValue(dailyRef, (snap) => {
        todayEl.textContent = snap.val() || 0;
    });

    onValue(totalRef, (snap) => {
        totalEl.textContent = snap.val() || 0;
    });
}

// 日付文字列を取得 (YYYY-MM-DD)
function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

