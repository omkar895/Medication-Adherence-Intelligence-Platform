import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Pill,
  BarChart3,
  Users,
  User as UserIcon,
  LogOut,
  ArrowRightLeft,
  FileText,
  Moon,
  Sun,
  BellRing,
} from 'lucide-react';
import {
  User,
  DoseEvent,
  Medication,
  Insight,
  ConsentGrant,
  api,
  getStoredUser,
  clearStoredAuth,
  getOfflineQueue,
  clearOfflineQueue,
} from './services/api';
import { AuthModal } from './components/AuthModal';
import { firebaseSignOut, auth } from './services/firebase';
import { TodayLedger } from './components/TodayLedger';
import { MedicationList } from './components/MedicationList';
import { HistoryPage } from './components/HistoryPage';
import { InsightsDashboard } from './components/InsightsDashboard';
import { CaregiversConsent } from './components/CaregiversConsent';
import { CaregiverPortal } from './components/CaregiverPortal';
import { ProfileSettings } from './components/ProfileSettings';
import { SyntheticBanner, ClinicalSafetyFooter, SyncStatusBar } from './components/Disclaimers';
import { ActiveMedicationAlert } from './components/ActiveMedicationAlert';
import { notificationService } from './services/notifications';

export function App() {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [activeTab, setActiveTab] = useState<'today' | 'medications' | 'history' | 'insights' | 'caregivers' | 'profile'>('today');

  // Dark Mode Toggle
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('maip_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('maip_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('maip_theme', 'light');
    }
  }, [isDarkMode]);

  // Network & Sync state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'failed'>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(getOfflineQueue().length);

  // Patient data
  const [todayEvents, setTodayEvents] = useState<DoseEvent[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [consents, setConsents] = useState<ConsentGrant[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Real-time active dose alert
  const [activeAlertEvent, setActiveAlertEvent] = useState<DoseEvent | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('online');
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch initial data when user changes
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Real-time dose reminder checker
  useEffect(() => {
    if (!user || user.role !== 'patient' || todayEvents.length === 0) return;

    notificationService.requestPermission().catch(() => {});

    const checkScheduledDoseTimes = () => {
      const now = new Date();
      for (const ev of todayEvents) {
        if (ev.status === 'scheduled' && !notificationService.hasAlerted(ev.id)) {
          const schedTime = new Date(ev.scheduled_at).getTime();
          const diffMinutes = (now.getTime() - schedTime) / (60 * 1000);

          // Alert if scheduled time is within [-5 min, +25 min]
          if (diffMinutes >= -5 && diffMinutes <= 25) {
            notificationService.markAlerted(ev.id);
            notificationService.playChime();
            notificationService.showSystemNotification(
              'Medication Due',
              `Time for your scheduled dose: ${ev.medication_name}`
            );
            setActiveAlertEvent(ev);
            api.simulateReminder(ev.id).catch(() => {});
            break;
          }
        }
      }
    };

    checkScheduledDoseTimes();
    const interval = setInterval(checkScheduledDoseTimes, 15000);
    return () => clearInterval(interval);
  }, [user, todayEvents]);

  const triggerSync = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setSyncStatus('syncing');
    try {
      const syncPayload = queue.map((q) => ({
        id: q.event_id,
        schedule_version_id: q.schedule_version_id,
        medication_id: q.medication_id,
        scheduled_at: q.scheduled_at,
        status: q.outcome,
        idempotency_key: q.idempotency_key,
        responded_at: q.timestamp,
      }));
      await api.syncOfflineBatch(syncPayload);
      clearOfflineQueue();
      setPendingSyncCount(0);
      setSyncStatus('online');
      loadData();
    } catch {
      setSyncStatus('failed');
    }
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setPendingSyncCount(getOfflineQueue().length);
    try {
      if (user.role === 'patient') {
        const [today, meds, ins, cgData] = await Promise.all([
          api.getTodayEvents(),
          api.listMedications(),
          api.getInsights(),
          api.listCaregivers(),
        ]);
        setTodayEvents(today);
        setMedications(meds);
        setInsights(ins);
        setConsents(cgData.active_caregivers || []);
        setPendingInvitations(cgData.pending_invitations || []);
      }
    } catch (err: any) {
      console.error('Failed to load application data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    clearStoredAuth();
    setUser(null);
  };

  const handleSwitchRole = async (targetRole: 'patient' | 'caregiver') => {
    try {
      const email = targetRole === 'patient' ? 'patient.demo@maip.local' : 'caregiver.demo@maip.local';
      const newUser = await api.login(email, 'Password123!');
      setUser(newUser);
      setActiveTab('today');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Test notification and audio chime
  const handleTestAlertChime = () => {
    notificationService.playChime();
    notificationService.showSystemNotification(
      'Medication Reminder Test',
      'This is how dose alarms and audio chimes sound.'
    );
    if (todayEvents.length > 0) {
      setActiveAlertEvent(todayEvents[0]);
    } else {
      alert('Chime played! (Add a medication to test with a real scheduled dose).');
    }
  };

  const handleAlertTake = async (eventId: string) => {
    try {
      await api.recordDoseResponse(eventId, 'taken');
      setActiveAlertEvent(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAlertSkip = async (eventId: string) => {
    try {
      await api.recordDoseResponse(eventId, 'not_taken');
      setActiveAlertEvent(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAlertSnooze = async (eventId: string) => {
    try {
      await api.snoozeReminder(eventId, 15);
      setActiveAlertEvent(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user) {
    return <AuthModal onSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] transition-colors pb-16 sm:pb-0">
      {/* Top Banner: Synthetic Demo Disclosure */}
      <SyntheticBanner />

      {/* Persistent Sync Status Line */}
      <SyncStatusBar
        status={syncStatus}
        pendingCount={pendingSyncCount}
        onRetry={triggerSync}
      />

      {/* Real-Time Medication Time Alert Banner */}
      {activeAlertEvent && (
        <ActiveMedicationAlert
          event={activeAlertEvent}
          onTake={handleAlertTake}
          onSkip={handleAlertSkip}
          onSnooze={handleAlertSnooze}
          onDismiss={() => setActiveAlertEvent(null)}
        />
      )}

      {/* Main App Navigation Bar */}
      <header className="bg-white dark:bg-[#1E2226] border-b border-[#D9D5CA] dark:border-[#2E363D] px-4 py-3 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416] flex items-center justify-center font-bold text-sm">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-[#1B1F23] dark:text-[#ECEFF1]">MAIP</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-[#4A5159] dark:text-[#9EABB5] border border-neutral-300 dark:border-neutral-700">
                  {user.role}
                </span>
              </div>
              <div className="text-xs text-[#4A5159] dark:text-[#9EABB5]">
                {user.display_name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Test Alarm Sound */}
            {user.role === 'patient' && (
              <button
                onClick={handleTestAlertChime}
                title="Test Dose Alarm & Audio Chime"
                className="px-2.5 py-1.5 bg-[#F7F5F0] dark:bg-[#252A2F] hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-[#D9D5CA] dark:border-[#2E363D] text-xs font-semibold text-[#0F5C5A] dark:text-[#1EB8B4] rounded flex items-center gap-1.5 transition-colors"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Test Alert</span>
              </button>
            )}

            {/* Theme Toggle (Working flawlessly) */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} mode`}
              className="p-1.5 text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23] dark:hover:text-[#ECEFF1] rounded border border-neutral-200 dark:border-neutral-700 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#0F5C5A]" />}
            </button>

            {/* 1-Click Role Switch for Demo Convenience */}
            <button
              onClick={() => handleSwitchRole(user.role === 'patient' ? 'caregiver' : 'patient')}
              title={`Switch to ${user.role === 'patient' ? 'Caregiver' : 'Patient'} view`}
              className="px-2.5 py-1.5 bg-[#F7F5F0] dark:bg-[#252A2F] hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-[#D9D5CA] dark:border-[#2E363D] text-xs font-medium text-[#0F5C5A] dark:text-[#1EB8B4] rounded flex items-center gap-1.5 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Switch to</span> {user.role === 'patient' ? 'Caregiver' : 'Patient'}
            </button>

            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23] dark:hover:text-[#ECEFF1] rounded border border-neutral-200 dark:border-neutral-700"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop/Tablet Tab Navigation (for Patient) */}
        {user.role === 'patient' && (
          <div className="hidden sm:flex max-w-4xl mx-auto mt-3 items-center gap-1 overflow-x-auto border-t border-neutral-100 dark:border-[#2E363D] pt-2">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'today'
                  ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416]'
                  : 'text-[#4A5159] dark:text-[#9EABB5] hover:bg-[#F7F5F0] dark:hover:bg-[#252A2F]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Today's Ledger
            </button>

            <button
              onClick={() => setActiveTab('medications')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'medications'
                  ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416]'
                  : 'text-[#4A5159] dark:text-[#9EABB5] hover:bg-[#F7F5F0] dark:hover:bg-[#252A2F]'
              }`}
            >
              <Pill className="w-3.5 h-3.5" /> Medications
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'history'
                  ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416]'
                  : 'text-[#4A5159] dark:text-[#9EABB5] hover:bg-[#F7F5F0] dark:hover:bg-[#252A2F]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Dose History
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'insights'
                  ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416]'
                  : 'text-[#4A5159] dark:text-[#9EABB5] hover:bg-[#F7F5F0] dark:hover:bg-[#252A2F]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Insights & Metrics
            </button>

            <button
              onClick={() => setActiveTab('caregivers')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'caregivers'
                  ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416]'
                  : 'text-[#4A5159] dark:text-[#9EABB5] hover:bg-[#F7F5F0] dark:hover:bg-[#252A2F]'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Caregivers & Consent
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416]'
                  : 'text-[#4A5159] dark:text-[#9EABB5] hover:bg-[#F7F5F0] dark:hover:bg-[#252A2F]'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" /> Settings
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
        {user.role === 'caregiver' ? (
          <CaregiverPortal />
        ) : (
          <>
            {activeTab === 'today' && (
              <TodayLedger
                events={todayEvents}
                onRefresh={loadData}
                loading={loading}
              />
            )}

            {activeTab === 'medications' && (
              <MedicationList
                medications={medications}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'history' && (
              <HistoryPage
                medications={medications}
              />
            )}

            {activeTab === 'insights' && (
              <InsightsDashboard
                insights={insights}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'caregivers' && (
              <CaregiversConsent
                consents={consents}
                pendingInvitations={pendingInvitations}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileSettings
                user={user}
                onLogout={handleLogout}
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              />
            )}
          </>
        )}

        {/* Clinical Safety Disclaimer Footer */}
        <ClinicalSafetyFooter />
      </main>

      {/* Mobile Bottom Navigation */}
      {user.role === 'patient' && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1E2226] border-t border-[#D9D5CA] dark:border-[#2E363D] z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center py-1 px-2 rounded text-[10px] font-medium transition-colors ${
              activeTab === 'today' ? 'text-[#0F5C5A] dark:text-[#1EB8B4]' : 'text-[#4A5159] dark:text-[#9EABB5]'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span>Today</span>
          </button>

          <button
            onClick={() => setActiveTab('medications')}
            className={`flex flex-col items-center py-1 px-2 rounded text-[10px] font-medium transition-colors ${
              activeTab === 'medications' ? 'text-[#0F5C5A] dark:text-[#1EB8B4]' : 'text-[#4A5159] dark:text-[#9EABB5]'
            }`}
          >
            <Pill className="w-5 h-5 mb-0.5" />
            <span>Meds</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center py-1 px-2 rounded text-[10px] font-medium transition-colors ${
              activeTab === 'history' ? 'text-[#0F5C5A] dark:text-[#1EB8B4]' : 'text-[#4A5159] dark:text-[#9EABB5]'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`flex flex-col items-center py-1 px-2 rounded text-[10px] font-medium transition-colors ${
              activeTab === 'insights' ? 'text-[#0F5C5A] dark:text-[#1EB8B4]' : 'text-[#4A5159] dark:text-[#9EABB5]'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span>Insights</span>
          </button>

          <button
            onClick={() => setActiveTab('caregivers')}
            className={`flex flex-col items-center py-1 px-2 rounded text-[10px] font-medium transition-colors ${
              activeTab === 'caregivers' ? 'text-[#0F5C5A] dark:text-[#1EB8B4]' : 'text-[#4A5159] dark:text-[#9EABB5]'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Share</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center py-1 px-2 rounded text-[10px] font-medium transition-colors ${
              activeTab === 'profile' ? 'text-[#0F5C5A] dark:text-[#1EB8B4]' : 'text-[#4A5159] dark:text-[#9EABB5]'
            }`}
          >
            <UserIcon className="w-5 h-5 mb-0.5" />
            <span>Settings</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
