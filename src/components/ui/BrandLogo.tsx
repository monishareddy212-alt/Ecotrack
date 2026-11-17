import { Leaf } from 'lucide-react';

export interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#176B52] text-white shrink-0">
        <Leaf className="h-5 w-5" aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="text-lg font-bold tracking-tight text-[#18392C]">EcoTrack</span>
      ) : null}
    </div>
  );
}
