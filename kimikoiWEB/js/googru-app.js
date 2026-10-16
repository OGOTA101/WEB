/* ============================================
   GOOGRU APP - Browser application
   ============================================ */

const GoogruApp = {
    winId: null,
    history: [],
    historyIndex: -1,
    currentPage: 'home',
    
    // ★ ゲーム内容に即したダミーページ
    pages: {
        'こもれびの森': {
            title: 'こもれびの森 - 地域ポータルサイト',
            url: 'www.komorebi-forest.jp',
            content: `
                <h1>🌲 こもれびの森 観光ガイド</h1>
                <p>こもれびの森は、古くから神聖な場所として知られる自然豊かな地域です。</p>
                <h2>🏛 半月参り（はんつきまいり）</h2>
                <p>この地域に伝わる古い伝説。三方3カ所の神社を15日間かけて参拝すると、3つの願いが叶うと言われています。</p>
                <p>参拝順序：</p>
                <p>1. 東の宮 - 朝日が差し込む神社（1日目～5日目）</p>
                <p>2. 北の宮 - 山頂に鎮座する神社（6日目～10日目）</p>
                <p>3. 西の宮 - 夕日が沈む神社（11日目～14日目）</p>
                <p>4. 最終日に東の宮へ戻り、最後のお参りをする</p>
                <h2>⚠️ 注意事項</h2>
                <p>半月参りは必ず2人以上で行うこと。1人で行った場合、呪いを受けるという言い伝えがあります。</p>
            `,
        },
        '半月参り': {
            title: '半月参り - オカルトwiki',
            url: 'occult-wiki.net/hantsuki',
            content: `
                <h1>🌙 半月参りの真実</h1>
                <p><b>警告：以下の情報にはネタバレが含まれます</b></p>
                <h2>概要</h2>
                <p>半月参りは表向きは願掛けの儀式だが、実際には「除霊」の儀式であるとする説がある。</p>
                <h2>噂の真相</h2>
                <p>この地域では昔から不可解な失踪事件が多発しており、半月参りはそれを防ぐために始まったとされる。</p>
                <p>しかし、失踪者の中には半月参りの最中に消えた者もいるという……。</p>
                <h2>関連ページ</h2>
                <p>→ こもれびの森の怪異録</p>
                <p>→ 除霊と神社の関係</p>
            `,
        },
        'キミコイ': {
            title: 'キミコイ ～恋するシミュレーション～ 攻略wiki',
            url: 'kimikoi-wiki.game',
            content: `
                <h1>💗 キミコイ ～恋するシミュレーション～ 攻略wiki</h1>
                <div style="background:#ffe0e0;padding:12px;border-radius:6px;margin:12px 0;">
                    <b>📢 最新情報</b>：Ver1.2アップデートで新キャラクター「水無月 三緒」ルート追加！
                </div>
                <h2>攻略キャラクター</h2>
                <p>👩 <b>恋糸 美結</b> - メインヒロイン。明るく元気な女の子。（好感度を80以上にするとルートエンド）</p>
                <p>👩‍🎓 <b>水無月 三緒</b> - クールで知的。（好感度を80以上で三緒ルート）</p>
                <h2>基本攻略テクニック</h2>
                <p>・選択肢は基本的に「優しい方」を選ぶと好感度UP</p>
                <p>・各ヒロインとのイベントは1日1回</p>
                <p>・チートツール（DAY4以降解禁）でパラメータ調整可能</p>
                <h2>エンディングリスト</h2>
                <p>全25種（トゥルーエンド×1、ルートエンド×6、死亡エンド×18）</p>
            `,
        },
        '恋糸美結': {
            title: '恋糸美結 攻略チャート - キミコイwiki',
            url: 'kimikoi-wiki.game/miyu',
            content: `
                <h1>💖 恋糸 美結（こいと みゆ）攻略チャート</h1>
                <div style="display:flex;gap:16px;align-items:start;margin:16px 0;">
                    <img src="assets/images/characters/miyu.png" style="width:120px;height:120px;border-radius:12px;object-fit:cover;">
                    <div>
                        <p><b>年齢:</b> 17歳（高校2年生）</p>
                        <p><b>身長:</b> 158cm</p>
                        <p><b>誕生日:</b> 3月14日</p>
                        <p><b>好きなもの:</b> お菓子作り、星を見ること</p>
                        <p><b>CV:</b> ???</p>
                    </div>
                </div>
                <h2>好感度UP選択肢</h2>
                <p>DAY1: 「実は……」を選択 → +10</p>
                <p>DAY3: 「一緒に帰ろう」を選択 → +15</p>
                <p>DAY7: 「好きかもしれない」を選択 → +20</p>
                <h2>攻略のコツ</h2>
                <p>美結は素直なタイプなので、正直に気持ちを伝える選択肢がベスト。</p>
                <p>DAY10以降のイベントで好感度が80を超えていると告白イベントが発生。</p>
            `,
        },
        '水無月三緒': {
            title: '水無月三緒 攻略チャート - キミコイwiki',
            url: 'kimikoi-wiki.game/mio',
            content: `
                <h1>📚 水無月 三緒（みなづき みお）攻略チャート</h1>
                <div style="display:flex;gap:16px;align-items:start;margin:16px 0;">
                    <img src="assets/images/characters/mio.png" style="width:120px;height:120px;border-radius:12px;object-fit:cover;">
                    <div>
                        <p><b>年齢:</b> 17歳（高校2年生）</p>
                        <p><b>身長:</b> 163cm</p>
                        <p><b>誕生日:</b> 11月3日</p>
                        <p><b>好きなもの:</b> 読書、紅茶</p>
                        <p><b>CV:</b> ???</p>
                    </div>
                </div>
                <h2>攻略条件</h2>
                <p>三緒ルートはDAY5以降に解禁されます。</p>
                <p>図書室で話しかけるイベントを発生させることが必須。</p>
                <h2>注意点</h2>
                <p>三緒ルートに入ると美結ルートとは排他になります。</p>
            `,
        },
        'インディーゲーム おすすめ': {
            title: 'インディーゲーム おすすめランキング2024',
            url: 'game-review.jp/indie-ranking',
            content: `
                <h1>🎮 インディーゲーム おすすめランキング 2024</h1>
                <h2>第1位 💗 キミコイ ～恋するシミュレーション～</h2>
                <div style="background:#f0f8ff;padding:12px;border-radius:8px;margin:8px 0;">
                    <p>★★★★★ (4.8/5.0) - レビュー数: 2,431件</p>
                    <p>「神社巡り×恋愛」という斬新な設定が話題のビジュアルノベル。</p>
                    <p>ヒロインの恋糸美結ちゃんがとにかくかわいい。15日間という限られた時間で恋を実らせるストーリーが切なくて良い。</p>
                    <p style="color:#c00;"><b>※ ホラー要素あり。苦手な方は注意！</b></p>
                </div>
                <h2>第2位 🗡️ ダンジョンクロニクル</h2>
                <div style="background:#f0f8ff;padding:12px;border-radius:8px;margin:8px 0;">
                    <p>★★★★☆ (4.5/5.0)</p>
                    <p>ローグライクRPG。毎回変わるダンジョンが飽きない。</p>
                </div>
                <h2>第3位 🚀 スターフォージ</h2>
                <div style="background:#f0f8ff;padding:12px;border-radius:8px;margin:8px 0;">
                    <p>★★★★☆ (4.3/5.0)</p>
                    <p>宇宙開拓シミュレーション。惑星を開発して銀河帝国を築け。</p>
                </div>
            `,
        },
        'こもれびの森 怪異': {
            title: 'こもれびの森の怪異録 | 怖い話まとめ',
            url: 'kowai-hanashi.net/komorebi',
            content: `
                <h1>👻 こもれびの森の怪異録</h1>
                <p style="color:red;font-weight:bold;">⚠ 閲覧注意：怖い内容を含みます</p>
                <h2>事例1：消えた女子高生（2019年）</h2>
                <p>半月参りの最中に行方不明になった女子高生。彼女のスマートフォンには、最後に撮影された不気味な写真が残っていた……。</p>
                <h2>事例2：深夜の笑い声</h2>
                <p>こもれびの森に住む住民が報告する「深夜の笑い声」。女の子の笑い声が森から聞こえるという。</p>
                <h2>事例3：繰り返す15日間</h2>
                <p>半月参りを完遂した人の中に、「同じ15日間を何度も繰り返している感覚」を訴える者がいるという……。</p>
                <p style="color:#888;font-size:12px;">（※この記事はフィクションです）</p>
            `,
        },
        '転校 友達 作り方': {
            title: '転校生のための友達の作り方5つのコツ',
            url: 'life-tips.jp/tenkousei-tomodachi',
            content: `
                <h1>🏫 転校生のための友達の作り方5つのコツ</h1>
                <h2>1. 最初の1週間が勝負</h2>
                <p>転校初日から積極的に声をかけましょう。「こんにちは、転校してきた○○です」と自分から名前を伝えるのが大事。</p>
                <h2>2. 共通の趣味を見つける</h2>
                <p>ゲーム、アニメ、スポーツなど、同じ趣味の人を見つけると自然と仲良くなれます。</p>
                <h2>3. LIMEで繋がる</h2>
                <p>LIMEのIDを交換すると、放課後もやり取りできて距離が縮まります。</p>
                <h2>4. 地域の行事に参加する</h2>
                <p>お祭りや地域のイベントに参加すると、クラスメイト以外の友達もできます。</p>
                <h2>5. 焦らないこと</h2>
                <p>友達は無理に作るものではありません。自然な出会いを大切にしましょう。</p>
            `,
        },
        '告白 タイミング': {
            title: '告白のベストタイミングとは？恋愛心理学',
            url: 'love-psychology.jp/kokuhaku-timing',
            content: `
                <h1>💌 告白のベストタイミングとは？</h1>
                <h2>心理学が教える「いつ言うべきか」</h2>
                <p>恋愛心理学では、告白のタイミングは以下の条件が揃った時がベストとされています。</p>
                <ul style="padding-left:24px;line-height:2;">
                    <li>相手と2人きりの空間がある</li>
                    <li>楽しい思い出を共有した直後</li>
                    <li>夕方～夜の時間帯（心理的ガードが下がる）</li>
                    <li>「期限」がある状況（卒業、転校など）</li>
                </ul>
                <h2>転校前の告白は成功しやすい？</h2>
                <p>実は「もう会えなくなる」という状況は、告白の成功率を高めるという研究結果があります。</p>
                <p>「吊り橋効果」に似たメカニズムで、別れの寂しさが恋愛感情と混同されやすいためです。</p>
                <p style="color:#888;font-size:12px;">出典：恋愛心理学研究所 2023年論文より</p>
            `,
        },
        '神社 お参り 作法': {
            title: '神社のお参り作法ガイド',
            url: 'jinja-guide.jp/manner',
            content: `
                <h1>⛩ 神社のお参り 正しい作法</h1>
                <h2>基本の参拝手順</h2>
                <ol style="padding-left:24px;line-height:2.2;">
                    <li>鳥居をくぐる前に一礼</li>
                    <li>参道は端を歩く（中央は神様の通り道）</li>
                    <li>手水舎で手と口を清める</li>
                    <li>賽銭を納める</li>
                    <li>鈴を鳴らす</li>
                    <li><b>二礼二拍手一礼</b>で参拝</li>
                </ol>
                <h2>お願い事のコツ</h2>
                <p>お願い事をする時は、まず自分の名前と住所を心の中で述べてから、感謝の気持ちとお願いを伝えましょう。</p>
                <h2>半月参りの特別作法</h2>
                <p>こもれびの森周辺では、通常の「二礼二拍手一礼」の代わりに「三礼三拍手一礼」で参拝するという独自の作法があります。</p>
            `,
        },
    },

    launch() {
        const win = WindowManager.create({
            title: 'Googru',
            icon: '🌐',
            width: 700,
            height: 500,
            appId: 'googru',
            content: this.buildContent(),
            onClose: () => { this.winId = null; },
        });
        this.winId = win.id;
        this.showHome();
    },

    buildContent() {
        return `
            <div class="googru-container">
                <div class="googru-toolbar">
                    <button class="googru-nav-btn" onclick="GoogruApp.goBack()">◀</button>
                    <button class="googru-nav-btn" onclick="GoogruApp.goForward()">▶</button>
                    <button class="googru-nav-btn" onclick="GoogruApp.showHome()">🏠</button>
                    <input class="googru-url-bar" id="googru-url" placeholder="検索またはURLを入力..." 
                           onkeydown="if(event.key==='Enter')GoogruApp.search(this.value)">
                    <button class="googru-nav-btn" onclick="GoogruApp.search(document.getElementById('googru-url').value)">🔍</button>
                    <button class="googru-nav-btn" onclick="GoogruApp.showMail()">📧</button>
                </div>
                <div class="googru-content" id="googru-content"></div>
            </div>
        `;
    },

    showHome() {
        const content = document.getElementById('googru-content');
        if (!content) return;
        this.currentPage = 'home';
        
        const urlBar = document.getElementById('googru-url');
        if (urlBar) urlBar.value = '';
        
        content.innerHTML = `
            <div class="googru-home">
                <div class="googru-logo">
                    <span class="g1">G</span><span class="g2">o</span><span class="g3">o</span><span class="g4">g</span><span class="g5">r</span><span class="g6">u</span>
                </div>
                <div class="googru-search-box">
                    <input class="googru-search-input" id="googru-search" placeholder="Googru 検索" 
                           onkeydown="if(event.key==='Enter')GoogruApp.search(this.value)">
                    <button class="googru-search-btn" onclick="GoogruApp.search(document.getElementById('googru-search').value)">🔍</button>
                </div>
                <div class="googru-trending">
                    <p style="font-size:13px;color:#888;margin-top:24px;">🔥 トレンド</p>
                    <div class="googru-trend-tags">
                        <span class="trend-tag" onclick="GoogruApp.search('キミコイ')">💗 キミコイ</span>
                        <span class="trend-tag" onclick="GoogruApp.search('半月参り')">🌙 半月参り</span>
                        <span class="trend-tag" onclick="GoogruApp.search('こもれびの森')">🌲 こもれびの森</span>
                        <span class="trend-tag" onclick="GoogruApp.search('恋糸美結')">💖 恋糸美結</span>
                        <span class="trend-tag" onclick="GoogruApp.search('インディーゲーム おすすめ')">🎮 インディーゲーム</span>
                    </div>
                </div>
            </div>
        `;
    },

    search(query) {
        if (!query.trim()) return;
        
        const content = document.getElementById('googru-content');
        if (!content) return;
        
        const urlBar = document.getElementById('googru-url');
        if (urlBar) urlBar.value = `googru.com/search?q=${encodeURIComponent(query)}`;
        
        this.history.push({ type: 'search', query });
        this.historyIndex = this.history.length - 1;
        
        // Find matching pages (fuzzy match)
        const results = [];
        const q = query.toLowerCase();
        Object.entries(this.pages).forEach(([key, page]) => {
            if (key.toLowerCase().includes(q) || 
                page.title.toLowerCase().includes(q) || 
                page.content.toLowerCase().includes(q)) {
                results.push({ key, ...page });
            }
        });
        
        // Always add Wikipedia-style result
        results.push({
            key: '_wiki_' + query,
            title: `${query} - Wikipedia`,
            url: 'ja.wikipedia.org',
            content: `<h1>${query}</h1><p>このページは現在作成中です。</p>`,
        });
        
        content.innerHTML = `
            <div class="googru-results">
                <p style="color:#545454;font-size:12px;">「${query}」の検索結果 - 約 ${results.length * randomInt(10, 100)} 件 (${(Math.random() * 0.5 + 0.1).toFixed(2)} 秒)</p>
                ${results.map(r => `
                    <div class="googru-result-item" onclick="GoogruApp.openPage('${r.key.replace(/'/g, "\\'")}')">
                        <div class="googru-result-url">${r.url}</div>
                        <div class="googru-result-title">${r.title}</div>
                        <div class="googru-result-desc">${(r.content || '').replace(/<[^>]*>/g, '').substring(0, 120)}...</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    openPage(key) {
        const page = this.pages[key];
        const content = document.getElementById('googru-content');
        if (!content) return;
        
        this.history.push({ type: 'page', key });
        this.historyIndex = this.history.length - 1;
        
        if (page) {
            const urlBar = document.getElementById('googru-url');
            if (urlBar) urlBar.value = page.url;
            content.innerHTML = `<div class="googru-page">${page.content}</div>`;
        } else {
            content.innerHTML = `<div class="googru-page"><h1>404 Not Found</h1><p>ページが見つかりませんでした。</p></div>`;
        }
    },

    showMail() {
        const content = document.getElementById('googru-content');
        if (!content) return;
        
        const urlBar = document.getElementById('googru-url');
        if (urlBar) urlBar.value = 'mail.googru.com';
        
        content.innerHTML = `
            <div class="googru-mail">
                <h2 style="color:#333;margin-bottom:16px;">📧 Googru メール</h2>
                <div class="googru-mail-compose">
                    <h3 style="font-size:14px;margin-bottom:12px;">新規メール作成</h3>
                    <div class="googru-mail-field">
                        <label>宛先:</label>
                        <select id="mail-to">
                            <option value="admin">サイト管理人</option>
                            <option value="teacher">担任の先生</option>
                        </select>
                    </div>
                    <div class="googru-mail-field">
                        <label>件名:</label>
                        <input type="text" id="mail-subject" placeholder="件名を入力...">
                    </div>
                    <textarea class="googru-mail-body" id="mail-body" placeholder="本文を入力..."></textarea>
                    <button class="googru-send-btn" onclick="GoogruApp.sendMail()">送信</button>
                </div>
            </div>
        `;
    },

    sendMail() {
        const to = document.getElementById('mail-to');
        const subject = document.getElementById('mail-subject');
        const body = document.getElementById('mail-body');
        
        if (!subject.value || !body.value) {
            showDialog('エラー', '件名と本文を入力してください。');
            return;
        }
        
        showToast('📧 メール送信完了', `${to.options[to.selectedIndex].text}にメールを送信しました`);
        
        setTimeout(() => {
            Taskbar.addNotification('Googru メール', '新着メールが届きました', '📧');
        }, 5000);
    },

    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const entry = this.history[this.historyIndex];
            if (entry.type === 'search') this.search(entry.query);
            else if (entry.type === 'page') this.openPage(entry.key);
        } else {
            this.showHome();
        }
    },

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const entry = this.history[this.historyIndex];
            if (entry.type === 'search') this.search(entry.query);
            else if (entry.type === 'page') this.openPage(entry.key);
        }
    },
};
