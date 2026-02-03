document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const imagePreviewArea = document.getElementById('imagePreviewArea');
    const processingIndicator = document.getElementById('processingIndicator');

    // モーダル要素
    const modal = document.getElementById('imageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalOriginal = document.getElementById('modalOriginal');
    const modalConverted = document.getElementById('modalConverted');
    const closeBtn = document.querySelector('.close');

    // --- 設定値を取得する要素 ---
    const colorCountSlider = document.getElementById('colorCount');
    const dotSizeSlider = document.getElementById('dotSize');
    const ditheringSelect = document.getElementById('dithering');
    const saturationSlider = document.getElementById('saturation');
    const contrastSlider = document.getElementById('contrast');
    const transparentCornerSelect = document.getElementById('transparentCorner');

    const colorCountValue = document.getElementById('colorCountValue');
    const dotSizeValue = document.getElementById('dotSizeValue');
    const saturationValue = document.getElementById('saturationValue');
    const contrastValue = document.getElementById('contrastValue');

    let originalImages = []; // 元のImageオブジェクトを保持
    let processedImages = new Map();
    let originalImageData = new Map(); // 元画像のImageDataを保持

    // --- イベントリスナー ---
    fileInput.addEventListener('change', handleFileSelect);
    convertBtn.addEventListener('click', processImages);
    downloadBtn.addEventListener('click', downloadAllImages);

    // モーダル関連
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    colorCountSlider.addEventListener('input', () => colorCountValue.textContent = colorCountSlider.value);
    dotSizeSlider.addEventListener('input', () => dotSizeValue.textContent = dotSizeSlider.value);
    saturationSlider.addEventListener('input', () => saturationValue.textContent = ['なし', '弱', '強'][saturationSlider.value]);
    contrastSlider.addEventListener('input', () => contrastValue.textContent = ['なし', '弱', '強'][contrastSlider.value]);

    /**
     * ファイルが選択されたときの処理
     */
    function handleFileSelect(event) {
        imagePreviewArea.innerHTML = '';
        originalImages = [];
        originalImageData.clear();
        const files = Array.from(event.target.files);

        if (files.length === 0) return;

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    originalImages[index] = img; // 元のImageオブジェクトを保存
                    createImageCard(img, file.name, index);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * 画像表示用のカードを作成
     */
    function createImageCard(img, fileName, index) {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.dataset.index = index;

        const title = document.createElement('h4');
        title.textContent = fileName;

        const originalCanvas = document.createElement('canvas');
        const convertedCanvas = document.createElement('canvas');

        originalCanvas.id = `original-${index}`;
        convertedCanvas.id = `converted-${index}`;

        // 元の画像を描画 (プレビュー用に縮小)
        const originalCtx = originalCanvas.getContext('2d');
        const maxPreviewSize = 300;
        const scale = Math.min(maxPreviewSize / img.width, maxPreviewSize / img.height, 1);
        originalCanvas.width = img.width * scale;
        originalCanvas.height = img.height * scale;
        originalCtx.drawImage(img, 0, 0, originalCanvas.width, originalCanvas.height);

        // 変換後キャンバスの初期化
        const convertedCtx = convertedCanvas.getContext('2d');
        convertedCanvas.width = originalCanvas.width;
        convertedCanvas.height = originalCanvas.height;
        convertedCtx.fillStyle = '#f0f0f0';
        convertedCtx.fillRect(0, 0, convertedCanvas.width, convertedCanvas.height);
        convertedCtx.fillStyle = 'black';
        convertedCtx.textAlign = 'center';
        convertedCtx.font = '14px sans-serif';
        convertedCtx.fillText('変換待機中', convertedCanvas.width / 2, convertedCanvas.height / 2);

        // 個別ダウンロードボタン
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = 'DL';
        downloadBtn.disabled = true;
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            downloadSingleImage(index);
        };

        // クリックでモーダル表示
        card.onclick = () => showModal(index);

        card.appendChild(title);
        card.appendChild(downloadBtn);

        const canvasesContainer = document.createElement('div');
        canvasesContainer.style.display = 'flex';
        canvasesContainer.style.gap = '10px';
        canvasesContainer.style.justifyContent = 'space-between';

        const originalContainer = document.createElement('div');
        originalContainer.style.textAlign = 'center';
        originalContainer.appendChild(document.createTextNode('元画像'));
        originalContainer.appendChild(originalCanvas);

        const convertedContainer = document.createElement('div');
        convertedContainer.style.textAlign = 'center';
        convertedContainer.appendChild(document.createTextNode('変換後'));
        convertedContainer.appendChild(convertedCanvas);

        canvasesContainer.appendChild(originalContainer);
        canvasesContainer.appendChild(convertedContainer);

        card.appendChild(canvasesContainer);
        imagePreviewArea.appendChild(card);
    }

    /**
     * 画像変換処理のメイン関数
     */
    async function processImages() {
        if (originalImages.length === 0) {
            alert('画像を選択してください。');
            return;
        }

        showProcessingIndicator(true);
        processedImages.clear();

        const settings = {
            colors: parseInt(colorCountSlider.value, 10),
            pixelSize: parseInt(dotSizeSlider.value, 10),
            dithering: ditheringSelect.value,
            saturation: parseInt(saturationSlider.value, 10),
            contrast: parseInt(contrastSlider.value, 10),
            transparentCorner: transparentCornerSelect.value,
        };

        console.log('変換設定:', settings);

        for (let i = 0; i < originalImages.length; i++) {
            const img = originalImages[i];

            // 元の解像度でImageDataを取得
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, img.width, img.height);

            // 元画像のImageDataを保存
            originalImageData.set(i, imageData);

            await new Promise(resolve => setTimeout(resolve, 0));

            const convertedImageData = convertToPixelArt(imageData, settings);

            // プレビュー用の変換後キャンバスに表示
            const convertedCanvasPreview = document.getElementById(`converted-${i}`);
            const convertedCtxPreview = convertedCanvasPreview.getContext('2d');
            convertedCanvasPreview.width = convertedImageData.width;
            convertedCanvasPreview.height = convertedImageData.height;
            convertedCtxPreview.imageSmoothingEnabled = false;

            // 縮小してプレビュー表示
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = convertedImageData.width;
            previewCanvas.height = convertedImageData.height;
            previewCanvas.getContext('2d').putImageData(convertedImageData, 0, 0);

            const maxPreviewSize = 300;
            const scale = Math.min(maxPreviewSize / img.width, maxPreviewSize / img.height, 1);
            convertedCanvasPreview.width = img.width * scale;
            convertedCanvasPreview.height = img.height * scale;
            convertedCtxPreview.drawImage(previewCanvas, 0, 0, convertedCanvasPreview.width, convertedCanvasPreview.height);

            // ダウンロード用にフル解像度の変換後Canvasを保存
            const fullResCanvas = document.createElement('canvas');
            fullResCanvas.width = convertedImageData.width;
            fullResCanvas.height = convertedImageData.height;
            fullResCanvas.getContext('2d').putImageData(convertedImageData, 0, 0);
            processedImages.set(i, fullResCanvas);

            // ダウンロードボタンを有効化
            const downloadBtn = document.querySelector(`[data-index="${i}"] .download-btn`);
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
        }

        showProcessingIndicator(false);
        alert('変換が完了しました。');
    }

    /**
     * 画像をピクセルアートに変換するコアロジック（改良版）
     */
    function convertToPixelArt(imageData, settings) {
        const { width, height, data } = imageData;
        const { pixelSize, colors, dithering, saturation, contrast, transparentCorner } = settings;

        // 0. 透過色の取得
        let transparentColor = null;
        if (transparentCorner !== 'none') {
            let x = 0, y = 0;
            if (transparentCorner === 'top-right') x = width - 1;
            if (transparentCorner === 'bottom-left') y = height - 1;
            if (transparentCorner === 'bottom-right') { x = width - 1; y = height - 1; }
            const i = (y * width + x) * 4;
            transparentColor = [data[i], data[i + 1], data[i + 2]];
        }

        // 1. 画像調整
        let adjustedData = applyImageAdjustments(data, width * height, saturation, contrast);

        // 2. 平滑化フィルター（元記事の説明に基づく）
        adjustedData = applySmoothingFilter(adjustedData, width, height);

        // 3. ピクセル化（ダウンサンプリング）
        const smallWidth = Math.max(1, Math.floor(width / pixelSize));
        const smallHeight = Math.max(1, Math.floor(height / pixelSize));

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = smallWidth;
        tempCanvas.height = smallHeight;

        const scaledImageData = new ImageData(adjustedData, width, height);
        const tempImgCanvas = document.createElement('canvas');
        tempImgCanvas.width = width;
        tempImgCanvas.height = height;
        tempImgCanvas.getContext('2d').putImageData(scaledImageData, 0, 0);
        tempCtx.drawImage(tempImgCanvas, 0, 0, smallWidth, smallHeight);

        const smallImageData = tempCtx.getImageData(0, 0, smallWidth, smallHeight);
        const pixelData = smallImageData.data;

        // 4. 改良されたk-means法による減色
        const palette = improvedKMeansQuantization(pixelData, colors);
        const quantizedData = new Uint8ClampedArray(pixelData.length);
        const ditheringMatrix = getDitheringMatrix(dithering);

        for (let i = 0; i < pixelData.length; i += 4) {
            const x = (i / 4) % smallWidth;
            const y = Math.floor((i / 4) / smallWidth);
            const originalColor = [pixelData[i], pixelData[i + 1], pixelData[i + 2]];

            let ditheredColor = [...originalColor];
            if (dithering !== 'none') {
                const ditherValue = ditheringMatrix[y % ditheringMatrix.length][x % ditheringMatrix[0].length];
                ditheredColor = originalColor.map(c => Math.min(255, c + ditherValue));
            }

            const closestColor = findClosestColor(ditheredColor, palette);
            quantizedData[i] = closestColor[0];
            quantizedData[i + 1] = closestColor[1];
            quantizedData[i + 2] = closestColor[2];
            quantizedData[i + 3] = pixelData[i + 3];
        }

        // 5. アップサンプリング
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = width;
        finalCanvas.height = height;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.imageSmoothingEnabled = false;

        const quantizedSmallImageData = new ImageData(quantizedData, smallWidth, smallHeight);
        const tempQuantizedCanvas = document.createElement('canvas');
        tempQuantizedCanvas.width = smallWidth;
        tempQuantizedCanvas.height = smallHeight;
        tempQuantizedCanvas.getContext('2d').putImageData(quantizedSmallImageData, 0, 0);

        finalCtx.drawImage(tempQuantizedCanvas, 0, 0, width, height);

        let finalImageData = finalCtx.getImageData(0, 0, width, height);

        // 6. 透過処理
        if (transparentColor) {
            const finalData = finalImageData.data;
            const closestTransparent = findClosestColor(transparentColor, palette);
            for (let i = 0; i < finalData.length; i += 4) {
                if (finalData[i] === closestTransparent[0] &&
                    finalData[i + 1] === closestTransparent[1] &&
                    finalData[i + 2] === closestTransparent[2]) {
                    finalData[i + 3] = 0; // Alphaを0に
                }
            }
        }

        return finalImageData;
    }

    /**
     * 平滑化フィルター（元記事の説明に基づく）
     */
    function applySmoothingFilter(data, width, height) {
        const smoothedData = new Uint8ClampedArray(data.length);
        const kernel = [
            [1, 1, 1],
            [1, 2, 1],
            [1, 1, 1]
        ];
        const kernelSum = 10;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                let r = 0, g = 0, b = 0;

                // 3x3カーネルを適用
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const nx = Math.max(0, Math.min(width - 1, x + kx));
                        const ny = Math.max(0, Math.min(height - 1, y + ky));
                        const ni = (ny * width + nx) * 4;
                        const weight = kernel[ky + 1][kx + 1];

                        r += data[ni] * weight;
                        g += data[ni + 1] * weight;
                        b += data[ni + 2] * weight;
                    }
                }

                smoothedData[i] = Math.round(r / kernelSum);
                smoothedData[i + 1] = Math.round(g / kernelSum);
                smoothedData[i + 2] = Math.round(b / kernelSum);
                smoothedData[i + 3] = data[i + 3]; // Alpha
            }
        }

        return smoothedData;
    }

    /**
     * 改良されたk-means法による減色
     */
    function improvedKMeansQuantization(pixelData, maxColors) {
        const pixels = [];
        for (let i = 0; i < pixelData.length; i += 4) {
            if (pixelData[i + 3] > 128) {
                pixels.push([pixelData[i], pixelData[i + 1], pixelData[i + 2]]);
            }
        }
        if (pixels.length === 0) return [[0, 0, 0]];

        // k-means法の初期化（改良版）
        const centroids = initializeCentroids(pixels, maxColors);

        // k-means法の実行
        for (let iteration = 0; iteration < 10; iteration++) {
            const clusters = new Array(maxColors).fill().map(() => []);

            // 各ピクセルを最も近いクラスタに割り当て
            for (const pixel of pixels) {
                let minDistance = Infinity;
                let closestCluster = 0;

                for (let i = 0; i < centroids.length; i++) {
                    const distance = colorDistance(pixel, centroids[i]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCluster = i;
                    }
                }
                clusters[closestCluster].push(pixel);
            }

            // クラスタの中心を更新
            let converged = true;
            for (let i = 0; i < centroids.length; i++) {
                if (clusters[i].length > 0) {
                    const newCentroid = calculateCentroid(clusters[i]);
                    if (colorDistance(centroids[i], newCentroid) > 1) {
                        converged = false;
                    }
                    centroids[i] = newCentroid;
                }
            }

            if (converged) break;
        }

        return centroids;
    }

    /**
     * k-means法の初期化（改良版）
     */
    function initializeCentroids(pixels, k) {
        if (pixels.length === 0) return [[0, 0, 0]];

        // 最初のセントロイドをランダムに選択
        const centroids = [pixels[Math.floor(Math.random() * pixels.length)]];

        // k-means++法で残りのセントロイドを選択
        for (let i = 1; i < k; i++) {
            const distances = pixels.map(pixel => {
                const minDistance = Math.min(...centroids.map(centroid =>
                    colorDistance(pixel, centroid)
                ));
                return minDistance * minDistance; // 距離の二乗
            });

            const totalDistance = distances.reduce((sum, d) => sum + d, 0);
            let random = Math.random() * totalDistance;

            for (let j = 0; j < pixels.length; j++) {
                random -= distances[j];
                if (random <= 0) {
                    centroids.push(pixels[j]);
                    break;
                }
            }
        }

        return centroids;
    }

    /**
     * 色の距離を計算
     */
    function colorDistance(color1, color2) {
        return Math.sqrt(
            Math.pow(color1[0] - color2[0], 2) +
            Math.pow(color1[1] - color2[1], 2) +
            Math.pow(color1[2] - color2[2], 2)
        );
    }

    /**
     * クラスタの中心を計算
     */
    function calculateCentroid(cluster) {
        if (cluster.length === 0) return [0, 0, 0];

        const sum = cluster.reduce((acc, pixel) => {
            acc[0] += pixel[0];
            acc[1] += pixel[1];
            acc[2] += pixel[2];
            return acc;
        }, [0, 0, 0]);

        return [
            Math.round(sum[0] / cluster.length),
            Math.round(sum[1] / cluster.length),
            Math.round(sum[2] / cluster.length)
        ];
    }

    /**
     * 彩度とコントラストを調整
     */
    function applyImageAdjustments(data, pixelCount, saturation, contrast) {
        const satValue = [1.0, 1.5, 2.0][saturation];
        const contValue = [0, 50, 100][contrast];
        const factor = (259 * (contValue + 255)) / (255 * (259 - contValue));

        const newData = new Uint8ClampedArray(data.length);

        for (let i = 0; i < pixelCount * 4; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            if (saturation > 0) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = Math.round(gray + (r - gray) * satValue);
                g = Math.round(gray + (g - gray) * satValue);
                b = Math.round(gray + (b - gray) * satValue);
            }

            if (contrast > 0) {
                r = Math.round(factor * (r - 128) + 128);
                g = Math.round(factor * (g - 128) + 128);
                b = Math.round(factor * (b - 128) + 128);
            }

            newData[i] = Math.max(0, Math.min(255, r));
            newData[i + 1] = Math.max(0, Math.min(255, g));
            newData[i + 2] = Math.max(0, Math.min(255, b));
            newData[i + 3] = data[i + 3];
        }
        return newData;
    }

    /**
     * パレットから最も近い色を見つける
     */
    function findClosestColor(color, palette) {
        let minDistance = Infinity;
        let closestColor = palette[0];
        for (const paletteColor of palette) {
            const distance = colorDistance(color, paletteColor);
            if (distance < minDistance) {
                minDistance = distance;
                closestColor = paletteColor;
            }
        }
        return closestColor;
    }

    /**
     * ディザリング行列を取得
     */
    function getDitheringMatrix(type) {
        if (type === 'bayer') {
            const bayerMatrix = [
                [0, 8, 2, 10], [12, 4, 14, 6],
                [3, 11, 1, 9], [15, 7, 13, 5]
            ];
            const size = 4;
            return bayerMatrix.map(row => row.map(val => val * (255 / (size * size)) - 128));
        }
        return [[0]];
    }

    /**
     * モーダルを表示
     */
    function showModal(index) {
        if (!originalImageData.has(index) || !processedImages.has(index)) {
            alert('変換が完了していません。');
            return;
        }

        const originalData = originalImageData.get(index);
        const convertedCanvas = processedImages.get(index);

        // 元画像をキャンバスに描画
        const originalCanvas = document.createElement('canvas');
        originalCanvas.width = originalData.width;
        originalCanvas.height = originalData.height;
        originalCanvas.getContext('2d').putImageData(originalData, 0, 0);

        modalOriginal.src = originalCanvas.toDataURL('image/png');
        modalConverted.src = convertedCanvas.toDataURL('image/png');
        modalTitle.textContent = `画像 ${index + 1} の詳細`;
        modal.style.display = 'block';
    }

    /**
     * モーダルを閉じる
     */
    function closeModal() {
        modal.style.display = 'none';
    }

    /**
     * 個別画像をダウンロード
     */
    function downloadSingleImage(index) {
        if (!processedImages.has(index)) {
            alert('変換が完了していません。');
            return;
        }

        const canvas = processedImages.get(index);
        const link = document.createElement('a');
        link.download = `pixelated-image-${index + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    /**
     * 全画像のダウンロード処理
     */
    function downloadAllImages() {
        if (processedImages.size === 0) {
            alert('変換する画像がありません。');
            return;
        }
        processedImages.forEach((canvas, index) => {
            const link = document.createElement('a');
            link.download = `pixelated-image-${index + 1}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    /**
     * 処理中インジケーターの表示切替
     */
    function showProcessingIndicator(show) {
        processingIndicator.style.display = show ? 'block' : 'none';
        convertBtn.disabled = show;
        downloadBtn.disabled = show;
    }
});
