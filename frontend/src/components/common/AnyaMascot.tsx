import type { AssistantStatus } from '../../types/assistant';

interface AnyaMascotProps {
  size?: 'sm' | 'md' | 'lg';
  status?: AssistantStatus;
  className?: string;
}

const SIZE_MAP = {
  sm: 'h-20 w-20',
  md: 'h-32 w-32',
  lg: 'h-44 w-44',
};

export function AnyaMascot({ size = 'md', status = 'idle', className = '' }: AnyaMascotProps) {
  const ringClass =
    status === 'listening'
      ? 'ring-4 ring-anya-primary ring-offset-4 ring-offset-anya-bg'
      : status === 'processing'
        ? 'ring-4 ring-anya-primaryLight ring-offset-4 ring-offset-anya-bg'
        : status === 'speaking'
          ? 'ring-4 ring-anya-success ring-offset-4 ring-offset-anya-bg'
          : 'ring-2 ring-white/80';

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-full bg-[#EDE9FE] shadow-card transition-all ${SIZE_MAP[size]} ${ringClass} ${className}`}
    >
      <img
        src="/anya-mascot.jpg"
        alt="ANYA, your purple AI companion mascot waving hello"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
