// アプリケーションのバージョンをコンソールに出力
console.log(`RGB QR Code Reader version ${APP_VERSION}`);

// グローバル変数
let video, canvas, ctx, cameraStateText, resultText;
let currentChannel = 'R';
let channelData = { R: null, G: null, B: null };
let lastReadTime = 0;
const TIMEOUT = 1000; // 1秒のタイムアウト

document.addEventListener('DOMContentLoaded', () => {
    function initializeCamera() {
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        cameraStateText = document.getElementById('camera-state');
        resultText = document.getElementById('result');
    
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    // video要素のサイズが設定された後にcanvasのサイズを設定
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    processFrame();
                };
            })
            .catch(error => {
                console.error('Error accessing the camera:', error);
                cameraStateText.textContent = `Error: ${error.message}`;
            });
    }
    
    function processFrame() {
        if (video.paused || video.ended) return;
    
        // video要素のサイズが有効かチェック
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            requestAnimationFrame(processFrame);
            return;
        }
    
        // canvasのサイズをvideo要素に合わせて更新
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
    
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = decodeQRCode(imageData, currentChannel);
    
            if (code) {
                const currentTime = Date.now();
                if (currentTime - lastReadTime > TIMEOUT) {
                    // タイムアウトしたらリセット
                    channelData = { R: null, G: null, B: null };
                    currentChannel = 'R';
                }
    
                channelData[currentChannel] = code;
                lastReadTime = currentTime;
    
                if (currentChannel === 'R') {
                    currentChannel = 'G';
                } else if (currentChannel === 'G') {
                    currentChannel = 'B';
                } else if (currentChannel === 'B') {
                    // 全チャンネル読み取り完了
                    const fullCode = channelData.R + channelData.G + channelData.B;
                    resultText.textContent = `Decoded: ${fullCode}`;
                    return; // 読み取り完了
                }
    
                cameraStateText.textContent = `Read ${currentChannel} channel. Waiting for next...`;
            } else {
                cameraStateText.textContent = `Scanning ${currentChannel} channel...`;
            }
        } catch (error) {
            console.error('Error processing frame:', error);
            cameraStateText.textContent = 'Error processing frame. Retrying...';
        }
    
        requestAnimationFrame(processFrame);
    }
    
    function decodeQRCode(imageData, channel) {
        // チャンネルに応じてイメージデータをフィルタリング
        const filteredData = new Uint8ClampedArray(imageData.data.length);
        for (let i = 0; i < imageData.data.length; i += 4) {
            if (channel === 'R') {
                filteredData[i] = imageData.data[i];
                filteredData[i + 1] = filteredData[i + 2] = 0;
            } else if (channel === 'G') {
                filteredData[i + 1] = imageData.data[i + 1];
                filteredData[i] = filteredData[i + 2] = 0;
            } else if (channel === 'B') {
                filteredData[i + 2] = imageData.data[i + 2];
                filteredData[i] = filteredData[i + 1] = 0;
            }
            filteredData[i + 3] = 255; // アルファチャンネル
        }
    
        const filteredImageData = new ImageData(filteredData, imageData.width, imageData.height);
        
        // OpenCV.jsを使用してQRコードをデコード
        let src = cv.matFromImageData(filteredImageData);
        let dst = new cv.Mat();
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        
        let qrCodeDetector = new cv.QRCodeDetector();
        let decoded = qrCodeDetector.detectAndDecode(dst);
        
        src.delete();
        dst.delete();
    
        return decoded.decodedText || null;
    }
    
    // カメラ起動ボタンのイベントリスナー
    document.getElementById('startCamera').addEventListener('click', initializeCamera);
});

// サービスワーカーの登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/rgb-qr-reader-pwa/service-worker.js').then(function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function(err) {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}