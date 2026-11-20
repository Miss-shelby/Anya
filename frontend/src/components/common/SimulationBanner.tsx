import { ShieldAlert } from 'lucide-react';

interface SimulationBannerProps {
  title?: string;
  message: string;
}

export function SimulationBanner({
  title = 'Simulation Mode',
  message,
}: SimulationBannerProps) {
  return (
    <div
      role="note"
      aria-label={title}
      className="flex items-start gap-2.5 rounded-2xl border-2 border-amber-400 bg-amber-50 px-3.5 py-3 text-xs text-amber-950"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-anya-warning" aria-hidden="true" />
      <div>
        <p className="font-extrabold uppercase tracking-wide text-anya-warning">{title}</p>
        <p className="mt-0.5 leading-relaxed font-medium">{message}</p>
      </div>
    </div>
  );
}
