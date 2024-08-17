// アプリケーションのバージョンをコンソールに出力
console.log(`RGB QR Code Reader version ${APP_VERSION}`);

// グローバル変数
let video, canvas, ctx, cameraStateText, resultText;
let currentChannel = 'R';
let channelData = { R: null, G: null, B: null };
let lastReadTime = 0;
const TIMEOUT = 1000; // 1秒のタイムアウト
const DEBUG = true; // デバッグモードフラグ


document.addEventListener('DOMContentLoaded', () => {

    function debugLog(message) {
        if (DEBUG) {
            console.log(`[DEBUG] ${message}`);
        }
    }
    
    function initializeCamera() {
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 },
                aspectRatio: { ideal: 1.777778 }
            }
        };
    
        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
                    processFrame();
                };
            })
            .catch(error => {
                console.error('Error accessing the camera:', error);
                cameraStateText.textContent = `Error: ${error.message}`;
            });
    }

    function decodeQRCode(imageData) {
        try {
            let src = cv.matFromImageData(imageData);
            let gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            
            let qrCodeDetector = new cv.QRCodeDetector();
            let decoded = qrCodeDetector.detectAndDecode(gray);
            
            src.delete();
            gray.delete();
    
            return decoded.decodedText || null;
        } catch (error) {
            console.error('Error decoding QR code:', error);
            return null;
        }
    }
    
    function processFrame() {
        if (video.paused || video.ended) return;
    
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            requestAnimationFrame(processFrame);
            return;
        }
    
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
    
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            debugLog(`Processing frame: ${canvas.width}x${canvas.height}`);
            const code = decodeQRCode(imageData);
    
            if (code) {
                debugLog(`Decoded QR code: ${code}`);
                resultText.textContent = `Decoded: ${code}`;
            } else {
                debugLog('No QR code detected in this frame');
            }
        } catch (error) {
            console.error('Error processing frame:', error);
        }
    
        requestAnimationFrame(processFrame);
    }
    
    document.getElementById('startCamera').addEventListener('click', initializeCamera);
});

// OpenCV.js の読み込み完了を確認
function onOpenCvReady() {
    console.log('OpenCV.js is ready');
    document.getElementById('startCamera').disabled = false;
}

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