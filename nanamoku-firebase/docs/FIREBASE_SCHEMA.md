# Firebase通信設計 v0.1

## 方針

Firebase Hostingでフロントエンドを配信し、Cloud Firestoreでルーム、盤面、ターン、所持カードを同期する。Firebase Authenticationは匿名ログインを使う。

対戦の着手確定はCloud Functionsに寄せる。クライアントからFirestoreへ直接盤面を書かせると、カード効果や勝利判定の不正を防ぎにくいため。

## 利用サービス

| サービス | 用途 |
| --- | --- |
| Firebase Hosting | Webアプリ配信 |
| Firebase Authentication | 匿名ログイン、ユーザー識別 |
| Cloud Firestore | ルーム、盤面、所持カード、ログ同期 |
| Cloud Functions | 着手、カード、ガチャ、CPU行動の検証 |
| Firebase Emulator Suite | ローカル開発と通信テスト |

## コレクション設計

### users/{uid}

| フィールド | 型 | 内容 |
| --- | --- | --- |
| displayName | string | 表示名 |
| createdAt | timestamp | 初回作成日時 |
| lastLoginAt | timestamp | 最終ログイン |
| freeGem | number | 無料ガチャ用ポイント |

### users/{uid}/inventory/{cardId}

| フィールド | 型 | 内容 |
| --- | --- | --- |
| cardId | string | カードID |
| count | number | 所持数 |
| firstObtainedAt | timestamp | 初入手日時 |

### users/{uid}/decks/{deckId}

| フィールド | 型 | 内容 |
| --- | --- | --- |
| name | string | デッキ名 |
| normal | string[] | 通常カード4枚 |
| strong | string[] | 強カード2枚 |
| ultimate | string[] | 最強カード1枚 |
| updatedAt | timestamp | 更新日時 |

### rooms/{roomId}

| フィールド | 型 | 内容 |
| --- | --- | --- |
| status | string | waiting, playing, finished |
| ownerUid | string | ルーム作成者 |
| maxPlayers | number | 2から7 |
| boardSize | number | 30 |
| winLength | number | 7 |
| turnIndex | number | 現在の手番インデックス |
| turnNumber | number | 何巡目か |
| playerOrder | string[] | 手番順のuid |
| currentPlayerUid | string | 現在手番 |
| rngSeed | string | ガチャ以外の試合内乱数 |
| version | number | 状態更新番号 |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |
| expiresAt | timestamp | 自動削除予定 |

### rooms/{roomId}/players/{uid}

| フィールド | 型 | 内容 |
| --- | --- | --- |
| uid | string | ユーザーID |
| seatIndex | number | 0から6 |
| displayName | string | 表示名 |
| colorId | string | black, white, redなど |
| isCpu | boolean | CPUかどうか |
| cpuLevel | string | easy, normal, hard |
| ready | boolean | 準備済み |
| connected | boolean | 接続中 |
| deckCardIds | string[] | 持ち込み7枚 |
| usedCardIds | string[] | 使用済みカード |
| joinedAt | timestamp | 参加日時 |
| lastSeenAt | timestamp | 最終接続 |

### rooms/{roomId}/state/current

| フィールド | 型 | 内容 |
| --- | --- | --- |
| board | number[] | 900要素。-1は空き、0から6は席番号 |
| blockers | map | 封鎖セルと期限 |
| reservations | map | 予約石セルと所有者 |
| pendingEffects | map | 余響、沈黙などの継続効果 |
| winnerUid | string/null | 勝者 |
| winningLine | object/null | 勝利ライン |
| lastMove | object/null | 直近行動 |
| version | number | 状態番号 |
| updatedAt | timestamp | 更新日時 |

boardは30x30を一次元配列にする。indexは `y * 30 + x`。

### rooms/{roomId}/moves/{moveId}

| フィールド | 型 | 内容 |
| --- | --- | --- |
| seq | number | 連番 |
| uid | string | 行動者 |
| type | string | place, card, cardAndPlace, system |
| cardId | string/null | 使用カード |
| removed | object[] | コストとして除去した座標 |
| placements | object[] | 置いた座標 |
| effects | object | カード固有の結果 |
| boardVersionBefore | number | 更新前バージョン |
| boardVersionAfter | number | 更新後バージョン |
| createdAt | timestamp | 記録日時 |

## Cloud Functions API案

| 関数 | 役割 |
| --- | --- |
| createRoom | ルーム作成 |
| joinRoom | ルーム参加 |
| leaveRoom | 退出 |
| setReady | 準備状態更新 |
| startGame | 試合開始、席順と初期状態確定 |
| submitTurn | カード使用と通常着手をまとめて検証、確定 |
| addCpu | 待機中ルームにCPUを追加 |
| runCpuTurn | CPUの行動を確定 |
| rollGacha | ガチャ抽選、所持カード更新 |
| cleanupExpiredRooms | 古いルーム削除 |

submitTurnはFirestoreトランザクション内で、現在手番、盤面バージョン、カード未使用、コスト、カード効果、通常着手、勝利判定をすべて検証する。

## セキュリティルール方針

| 領域 | 方針 |
| --- | --- |
| users | 自分のユーザードキュメントだけ読み書き可 |
| inventory | クライアント書き込み不可。Functionsだけが更新 |
| decks | 所持カード範囲内で自分だけ更新可 |
| rooms | 読み取りは参加者または公開待機ルームのみ |
| room state | クライアント書き込み不可 |
| moves | クライアント書き込み不可 |
| players | lastSeenAtなど限定フィールドだけ本人更新可 |

初期開発ではエミュレータを使い、ルールを緩くせずに最初からFunctions経由で進める。

## 同期フロー

1. クライアントが匿名ログインする。
2. ルーム作成または参加をFunctionsへ送る。
3. クライアントは `rooms/{roomId}`、`players`、`state/current`、最新`moves`を購読する。
4. 自分のターンで操作したら `submitTurn` を呼ぶ。
5. Functionsが検証してstateとmovesを更新する。
6. 全クライアントへonSnapshotで反映される。

## オフラインと再接続

- 操作中に切断した場合、確定前の操作はローカルだけの仮表示にする。
- 再接続時はFirestoreのstateを正とし、ローカル仮表示を捨てる。
- プレイヤーの接続状態はlastSeenAtで判定する。
- 一定時間戻らないプレイヤーはCPU代走または敗北扱いを選べるようにする。
