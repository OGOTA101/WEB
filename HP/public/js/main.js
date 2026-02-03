// メインスクリプト

document.addEventListener('DOMContentLoaded', () => {
    console.log('SGGameSite Main Script Loaded 🎮');
    
    // コインシステムの初期化
    if (typeof CoinSystem !== 'undefined') {
        window.coinSystem = new CoinSystem();
    } else {
        console.warn('CoinSystem not loaded');
    }

    // モバイルメニューの制御
    setupMobileMenu();
    
    // サイドバーの制御（モバイル用）
    setupSidebar();
    
    // タブ切り替え（ハッシュ対応）
    handleHashNavigation();
});

// モバイルメニューのセットアップ
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navTabs = document.querySelector('.nav-tabs');

    if (menuToggle && navTabs) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navTabs.classList.toggle('show');
            
            // アイコン切り替え
            if (navTabs.classList.contains('show')) {
                menuToggle.textContent = '✖';
            } else {
                menuToggle.textContent = '☰';
            }
        });

        // メニュー外クリックで閉じる
        document.addEventListener('click', (e) => {
            if (navTabs.classList.contains('show') && !navTabs.contains(e.target) && e.target !== menuToggle) {
                navTabs.classList.remove('show');
                menuToggle.textContent = '☰';
            }
        });
    }
}

// サイドバーのセットアップ（モバイルでの開閉）
function setupSidebar() {
    const sidebarHeaders = document.querySelectorAll('.sidebar h3');
    
    sidebarHeaders.forEach(header => {
        header.addEventListener('click', () => {
            // モバイル表示時のみ動作
            if (window.innerWidth <= 768) {
                const list = header.nextElementSibling;
                if (list && list.tagName === 'UL') {
                    list.classList.toggle('show');
                    header.classList.toggle('active');
                }
            }
        });
    });
}

// タブ表示切り替え関数（グローバル）
window.showTab = function(tabName) {
    // すべてのタブとコンテンツを非アクティブにする
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));

    // 選択されたタブをアクティブにする
    const activeTab = document.querySelector(`.nav-tab[onclick="showTab('${tabName}')"]`);
    const activeContent = document.getElementById(tabName);

    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
    
    // モバイルメニューを閉じる
    const navTabs = document.querySelector('.nav-tabs');
    const menuToggle = document.getElementById('menuToggle');
    if (navTabs && navTabs.classList.contains('show')) {
        navTabs.classList.remove('show');
        if (menuToggle) menuToggle.textContent = '☰';
    }

    // 既存の卵を削除（タブ切り替え時のリセット）
    const existingEggs = document.querySelectorAll('.egg');
    existingEggs.forEach(egg => egg.remove());

    // 新しい卵の出現判定
    if (window.coinSystem && Math.random() < 0.3) {
        setTimeout(() => {
            window.coinSystem.createEgg();
        }, 500);
    }
    
    // ページトップへスクロール（モバイルの場合）
    if (window.innerWidth <= 768) {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
};

// URLハッシュに基づいたナビゲーション
function handleHashNavigation() {
    const hash = window.location.hash.substring(1); // #を除去
    if (hash) {
        // ハッシュがタブIDと一致するか確認
        const targetTab = document.getElementById(hash);
        if (targetTab && targetTab.classList.contains('tab-content')) {
            showTab(hash);
        } else {
            // ゲームカテゴリへのリンクなどの場合、親タブを開く
            // 例: #puzzle -> gamesタブを開く
            const gamesTab = document.getElementById('games');
            if (gamesTab && gamesTab.querySelector(`a[name="${hash}"]`) || document.getElementById(hash)) {
                showTab('games');
                // 少し遅れてスクロール
                setTimeout(() => {
                    const target = document.getElementById(hash) || document.querySelector(`a[name="${hash}"]`);
                    if (target) target.scrollIntoView({behavior: 'smooth'});
                }, 100);
            }
        }
    }
}

// レトロな効果音（プレースホルダー）
window.playRetroSound = function() {
    // 将来的に実装
};
