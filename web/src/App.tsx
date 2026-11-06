import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Pill,
  BarChart3,
  Users,
  User as UserIcon,
  LogOut,
  ArrowRightLeft,
  RefreshCw,
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
import { TodayLedger } from './components/TodayLedger';
import { MedicationList } from './components/MedicationList';
import { InsightsDashboard } from './components/InsightsDashboard';
import { CaregiversConsent } from './components/CaregiversConsent';
import { CaregiverPortal } from './components/CaregiverPortal';
import { ProfileSettings } from './components/ProfileSettings';
import { SyntheticBanner, ClinicalSafetyFooter, SyncStatusBar } from './components/Disclaimers';

export function App() {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [activeTab, setActiveTab] = useState<'today' | 'medications' | 'insights' | 'caregivers' | 'profile'>('today');

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

  const handleLogout = () => {
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

  if (!user) {
    return <AuthModal onSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0]">
      {/* Top Banner: Synthetic Demo Disclosure */}
      <SyntheticBanner />

      {/* Persistent Sync Status Line */}
      <SyncStatusBar
        status={syncStatus}
        pendingCount={pendingSyncCount}
        onRetry={triggerSync}
      />

      {/* Main App Navigation Bar */}
      <header className="bg-white border-b border-[#D9D5CA] px-4 py-3 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#0F5C5A] text-white flex items-center justify-center font-bold text-sm">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-[#1B1F23]">MAIP</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-neutral-100 text-[#4A5159] border border-neutral-300">
                  {user.role}
                </span>
              </div>
              <div className="text-xs text-[#4A5159]">
                {user.display_name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 1-Click Role Switch for Demo Convenience */}
            <button
              onClick={() => handleSwitchRole(user.role === 'patient' ? 'caregiver' : 'patient')}
              title={`Switch to ${user.role === 'patient' ? 'Caregiver' : 'Patient'} view`}
              className="px-2.5 py-1.5 bg-[#F7F5F0] hover:bg-neutral-200 border border-[#D9D5CA] text-xs font-medium text-[#0F5C5A] rounded flex items-center gap-1.5 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Switch to</span> {user.role === 'patient' ? 'Caregiver' : 'Patient'}
            </button>

            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 text-[#4A5159] hover:text-[#1B1F23] rounded border border-neutral-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (for Patient) */}
        {user.role === 'patient' && (
          <div className="max-w-4xl mx-auto mt-3 flex items-center gap-1 overflow-x-auto border-t border-neutral-100 pt-2">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'today'
                  ? 'bg-[#0F5C5A] text-white'
                  : 'text-[#4A5159] hover:bg-[#F7F5F0]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Today's Ledger
            </button>

            <button
              onClick={() => setActiveTab('medications')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'medications'
                  ? 'bg-[#0F5C5A] text-white'
                  : 'text-[#4A5159] hover:bg-[#F7F5F0]'
              }`}
            >
              <Pill className="w-3.5 h-3.5" /> Medications
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'insights'
                  ? 'bg-[#0F5C5A] text-white'
                  : 'text-[#4A5159] hover:bg-[#F7F5F0]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Insights & Metrics
            </button>

            <button
              onClick={() => setActiveTab('caregivers')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'caregivers'
                  ? 'bg-[#0F5C5A] text-white'
                  : 'text-[#4A5159] hover:bg-[#F7F5F0]'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Caregivers & Consent
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#0F5C5A] text-white'
                  : 'text-[#4A5159] hover:bg-[#F7F5F0]'
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
              />
            )}
          </>
        )}

        {/* Clinical Safety Disclaimer Footer */}
        <ClinicalSafetyFooter />
      </main>
    </div>
  );
}

export default App;
