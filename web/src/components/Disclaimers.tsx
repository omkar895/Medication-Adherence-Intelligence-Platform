import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export const SyntheticBanner: React.FC = () => (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
    <div className="flex items-center gap-1.5">
      <span className="font-semibold uppercase tracking-wider text-[11px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950">
        Synthetic Demo
      </span>
      <span>All medications, times, and adherence records in this session are generated for demonstration.</span>
    </div>
    <span className="hidden sm:inline text-amber-700 text-[11px]">PS-05 Compliant</span>
  </div>
);

export const ClinicalSafetyFooter: React.FC = () => (
  <footer className="mt-12 mb-20 border-t border-[#D9D5CA] pt-4 px-4 text-center text-xs text-[#4A5159] space-y-1">
    <div className="flex items-center justify-center gap-1 text-[#0F5C5A] font-medium">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>Clinical Record Disclosure</span>
    </div>
    <p>
      Based solely on what was recorded in this application. All confirmed intakes are self-reported and not clinically verified.
    </p>
    <p className="font-medium text-neutral-700">
      This product does not provide medical guidance or missed-dose instructions. For any questions regarding your prescription, consult your doctor or pharmacist.
    </p>
  </footer>
);

export const SyncStatusBar: React.FC<{
  status: 'online' | 'offline' | 'syncing' | 'failed';
  pendingCount: number;
  onRetry?: () => void;
}> = ({ status, pendingCount, onRetry }) => {
  return (
    <div className="bg-[#FFFFFF] border-b border-[#D9D5CA] px-4 py-1 flex items-center justify-between text-xs text-[#4A5159]">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'online'
              ? 'bg-emerald-600'
              : status === 'syncing'
              ? 'bg-amber-500 animate-pulse'
              : status === 'offline'
              ? 'bg-neutral-400'
              : 'bg-rose-600'
          }`}
        />
        <span className="font-medium capitalize">{status}</span>
        {pendingCount > 0 && (
          <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded text-[11px]">
            {pendingCount} pending offline {pendingCount === 1 ? 'sync' : 'syncs'}
          </span>
        )}
      </div>
      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-[#0F5C5A] underline hover:text-teal-800 font-medium"
        >
          Retry sync
        </button>
      )}
    </div>
  );
};
