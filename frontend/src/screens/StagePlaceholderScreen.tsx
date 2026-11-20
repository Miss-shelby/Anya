import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { AnyaMascot } from '../components/common/AnyaMascot';

interface StagePlaceholderScreenProps {
  title: string;
  stageLabel: string;
  description: string;
}

export function StagePlaceholderScreen({
  title,
  stageLabel,
  description,
}: StagePlaceholderScreenProps) {
  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader title={title} showBack backTo="/home" />
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <AnyaMascot size="sm" />
        <span className="mt-4 rounded-full bg-anya-soft px-3.5 py-1 text-xs font-bold text-anya-primary">
          {stageLabel}
        </span>
        <h2 className="mt-2 text-lg font-extrabold text-anya-ink">{title}</h2>
        <p className="mt-1.5 max-w-[280px] text-sm leading-relaxed text-anya-muted">
          {description}
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
