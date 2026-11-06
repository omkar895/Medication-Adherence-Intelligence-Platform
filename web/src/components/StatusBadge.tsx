import React from 'react';

interface Props {
  status: 'taken' | 'not_taken' | 'unresolved' | 'scheduled' | 'snoozed';
  isLate?: boolean;
}

export const StatusBadge: React.FC<Props> = ({ status, isLate }) => {
  switch (status) {
    case 'taken':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-[#1E6B3A]/10 text-[#1E6B3A] border border-[#1E6B3A]/30">
          <span className="text-sm font-bold">✓</span>
          <span>Taken</span>
          {isLate && <span className="ml-1 text-[10px] uppercase font-semibold text-amber-700">(Late)</span>}
        </span>
      );
    case 'not_taken':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-[#8A2D2D]/10 text-[#8A2D2D] border border-[#8A2D2D]/30">
          <span className="text-sm font-bold">✕</span>
          <span>Not taken</span>
        </span>
      );
    case 'unresolved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-[#7A5A00]/10 text-[#7A5A00] border border-dashed border-[#7A5A00]/50">
          <span className="text-sm font-bold">◌</span>
          <span>Unresolved</span>
        </span>
      );
    case 'snoozed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-[#3B4A8A]/10 text-[#3B4A8A] border border-[#3B4A8A]/30">
          <span className="text-sm">◷</span>
          <span>Snoozed</span>
        </span>
      );
    case 'scheduled':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-neutral-100 text-[#4A5159] border border-neutral-300">
          <span className="text-sm">○</span>
          <span>Scheduled</span>
        </span>
      );
  }
};

