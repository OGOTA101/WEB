/**
 * ピクセル人生ゲーム - マスターデータ定義
 * 市販の家庭用ボード版「人生ゲーム」のゲーム構造・イベント密度を参考に、
 * 職業(24種・昇進あり)、マイホーム(10種)、お宝(20種)、保険(3種)、株券、約束手形、
 * そして全110マス規模＋4大分岐ルートの盤面データを定義します。
 */

const PLAYER_COLORS = [
  { id: 'red', name: 'レッド', hex: '#ef4444', dark: '#991b1b', light: '#fecaca' },
  { id: 'blue', name: 'ブルー', hex: '#3b82f6', dark: '#1e40af', light: '#bfdbfe' },
  { id: 'green', name: 'グリーン', hex: '#22c55e', dark: '#166534', light: '#bbf7d0' },
  { id: 'yellow', name: 'イエロー', hex: '#eab308', dark: '#854d0e', light: '#fef08a' },
  { id: 'purple', name: 'パープル', hex: '#a855f7', dark: '#581c87', light: '#e9d5ff' },
  { id: 'orange', name: 'オレンジ', hex: '#f97316', dark: '#9a3412', light: '#fed7aa' }
];

const CPU_PROFILES = [
  { name: 'タロウ(CPU)', avatar: 0, style: 'balanced', desc: 'バランス重視の堅実派' },
  { name: 'ハナコ(CPU)', avatar: 1, style: 'family', desc: 'マイホームと家族愛重視' },
  { name: 'ハカセ(CPU)', avatar: 2, style: 'career', desc: '進学・専門職キャリア志向' },
  { name: 'ケンジ(CPU)', avatar: 3, style: 'gambler', desc: 'ダイス＆勝負イベント好き' },
  { name: 'レイカ(CPU)', avatar: 4, style: 'rich', desc: '高級住宅・お宝コレクター' },
  { name: 'ボス(CPU)', avatar: 5, style: 'investor', desc: '株とビジネスで荒稼ぎ' }
];

// 全24種類の職業カード（一般職14種 + 専門職10種、表裏ランクアップ対応）
const JOBS_DATA = [
  // --- 一般職（ビジネスコース・通常就職で取得可能） ---
  {
    id: 'freeter',
    name: 'フリーター',
    rankUpName: 'カリスマ副業王',
    category: 'free',
    salary: 12000,
    rankUpSalary: 28000,
    icon: 'job',
    desc: '自由気ままな働き方。就職マスや転職マスで正社員・専門職へステップアップできる。'
  },
  {
    id: 'office',
    name: '商社マン',
    rankUpName: 'エリート執行役員',
    category: 'business',
    salary: 24000,
    rankUpSalary: 48000,
    icon: 'job',
    desc: '世界を股にかけるビジネスパーソン。安定した給与と昇進後の爆発力が魅力。'
  },
  {
    id: 'chef',
    name: '料理人',
    rankUpName: '三ツ星オーナーシェフ',
    category: 'business',
    salary: 22000,
    rankUpSalary: 46000,
    icon: 'cash_plus',
    desc: 'グルメイベントで他プレイヤーから食事代を受け取れる美味しい職業。'
  },
  {
    id: 'athlete',
    name: 'プロアスリート',
    rankUpName: '世界的メダリスト',
    category: 'business',
    salary: 28000,
    rankUpSalary: 60000,
    icon: 'trophy',
    desc: 'スポーツ観戦イベントで入場料収入が入る花形職業。'
  },
  {
    id: 'idol',
    name: 'アイドル',
    rankUpName: '国民的トップスター',
    category: 'business',
    salary: 20000,
    rankUpSalary: 65000,
    icon: 'wedding',
    desc: '最初は控えめだが、ランクアップで大化け！ライブイベントでグッズ収入も。'
  },
  {
    id: 'mangaka',
    name: '漫画家',
    rankUpName: '世界的メガヒット作家',
    category: 'business',
    salary: 21000,
    rankUpSalary: 58000,
    icon: 'treasure',
    desc: '印税イベントでボーナスが入る夢のあるクリエイター職。'
  },
  {
    id: 'gamedev',
    name: 'ゲームクリエイター',
    rankUpName: '伝説の名ディレクター',
    category: 'business',
    salary: 25000,
    rankUpSalary: 52000,
    icon: 'dice',
    desc: 'ドット絵の超大作を開発！ダイスイベントでも有利になる。'
  },
  {
    id: 'firefighter',
    name: '消防士',
    rankUpName: 'レスキュー司令長',
    category: 'business',
    salary: 26000,
    rankUpSalary: 45000,
    icon: 'accident',
    desc: '災害・トラブルに強く、地域からの信頼が厚い安定職。'
  },
  {
    id: 'carpenter',
    name: '大工職人',
    rankUpName: '総合建築マイスター',
    category: 'business',
    salary: 25000,
    rankUpSalary: 50000,
    icon: 'house',
    desc: 'マイホーム購入時に建築割引（$10,000引き）が受けられるお得な職業！'
  },
  {
    id: 'streamer',
    name: '人気配信者',
    rankUpName: '登録者1000万スター',
    category: 'business',
    salary: 18000,
    rankUpSalary: 62000,
    icon: 'roulette',
    desc: 'バズれば一気に億万長者！投げ銭イベントで臨時収入が多い。'
  },
  {
    id: 'police',
    name: '警察官',
    rankUpName: '警視総監',
    category: 'business',
    salary: 26000,
    rankUpSalary: 48000,
    icon: 'insurance',
    desc: '交通違反イベントで罰金を徴収できる頼もしい公務員。'
  },
  {
    id: 'farmer',
    name: 'ブランド農家',
    rankUpName: 'アグリビジネス王',
    category: 'business',
    salary: 23000,
    rankUpSalary: 47000,
    icon: 'cash_plus',
    desc: '豊作イベントで大きな収穫ボーナスを得られる。'
  },
  {
    id: 'designer',
    name: 'ファッションデザイナー',
    rankUpName: 'パリコレブランド総帥',
    category: 'business',
    salary: 24000,
    rankUpSalary: 51000,
    icon: 'treasure',
    desc: '流行イベントやブランド品購入マスで報酬を受け取れる。'
  },
  // --- 専門職（専門大学進学コースまたはエリートヘッドハンティングで取得可能） ---
  {
    id: 'doctor',
    name: '医師',
    rankUpName: '大学病院院長',
    category: 'specialist',
    salary: 38000,
    rankUpSalary: 72000,
    icon: 'hospital',
    desc: '最高クラスの高給専門職！他プレイヤーの病気・通院イベントで診察料を受け取れる。'
  },
  {
    id: 'lawyer',
    name: '弁護士',
    rankUpName: '国際スーパー弁護士',
    category: 'specialist',
    salary: 36000,
    rankUpSalary: 68000,
    icon: 'school',
    desc: '契約・トラブル解決イベントで弁護報酬を受け取れるエリート職。'
  },
  {
    id: 'pilot',
    name: 'パイロット',
    rankUpName: '国際線チーフ機長',
    category: 'specialist',
    salary: 37000,
    rankUpSalary: 70000,
    icon: 'travel',
    desc: '世界の空を飛ぶ高収入職。海外旅行イベントで航空代を受け取れる。'
  },
  {
    id: 'scientist',
    name: '科学者',
    rankUpName: 'ノーベル賞受賞博士',
    category: 'specialist',
    salary: 34000,
    rankUpSalary: 75000,
    icon: 'rankup',
    desc: '世紀の大発明で特許収入と超高額給料を手にする頭脳職。'
  },
  {
    id: 'architect',
    name: '一級建築士',
    rankUpName: '世界的巨匠建築家',
    category: 'specialist',
    salary: 35000,
    rankUpSalary: 66000,
    icon: 'house',
    desc: 'マイホーム購入が$15,000引きになり、他人の住宅購入時に設計料$10,000を受け取る！'
  },
  {
    id: 'astronaut',
    name: '宇宙飛行士',
    rankUpName: '月面基地コマンダー',
    category: 'specialist',
    salary: 39000,
    rankUpSalary: 78000,
    icon: 'travel',
    desc: '全職業トップクラスの給与を誇る憧れのスペシャリスト！'
  },
  {
    id: 'ai_engineer',
    name: 'AIリードエンジニア',
    rankUpName: 'テックジャイアントCEO',
    category: 'specialist',
    salary: 36000,
    rankUpSalary: 76000,
    icon: 'stock',
    desc: 'IT・株式市場に強く、昇進するとシリコンバレー級の報酬を得る。'
  },
  {
    id: 'fund_manager',
    name: 'ファンドマネージャー',
    rankUpName: 'ウォール街の帝王',
    category: 'specialist',
    salary: 35000,
    rankUpSalary: 74000,
    icon: 'stock',
    desc: '株券購入が常に割引になり、配当イベントでボーナスが増える金融のプロ。'
  }
];

