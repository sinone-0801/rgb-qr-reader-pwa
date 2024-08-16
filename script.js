document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const resultText = document.getElementById('result');
    const startButton = document.getElementById('startCamera');
    const stopButton = document.getElementById('stopCamera');
    let stream;

    function startCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(str => {
                    stream = str;
                    video.srcObject = stream;
                    video.play();
                    startButton.style.display = 'none';
                    stopButton.style.display = 'inline-block';
                    resultText.textContent = 'Camera started. Scanning for QR codes...';
                    processFrame();
                })
                .catch(error => {
                    console.error('Error accessing the camera:', error);
                    resultText.textContent = `Error: ${error.message}`;
                });
        } else {
            resultText.textContent = 'getUserMedia is not supported in this browser';
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            startButton.style.display = 'inline-block';
            stopButton.style.display = 'none';
            resultText.textContent = 'Camera stopped';
        }
    }

    function processFrame() {
        if (video.paused || video.ended) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // ここで OpenCV.js を使用して QR コードを検出・デコードする処理を実装
        // 実装例：
        // let src = cv.imread('canvas');
        // let results = readRgbQrCode(src);
        // src.delete();
        
        // if (results && results.length > 0) {
        //     resultText.textContent = "Decoded data: " + results.join(', ');
        // } else {
        //     resultText.textContent = "Scanning for QR codes...";
        // }

        requestAnimationFrame(processFrame);
    }

    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
});

function onOpenCvReady() {
    console.log('OpenCV.js is ready');
    document.getElementById('startCamera').disabled = false;
}
