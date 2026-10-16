$source = 'C:\Users\ihogo\Downloads\storepage_1306765_all (2).csv'
$target = 'C:\Users\ihogo\Desktop\WEB\AVALANCHE_localization_upload.csv'

function Convert-ToSteamMarkup([string]$Text) {
    $paragraphs = $Text.Trim() -split "\r?\n\r?\n"
    $parts = for ($i = 0; $i -lt $paragraphs.Count; $i++) {
        $paragraph = $paragraphs[$i]
        $lines = $paragraph -split '\r?\n'
        if ($lines.Count -gt 1 -and $lines[1] -match '^•') {
            $bulletItems = ($lines[1..($lines.Count - 1)] | ForEach-Object { "[*]$($_.TrimStart('•').Trim())[/*]" }) -join ''
            "[p][b]$($lines[0])[/b][/p][list]$bulletItems[/list]"
        } elseif ($paragraph -match '^•') {
            $bulletItems = (($paragraph -split '\r?\n') | ForEach-Object { "[*]$($_.TrimStart('•').Trim())[/*]" }) -join ''
            "[list]$bulletItems[/list]"
        } elseif (($i % 2) -eq 0) {
            "[p][b]$paragraph[/b][/p]"
        } else {
            "[p]$paragraph[/p]"
        }
    }
    $parts -join ''
}

