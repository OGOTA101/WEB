/* ========================================
   Bar-Code Tactics: 凸（TOTSU）
   スキャナー (Wrapper for html5-qrcode)
   ======================================== */

class Scanner {
    constructor(elementId, resultCallback) {
        this.elementId = elementId;
        this.resultCallback = resultCallback;
        this.html5QrcodeScanner = null;
        this.isScanning = false;
    }

    start() {
        if (this.isScanning) return;

        // html5-qrcode library check
        if (typeof Html5Qrcode === 'undefined') {
            console.error('html5-qrcode library not loaded');
            if (window.showAlertDialog) window.showAlertDialog('カメラスキャン機能の読み込みに失敗しました。');
            else alert('カメラスキャン機能の読み込みに失敗しました。');
            return;
        }

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1
        };

        // Use back camera by default
        this.html5QrcodeScanner = new Html5Qrcode(this.elementId);

        this.html5QrcodeScanner.start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
                this.onScanSuccess(decodedText, decodedResult);
            },
            (errorMessage) => {
                // parse error, ignore it.
            }
        ).then(() => {
            this.isScanning = true;
            console.log("Camera started");
        }).catch(err => {
            console.error("Error starting camera", err);
            if (window.showAlertDialog) window.showAlertDialog('カメラの起動に失敗しました。\nHTTPS接続か確認してください。');
            else alert('カメラの起動に失敗しました。\nHTTPS接続か確認してください。');
        });
    }

    stop() {
        if (!this.isScanning || !this.html5QrcodeScanner) return;

        this.html5QrcodeScanner.stop().then(() => {
            this.isScanning = false;
            console.log("Camera stopped");
            this.html5QrcodeScanner.clear();
        }).catch(err => {
            console.error("Failed to stop camera", err);
        });
    }

    onScanSuccess(decodedText, decodedResult) {
        // Handle the scanned code as you like, for example:
        console.log(`Code matched = ${decodedText}`, decodedResult);

        // 成功音
        if (window.soundManager) window.soundManager.playSE('se_koto');

        // Stop scanning after success
        this.stop();

        if (this.resultCallback) {
            this.resultCallback(decodedText);
        }
    }
}

window.Scanner = Scanner;