// マイホーム物件データ（全10種）
const HOUSES_DATA = [
  { id: 'cottage', name: '赤い屋根のコテージ', price: 30000, sellLow: 20000, sellHigh: 45000, style: 0, desc: '新婚生活にぴったりの温かい一戸建て。手頃な価格で借金せずに買える。' },
  { id: 'loghouse', name: '森のぬくもりログハウス', price: 45000, sellLow: 30000, sellHigh: 65000, style: 1, desc: '木の香りが心地よい本格ログハウス。アウトドア好きの家族に大人気。' },
  { id: 'modern', name: '太陽光スマートハウス', price: 60000, sellLow: 45000, sellHigh: 85000, style: 2, desc: '最新設備を備えたスタイリッシュな都市型住宅。資産価値が落ちにくい。' },
  { id: 'villa', name: 'エメラルド海辺のヴィラ', price: 80000, sellLow: 60000, sellHigh: 115000, style: 3, desc: 'オーシャンビューのリゾート邸宅。バカンス気分を毎日味わえる。' },
  { id: 'brick', name: '英国風赤レンガ洋館', price: 95000, sellLow: 70000, sellHigh: 135000, style: 4, desc: '暖炉と広い庭園を備えた重厚な洋館。高騰時の売却益も大きい。' },
  { id: 'mansion', name: 'ビバリーヒルズ白亜邸', price: 120000, sellLow: 85000, sellHigh: 170000, style: 5, desc: 'プール付きのセレブ豪邸。成功者のステータスシンボル。' },
  { id: 'tower', name: '超高層タワマン最上階', price: 150000, sellLow: 110000, sellHigh: 210000, style: 6, desc: '夜景を独占するペントハウス。不動産ブームで価値が跳ね上がる！' },
  { id: 'japanese', name: '日本庭園付き数寄屋大屋敷', price: 180000, sellLow: 130000, sellHigh: 250000, style: 7, desc: '錦鯉が泳ぐ池と茶室を備えた伝統の名建築。' },
  { id: 'palace', name: '黄金のヴェルサイユ宮殿', price: 240000, sellLow: 170000, sellHigh: 330000, style: 8, desc: '噴水庭園と黄金のホールを持つ超ド級の宮殿。' },
  { id: 'castle', name: '天空のファンタジーキャッスル', price: 300000, sellLow: 220000, sellHigh: 420000, style: 9, desc: '誰もが羨む伝説の城！最終資産計算で圧倒的な存在感を放つ。' }
];

// お宝カードデータ（全20種）
const TREASURES_DATA = [
  { id: 't01', name: '伝説のレトロゲーム基板', value: 20000, icon: 'dice', desc: '1980年代の幻のアーケード基板。コレクター垂涎の品！' },
  { id: 't02', name: '黄金のドット絵トロフィー', value: 25000, icon: 'trophy', desc: '大会優勝者に贈られた純金製の輝くトロフィー。' },
  { id: 't03', name: '100年熟成ヴィンテージワイン', value: 30000, icon: 'treasure', desc: '地下ワインセラーで眠っていた最高級ボトル。' },
  { id: 't04', name: 'ティラノサウルスの全身化石', value: 60000, icon: 'treasure', desc: '発掘調査で掘り当てた博物館級の超大型化石！' },
  { id: 't05', name: '巨匠のドット風景名画', value: 45000, icon: 'treasure', desc: 'オークションで高値がつく世界的な名画。' },
  { id: 't06', name: '深海のブルーダイヤモンド', value: 70000, icon: 'treasure', desc: '海底の沈没船から引き揚げられた神秘の宝石。' },
  { id: 't07', name: '月の石コレクション', value: 55000, icon: 'travel', desc: '宇宙探査で持ち帰られた本物のムーンロック。' },
  { id: 't08', name: '純金のルーレット盤', value: 50000, icon: 'roulette', desc: '大富豪が愛用した24金製の豪華ルーレット。' },
  { id: 't09', name: 'クラシック名車オープンカー', value: 40000, icon: 'start', desc: 'ピカピカにレストアされた1960年代のヴィンテージカー。' },
  { id: 't10', name: '古代王朝の黄金マスク', value: 65000, icon: 'rankup', desc: '砂漠の遺跡から発見されたロマンあふれる秘宝。' },
  { id: 't11', name: 'ストラディバリウス名器', value: 55000, icon: 'wedding', desc: '極上の音色を奏でる世界に数挺しかないヴァイオリン。' },
  { id: 't12', name: '幻の切手シート', value: 35000, icon: 'cash_plus', desc: '印刷ミスで現存数が極めて少ないプレミア切手。' },
  { id: 't13', name: '豪華クルーザーヨット', value: 75000, icon: 'travel', desc: '世界中の海を旅できるプライベートヨット。' },
  { id: 't14', name: '純プラチナの懐中時計', value: 30000, icon: 'insurance', desc: '職人が1年かけて組み上げた精密機械式時計。' },
  { id: 't15', name: '開運・金の招き猫', value: 25000, icon: 'payday', desc: '飾るだけで金運が上がると評判の縁起物。' },
  { id: 't16', name: '無人島リゾート所有権', value: 80000, icon: 'house', desc: '南国のプライベートアイランド丸ごと1島！' }
];

// 保険データ
const INSURANCES_DATA = {
  auto: { id: 'auto', name: '自動車保険', cost: 6000, icon: 'insurance', desc: '車の故障・事故・交通トラブルの出費を0にし、見舞金$8,000を受け取れる！' },
  fire: { id: 'fire', name: '火災・住宅保険', cost: 8000, icon: 'house', desc: '火事・台風・落雷・水漏れなどの住宅トラブル出費を完全補償！' },
  life: { id: 'life', name: '生命・医療保険', cost: 7000, icon: 'hospital', desc: '病気・ケガ・入院イベントの医療費を0にし、保険金$10,000を受け取れる！' }
};

/**
 * 家庭用ボード版フルサイズ盤面データ（全108マス＋4大分岐ルート）
 *
 * 分岐構造:
 * - マス2 (進路選択ストップ):
 *     [ビジネス就職コース] 3 -> 4 -> 5 -> 6 -> 7 -> 8 (就職) -> 15で合流
 *     [専門大学進学コース] 9 -> 10 -> 11 -> 12 -> 13 -> 14 (専門職就職) -> 15で合流
 * - マス26 (結婚ストップ): 全員合流して盛大な結婚式！
 * - マス38 (マイホーム購入ストップ)
 * - マス42 (中盤キャリア＆ライフ分岐ストップ):
 *     [ファミリー＆安定コース] 43 -> 44 -> 45 -> 46 -> 47 -> 48 -> 49 -> 57で合流
 *     [ベンチャー＆カジノコース] 50 -> 51 -> 52 -> 53 -> 54 -> 55 -> 56 -> 57で合流
 * - マス65 (世界バカンス vs エリート出世分岐ストップ):
 *     [世界一周トラベルコース] 66 -> 67 -> 68 -> 69 -> 70 -> 71 -> 78で合流
 *     [エリート本社出世コース] 72 -> 73 -> 74 -> 75 -> 76 -> 77 -> 78で合流
 * - マス92 (決算日ストップ): 子ども仕送り精算＆借金返済＆最終ルート選択！
 *     [堅実ウィニングロード] 93 -> 94 -> 95 -> 96 -> 97 -> 103で合流
 *     [一発逆転ギャンブル渓谷] 98 -> 99 -> 100 -> 101 -> 102 -> 103で合流
 * - マス107 (ゴール：億万長者の館！)
 */
