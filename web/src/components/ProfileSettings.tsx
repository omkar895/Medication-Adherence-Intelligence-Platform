import React, { useState, useEffect } from 'react';
import { User, Clock, Trash2, Shield, Globe, Moon, Sun, Type, Save } from 'lucide-react';
import { api, PatientProfile } from '../services/api';

interface Props {
  user: any;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const ProfileSettings: React.FC<Props> = ({ user, onLogout, isDarkMode, onToggleDarkMode }) => {
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [snoozeMins, setSnoozeMins] = useState(15);
  const [textSize, setTextSize] = useState<'standard' | 'large' | 'extra-large'>('standard');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deletionStatus, setDeletionStatus] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const p = await api.getProfile();
      if (p.reminder_preferences) {
        if (p.reminder_preferences.quiet_hours_start) setQuietStart(p.reminder_preferences.quiet_hours_start);
        if (p.reminder_preferences.quiet_hours_end) setQuietEnd(p.reminder_preferences.quiet_hours_end);
        if (p.reminder_preferences.snooze_interval_minutes) setSnoozeMins(p.reminder_preferences.snooze_interval_minutes);
      }
      if (p.accessibility_preferences?.text_size) {
        applyTextSize(p.accessibility_preferences.text_size);
      }
    } catch (err: any) {
      console.error('Failed to load profile', err);
    }
  };

  const applyTextSize = (size: 'standard' | 'large' | 'extra-large') => {
    setTextSize(size);
    document.documentElement.classList.remove('text-size-large', 'text-size-xlarge');
    if (size === 'large') document.documentElement.classList.add('text-size-large');
    if (size === 'extra-large') document.documentElement.classList.add('text-size-xlarge');
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await api.updateProfile({
        reminder_preferences: {
          quiet_hours_start: quietStart,
          quiet_hours_end: quietEnd,
          snooze_interval_minutes: snoozeMins,
        },
        accessibility_preferences: {
          text_size: textSize,
          dark_mode: isDarkMode,
        },
      });
      setStatusMessage('Preferences successfully saved to server.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (
      window.confirm(
        'Submit account deletion request? This will initiate the clinical data retention and removal workflow.'
      )
    ) {
      try {
        const res = await api.requestAccountDeletion();
        setDeletionStatus(res.message);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {statusMessage && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 rounded text-xs flex justify-between items-center shadow-xs">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold text-sm px-1">×</button>
        </div>
      )}

      <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-6 space-y-6">
        {/* User identification */}
        <div className="flex items-center gap-3 border-b border-[#D9D5CA] dark:border-[#2E363D] pb-4">
          <div className="w-12 h-12 rounded-full bg-[#0F5C5A]/10 text-[#0F5C5A] dark:text-[#1EB8B4] flex items-center justify-center font-bold text-lg">
            {user.display_name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">{user.display_name}</h2>
            <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] flex items-center gap-2 mt-0.5">
              <span>{user.email || 'No email attached'}</span>
              <span>·</span>
              <span className="capitalize font-semibold text-[#0F5C5A] dark:text-[#1EB8B4]">{user.role} role</span>
            </div>
          </div>
        </div>

        {/* Timezone Notice */}
        <div className="p-4 bg-[#F7F5F0] dark:bg-[#252A2F] rounded border border-[#D9D5CA] dark:border-[#2E363D] space-y-2 text-xs text-[#4A5159] dark:text-[#9EABB5]">
          <div className="flex items-center gap-2 font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">
            <Globe className="w-4 h-4 text-[#0F5C5A] dark:text-[#1EB8B4]" />
            <span>Timezone & Audit Policy</span>
          </div>
          <p>
            Current Timezone: <strong className="text-neutral-900 dark:text-neutral-100">Asia/Kolkata (IST, UTC+05:30)</strong>.
          </p>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
            Changing your timezone will adjust future reminder delivery windows, but historical dose events will strictly retain their original scheduled timestamps for audit integrity.
          </p>
        </div>

        {/* Reminder Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Reminder Preferences
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#4A5159] dark:text-[#9EABB5] mb-1">Quiet Hours Start</label>
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded font-mono-numbers"
              />
            </div>
            <div>
              <label className="block text-[#4A5159] dark:text-[#9EABB5] mb-1">Quiet Hours End</label>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded font-mono-numbers"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#4A5159] dark:text-[#9EABB5] mb-1">Default Snooze Interval</label>
            <select
              value={snoozeMins}
              onChange={(e) => setSnoozeMins(Number(e.target.value))}
              className="px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-xs w-48"
            >
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>60 Minutes</option>
            </select>
          </div>
        </div>

        {/* Accessibility & Display Settings */}
        <div className="space-y-4 border-t border-[#D9D5CA] dark:border-[#2E363D] pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
            Accessibility & Display
          </h3>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#1B1F23] dark:text-[#ECEFF1] font-medium flex items-center gap-1.5">
              {isDarkMode ? <Moon className="w-4 h-4 text-[#1EB8B4]" /> : <Sun className="w-4 h-4 text-[#0F5C5A]" />}
              Display Theme: {isDarkMode ? 'Dark Mode' : 'Light (Clinical Ledger)'}
            </span>
            <button
              onClick={onToggleDarkMode}
              className="px-3 py-1.5 bg-[#F7F5F0] dark:bg-[#2E363D] border border-[#D9D5CA] dark:border-[#2E363D] rounded text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              Switch to {isDarkMode ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Dynamic Text Scaling */}
          <div>
            <label className="block text-xs text-[#4A5159] dark:text-[#9EABB5] mb-2 flex items-center gap-1">
              <Type className="w-3.5 h-3.5" /> Text Scaling (Dynamic Font Size)
            </label>
            <div className="flex gap-2">
              {(['standard', 'large', 'extra-large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => applyTextSize(size)}
                  className={`px-3 py-1.5 rounded text-xs capitalize ${
                    textSize === size
                      ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416] font-semibold'
                      : 'bg-[#F7F5F0] dark:bg-[#2E363D] text-[#4A5159] dark:text-[#ECEFF1] hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {size} Text
                </button>
              ))}
            </div>
          </div>

          {/* Save Preferences Button */}
          <div className="pt-2">
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="px-4 py-2 bg-[#0F5C5A] dark:bg-[#1EB8B4] hover:bg-teal-900 text-white dark:text-[#121416] rounded text-xs font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving Preferences…' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>

        {/* Account Deletion & Logout */}
        <div className="border-t border-[#D9D5CA] dark:border-[#2E363D] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onLogout}
            className="w-full sm:w-auto px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-[#4A5159] dark:text-[#9EABB5] hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-xs font-medium"
          >
            Log Out
          </button>

          <button
            onClick={handleDeleteRequest}
            className="w-full sm:w-auto px-4 py-2 text-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Request Account Deletion
          </button>
        </div>

        {deletionStatus && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded text-xs text-amber-900 dark:text-amber-200">
            {deletionStatus}
          </div>
        )}
      </div>
    </div>
  );
};
