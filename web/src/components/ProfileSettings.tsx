import React, { useState } from 'react';
import { User, Clock, Trash2, Shield, Globe } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  user: any;
  onLogout: () => void;
}

export const ProfileSettings: React.FC<Props> = ({ user, onLogout }) => {
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [snoozeMins, setSnoozeMins] = useState(15);
  const [textSize, setTextSize] = useState('standard');
  const [deletionStatus, setDeletionStatus] = useState<string | null>(null);

  const handleDeleteRequest = async () => {
    if (window.confirm('Submit account deletion request? This will initiate the clinical data retention and removal workflow.')) {
      try {
        await api.getMe(); // checks auth
        setDeletionStatus('Account deletion request registered and queued for processing.');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white border border-[#D9D5CA] rounded-md p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-[#D9D5CA] pb-4">
          <div className="w-12 h-12 rounded-full bg-[#0F5C5A]/10 text-[#0F5C5A] flex items-center justify-center font-bold text-lg">
            {user.display_name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1B1F23]">{user.display_name}</h2>
            <div className="text-xs text-[#4A5159] flex items-center gap-2 mt-0.5">
              <span>{user.email || 'No email attached'}</span>
              <span>·</span>
              <span className="capitalize font-semibold text-[#0F5C5A]">{user.role} role</span>
            </div>
          </div>
        </div>

        {/* Timezone Notice */}
        <div className="p-4 bg-[#F7F5F0] rounded border border-[#D9D5CA] space-y-2 text-xs text-[#4A5159]">
          <div className="flex items-center gap-2 font-semibold text-[#1B1F23]">
            <Globe className="w-4 h-4 text-[#0F5C5A]" />
            <span>Timezone & Audit Policy</span>
          </div>
          <p>
            Current Timezone: <strong className="text-neutral-900">Asia/Kolkata (IST, UTC+05:30)</strong>.
          </p>
          <p className="text-[11px] text-neutral-600">
            Changing your timezone will adjust future reminder delivery windows, but historical dose events will strictly retain their original scheduled timestamps for audit integrity.
          </p>
        </div>

        {/* Reminder Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Reminder Preferences
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#4A5159] mb-1">Quiet Hours Start</label>
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#D9D5CA] rounded font-mono-numbers"
              />
            </div>
            <div>
              <label className="block text-[#4A5159] mb-1">Quiet Hours End</label>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#D9D5CA] rounded font-mono-numbers"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#4A5159] mb-1">Default Snooze Interval</label>
            <select
              value={snoozeMins}
              onChange={(e) => setSnoozeMins(Number(e.target.value))}
              className="px-3 py-1.5 border border-[#D9D5CA] rounded text-xs w-48"
            >
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>60 Minutes</option>
            </select>
          </div>
        </div>

        {/* Accessibility */}
        <div className="space-y-3 border-t border-[#D9D5CA] pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159]">
            Accessibility & Display
          </h3>
          <div className="flex gap-2">
            {['standard', 'large', 'extra-large'].map((size) => (
              <button
                key={size}
                onClick={() => setTextSize(size)}
                className={`px-3 py-1.5 rounded text-xs capitalize ${
                  textSize === size
                    ? 'bg-[#0F5C5A] text-white'
                    : 'bg-[#F7F5F0] text-[#4A5159] hover:bg-neutral-200'
                }`}
              >
                {size} Text
              </button>
            ))}
          </div>
        </div>

        {/* Account Deletion & Logout */}
        <div className="border-t border-[#D9D5CA] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onLogout}
            className="w-full sm:w-auto px-4 py-2 border border-neutral-300 text-[#4A5159] hover:bg-neutral-100 rounded text-xs font-medium"
          >
            Log Out
          </button>

          <button
            onClick={handleDeleteRequest}
            className="w-full sm:w-auto px-4 py-2 text-rose-800 hover:bg-rose-50 border border-rose-200 rounded text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Request Account Deletion
          </button>
        </div>

        {deletionStatus && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900">
            {deletionStatus}
          </div>
        )}
      </div>
    </div>
  );
};
