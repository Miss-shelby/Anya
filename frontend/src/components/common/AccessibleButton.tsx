import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'anya-cta-gradient text-white shadow-cta font-bold',
  secondary: 'bg-anya-soft text-anya-ink hover:bg-anya-softHover font-semibold',
  outline:
    'border-2 border-anya-primary bg-white text-anya-primary hover:bg-anya-soft font-bold',
  danger: 'bg-anya-danger text-white hover:opacity-95 font-bold',
};

export function AccessibleButton({
  variant = 'primary',
  fullWidth = true,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: AccessibleButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-base transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
        VARIANT_CLASSES[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
