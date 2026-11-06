import React from 'react';
import { AlertCircle, ShieldCheck, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const SyntheticBanner: React.FC = () => (
  <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/80 px-4 py-1.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between transition-colors">
    <div className="flex items-center gap-2">
      <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 px-1.5 py-0.5 rounded font-mono border border-amber-300 dark:border-amber-700">
        SYNTHETIC DATA
      </span>
      <span className="text-[11px] leading-snug">
        All medications, times, and adherence records in this session are generated for demonstration.
      </span>
    </div>
    <span className="hidden sm:inline text-amber-800 dark:text-amber-300 font-mono text-[11px]">
      PS-05 Compliant
    </span>
  </div>
);

export const ClinicalSafetyFooter: React.FC = () => (
  <footer className="mt-14 mb-20 border-t border-[#D9D5CA] dark:border-[#2E363D] pt-5 px-4 text-center text-xs text-[#4A5159] dark:text-[#9EABB5] space-y-1.5 transition-colors">
    <div className="flex items-center justify-center gap-1.5 text-[#0F5C5A] dark:text-[#1EB8B4] font-semibold text-xs tracking-wide uppercase">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>Clinical Record Disclosure</span>
    </div>
    <p className="max-w-xl mx-auto leading-relaxed">
      Based solely on what was recorded in this application. All confirmed intakes are self-reported and not clinically verified.
    </p>
    <p className="font-medium text-neutral-700 dark:text-neutral-300 max-w-xl mx-auto text-[11px]">
      This platform does not provide medical advice or missed-dose instructions. For any questions regarding your prescription, consult your doctor or pharmacist.
    </p>
  </footer>
);

export const SyncStatusBar: React.FC<{
  status: 'online' | 'offline' | 'syncing' | 'failed';
  pendingCount: number;
  onRetry?: () => void;
}> = ({ status, pendingCount, onRetry }) => {
  return (
    <div className="bg-white dark:bg-[#1A1D20] border-b border-[#D9D5CA] dark:border-[#2E363D] px-4 py-1.5 flex items-center justify-between text-xs text-[#4A5159] dark:text-[#9EABB5] transition-colors">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'online'
              ? 'bg-emerald-600 dark:bg-emerald-400'
              : status === 'syncing'
              ? 'bg-amber-500 animate-pulse'
              : status === 'offline'
              ? 'bg-neutral-400 dark:bg-neutral-600'
              : 'bg-rose-600 dark:bg-rose-400'
          }`}
        />
        <span className="font-medium capitalize text-[11px]">
          System Status: {status}
        </span>
        {pendingCount > 0 && (
          <span className="text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-1.5 py-0.2 rounded text-[10px] font-mono">
            {pendingCount} offline {pendingCount === 1 ? 'record' : 'records'} pending sync
          </span>
        )}
      </div>
      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-[#0F5C5A] dark:text-[#1EB8B4] underline hover:opacity-80 font-medium flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry sync
        </button>
      )}
    </div>
  );
};