$detailText = @{
    english = @'
Build a stack in a field that keeps changing.

Move and rotate each falling Tron into place. Complete a horizontal line to clear it, then watch the Trons above fall under gravity. The opening left by a clear reshapes the stack and creates the next decision.

Gravity changes the way you build.

A Tron drops whenever there is room below it. That applies after a line clear and after a special Tron pushes a neighboring piece aside. A piece moved into open space will keep falling, so plan for the board after the clear, not only the placement in front of you.

Use special Trons to open a route.

Special Trons can shove neighboring pieces out of the way. Find the moment that turns a crowded column into a usable gap, then use the fall that follows to prepare your next line.

Snow makes every level a little tighter.

As the level rises, snow falls into columns where Trons remain, and later levels can leave several snow cells in the same column. The forecast shows where the next snow will land, but each new cell changes the shape of the field. Crush it with a special Tron or build around it—the choice is yours.

Play solo or take the board online.

Alongside solo score attack, AVALANCHE supports online battles through random matchmaking or room-code matches. Clear lines to send trash, watch the opponent's score and status, and win by knocking them out—or by leading when the 180-second limit expires.

Keep the line clears connected.

Clear lines in succession to grow your CON and push your score higher. Use the snowfall forecast, Hold, Ghost, and NEXT preview to think one placement ahead. Play a quick run or stay with the board as the speed rises and the margin for error disappears.

Features
• A falling-block puzzle where gravity reshapes the stack after every clear
• Special Trons that push neighboring pieces aside and open new routes
• Snowfall and rising drop speed that create a steadily changing challenge
• Snow forecast, Hold, Ghost, and NEXT preview for planning ahead
• Solo score attack and online battles with random matchmaking or room codes
• Keyboard and XInput controller support
• Japanese, English, Simplified Chinese, and Korean UI, achievements, and personal bests
'@
    japanese = @'
雪が降るフィールドで、トロンを積む。

落ちてくるトロンを左右に動かし、回転させて置きます。横一列が埋まるとラインが消え、上に残ったトロンは重力で落下します。ラインを消したあとに空いた場所をそのままにせず、盤面全体が崩れて次の置き場所を作るのがAVALANCHEの基本です。

重力で、積み方が変わる。

トロンは下が空いていれば落ちます。ライン消去でできた穴はもちろん、特殊トロンに押しのけられたトロンも、下に空きがあれば落下します。消す前の形だけでなく、消したあとにどこへ落ちるかまで考えて置くことで、積み上がり方が大きく変わります。

特殊トロンで、盤面を切り開く。

特殊トロンは、隣のトロンを押しのけて道を作れます。押し出した先に空きがあれば、そこからさらに落下します。動かせないと思った山に手を入れ、次のラインを作るための空間を開けることができます。

雪が、次の判断を迫る。

レベルが上がると、トロンが残っている列へ雪が降り、同じ列に複数の雪が残るようになります。降る場所は予測表示で確認できますが、雪は盤面を少しずつ狭くします。特殊トロンで雪を押しつぶすか、雪を残したまま別の列を伸ばすか。積み方を決めるたびに、フィールドの条件が変わります。

ひとりでも、オンラインでも。

ひとり用のスコアアタックに加えて、オンライン対戦にも対応しています。ランダムマッチで相手を探すほか、ルーム番号を共有して対戦できます。ライン消去でトラッシュを送り、相手を先に追い詰めるか、180秒の制限時間でスコアを競いましょう。

ラインとCONを、どこまでつなげられるか。

連続してラインを消すとCONが伸び、スコアも上がります。ホールド、ゴースト表示、NEXT表示を手がかりに、いま置くトロンだけでなく、その次の一手まで準備しましょう。短い一局で試すことも、落下速度が上がる高レベルで自分の限界を探すこともできます。

主な特徴
• 重力でトロンが落ち、ライン消去後の盤面が自然に組み替わる落下パズル
• 特殊トロンで隣のトロンを押しのけ、空いた場所へさらに落とせる独自の操作
• レベルに応じて雪の量と落下速度が変わる、段階的な難易度
• 降雪予測、ホールド、ゴースト、NEXT表示で次の形を読める
• ひとり用スコアアタックと、ランダムマッチ／ルーム番号に対応したオンライン対戦
• キーボードとXInput対応コントローラーに対応
• 日本語・英語・中国語（簡体字）・韓国語のUI、実績、自己ベストに対応
'@
    schinese = @'
在不断变化的场地中堆叠特隆。

移动并旋转落下的特隆，填满横向一行即可消除。消行后，上方的特隆会在重力作用下落下。留下的空位会改变整个堆叠，也会决定下一步该怎么放置。

重力会改变你的堆叠方式。

只要下方有空位，特隆就会继续下落。消行后如此，特殊特隆推开相邻方块后也如此。被推到空位的特隆还会继续下落，因此要同时考虑放置之前和消除之后的形状。

用特殊特隆打开路线。

特殊特隆可以把相邻的特隆推开。在拥挤的列中找到一个空隙，推开挡路的方块，再利用之后的下落为下一行创造空间。

降雪让场地越来越紧张。

等级提高后，仍有特隆的列会迎来降雪，后期同一列还可能留下多个雪格。预测显示会落在哪里，但每一格雪都会改变场地形状。用特殊特隆压碎积雪，或者绕开它继续堆叠，取决于你的判断。

单人挑战，也可在线对战。

除了单人分数挑战之外，还支持在线对战。可以通过随机匹配寻找对手，也可以分享房间号进行对战。消除行来发送垃圾行，在180秒限制时间内争取更高分，或先让对手结束游戏。

让消行和CON持续下去。

连续消行可以延长CON并提高分数。利用降雪预测、保留、幽灵显示和NEXT预览，提前想好下一次放置。既可以用短局练习，也可以在速度不断上升的高等级中挑战自己的极限。

主要特色
• 每次消行后都会在重力下重新排列的落下益智玩法
• 可以推开相邻方块、为下一步打开路线的特殊特隆
• 随等级提高而变化的降雪和下落速度
• 降雪预测、保留、幽灵显示和NEXT预览
• 单人分数挑战，以及支持随机匹配和房间号的在线对战
• 支持键盘与XInput控制器
• 支持日语、英语、简体中文、韩语界面、成就和个人最高纪录
'@
    koreana = @'
계속 변하는 필드에 트론을 쌓으세요.

떨어지는 트론을 움직이고 회전해 배치하세요. 가로줄을 완성하면 줄이 사라지고, 위에 남은 트론은 중력에 따라 내려옵니다. 줄이 사라져 생긴 빈칸은 그대로 끝나지 않고 스택의 모양을 바꾸어 다음 판단을 만듭니다.

중력이 쌓는 방법을 바꿉니다.

아래에 빈 공간이 있으면 트론은 계속 내려갑니다. 줄을 지운 뒤에도, 특수 트론으로 옆의 블록을 밀어낸 뒤에도 같은 규칙이 적용됩니다. 밀려난 트론이 빈 공간으로 들어가면 다시 떨어지므로, 지금의 배치뿐 아니라 지운 뒤의 모양까지 생각해야 합니다.

특수 트론으로 길을 만드세요.

특수 트론은 옆의 트론을 밀어낼 수 있습니다. 막힌 열에 틈을 만들고, 이어지는 낙하를 이용해 다음 줄을 지울 공간을 준비하세요.

눈이 레벨마다 필드를 조여 옵니다.

레벨이 오르면 트론이 남아 있는 열에 눈이 내리고, 후반에는 한 열에 여러 눈 칸이 남을 수 있습니다. 예측 표시로 다음 눈의 위치를 확인할 수 있지만, 눈 하나마다 필드의 모양도 달라집니다. 특수 트론으로 눈을 눌러 없앨지, 눈을 남겨 두고 다른 열을 키울지 선택하세요.

혼자서도, 온라인에서도 플레이하세요.

싱글 플레이 점수 도전뿐 아니라 온라인 대전도 지원합니다. 랜덤 매칭으로 상대를 찾거나 방 번호를 공유해 대전할 수 있습니다. 줄을 지워 트래시를 보내고, 180초 제한 시간 안에 더 높은 점수를 노리거나 상대를 먼저 게임 오버로 몰아붙이세요.

줄 지우기와 CON을 이어 가세요.

연속해서 줄을 지우면 CON이 올라가고 점수도 커집니다. 눈 예측, 홀드, 고스트, NEXT 미리보기를 활용해 한 수 앞을 준비하세요. 짧게 한 판을 즐기거나, 속도가 올라가며 여유가 사라지는 높은 레벨에서 한계를 시험할 수도 있습니다.

주요 특징
• 줄을 지울 때마다 중력으로 스택이 다시 정리되는 낙하 퍼즐
• 옆의 블록을 밀어내 새로운 길을 만드는 특수 트론
• 레벨에 따라 달라지는 눈과 낙하 속도
• 눈 예측, 홀드, 고스트, NEXT 미리보기
• 싱글 플레이 점수 도전과 랜덤 매칭／방 번호 온라인 대전
• 키보드와 XInput 컨트롤러 지원
• 일본어·영어·중국어 간체·한국어 UI, 도전 과제와 개인 최고 기록 지원
'@
}

