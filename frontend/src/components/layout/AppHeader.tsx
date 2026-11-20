import { useNavigate } from 'react-router-dom';
import { ChevronLeft, VolumeX } from 'lucide-react';
import { useSpeech } from '../../context/SpeechContext';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  backTo?: string;
  progress?: number; // 0 to 100 for onboarding/setup progress bar matching design reference
  rightSlot?: React.ReactNode;
}

export function AppHeader({
  title,
  showBack = true,
  backTo,
  progress,
  rightSlot,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { isSpeaking, stopSpeaking } = useSpeech();

  const handleBack = () => {
    stopSpeaking();
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
      <div className="flex min-w-[44px] items-center">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-anya-ink shadow-card transition-colors hover:bg-anya-soft"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
        )}
      </div>

      {typeof progress === 'number' ? (
        <div
          className="mx-2 h-1.5 flex-1 overflow-hidden rounded-full bg-anya-soft"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Setup progress"
        >
          <div
            className="h-full rounded-full bg-anya-primary transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : title ? (
        <h1 className="truncate text-base font-bold text-anya-ink">{title}</h1>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex min-w-[44px] items-center justify-end gap-2">
        {isSpeaking && (
          <button
            type="button"
            onClick={stopSpeaking}
            aria-label="Stop ANYA from speaking"
            className="flex h-11 items-center gap-1.5 rounded-full bg-anya-danger px-3 text-xs font-bold text-white shadow-card transition-opacity hover:opacity-95"
          >
            <VolumeX className="h-4 w-4" aria-hidden="true" />
            <span>Stop</span>
          </button>
        )}
        {rightSlot}
      </div>
    </header>
  );
}