const BOARD_SPACES = [
  // ================= 第1章：青春・進路選択ステージ (0〜16) =================
  {
    id: 0, chapter: 1, x: 0, y: 2, next: [1],
    type: 'start', title: '人生スタート', subText: '初期資金$10,000',
    icon: 'start', scene: 'normal',
    desc: '希望に満ちた人生の幕開け！初期資金$10,000とダイス切替チケット3枚を持って出発します。ゲーム開始時に自動車保険・生命保険に加入することもできます。'
  },
  {
    id: 1, chapter: 1, x: 1, y: 2, next: [2],
    type: 'cash', amount: 5000, title: 'お年玉＆入学祝', subText: '+$5,000',
    icon: 'cash_plus', scene: 'cash_plus',
    desc: '親戚からお祝い金をもらった！幸先の良いスタートで $5,000 を受け取る。'
  },
  {
    id: 2, chapter: 1, x: 2, y: 2, next: [3, 9],
    type: 'stop_branch', title: '進路選択!', subText: 'STOP! 分岐',
    icon: 'school', scene: 'job',
    branchChoices: [
      { nextId: 3, label: '💼 ビジネス就職コース', desc: 'すぐに社会に出て給料を稼ぐ堅実ルート（学費不要・早い給料日）' },
      { nextId: 9, label: '🎓 専門大学進学コース', desc: '学費を払って大学へ進み、医師・弁護士・パイロット等の高給専門職を目指すルート' }
    ],
    desc: '【全員ストップ！】最初の大きな人生の岐路です。すぐに働いてお金を貯める「ビジネス就職コース」か、学費を払って高給な専門職を目指す「専門大学進学コース」かを選択してください！'
  },

  // --- 分岐1A: ビジネス就職コース (3〜8) ---
  {
    id: 3, chapter: 1, x: 3, y: 1, next: [4],
    type: 'cash', amount: 8000, title: 'アルバイト大賞', subText: '+$8,000',
    icon: 'cash_plus', scene: 'cash_plus',
    desc: '接客コンテストで優勝！特別ボーナスとして $8,000 を受け取る。'
  },
  {
    id: 4, chapter: 1, x: 4, y: 1, next: [5],
    type: 'dice_event', mode: 'multiply', multiplier: 2000, title: '🎲新人研修ダイス', subText: '出目×$2,000獲得',
    icon: 'dice', scene: 'dice',
    desc: '【ダイスイベント】新人研修で才能が開花！サイコロ(1D6)を振り、出た目×$2,000 の報奨金を獲得します！'
  },
  {
    id: 5, chapter: 1, x: 5, y: 1, next: [6],
    type: 'cash', amount: -4000, title: 'スーツ新調', subText: '-$4,000',
    icon: 'cash_minus', scene: 'normal',
    desc: '面接に向けてビシッと高級オーダースーツを購入。$4,000 を支払う。'
  },
  {
    id: 6, chapter: 1, x: 6, y: 1, next: [7],
    type: 'cash', amount: 10000, title: '資格試験合格', subText: '+$10,000',
    icon: 'school', scene: 'job',
    desc: '猛勉強の末にビジネス資格に一発合格！合格祝い金 $10,000 を受け取る。'
  },
  {
    id: 7, chapter: 1, x: 7, y: 1, next: [8],
    type: 'insurance', insuranceType: 'auto', title: 'マイカー点検', subText: '自動車保険案内',
    icon: 'insurance', scene: 'normal',
    desc: '交通安全週間！未加入なら自動車保険($6,000)に加入できる。すでに加入済みなら安全運転ボーナス +$6,000！'
  },
  {
    id: 8, chapter: 1, x: 8, y: 1, next: [15],
    type: 'stop_job', pool: 'business', title: '就職決定!', subText: 'STOP! 一般職',
    icon: 'job', scene: 'job',
    desc: '【ストップ！】いよいよ社会人デビュー！ルーレットまたはカード抽選であなたの「職業（一般職）」が決定し、初任給ボーナス $10,000 も受け取ります！'
  },

  // --- 分岐1B: 専門大学進学コース (9〜14) ---
  {
    id: 9, chapter: 1, x: 3, y: 3, next: [10],
    type: 'cash', amount: -15000, title: '大学入学金', subText: '-$15,000',
    icon: 'school', scene: 'job',
    desc: '専門大学へ進学！入学金と授業料として $15,000 を支払う（足りない場合は約束手形で借入可能）。'
  },
  {
    id: 10, chapter: 1, x: 4, y: 3, next: [11],
    type: 'cash', amount: 12000, title: '特別奨学金!', subText: '+$12,000',
    icon: 'cash_plus', scene: 'cash_plus',
    desc: '成績優秀者に選ばれ、返済不要の特別奨学金 $12,000 を受け取る！'
  },
  {
    id: 11, chapter: 1, x: 5, y: 3, next: [12],
    type: 'dice_event', mode: 'highlow', title: '🎲学園祭ダイス', subText: '4以上で+$15,000',
    icon: 'dice', scene: 'dice',
    desc: '【ダイスイベント】学園祭で模擬店を出店！サイコロを振って4〜6が出れば大繁盛で +$15,000！1〜3でも売上 +$5,000！'
  },
  {
    id: 12, chapter: 1, x: 6, y: 3, next: [13],
    type: 'cash', amount: -8000, title: '海外短期留学', subText: '-$8,000 / チケット+1',
    giveDiceTicket: 1,
    icon: 'travel', scene: 'normal',
    desc: '語学と最先端技術を学びに短期留学！費用 $8,000 を支払うが、精密移動に使える「ダイス切替チケット」を1枚獲得！'
  },
  {
    id: 13, chapter: 1, x: 7, y: 3, next: [14],
    type: 'cash', amount: 15000, title: '卒業論文表彰', subText: '+$15,000',
    icon: 'trophy', scene: 'job',
    desc: '卒業論文が学会で絶賛された！研究奨励金として $15,000 を受け取る。'
  },
  {
    id: 14, chapter: 1, x: 8, y: 3, next: [15],
    type: 'stop_job', pool: 'specialist', title: '専門職就職!', subText: 'STOP! 専門職',
    icon: 'school', scene: 'job',
    desc: '【ストップ！】大学を首席で卒業！医師・弁護士・パイロット・科学者・建築家などの高給「専門職」から職業が決定します！'
  },

  // --- 合流＆第2章：新社会人・ロマンス＆結婚ステージ (15〜28) ---
  {
    id: 15, chapter: 2, x: 9, y: 2, next: [16],
    type: 'payday', title: '初給料日!', subText: '通過でも給料GET!',
    icon: 'payday', scene: 'payday',
    desc: '【給料日マス】待ちに待った最初の給料日！このマスを通過または止まると、現在の職業の給料を銀行から受け取ります！'
  },
  {
    id: 16, chapter: 2, x: 10, y: 2, next: [17],
    type: 'cash', amount: 10000, title: 'プロジェクト成功', subText: '+$10,000',
    icon: 'cash_plus', scene: 'job',
    desc: '初めての大型案件が大成功！社長賞として $10,000 を受け取る。'
  },
  {
    id: 17, chapter: 2, x: 11, y: 2, next: [18],
    type: 'trouble', troubleType: 'auto', amount: 12000, title: '車のエンジントラブル', subText: '-$12,000 (保険で免除)',
    icon: 'accident', scene: 'accident',
    desc: 'ドライブ中に愛車がオーバーヒート！修理代 $12,000 を支払う（自動車保険に入っていれば支払免除＋見舞金$8,000獲得！）。'
  },
  {
    id: 18, chapter: 2, x: 12, y: 2, next: [19],
    type: 'treasure', title: 'フリーマーケット掘出物', subText: 'お宝カード+1',
    icon: 'treasure', scene: 'treasure',
    desc: '休日のフリーマーケットで価値ある品を発見！「お宝カード」を1枚獲得します！'
  },
  {
    id: 19, chapter: 2, x: 12, y: 4, next: [20],
    type: 'cash', amount: -8000, payToJob: 'chef', title: '三ツ星ディナー', subText: '-$8,000 (料理人へ)',
    icon: 'cash_minus', scene: 'normal',
    desc: '話題のレストランで豪華ディナー。$8,000 を支払う（プレイヤーの中に「料理人」がいれば、その人に支払われる！自分が料理人なら+$12,000受取！）。'
  },
  {
    id: 20, chapter: 2, x: 11, y: 4, next: [21],
    type: 'dice_event', mode: 'versus_all', title: '🎲ボウリング大会', subText: '全員ダイス勝負!',
    icon: 'dice', scene: 'dice',
    desc: '【ダイス勝負】社会人ボウリング大会開催！サイコロ2個(2D6)を振り、合計が8以上なら優勝賞金 $20,000、7以下でも参加賞 $6,000 を獲得！'
  },
  {
    id: 21, chapter: 2, x: 10, y: 4, next: [22],
    type: 'rankup', title: '昇進チャンス!', subText: 'ランクアップ判定',
    icon: 'rankup', scene: 'rankup',
    desc: '日頃の努力が認められ昇進試験！職業が「ランクアップ（昇進）」して給料が大幅アップします！（すでに昇進済みなら特別賞与 +$20,000）'
  },
  {
    id: 22, chapter: 2, x: 9, y: 4, next: [23],
    type: 'cash', amount: 14000, title: '動画がバズった!', subText: '+$14,000',
    icon: 'cash_plus', scene: 'cash_plus',
    desc: '趣味で投稿したペット動画が世界中で大バズり！広告収益 $14,000 を受け取る。（人気配信者ならさらに+$10,000！）'
  },
  {
    id: 23, chapter: 2, x: 8, y: 4, next: [24],
    type: 'stock', title: '初めての株式投資', subText: '株券購入チャンス',
    icon: 'stock', scene: 'stock',
    desc: '証券口座を開設！1口 $10,000 で「株券」を最大2口まで購入できます（終盤の配当や精算で大化けするかも！）。'
  },
  {
    id: 24, chapter: 2, x: 7, y: 4, next: [25],
    type: 'cash', amount: -6000, title: 'デートで大奮発', subText: '-$6,000 / チケット+1',
    giveDiceTicket: 1,
    icon: 'wedding', scene: 'wedding',
    desc: '運命の相手と遊園地デート！$6,000 を使うが、愛が深まり「ダイス切替チケット」を1枚獲得！'
  },
  {
    id: 25, chapter: 2, x: 6, y: 4, next: [26],
    type: 'payday', title: 'ボーナス給料日!', subText: '通過でも給料GET!',
    icon: 'payday', scene: 'payday',
    desc: '【給料日マス】結婚資金に嬉しい給料日！通過または停止で、現在の給料を銀行から受け取ります！'
  },
  {
    id: 26, chapter: 2, x: 5, y: 4, next: [27],
    type: 'stop_marriage', title: 'ハッピー結婚!', subText: 'STOP! 結婚＆祝儀',
    icon: 'wedding', scene: 'wedding',
    desc: '【全員ストップ！結婚式】教会の鐘が鳴り響く！車に「配偶者ピン」が乗り、サイコロまたはルーレットの判定で他の全プレイヤーからご祝儀（$5,000〜$15,000ずつ）を受け取ります！'
  },
  {
    id: 27, chapter: 2, x: 4, y: 4, next: [28],
    type: 'cash', amount: 15000, title: 'ハネムーン懸賞当選', subText: '+$15,000',
    icon: 'travel', scene: 'cash_plus',
    desc: '新婚旅行先の福引きで特賞に当選！旅行券と賞金 $15,000 を受け取る。'
  },
  {
    id: 28, chapter: 2, x: 3, y: 4, next: [29],
    type: 'insurance', insuranceType: 'fire', title: '新生活の火災保険', subText: '火災保険案内',
    icon: 'insurance', scene: 'house',
    desc: 'マイホーム購入に備えて「火災・住宅保険($8,000)」に加入できる。すでに加入済みなら無事故還付金 +$8,000！'
  },

  // ================= 第3章：家族誕生・マイホーム＆分岐ステージ (29〜57) =================
  {
    id: 29, chapter: 3, x: 2, y: 4, next: [30],
    type: 'baby', count: 1, title: '赤ちゃん誕生!', subText: '子ども+1 & 祝儀',
    icon: 'baby', scene: 'baby',
    desc: '元気な赤ちゃんが誕生！車に「子どもピン」が1人増え、他プレイヤー全員から出産祝い $5,000 ずつ＆銀行から育児手当 $10,000 を受け取ります！（子どもは決算日で1人$30,000の仕送りをくれます！）'
  },
  {
    id: 30, chapter: 3, x: 1, y: 4, next: [31],
    type: 'cash', amount: -10000, payToJob: 'doctor', title: '人間ドック＆検診', subText: '-$10,000 (医師へ)',
    icon: 'hospital', scene: 'normal',
    desc: '家族の健康のために精密検診を受ける。$10,000 を支払う（プレイヤーに「医師」がいれば医師へ支払われる！自分が医師なら+$15,000受取！）。'
  },
  {
    id: 31, chapter: 3, x: 0, y: 4, next: [32],
    type: 'baby', count: 2, title: '双子の赤ちゃん誕生!', subText: '子ども+2 & 祝儀!',
    icon: 'baby', scene: 'baby',
    desc: 'なんと可愛い双子が誕生！車に「子どもピン」が一気に2人増え、全プレイヤーからお祝い $8,000 ずつ＆銀行から $15,000 を受け取ります！'
  },
  {
    id: 32, chapter: 3, x: 0, y: 6, next: [33],
    type: 'payday', title: '給料日!', subText: '通過でも給料GET!',
    icon: 'payday', scene: 'payday',
    desc: '【給料日マス】家族が増えて頼もしい給料日！通過または停止で現在の給料を受け取ります！'
  },
  {
    id: 33, chapter: 3, x: 1, y: 6, next: [34],
    type: 'treasure', title: '屋根裏から古文書発見', subText: 'お宝カード+1',
    icon: 'treasure', scene: 'treasure',
    desc: '実家の大掃除中に先祖代々の宝箱を発見！「お宝カード」を1枚獲得！'
  },
  {
    id: 34, chapter: 3, x: 2, y: 6, next: [35],
    type: 'dice_event', mode: 'jackpot', title: '🎲宝くじダイス抽選', subText: 'ゾロ目で+$50,000!',
    icon: 'dice', scene: 'dice',
    desc: '【ダイスイベント】年末ジャンボ宝くじ抽選！サイコロ2個(2D6)を振り、ゾロ目が出たら1等当選 +$50,000！合計7でも2等 +$30,000、それ以外でも当選金(出目合計×$2,000)を獲得！'
  },
  {
    id: 35, chapter: 3, x: 3, y: 6, next: [36],
    type: 'job_change', title: 'ヘッドハンティング', subText: '転職チャンス!',
    icon: 'job_change', scene: 'job_change',
    desc: '人材エージェントから声がかかった！現在の職業を続けるか、新しい職業（専門職含む）へ華麗に転職するかを選べます！'
  },
  {
    id: 36, chapter: 3, x: 4, y: 6, next: [37],
    type: 'baby', count: 1, title: '新しい家族が増えた!', subText: '子ども+1 & 祝儀',
    icon: 'baby', scene: 'baby',
    desc: 'さらに元気な子どもが誕生！車に「子どもピン」が1人増え、全プレイヤーからお祝い $5,000 ずつ＆銀行から $10,000 を受け取ります！'
  },
  {
    id: 37, chapter: 3, x: 5, y: 6, next: [38],
    type: 'cash', amount: 16000, title: '地域コンテスト優勝', subText: '+$16,000',
    icon: 'trophy', scene: 'cash_plus',
    desc: 'ガーデニング＆DIYコンテストで金賞受賞！賞金 $16,000 を受け取る。'
  },
  {
    id: 38, chapter: 3, x: 6, y: 6, next: [39],
    type: 'stop_house', title: 'マイホーム購入!', subText: 'STOP! 家を買う',
    icon: 'house', scene: 'house',
    desc: '【全員ストップ！マイホーム購入】夢のマイホームを購入する大イベント！手頃なコテージからタワマン、大屋敷、天空の城まで予算に合わせて選べます（大工・建築士は特別割引あり！）。'
  },
  {
    id: 39, chapter: 3, x: 7, y: 6, next: [40],
    type: 'cash', amount: -12000, payToJob: 'architect', title: '家具＆インテリア新調', subText: '-$12,000 (建築士へ)',
    icon: 'house', scene: 'house',
    desc: '新居に合わせて高級家具を揃える。$12,000 を支払う（プレイヤーに「一級建築士」または「大工職人」がいればその人に支払われる！）。'
  },
  {
    id: 40, chapter: 3, x: 8, y: 6, next: [41],
    type: 'trouble', troubleType: 'fire', amount: 20000, title: '落雷で屋根が破損!', subText: '-$20,000 (火災保険で0)',
    icon: 'accident', scene: 'accident',
    desc: '激しい雷雨で家の屋根が損傷！修理費 $20,000 を支払う（火災・住宅保険に入っていれば支払免除＋保険金$10,000獲得！）。'
  },
  {
    id: 41, chapter: 3, x: 9, y: 6, next: [42],
    type: 'payday', title: '給料日!', subText: '通過でも給料GET!',
    icon: 'payday', scene: 'payday',
    desc: '【給料日マス】ローン返済や貯蓄に嬉しい給料日！通過または停止で給料を受け取ります！'
  },
  {
    id: 42, chapter: 3, x: 10, y: 6, next: [43, 50],
    type: 'stop_branch', title: '中盤ルート選択!', subText: 'STOP! 分岐',
    icon: 'roulette', scene: 'normal',
    branchChoices: [
      { nextId: 43, label: '🏡 ファミリー＆堅実街道', desc: '出産・子どもイベント・安定した臨時収入が多い温かいルート' },
      { nextId: 50, label: '🎰 ベンチャー＆カジノ街道', desc: '昇進・株・ダイス勝負・一攫千金とスリルが待つハイリターンルート' }
    ],
    desc: '【全員ストップ！】人生中盤のルート選択です！家族を増やして堅実に資産を築く「ファミリー＆堅実街道」か、昇進・株・カジノで大きく狙う「ベンチャー＆カジノ街道」かを選んでください！'
  },

  // --- 分岐2A: ファミリー＆堅実街道 (43〜49) ---
  {
    id: 43, chapter: 3, x: 11, y: 5, next: [44],
    type: 'baby', count: 1, title: '子宝に恵まれる!', subText: '子ども+1 & 祝儀',
    icon: 'baby', scene: 'baby',
    desc: '賑やかな大家族に！子どもピンが1人増え、他プレイヤーからお祝い $5,000 ずつ＆銀行から $12,000 を受け取ります！'
  },
  {
    id: 44, chapter: 3, x: 12, y: 5, next: [45],
    type: 'cash', amount: 18000, title: '子どもがCM出演!', subText: '+$18,000',
    icon: 'trophy', scene: 'cash_plus',
    desc: 'キッズモデルとしてテレビCMに出演！出演料 $18,000 を受け取る（子ども1人につきさらに+$3,000ボーナス！）。'
  },
  {
    id: 45, chapter: 3, x: 12, y: 7, next: [46],
    type: 'treasure', title: '家族キャンプで秘宝発見', subText: 'お宝カード+1',
    icon: 'treasure', scene: 'treasure',
    desc: '週末のファミリーキャンプで川底から輝くお宝を発見！「お宝カード」を1枚獲得！'
  },
  {
    id: 46, chapter: 3, x: 11, y: 7, next: [47],
    type: 'cash', amount: -8000, title: 'ピアノ＆習い事代', subText: '-$8,000 / チケット+1',
    giveDiceTicket: 1,
    icon: 'school', scene: 'normal',
    desc: '子どもの教育に投資して $8,000 を支払う。計画性が身につき「ダイス切替チケット」を1枚獲得！'
  },
  {
    id: 47, chapter: 3, x: 10, y: 7, next: [48],
    type: 'dice_event', mode: 'multiply', multiplier: 4000, title: '🎲運動会リレーダイス', subText: '出目×$4,000獲得',
    icon: 'dice', scene: 'dice',
    desc: '【ダイスイベント】町内大運動会の親子リレーで大活躍！サイコロ(1D6)を振り、出目×$4,000 の賞金を獲得！'
  },
  {
    id: 48, chapter: 3, x: 9, y: 7, next: [49],
    type: 'cash', amount: 20000, title: 'マイホーム省エネ補助金', subText: '+$20,000',
    icon: 'house', scene: 'cash_plus',
    desc: 'エコ住宅認定で自治体から大型補助金！$20,000 を受け取る。'
  },
  {
    id: 49, chapter: 3, x: 8, y: 7, next: [57],
    type: 'rankup', title: '地域貢献で特別昇進!', subText: 'ランクアップ!',
    icon: 'rankup', scene: 'rankup',
    desc: 'ワークライフバランスの模範社員として表彰され「ランクアップ（昇進）」！（昇進済みなら特別ボーナス +$22,000）'
  },

  // --- 分岐2B: ベンチャー＆カジノ街道 (50〜56) ---
  {
    id: 50, chapter: 3, x: 11, y: 8, next: [51],
    type: 'rankup', title: '新規事業で抜擢昇進!', subText: 'ランクアップ!',
    icon: 'rankup', scene: 'rankup',
    desc: '社内ベンチャーを立ち上げて大成功！即座に「ランクアップ（昇進）」して給料が大幅アップ！（昇進済みなら +$25,000）'
  },
  {
    id: 51, chapter: 3, x: 12, y: 8, next: [52],
    type: 'dice_event', mode: 'casino_double', title: '🎰カジノ丁半ダイス!', subText: '偶数で+$36,000!',
    icon: 'casino', scene: 'casino',
    desc: '【カジノダイス勝負】VIPカジノで運命の2D6ロール！合計が偶数なら大勝利 +$36,000！奇数ならチップ代 -$10,000！'
  },
  {
    id: 52, chapter: 3, x: 12, y: 9, next: [53],
    type: 'stock', title: 'ベンチャー株公開(IPO)', subText: '株購入＆配当+$15,000',
    icon: 'stock', scene: 'stock',
    desc: '株式市場が活況！保有している株券1口につき $15,000 の配当金を受け取り、さらに追加で株券を購入できます！'
  },
  {
    id: 53, chapter: 3, x: 11, y: 9, next: [54],
    type: 'cash', amount: -16000, payToJob: 'lawyer', title: '特許契約リーガル費用', subText: '-$16,000 (弁護士へ)',
    icon: 'school', scene: 'job',
    desc: '国際ビジネス契約の顧問料として $16,000 を支払う（プレイヤーに「弁護士」がいればその人へ支払われる！自分が弁護士なら+$24,000受取！）。'
  },
  {
    id: 54, chapter: 3, x: 10, y: 9, next: [55],
    type: 'treasure', title: 'VIPオークション落札', subText: 'お宝カード+1 & +$10,000',
    bonusCash: 10000,
    icon: 'treasure', scene: 'treasure',
    desc: '会員制オークションで希少なコレクションを入手！「お宝カード」1枚と優待金 $10,000 を獲得！'
  },
  {
    id: 55, chapter: 3, x: 9, y: 9, next: [56],
    type: 'revenge', title: '⚡ライバル買収バトル!', subText: 'トップから$20,000奪取',
    icon: 'revenge', scene: 'trouble',
    desc: '【仕返し・逆転マス】現在最も現金を持っているトップのプレイヤーからビジネス買収で $20,000 を奪い取る！（自分がトップなら銀行から+$20,000）'
  },
  {
    id: 56, chapter: 3, x: 8, y: 9, next: [57],
    type: 'cash', amount: 28000, title: 'スタートアップ売却益', subText: '+$28,000',
    icon: 'cash_plus', scene: 'cash_plus',
    desc: '育てたアプリ事業が大手企業に買収された！キャピタルゲイン $28,000 を受け取る！'
  },

  // ================= 第4章：キャリア円熟・トラベル＆エリート分岐 (57〜78) =================
  {
    id: 57, chapter: 4, x: 7, y: 8, next: [58],
    type: 'payday', title: '給料日!', subText: '通過でも給料GET!',
    icon: 'payday', scene: 'payday',
    desc: '【給料日マス】ルート合流地点の給料日！通過または停止で現在の給料を受け取ります！'
  },
  {
    id: 58, chapter: 4, x: 6, y: 8, next: [59],
    type: 'cash', amount: -10000, payToJob: 'idol', title: 'ドームツアーVIP観戦', subText: '-$10,000 (アイドルへ)',
    icon: 'wedding', scene: 'casino',
    desc: '家族みんなでドームコンサートへ！チケット＆グッズ代 $10,000 を支払う（プレイヤーに「アイドル」または「人気配信者」がいればその人へ！）。'
  },
  {
    id: 59, chapter: 4, x: 5, y: 8, next: [60],
    type: 'trouble', troubleType: 'life', amount: 18000, title: '過労で短期入院!', subText: '-$18,000 (生命保険で0)',
    icon: 'hospital', scene: 'accident',
    desc: '働きすぎで検査入院！医療費 $18,000 を支払う（生命・医療保険に入っていれば支払免除＋見舞金$10,000獲得！）。'
  },
  {
    id: 60, chapter: 4, x: 4, y: 8, next: [61],
    type: 'dice_event', mode: 'treasure_dig', title: '🎲海底遺跡ダイス発掘', subText: '出目でお宝＆賞金!',
    icon: 'dice', scene: 'treasure',
    desc: '【ダイスイベント】海底遺跡の発掘調査！サイコロを振って4以上なら「お宝カード」1枚＋$15,000獲得！3以下でも古代金貨 +$15,000 を獲得！'
  },
  {
    id: 61, chapter: 4, x: 3, y: 8, next: [62],
    type: 'job_change', forceSpecialist: true, title: 'エリートスカウト!', subText: '専門職へ転職可能!',
    icon: 'job_change', scene: 'job_change',
    desc: '実績が認められ、大学コース限定の「専門職」にも転職できる特別ヘッドハンティング！今の仕事を続けるか、高給専門職へ移るか選べます！'
  },
  {
    id: 62, chapter: 4, x: 2, y: 8, next: [63],
    type: 'cash', amount: 22000, title: 'ベストセラー出版!', subText: '+$22,000',
    icon: 'school', scene: 'cash_plus',
    desc: '自伝エッセイが大ヒット！印税 $22,000 を受け取る（漫画家ならさらに+$15,000ボーナス！）。'
  },
  {
    id: 63, chapter: 4, x: 1, y: 8, next: [64],
    type: 'insurance', insuranceType: 'life', title: 'プラチナ医療保険', subText: '生命保険案内',
    icon: 'insurance', scene: 'normal',
    desc: '人生後半に備えて「生命・医療保険($7,000)」に加入できる。すでに加入済みなら健康祝い金 +$12,000 を受け取る！'
  },
  {
    id: 64, chapter: 4, x: 0, y: 8, next: [65],
    type: 'payday', title: '給料日!', subText: '通過でも給料GET!',
    icon: 'payday', scene: 'payday',
    desc: '【給料日マス】嬉しい給料日！通過または停止で現在の給料を受け取ります！'
  },
  {
    id: 65, chapter: 4, x: 0, y: 10, next: [66, 72],
    type: 'stop_branch', title: '世界旅か出世か!', subText: 'STOP! 分岐',
    icon: 'travel', scene: 'normal',
    branchChoices: [
      { nextId: 66, label: '✈️ 世界一周バカンスコース', desc: 'お宝カード2連発・ダイスイベント・観光ボーナスが豊富なロマンルート' },
      { nextId: 72, label: '👑 エリート出世＆投資コース', desc: '追加給料日・確実なランクアップ・株式大配当がある高収入ルート' }
    ],
    desc: '【全員ストップ！】第3の分岐点！世界中を巡ってお宝とダイスボーナスを集める「世界一周バカンスコース」か、昇進と追加給料日で稼ぐ「エリート出世＆投資コース」かを選択してください！'
  },

  // --- 分岐3A: 世界一周バカンスコース (66〜71) ---
  {
    id: 66, chapter: 4, x: 1, y: 10, next: [67],
    type: 'cash', amount: -12000, payToJob: 'pilot', title: 'ファーストクラス世界旅', subText: '-$12,000 (パイロットへ)',
    giveDiceTicket: 1,
    icon: 'travel', scene: 'normal',
    desc: 'ファーストクラスで世界一周へ出発！航空券代 $12,000 を支払い（パイロットがいればその人へ！）、「ダイス切替チケット」を1枚獲得！'
  },
  {
    id: 67, chapter: 4, x: 2, y: 10, next: [68],
    type: 'treasure', title: 'ピラミッドの秘宝!', subText: 'お宝カード+1',
    icon: 'treasure', scene: 'treasure',
    desc: 'エジプトの砂漠で古代の秘宝を発見！「お宝カード」を1枚獲得！'
  },
  {
    id: 68, chapter: 4, x: 3, y: 10, next: [69],
    type: 'dice_event', mode: 'multiply', multiplier: 6000, title: '🎲モナコGPダイス賭け', subText: '出目×$6,000獲得!',
    icon: 'dice', scene: 'casino',
    desc: '【ダイスイベント】モナコのサーキットで大熱狂！サイコロ(1D6)を振り、出目×$6,000（最大$36,000）を獲得！'
  },
  {
    id: 69, chapter: 4, x: 4, y: 10, next: [70],
    type: 'treasure', title: 'カリブ海沈没船の財宝', subText: 'お宝カード+1',
    icon: 'treasure', scene: 'treasure',
    desc: 'スキューバダイビング中に財宝船を発見！さらに「お宝カード」を1枚獲得！'
  },
  {
    id: 70, chapter: 4, x: 5, y: 10, next: [71],
    type: 'cash', amount: 25000, title: '旅行記が映画化決定!', subText: '+$25,000',
    icon: 'trophy', scene: 'cash_plus',
    desc: '世界一周の冒険記がハリウッドで映画化！原作料 $25,000 を受け取る！'
  },
  {
    id: 71, chapter: 4, x: 6, y: 10, next: [78],
    type: 'baby', count: 1, title: '旅先でハネムーンベイビー', subText: '子ども+1 & +$15,000',
    icon: 'baby', scene: 'baby',
    desc: '素敵な旅の思い出とともに新しい家族が誕生！子どもピン+1＆お祝い金を受け取ります！'
  },

  // --- 分岐3B: エリート出世＆投資コース (72〜77) ---
  {
    id: 72, chapter: 4, x: 1, y: 12, next: [73],
    type: 'rankup', title: '本社トップへ栄転!', subText: '確実ランクアップ!',
    icon: 'rankup', scene: 'rankup',
    desc: '本社の最高ポジションへ抜擢！未昇進なら確実に「ランクアップ（昇進）」し、すでに昇進済みなら役員報酬 +$30,000 を受け取る！'
  },
  {
    id: 73, chapter: 4, x: 2, y: 12, next: [74],
    type: 'stock', title: 'ウォール街大相場!', subText: '株配当＆追加購入',
    icon: 'stock', scene: 'stock',
    desc: '株価が急騰！保有している株券1口につき $20,000 の特別配当を受け取り、さらに株券を買い増しできます！'
  },
  {
    id: 74, chapter: 4, x: 3, y: 12, next: [75],
    type: 'cash', amount: -14000, title: 'チャリティ財団設立', subText: '-$14,000 / チケット+2',
    giveDiceTicket: 2,
    icon: 'insurance', scene: 'job',
    desc: '社会貢献のため $14,000 を寄付。名声が高まり「ダイス切替チケット」を一気に2枚獲得！'
  },
  {
    id: 75, chapter: 4, x: 4, y: 12, next: [76],
    type: 'payday', title: '特別ボーナス給料日!', subText: '通過でも給料GET!',
    icon: 'payday', scene: 'payday',
    desc: '【エリートコース限定・追加給料日！】通過または停止で、昇進したたっぷりの給料を受け取ります！'
  },
  {
    id: 76, chapter: 4, x: 5, y: 12, next: [77],
    type: 'cash', amount: 30000, title: '国家プロジェクト完遂', subText: '+$30,000',
    icon: 'trophy', scene: 'cash_plus',
    desc: '歴史に残るビッグプロジェクトを成功させ、功労金 $30,000 を受け取る！'
  },
  {
    id: 77, chapter: 4, x: 6, y: 12, next: [78],
    type: 'revenge', title: '⚡M&A敵対的買収!', subText: 'トップから$25,000奪取',
    icon: 'revenge', scene: 'trouble',
    desc: '【逆転マス】現在最も現金が多いプレイヤーから M&A で $25,000 を奪い取る！（自分がトップなら銀行から+$25,000）'
  },

  // ================= 第5章：資産拡大・波乱と栄光の後半ステージ (78〜91) =================
  {
    id: 78, chapter: 5, x: 7, y: 11, next: [79],
    type: 'payday', title: '給料日!', subText: '通過でも給料GET!',
    icon: 'payday', scene: 'payday',
    desc: '【給料日マス】両ルート合流後の給料日！通過または停止で現在の給料を受け取ります！'
  },
  {
    id: 79, chapter: 5, x: 8, y: 11, next: [80],
    type: 'stop_house', isSecondHouse: true, title: '別荘・豪邸買い替え!', subText: 'STOP! 不動産チャンス',
    icon: 'house', scene: 'house',
    desc: '【ストップ！不動産チャンス】さらに豪華な邸宅・お城への買い替え（またはマイホーム未購入なら新規購入）ができます！買わずに投資ボーナス +$15,000 を受け取ることも可能！'
  },
  {
    id: 80, chapter: 5, x: 9, y: 11, next: [81],
    type: 'cash', amount: -15000, payToJob: 'athlete', title: 'ワールド決勝VIP観戦', subText: '-$15,000 (選手へ)',
    icon: 'trophy', scene: 'normal',
    desc: '世界大会のVIPボックス席を購入！$15,000 を支払う（プレイヤーに「プロアスリート」がいればその人へ支払われる！）。'
  },
  {
    id: 81, chapter: 5, x: 10, y: 11, next: [82],
    type: 'dice_event', mode: 'everyone_gift', title: '🎲大感謝祭ダイス!', subText: '出目×$5,000＋全員配当',
    icon: 'dice', scene: 'dice',
    desc: '【ダイスイベント】サイコロ2個(2D6)を振り、合計×$5,000（最大$60,000）を銀行から獲得！さらにゾロ目なら他全員からも$10,000ずつ祝福される！'
  },
  {
    id: 82, chapter: 5, x: 11, y: 11, next: [83],
    type: 'trouble', troubleType: 'auto', amount: 24000, title: 'クラシックカー大修理', subText: '-$24,000 (自動車保険0)',
    icon: 'accident', scene: 'accident',
    desc: '愛車のトランスミッションが故障！修理費 $24,000 を支払う（自動車保険に入っていれば支払免除＋保険金$8,000獲得！）。'
  },
  {
    id: 83, chapter: 5, x: 12, y: 11, next: [84],
    type: 'treasure', title: '国立博物館へ寄贈表彰', subText: 'お宝カード+1 & +$15,000',
    bonusCash: 15000,
    icon: 'treasure', scene: 'treasure',
    desc: '文化活動が評価され、記念の「お宝カード」1枚と感謝状賞金 $15,000 を獲得！'
  },
  {
    id: 84, chapter: 5, x: 12, y: 13, next: [85],
    type: 'cash', amount: 35000, title: '子どもの結婚＆親孝行!', subText: '+$35,000',
    icon: 'wedding', scene: 'wedding',
    desc: '立派に育った子どもたちから感謝のプレゼント！$35,000 を受け取る（子ども1人につきさらに+$5,000追加！）。'
  },
  {
    id: 85, chapter: 5, x: 11, y: 13, next: [86],
    type: 'trouble', troubleType: 'fire', amount: 30000, title: '大型台風で別荘被害!', subText: '-$30,000 (火災保険で0)',
    icon: 'accident', scene: 'accident',
    desc: '記録的な暴風雨で屋根と庭が被災！修繕費 $30,000 を支払う（火災・住宅保険に入っていれば支払免除＋保険金$12,000獲得！）。'
  },
  {
    id: 86, chapter: 5, x: 10, y: 13, next: [87],
    type: 'stock', title: '世界株バブル到来!', subText: '株1口につき+$25,000!',
    icon: 'stock', scene: 'stock',
    desc: '歴史的な株高バブル！保有している株券1口につき $25,000 の大配当を受け取ります！（株を持っていない場合も市場ボーナス+$10,000）'
  },
  {
    id: 87, chapter: 5, x: 9, y: 13, next: [88],
    type: 'cash', amount: -20000, payToJob: 'scientist', title: '宇宙旅行ツアー参加!', subText: '-$20,000 (宇宙/科学者へ)',
    icon: 'travel', scene: 'normal',
    desc: '民間ロケットで成層圏へ！ツアー代金 $20,000 を支払う（プレイヤーに「宇宙飛行士」または「科学者」がいればその人へ支払われる！）。'
  },
  {
    id: 88, chapter: 5, x: 8, y: 13, next: [89],
    type: 'roulette_event', title: '🎡10万ドル大抽選会!', subText: 'ルーレットで大賞金!',
    icon: 'roulette', scene: 'payday',
    desc: '【ルーレットイベント】夢の10万ドル抽選会！ルーレットの数値に応じて最大 $60,000〜$100,000 の特大賞金を獲得します！'
  },
  {
    id: 89, chapter: 5, x: 7, y: 13, next: [90],
    type: 'trouble', troubleType: 'life', amount: 26000, title: 'VIP人間ドック手術', subText: '-$26,000 (生命保険で0)',
    icon: 'hospital', scene: 'accident',
    desc: '最新医療で徹底治療！医療費 $26,000 を支払う（生命・医療保険に入っていれば支払免除＋保険金$12,000獲得！）。'
  },
  {
    id: 90, chapter: 5, x: 6, y: 13, next: [91],
    type: 'revenge', title: '⚡大逆転チャリティ徴収!', subText: '全員から$12,000ずつ!',
    revengeAll: true,
    icon: 'revenge', scene: 'cash_plus',
    desc: '【大逆転マス】主催ガラパーティーが大盛況！他の全プレイヤーから参加費 $12,000 ずつを徴収します！'
  },
  {
    id: 91, chapter: 5, x: 5, y: 13, next: [92],
    type: 'payday', title: '最後の給料日!', subText: '通過でも給料GET!',
    icon: 'payday', scene: 'payday',
    desc: '【最終給料日マス】決算橋の手前のラスト給料日！通過または停止でたっぷり給料を受け取ります！'
  },

  // ================= 第6章：決算日〜ファイナルステージ (92〜107) =================
  {
    id: 92, chapter: 6, x: 4, y: 13, next: [93, 98],
    type: 'stop_settlement', title: '決算日ゲート!', subText: 'STOP! 子ども精算＆分岐',
    icon: 'bridge', scene: 'bridge',
    branchChoices: [
      { nextId: 93, label: '👑 堅実ウィニングロード', desc: '安定した老後ボーナスとお宝・年金を受け取りながらゴールへ進む王道コース' },
      { nextId: 98, label: '⚡ 一発逆転ギャンブル渓谷', desc: '超大型ダイス勝負や倍増チャンスで最後の最後に1位を奪い取る激アツコース' }
    ],
    desc: '【全員ストップ！決算日】大きな吊り橋を渡る決算日です！①子ども1人につき $30,000 の仕送りボーナスを獲得！②約束手形（借金）があれば返済！③ゴールへ向けた最後の2ルートを選択します！'
  },

  // --- 分岐4A: 堅実ウィニングロード (93〜97) ---
  {
    id: 93, chapter: 6, x: 3, y: 12, next: [94],
    type: 'cash', amount: 30000, title: '満期ゴールデン年金', subText: '+$30,000',
    icon: 'cash_plus', scene: 'payday',
    desc: '長年積み立てた企業年金が満期に！$30,000 を受け取る。'
  },
  {
    id: 94, chapter: 6, x: 2, y: 12, next: [95],
    type: 'treasure', title: '名誉市民の記念秘宝', subText: 'お宝カード+1',
    icon: 'treasure', scene: 'treasure',
    desc: '街の発展に貢献し、名誉市民章とともに「お宝カード」を1枚獲得！'
  },
  {
    id: 95, chapter: 6, x: 1, y: 13, next: [96],
    type: 'cash', amount: 25000, title: 'マイホーム価値上昇!', subText: '+$25,000',
    icon: 'house', scene: 'house',
    desc: '周辺エリアの再開発で地価が上昇！不動産評価ボーナス $25,000 を受け取る。'
  },
  {
    id: 96, chapter: 6, x: 1, y: 14, next: [97],
    type: 'dice_event', mode: 'multiply', multiplier: 5000, title: '🎲孫へのプレゼントダイス', subText: '出目×$5,000獲得',
    icon: 'dice', scene: 'dice',
    desc: '【ダイスイベント】可愛い孫たちと楽しくサイコロ遊び！出目×$5,000 のハッピーボーナスを受け取る！'
  },
  {
    id: 97, chapter: 6, x: 2, y: 14, next: [103],
    type: 'cash', amount: 35000, title: '退職功労プラチナ賞', subText: '+$35,000',
    icon: 'trophy', scene: 'cash_plus',
    desc: '華々しいキャリアを讃えられ、特別功労金 $35,000 を受け取る！'
  },

  // --- 分岐4B: 一発逆転ギャンブル渓谷 (98〜102) ---
  {
    id: 98, chapter: 6, x: 4, y: 15, next: [99],
    type: 'dice_event', mode: 'jackpot_big', title: '🎲運命の10万ドルダイス!', subText: '8以上で+$80,000!',
    icon: 'casino', scene: 'casino',
    desc: '【超ダイス勝負】2D6を振って合計8以上なら一撃 +$80,000！7以下なら渓谷通行料 -$20,000！'
  },
  {
    id: 99, chapter: 6, x: 3, y: 15, next: [100],
    type: 'revenge', title: '⚡大富豪から資産奪取!', subText: 'トップから$40,000奪取!',
    revengeAmount: 40000,
    icon: 'revenge', scene: 'trouble',
    desc: '【終盤大逆転マス】現在1位のプレイヤーから世紀の逆転劇で $40,000 を奪い取る！（自分が1位なら銀行から+$40,000）'
  },
  {
    id: 100, chapter: 6, x: 2, y: 16, next: [101],
    type: 'cash', amount: -25000, title: '油田発掘プロジェクト費', subText: '-$25,000',
    icon: 'cash_minus', scene: 'accident',
    desc: '一攫千金を狙って油田掘削に投資！開発費 $25,000 を支払う。'
  },
  {
    id: 101, chapter: 6, x: 3, y: 16, next: [102],
    type: 'cash', amount: 70000, title: '大油田が噴き出した!!', subText: '+$70,000!!',
    icon: 'payday', scene: 'payday',
    desc: 'ドカーン！砂漠から黒金の石油が噴出！オイルマネー $70,000 を一挙に獲得！！'
  },
  {
    id: 102, chapter: 6, x: 4, y: 16, next: [103],
    type: 'treasure', title: '黄金郷エルドラド発見', subText: 'お宝カード+2枚!!',
    count: 2,
    icon: 'treasure', scene: 'treasure',
    desc: '渓谷の奥地で伝説の黄金郷を発見！なんと「お宝カード」を一気に2枚獲得！！'
  },

  // --- 最終直線〜ゴール：億万長者の館 (103〜107) ---
  {
    id: 103, chapter: 6, x: 5, y: 15, next: [104],
    type: 'stock', title: '最終株式配当フェスティバル', subText: '株1口につき+$20,000',
    icon: 'stock', scene: 'stock',
    desc: 'ゴール直前の決算配当！保有している株券1口につき $20,000 を受け取ります（株なしでも+$10,000）！'
  },
  {
    id: 104, chapter: 6, x: 6, y: 15, next: [105],
    type: 'dice_event', mode: 'multiply', multiplier: 8000, title: '🎲ラストスパートダイス!', subText: '出目×$8,000獲得!',
    icon: 'dice', scene: 'dice',
    desc: '【最終ダイスボーナス】ゴール目前のビッグチャンス！サイコロ(1D6)を振り、出目×$8,000（最大$48,000）を獲得！'
  },
  {
    id: 105, chapter: 6, x: 7, y: 15, next: [106],
    type: 'cash', amount: 30000, title: '人生パレード大歓声!', subText: '+$30,000',
    icon: 'trophy', scene: 'cash_plus',
    desc: '沿道の人々から拍手喝采！祝福のご祝儀 $30,000 を受け取る！'
  },
  {
    id: 106, chapter: 6, x: 8, y: 15, next: [107],
    type: 'treasure', title: 'ラストワン秘宝ガチャ', subText: 'お宝カード+1',
    icon: 'treasure', scene: 'treasure',
    desc: 'ゴール直前の記念ミュージアムで「お宝カード」を1枚獲得！'
  },
  {
    id: 107, chapter: 6, x: 9, y: 15, next: [],
    type: 'goal', title: '👑億万長者の館ゴール!', subText: '1着+$100,000 / 資産精算',
    icon: 'castle', scene: 'goal',
    desc: '【祝・ゴール到着！！】壮大な人生の旅路を完走し、「億万長者の館」へ到着しました！到着順ボーナス（1着$100,000 / 2着$60,000 / 3着$40,000 / 4着以下$20,000）を獲得し、全員到着まで毎ターン「ゴール後ダイス配当」を楽しめます！'
  }
];

