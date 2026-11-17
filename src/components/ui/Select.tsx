import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
}

export function Select({
  id,
  label,
  options,
  placeholder,
  error,
  hint,
  className = '',
  required,
  ...props
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-[#18392C]">
        {label}
        {required ? (
          <span className="ml-1 text-[#176B52]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={[
            'w-full min-h-[42px] appearance-none rounded-lg border bg-white pl-3.5 pr-10 py-2 text-sm text-[#18392C]',
            'transition-colors duration-150 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-[#176B52]/20 focus:border-[#176B52]',
            'disabled:bg-[#F6F8F3] disabled:text-[#64766C] disabled:cursor-not-allowed',
            error ? 'border-[#B91C1C] focus:border-[#B91C1C] focus:ring-[#B91C1C]/20' : 'border-[#D4E0D8]',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64766C]"
          aria-hidden="true"
        />
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
