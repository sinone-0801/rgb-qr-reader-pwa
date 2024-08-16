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
                    video.addEventListener('loadedmetadata', () => {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        processFrame();
                    });
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
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            requestAnimationFrame(processFrame);
            return;
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
            let src = cv.imread('canvas');
            let results = readRgbQrCode(src);
            src.delete();
            
            if (results) {
                resultText.textContent = "Decoded data: " + results;
                stopCamera(); // QRコードが検出されたらカメラを停止
            } else {
                resultText.textContent = "Scanning for QR codes...";
                requestAnimationFrame(processFrame);
            }
        } catch (error) {
            console.error('Error processing frame:', error);
            requestAnimationFrame(processFrame);
        }
    }

    function readRgbQrCode(src) {
        let channels = new cv.MatVector();
        cv.split(src, channels);
        
        let qrCodeDetector = new cv.QRCodeDetector();
        let decodedResults = [];

        for (let i = 0; i < 3; i++) {
            let points = new cv.Mat();
            let result = qrCodeDetector.detect(channels.get(i), points);
            
            if (result) {
                let decodedInfo = new cv.Mat();
                let straightQrCode = new cv.Mat();
                let data = qrCodeDetector.decode(channels.get(i), points, straightQrCode);
                if (data) {
                    decodedResults.push(data.replace(/\\+$/, '')); // 末尾の \\ をトリム
                }
                decodedInfo.delete();
                straightQrCode.delete();
            }
            points.delete();
        }

        channels.delete();

        if (decodedResults.length === 3) {
            return decodedResults.join('');
        }
        return null;
    }

    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
});

function onOpenCvReady() {
    console.log('OpenCV.js is ready');
    document.getElementById('startCamera').disabled = false;
}