// 座標の微調整（行と列が重ならないように検証・補正する安全処理）
(function normalizeCoordinates() {
  // マス93,94と72,73の座標が重ならないよう第6章のY座標を14〜16に綺麗に整列
  const overrides = {
    92: { x: 4, y: 13 },
    93: { x: 3, y: 13 },
    94: { x: 2, y: 13 },
    95: { x: 1, y: 13 },
    96: { x: 1, y: 14 },
    97: { x: 3, y: 14 },
    98: { x: 4, y: 15 },
    99: { x: 3, y: 15 },
    100: { x: 2, y: 16 },
    101: { x: 4, y: 16 },
    102: { x: 5, y: 16 },
    103: { x: 6, y: 15 },
    104: { x: 7, y: 15 },
    105: { x: 8, y: 15 },
    106: { x: 9, y: 15 },
    107: { x: 10, y: 15 }
  };
  BOARD_SPACES.forEach((sp) => {
    if (overrides[sp.id]) {
      sp.x = overrides[sp.id].x;
      sp.y = overrides[sp.id].y;
    }
  });
})();

window.GAME_DATA = {
  PLAYER_COLORS,
  CPU_PROFILES,
  JOBS_DATA,
  HOUSES_DATA,
  TREASURES_DATA,
  INSURANCES_DATA,
  BOARD_SPACES
};
