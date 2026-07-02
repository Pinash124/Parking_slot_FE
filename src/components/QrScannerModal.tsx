import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Quét Mã QR qua Camera / Webcam',
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset error states
    setHasCameraError(false);
    setCameraErrorMessage('');

    // Start video stream
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
          videoRef.current.play();
          animationFrameIdRef.current = requestAnimationFrame(tick);
        }
      })
      .catch((err) => {
        console.error('Camera access error:', err);
        setHasCameraError(true);
        setCameraErrorMessage('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập thiết bị.');
      });

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            console.log('QR Code successfully decoded:', code.data);
            onScanSuccess(code.data);
            stopCamera();
            onClose();
            return;
          }
        }
      }
    }
    animationFrameIdRef.current = requestAnimationFrame(tick);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 transition cursor-pointer text-xs"
          >
            ✕ Đóng
          </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
          {hasCameraError ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-xs text-rose-500 font-bold leading-relaxed">{cameraErrorMessage}</p>
            </div>
          ) : (
            <>
              {/* Native video preview */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Laser Line Scanning Indicator */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Visual scan frame box */}
                <div className="w-64 h-64 border-2 border-dashed border-indigo-400/80 rounded-2xl relative flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  {/* Glowing corners */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>

                  {/* Red animated scan bar */}
                  <div className="absolute left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_8px_#f43f5e] animate-bounce w-[85%]"></div>
                </div>
                
                <span className="text-[10px] text-slate-350 font-medium bg-slate-900/80 px-3 py-1 rounded-full mt-6 backdrop-blur">
                  Đặt mã QR vào giữa khung hình để quét
                </span>
              </div>
            </>
          )}
        </div>

        {/* Info panel */}
        <div className="p-4 bg-slate-50 text-[10px] text-slate-450 text-center leading-relaxed">
          Cam kết bảo mật. Quá trình quét và giải mã QR được xử lý trực tiếp trên trình duyệt của bạn thông qua camera cục bộ.
        </div>
      </div>
    </div>
  );
}