$short = @{
    english = "Snow falls. The stack shifts under gravity. Move falling Trons, push neighboring pieces aside with special Trons, and keep your CON alive through each line clear. Play solo for a personal best or face an opponent online in this focused falling-block puzzle."
    japanese = "雪が降り、重力で盤面が崩れる。落ちてくるトロンを積み、特殊トロンで隣のトロンを押しのけ、ライン消去をCONにつなげよう。ひとりで自己ベストを狙うのも、オンラインで対戦するのも楽しめる落下パズル。"
    schinese = "雪会落下，方块会在重力下重新排列。移动下落的特隆，用特殊特隆推开相邻方块，连续消行保持CON。既可以单人挑战最高分，也可以在线与对手较量。"
    koreana = "눈이 내리고, 블록은 중력에 따라 다시 내려앉습니다. 떨어지는 트론을 쌓고 특수 트론으로 옆의 블록을 밀어내며 줄을 지워 CON을 이어 가세요. 혼자 최고 기록에 도전하거나 온라인에서 상대와 겨룰 수 있는 낙하 퍼즐입니다."
}

$rows = Import-Csv -LiteralPath $source
$detail = @{}
foreach ($language in $detailText.Keys) {
    $detail[$language] = Convert-ToSteamMarkup $detailText[$language]
}

foreach ($row in $rows) {
    if ($detail.ContainsKey($row.language) -and $row.key -eq 'app[content][about]') {
        $row.text = $detail[$row.language]
    } elseif ($short.ContainsKey($row.language) -and $row.key -eq 'app[content][short_description]') {
        $row.text = $short[$row.language]
    }
}

$rows | Export-Csv -LiteralPath $target -NoTypeInformation -Encoding utf8
Write-Output "Wrote $target"
