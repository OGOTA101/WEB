/**
 * コインシステム管理クラス
 * 卵の出現、クリック処理、コイン獲得、ローカルストレージへの保存を管理
 */
class CoinSystem {
    constructor() {
        this.coins = {
            gold: 0,
            silver: 0,
            bronze: 0
        };
        this.loadCoins();
        this.updateDisplay();
        
        // ページ読み込み時に初期出現判定を行う
        // 注: インスタンス化のタイミングによってはDOMがまだ準備できていない可能性があるため
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startEggSpawning());
        } else {
            this.startEggSpawning();
        }

        this.audioContext = null;
        this.initAudio();
        
        // イベントリスナー設定
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    // AudioContextを初期化（ユーザーインタラクション後に再開する必要がある場合も）
    initAudio() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
            }
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    // 効果音を生成・再生
    playSound(type) {
        if (!this.audioContext) return;
        
        // ユーザーインタラクションがないとサスペンド状態の場合がある
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(e => console.log('Audio resume failed', e));
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const currentTime = this.audioContext.currentTime;

        if (type === 'crack') {
            // 卵が割れる音
            oscillator.frequency.setValueAtTime(800, currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2);
            oscillator.start(currentTime);
            oscillator.stop(currentTime + 0.2);
        } else if (type === 'knock') {
            // ノック音（震える音）
            oscillator.frequency.setValueAtTime(200, currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);
            oscillator.start(currentTime);
            oscillator.stop(currentTime + 0.1);
        } else if (type === 'coin') {
            // コイン獲得音
            oscillator.frequency.setValueAtTime(523, currentTime);
            oscillator.frequency.setValueAtTime(659, currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.2, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
            oscillator.start(currentTime);
            oscillator.stop(currentTime + 0.3);
        }
    }

    // コインデータをローカルストレージから読み込み
    loadCoins() {
        try {
            const saved = localStorage.getItem('sgGameCoins');
            if (saved) {
                this.coins = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load coins:', e);
        }
    }

    // コインデータをローカルストレージに保存
    saveCoins() {
        try {
            localStorage.setItem('sgGameCoins', JSON.stringify(this.coins));
        } catch (e) {
            console.error('Failed to save coins:', e);
        }
    }

    // コインを追加
    addCoin(type, amount) {
        if (this.coins.hasOwnProperty(type)) {
            this.coins[type] += amount;
            this.saveCoins();
            this.updateDisplay();
        }
    }

    // 表示を更新
    updateDisplay() {
        const goldEl = document.getElementById('gold-count');
        const silverEl = document.getElementById('silver-count');
        const bronzeEl = document.getElementById('bronze-count');

        if (goldEl) goldEl.textContent = this.coins.gold;
        if (silverEl) silverEl.textContent = this.coins.silver;
        if (bronzeEl) bronzeEl.textContent = this.coins.bronze;
    }

    // 卵の出現を開始（ページ読み込み時に1回だけ判定）
    startEggSpawning() {
        // ページ読み込み時に即座に出現判定
        if (Math.random() < 0.4) { // 40%の確率で卵出現
            this.createEgg();
        }
    }

    // 卵を作成
    createEgg() {
        // すでに卵がある場合は作成しない（画面が卵だらけになるのを防ぐ）
        if (document.querySelector('.egg')) return;

        const egg = document.createElement('div');

        // 卵の種類を決定（50%ずつ）
        const eggType = Math.random() < 0.5 ? 'bronze' : 'silver';
        egg.className = 'egg';
        egg.dataset.type = eggType;

        // 卵の画像を追加
        const eggImg = document.createElement('img');
        eggImg.src = `shared/images/eggs/${eggType}-egg.svg`;
        eggImg.alt = `${eggType} egg`;
        
        // 画像読み込みエラー時のフォールバック（シンプルな円を表示）
        eggImg.onerror = () => {
            egg.style.backgroundColor = eggType === 'silver' ? '#c0c0c0' : '#cd7f32';
            egg.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
            eggImg.style.display = 'none';
        };

        // 上下に割れるための構造を作成（最初は非表示）
        const topHalf = document.createElement('div');
        const bottomHalf = document.createElement('div');
        topHalf.className = 'egg-half-top';
        bottomHalf.className = 'egg-half-bottom';
        topHalf.style.display = 'none';
        bottomHalf.style.display = 'none';

        const topImg = document.createElement('img');
        topImg.src = `shared/images/eggs/${eggType}-shell-top.svg`;
        topImg.alt = `${eggType} shell top`;
        topHalf.appendChild(topImg);

        const bottomImg = document.createElement('img');
        bottomImg.src = `shared/images/eggs/${eggType}-shell-bottom.svg`;
        bottomImg.alt = `${eggType} shell bottom`;
        bottomHalf.appendChild(bottomImg);

        egg.appendChild(eggImg);
        egg.appendChild(topHalf);
        egg.appendChild(bottomHalf);

        // コンテンツにかぶらない位置に配置（枠外の空いている場所）
        const pos = this.findSafePosition();
        
        // スクロール位置を考慮して絶対座標で配置
        egg.style.left = pos.x + 'px';
        egg.style.top = (pos.y + window.pageYOffset) + 'px';

        // クリックイベント
        egg.addEventListener('click', (e) => {
            e.stopPropagation(); // イベントバブリング防止
            if (window.audioSystem) window.audioSystem.play('notification');
            this.crackEgg(egg, pos.x, pos.y);
        });

        document.body.appendChild(egg);
    }
    
    // 安全な配置場所を探す
    findSafePosition() {
        const container = document.querySelector('.container');
        const containerRect = container ? container.getBoundingClientRect() : { left: 0, right: window.innerWidth, width: window.innerWidth };
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const positions = [];

        // 左側の余白（コンテナの左側）
        if (containerRect.left > 60) {
            positions.push({
                x: Math.random() * (containerRect.left - 60) + 10,
                y: Math.random() * (windowHeight - 100) + 50
            });
        }

        // 右側の余白（コンテナの右側）
        if (windowWidth - containerRect.right > 60) {
            positions.push({
                x: containerRect.right + 10 + Math.random() * (windowWidth - containerRect.right - 60),
                y: Math.random() * (windowHeight - 100) + 50
            });
        }

        // 下部の余白（フッター下）
        const footer = document.querySelector('.footer');
        const footerRect = footer ? footer.getBoundingClientRect() : null;
        if (footerRect && windowHeight - footerRect.bottom > 60) {
            positions.push({
                x: Math.random() * (containerRect.width - 60) + containerRect.left + 10,
                y: footerRect.bottom + 10 + Math.random() * (windowHeight - footerRect.bottom - 60)
            });
        }

        // サイドバーの下部空きスペース
        const sidebar = document.querySelector('.sidebar');
        const contentArea = document.querySelector('.content-area');
        if (sidebar && contentArea) {
            const sidebarRect = sidebar.getBoundingClientRect();
            // contentAreaがない場合はコンテナ下部を使用
            const containerBottom = containerRect.bottom;
            const sidebarBottom = sidebarRect.bottom;

            if (containerBottom - sidebarBottom > 80) {
                positions.push({
                    x: sidebarRect.left + 10 + Math.random() * (sidebarRect.width - 60),
                    y: sidebarBottom + 10 + Math.random() * (containerBottom - sidebarBottom - 80)
                });
            }
        }

        // 利用可能な位置がない場合は、右下角に配置
        if (positions.length === 0) {
            return {
                x: windowWidth - 60,
                y: windowHeight - 70
            };
        }

        // ランダムに位置を選択
        return positions[Math.floor(Math.random() * positions.length)];
    }

    // 卵を割る
    crackEgg(egg, x, y) {
        // クリック無効化
        egg.style.pointerEvents = 'none';

        // まず震えるアニメーション
        egg.classList.add('egg-shake');
        this.playSound('knock');

        // 震え終わってから割れる処理
        setTimeout(() => {
            egg.classList.remove('egg-shake');

            // 卵の画像を隠して殻を表示
            const eggImg = egg.querySelector('img');
            const topHalf = egg.querySelector('.egg-half-top');
            const bottomHalf = egg.querySelector('.egg-half-bottom');

            // 割れるアニメーション
            egg.classList.add('egg-crack');
            this.playSound('crack');

            // 少し遅れて卵を隠し、殻を表示
            setTimeout(() => {
                if (eggImg) eggImg.style.display = 'none';
                if (topHalf) topHalf.style.display = 'block';
                if (bottomHalf) bottomHalf.style.display = 'block';
            }, 400);

            // 卵の種類に基づいてコイン獲得（必ずコインが出る）
            const eggType = egg.dataset.type;
            let coinType, amount, text, rewardColor;

            if (eggType === 'silver') {
                coinType = 'silver';
                amount = 1;
                text = '+1 🥈';
                rewardColor = '#c0c0c0';
            } else { // bronze
                coinType = 'bronze';
                amount = 5;
                text = '+5 🥉';
                rewardColor = '#cd7f32';
            }

            // コイン追加
            this.addCoin(coinType, amount);

            // 少し遅れてコイン獲得音を再生（割れた中から出てくる演出）
            setTimeout(() => {
                if (window.audioSystem) {
                    window.audioSystem.play('success');
                } else {
                    this.playSound('coin');
                }
            }, 600);

            // 報酬表示アニメーション（卵が割れた中から出てくる）
            setTimeout(() => {
                const reward = document.createElement('div');
                reward.className = 'coin-reward';
                reward.textContent = text;
                // スクロール位置を考慮した絶対座標で配置
                reward.style.left = (x + 20) + 'px'; // 卵の中央から
                reward.style.top = (y + 25 + window.pageYOffset) + 'px';
                reward.style.color = rewardColor;

                document.body.appendChild(reward);

                // 報酬アニメーション後にクリーンアップ
                setTimeout(() => {
                    if (reward.parentNode) {
                        reward.remove();
                    }
                }, 2000);
            }, 800); // 卵が割れて少し遅れて出現

            // 卵を完全に隠す
            setTimeout(() => {
                egg.classList.add('egg-destroyed');
            }, 1000);

            // 卵のクリーンアップ
            setTimeout(() => {
                if (egg.parentNode) {
                    egg.remove();
                }

                // 卵が割れた後、少し時間を置いて新しい卵の出現判定
                setTimeout(() => {
                    if (Math.random() < 0.2) { // 20%の確率で新しい卵出現
                        this.createEgg();
                    }
                }, Math.random() * 10000 + 5000); // 5-15秒後
            }, 2000);
        }, 500); // 0.5秒震える
    }
    
    // クリーンアップ
    cleanup() {
        const eggs = document.querySelectorAll('.egg');
        eggs.forEach(egg => egg.remove());
    }
}

// グローバルスコープに公開
window.CoinSystem = CoinSystem;
