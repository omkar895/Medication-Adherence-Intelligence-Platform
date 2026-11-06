import React from 'react';

interface Props {
  status: 'taken' | 'not_taken' | 'unresolved' | 'scheduled' | 'snoozed';
  isLate?: boolean;
}

export const StatusBadge: React.FC<Props> = ({ status, isLate }) => {
  switch (status) {
    case 'taken':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold bg-[#1E6B3A]/10 dark:bg-[#2FA85C]/20 text-[#1E6B3A] dark:text-[#2FA85C] border border-[#1E6B3A]/30 dark:border-[#2FA85C]/40 shadow-2xs">
          <span className="text-sm font-bold leading-none">✓</span>
          <span>Taken</span>
          {isLate && (
            <span className="ml-1 text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400">
              (Late)
            </span>
          )}
        </span>
      );
    case 'not_taken':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold bg-[#8A2D2D]/10 dark:bg-[#C94A4A]/20 text-[#8A2D2D] dark:text-[#E56363] border border-[#8A2D2D]/30 dark:border-[#C94A4A]/40 shadow-2xs">
          <span className="text-sm font-bold leading-none">✕</span>
          <span>Not taken</span>
        </span>
      );
    case 'unresolved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold bg-[#7A5A00]/10 dark:bg-[#D4A017]/20 text-[#7A5A00] dark:text-[#E6B83B] border border-dashed border-[#7A5A00]/50 dark:border-[#D4A017]/60 shadow-2xs">
          <span className="text-sm font-bold leading-none">◌</span>
          <span>Unresolved</span>
        </span>
      );
    case 'snoozed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold bg-[#3B4A8A]/10 dark:bg-[#5C72D6]/20 text-[#3B4A8A] dark:text-[#889AEB] border border-[#3B4A8A]/30 dark:border-[#5C72D6]/40 shadow-2xs">
          <span className="text-sm leading-none">◷</span>
          <span>Snoozed</span>
        </span>
      );
    case 'scheduled':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium bg-neutral-100 dark:bg-[#252A2F] text-[#4A5159] dark:text-[#9EABB5] border border-neutral-300 dark:border-[#38414A]">
          <span className="text-sm leading-none">○</span>
          <span>Scheduled</span>
        </span>
      );
  }
};
