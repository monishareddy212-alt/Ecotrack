import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  rightAdornment?: React.ReactNode;
}

export function Input({
  id,
  label,
  error,
  hint,
  rightAdornment,
  className = '',
  required,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[#18392C]">
        {label}
        {required ? (
          <span className="ml-1 text-[#176B52]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div className="relative flex items-center">
        <input
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={[
            'w-full min-h-[42px] rounded-lg border bg-white px-3.5 py-2 text-sm text-[#18392C]',
            'placeholder:text-[#8A9A91] transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#176B52]/20 focus:border-[#176B52]',
            'disabled:bg-[#F6F8F3] disabled:text-[#64766C] disabled:cursor-not-allowed',
            error ? 'border-[#B91C1C] focus:border-[#B91C1C] focus:ring-[#B91C1C]/20' : 'border-[#D4E0D8]',
            rightAdornment ? 'pr-16' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {rightAdornment ? (
          <div className="absolute right-2.5 flex items-center">{rightAdornment}</div>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-[#B91C1C]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-[#64766C]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
