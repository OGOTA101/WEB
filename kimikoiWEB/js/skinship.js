/* ============================================
   SKINSHIP - Sister interaction system
   ============================================ */

const Skinship = {
    actionsRemaining: 4,
    dialogues: {
        talk: [
            '「ねー、おにいちゃん。今日は何してたの？」',
            '「学校？ ふーん、楽しかった？」',
            '「わたし、おにいちゃんのこと好きだよ」',
            '「ねえ、今日は一緒にいてくれる？」',
            '「おにいちゃんって、優しいよね」',
        ],
        headpat: [
            '「えへへ……なでなでされると嬉しいな」',
            '「もっと……もっとなでて？」',
            '「きゃっ！ くすぐったいよ……」',
            '「うん……幸せ……」',
        ],
        gift: [
            '「え！ プレゼント！？ ありがとう！」',
            '「わぁ……！ これ、欲しかったの！」',
            '「おにいちゃん、最高！」',
        ],
        ignore: [
            '「……おにいちゃん？」',
            '「無視しないでよ……」',
            '「なんで……こっち見てくれないの……」',
            '「……いたい」',
        ],
    },

    start() {
        this.actionsRemaining = 4;
        $('skinship-overlay').style.display = 'flex';
        $('action-count').textContent = this.actionsRemaining;
        $('skinship-dialogue').textContent = '「おにいちゃん、来てくれたんだ！」';
        $('skinship-expression').textContent = '';
        
        // Update buttons
        $$('.skinship-btn').forEach(b => b.disabled = false);
    },

    doAction(action) {
        if (this.actionsRemaining <= 0) return;
        
        this.actionsRemaining--;
        $('action-count').textContent = this.actionsRemaining;
        
        // Pick random dialogue
        const dialogueList = this.dialogues[action] || ['「……」'];
        const text = dialogueList[randomInt(0, dialogueList.length - 1)];
        $('skinship-dialogue').textContent = text;
        
        // Apply parameter changes
        switch (action) {
            case 'talk':
                GameManager.modifyParam('sister_affection', 5);
                GameManager.modifyParam('sister_trust', 3);
                $('skinship-character').querySelector('.skinship-sprite').textContent = '😊';
                break;
            case 'headpat':
                GameManager.modifyParam('sister_affection', 8);
                GameManager.modifyParam('sister_anger', -2);
                $('skinship-character').querySelector('.skinship-sprite').textContent = '🥰';
                break;
            case 'gift':
                GameManager.modifyParam('sister_affection', 10);
                GameManager.modifyParam('sister_trust', 5);
                $('skinship-character').querySelector('.skinship-sprite').textContent = '😍';
                break;
            case 'ignore':
                GameManager.modifyParam('sister_affection', -10);
                GameManager.modifyParam('sister_anger', 15);
                GameManager.modifyParam('sister_darkness', 2);
                $('skinship-character').querySelector('.skinship-sprite').textContent = '😢';
                break;
        }
        
        // Check if out of actions
        if (this.actionsRemaining <= 0) {
            $$('.skinship-btn').forEach(b => b.disabled = true);
            setTimeout(() => this.end(), 2000);
        }
    },

    end() {
        $('skinship-overlay').style.display = 'none';
        GameEvents.emit('skinship_done');
        
        // Check for horror trigger
        if (GameManager.state.params.sister_darkness >= 5) {
            setTimeout(() => {
                Effects.showGlitch('vhs');
                setTimeout(() => Effects.hideGlitch(), 2000);
            }, 1000);
        }
    },
};
