document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraStateText = document.getElementById('camera-state');
    const resultText = document.getElementById('result');
    const startButton = document.getElementById('startCamera');
    const stopButton = document.getElementById('stopCamera');
    const rOk = document.getElementById('r_ok');
    const gOk = document.getElementById('g_ok');
    const bOk = document.getElementById('b_ok');
    let stream;

    // OpenCVの読み込みを待つ
    function onOpenCvReady() {
        console.log('OpenCV.js is ready');
        startButton.style.display = 'inline-block';
    }

    // グローバルスコープにonOpenCvReady関数を追加
    window.onOpenCvReady = onOpenCvReady;

    // 初期状態でStartCameraボタンを非表示にする
    startButton.style.display = 'none';

    function startCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 720 },
                    height: { ideal: 720 }
                } 
            })
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
            clearChannelStatus();
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
                stopCamera();
            } else {
                cameraStateText.textContent = "Scanning for QR codes...";
                requestAnimationFrame(processFrame);
            }
        } catch (error) {
            cameraStateText.textContent = "Error processing frame. Retrying...";
            requestAnimationFrame(processFrame);
        }
    }

    function readRgbQrCode(src) {
        let channels = new cv.MatVector();
        cv.split(src, channels);
        
        let qrCodeDetector = new cv.QRCodeDetector();
        let decodedResults = [];
    
        clearChannelStatus();
    
        for (let i = 0; i < 3; i++) {
            let points = new cv.Mat();
            let result = qrCodeDetector.detect(channels.get(i), points);
            
            if (result) {
                let decodedInfo = new cv.Mat();
                let straightQrCode = new cv.Mat();
                let data = qrCodeDetector.decode(channels.get(i), points, straightQrCode);
                if (data) {
                    // バイナリデータとして処理
                    let binaryData = new Uint8Array(data.split('').map(c => c.charCodeAt(0)));
                    decodedResults.push(binaryData);
                    updateChannelStatus(i, true);
                }
                decodedInfo.delete();
                straightQrCode.delete();
            } else {
                updateChannelStatus(i, false);
            }
            points.delete();
        }
    
        channels.delete();
    
        if (decodedResults.length === 3) {
            // 3つのチャンネルのデータを結合
            const combinedData = new Uint8Array([...decodedResults[0], ...decodedResults[1], ...decodedResults[2]]);
            // パディングを除去（0バイトを末尾から削除）
            const trimmedData = combinedData.slice(0, combinedData.findIndex(byte => byte === 0) !== -1 ? combinedData.findIndex(byte => byte === 0) : undefined);
            // UTF-8としてデコード
            return new TextDecoder('utf-8').decode(trimmedData);
        }
        return null;
    }

    function updateChannelStatus(channel, success) {
        const element = channel === 0 ? rOk : channel === 1 ? gOk : bOk;
        element.textContent = success ? '●' : '○';
    }

    function clearChannelStatus() {
        rOk.textContent = '○';
        gOk.textContent = '○';
        bOk.textContent = '○';
    }

    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
});