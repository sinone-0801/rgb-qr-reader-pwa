// アプリケーションのバージョンをコンソールに出力
console.log(`RGB QR Code Reader version ${APP_VERSION}`);

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraStateText = document.getElementById('camera-state');
    const resultText = document.getElementById('result');
    const startButton = document.getElementById('startCamera');
    const stopButton = document.getElementById('stopCamera');
    let stream;

    // Canvas2Dのパフォーマンス警告に対処
    canvas.getContext('2d', { willReadFrequently: true });

    function startCamera() {
        if (typeof cv === 'undefined') {
            cameraStateText.textContent = 'OpenCV.js is not ready yet. Please wait.';
            return;
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(str => {
                    stream = str;
                    video.srcObject = stream;
                    video.onloadedmetadata = () => {
                        video.play();
                        startButton.style.display = 'none';
                        stopButton.style.display = 'inline-block';
                        cameraStateText.textContent = 'Camera started. Scanning for QR codes...';
                        resultText.textContent = '';
                        video.onplay = () => {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            processFrame();
                        };
                    };
                })
                .catch(error => {
                    console.error('Error accessing the camera:', error);
                    cameraStateText.textContent = `Error: ${error.message}`;
                });
        } else {
            cameraStateText.textContent = 'getUserMedia is not supported in this browser';
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            startButton.style.display = 'inline-block';
            stopButton.style.display = 'none';
            cameraStateText.textContent = 'Camera stopped';
            resultText.textContent = '';
        }
    }

    function processFrame() {
        if (video.paused || video.ended) return;
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            requestAnimationFrame(processFrame);
            return;
        }
    
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
        try {
            let src = cv.imread(canvas);
            let results = readRgbQrCode(src);
            src.delete();
            
            if (results) {
                resultText.textContent = "Decoded data: " + results;
                cameraStateText.textContent = "QR code detected. Camera stopped.";
                stopCamera(); // QRコードが検出されたらカメラを停止
            } else {
                cameraStateText.textContent = "Scanning for QR codes...";
                requestAnimationFrame(processFrame);
            }
        } catch (error) {
            console.error('Error processing frame:', error);
            cameraStateText.textContent = "Error processing frame. Retrying...";
            requestAnimationFrame(processFrame);
        }
    }
    
    function readRgbQrCode(src) {
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
        let qrCodeDetector = new cv.QRCodeDetector();
        let decodedInfo = new cv.Mat();
        let points = new cv.Mat();
        
        let result = qrCodeDetector.detectAndDecode(gray, decodedInfo, points);
        
        gray.delete();
        points.delete();
        
        if (result) {
            let data = decodedInfo.data[0];
            decodedInfo.delete();
            return data;
        }
        
        decodedInfo.delete();
        return null;
    }
    
    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
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