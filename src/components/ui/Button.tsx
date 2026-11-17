import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#176B52] text-white border border-transparent hover:bg-[#18392C] active:bg-[#122B21]',
  secondary:
    'bg-[#DCEDE3] text-[#18392C] border border-transparent hover:bg-[#CCE3D5] active:bg-[#BDD8C7]',
  outline:
    'bg-white text-[#18392C] border border-[#D4E0D8] hover:bg-[#F6F8F3] hover:border-[#BCCDC2]',
  ghost:
    'bg-transparent text-[#18392C] border border-transparent hover:bg-[#DCEDE3]/60',
  danger:
    'bg-[#B91C1C] text-white border border-transparent hover:bg-[#991B1B]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs',
  md: 'min-h-[40px] px-4 py-2 text-sm',
  lg: 'min-h-[44px] px-5 py-2.5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap shrink-0',
        'transition-colors duration-150 cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
