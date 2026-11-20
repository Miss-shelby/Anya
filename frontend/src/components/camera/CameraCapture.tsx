import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Upload, RotateCcw, AlertCircle, ShieldCheck } from 'lucide-react';
import { AccessibleButton } from '../common/AccessibleButton';
import { useSpeech } from '../../context/SpeechContext';

interface CameraCaptureProps {
  onImageReady: (blob: Blob) => void;
  isProcessing?: boolean;
  actionLabel?: string;
  guidanceText?: string;
  autoCapture?: boolean;
}

/**
 * Privacy-first, accessible camera capture component with photo upload fallback
 * and hands-free auto-capture mode for blind users triggered via voice.
 */
export function CameraCapture({
  onImageReady,
  isProcessing = false,
  actionLabel = 'Capture Photo',
  guidanceText = 'Hold your phone steady above the item in clear lighting.',
  autoCapture = false,
}: CameraCaptureProps) {
  const { speak } = useSpeech();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoStartedRef = useRef(false);
  const countdownTimerRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  const stopCamera = useCallback(() => {
    clearCountdown();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, [clearCountdown]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [stopCamera, previewUrl]);

  const handleCaptureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setCapturedBlob(blob);
        onImageReady(blob);
      },
      'image/jpeg',
      0.9
    );
  }, [onImageReady, previewUrl, stopCamera]);

  const startCamera = useCallback(
    async (withAutoCountdown = false) => {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const msg =
          'Live camera is not available in this browser. Use Upload Photo below instead.';
        setCameraError(msg);
        if (withAutoCountdown) speak(msg, { force: true });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
        setCameraActive(true);
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play();
          }
        });

        if (withAutoCountdown) {
          let secondsLeft = 3;
          setCountdown(secondsLeft);
          speak('Camera is open. Hold steady, capturing in 3 seconds.', { force: true });

          countdownTimerRef.current = window.setInterval(() => {
            secondsLeft -= 1;
            if (secondsLeft > 0) {
              setCountdown(secondsLeft);
            } else {
              clearCountdown();
              handleCaptureFrame();
            }
          }, 1100);
        }
      } catch {
        const msg =
          'Camera permission was denied or no camera was found. You can still upload a photo below.';
        setCameraError(msg);
        if (withAutoCountdown) speak(msg, { force: true });
      }
    },
    [clearCountdown, handleCaptureFrame, speak]
  );

  // Hands-free auto-capture when routed from a voice command
  useEffect(() => {
    if (autoCapture && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void startCamera(true);
    }
  }, [autoCapture, startCamera]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setCameraError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCapturedBlob(file);
    onImageReady(file);
    e.target.value = '';
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setCameraError(null);
    void startCamera(false);
  };

  return (
    <div className="space-y-3">
      <div className="anya-card relative overflow-hidden rounded-3xl border border-anya-border bg-[#171426] shadow-card">
        {cameraActive ? (
          <div className="relative aspect-[4/3] w-full">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
              aria-label="Live camera preview"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-dashed border-white/75"
            />
            {countdown !== null && (
              <div
                role="status"
                aria-live="assertive"
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white"
              >
                <span className="text-5xl font-extrabold">{countdown}</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-wider">
                  Hold steady — auto-capturing
                </span>
              </div>
            )}
          </div>
        ) : previewUrl ? (
          <div className="relative aspect-[4/3] w-full">
            <img
              src={previewUrl}
              alt="Captured photo for ANYA analysis"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-anya-soft/60 px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-anya-primary shadow-card">
              <Camera className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-bold text-anya-ink">Camera is off</p>
            <p className="mt-1 text-xs leading-relaxed text-anya-muted">{guidanceText}</p>
          </div>
        )}
      </div>

      {cameraActive ? (
        <div className="grid grid-cols-1 gap-2.5">
          <AccessibleButton
            variant="primary"
            disabled={isProcessing}
            onClick={() => {
              clearCountdown();
              handleCaptureFrame();
            }}
            icon={<Camera className="h-5 w-5" />}
          >
            {actionLabel}
          </AccessibleButton>
          <AccessibleButton variant="secondary" disabled={isProcessing} onClick={stopCamera}>
            Close Camera
          </AccessibleButton>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <AccessibleButton
            variant="primary"
            disabled={isProcessing}
            onClick={capturedBlob ? handleRetake : () => void startCamera(false)}
            icon={capturedBlob ? <RotateCcw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          >
            {capturedBlob ? 'Retake' : 'Open Camera'}
          </AccessibleButton>
          <AccessibleButton
            variant="secondary"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="h-4 w-4" />}
          >
            Upload Photo
          </AccessibleButton>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="sr-only"
        aria-label="Upload an image from your device"
      />

      {cameraError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-anya-danger/30 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-anya-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{cameraError}</span>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-2xl bg-anya-soft/70 px-3.5 py-2 text-[11px] text-anya-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-anya-primary" aria-hidden="true" />
        <span>Photos are analyzed in memory and never stored on the server.</span>
      </div>
    </div>
  );
}
