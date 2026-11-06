import React, { useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Check,
  X,
  Key,
  Trash2,
  Copy,
  Phone,
  Mail,
  Send,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { ConsentGrant, api } from '../services/api';

interface Props {
  consents: ConsentGrant[];
  pendingInvitations: any[];
  onRefresh: () => void;
}

const AVAILABLE_SCOPES = [
  { id: 'medication_names', label: 'Medication Names', desc: 'Allows caregiver to see names and forms of active medicines.' },
  { id: 'schedule_summary', label: 'Schedule Summary', desc: 'Allows caregiver to see times of day and frequency rules.' },
  { id: 'dose_status_summary', label: 'Today Dose Status', desc: "Allows caregiver to see today's Taken, Skipped, and Unresolved counts." },
  { id: 'dose_history', label: 'Dose History Ledger', desc: 'Allows caregiver to inspect chronological dose records.' },
  { id: 'adherence_dashboard', label: 'Adherence Dashboard', desc: 'Allows caregiver to see aggregate adherence percentages with denominators.' },
  { id: 'notifications', label: 'Caregiver Alerts', desc: 'Sends neutral alerts for unresolved doses and reported skips.' },
];

export const CaregiversConsent: React.FC<Props> = ({ consents, pendingInvitations, onRefresh }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'phone' | 'email' | 'code'>('phone');
  const [contact, setContact] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'medication_names',
    'schedule_summary',
    'dose_status_summary',
    'dose_history',
    'adherence_dashboard',
    'notifications',
  ]);
  const [generatedInvite, setGeneratedInvite] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const toggleScope = (scopeId: string) => {
    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scopeId));
    } else {
      setSelectedScopes([...selectedScopes, scopeId]);
    }
  };

  const handleCreateInvite = async () => {
    const contactValue = contact.trim() || (inviteMethod === 'code' ? 'Direct Code' : '');
    if (!contactValue) return;

    setSubmitting(true);
    try {
      const res = await api.createCaregiverInvite(contactValue, selectedScopes);
      setGeneratedInvite(res);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (consentId: string) => {
    if (
      window.confirm(
        'Revoke this caregiver’s access? Server-side access will cease immediately.'
      )
    ) {
      try {
        await api.revokeConsent(consentId);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleRemoveCaregiver = async (consentId: string) => {
    if (
      window.confirm(
        'Permanently remove this caregiver? The relationship will be deleted and access permanently severed.'
      )
    ) {
      try {
        await api.deleteConsent(consentId);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1B1F23] dark:text-[#ECEFF1]">Caregiver Sharing & Consent</h2>
          <p className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-0.5">
            You maintain full sovereignty. Access is opt-in, granular, and can be removed or revoked anytime.
          </p>
        </div>

        <button
          onClick={() => {
            setShowInviteModal(true);
            setGeneratedInvite(null);
            setContact('');
          }}
          className="h-10 px-4 bg-[#0F5C5A] dark:bg-[#1EB8B4] hover:bg-teal-900 text-white dark:text-[#121416] rounded text-sm font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Invite Caregiver
        </button>
      </div>

      {/* Active Caregiver Grants */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
          Connected Caregivers
        </h3>

        {consents.length === 0 ? (
          <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded p-8 text-center text-[#4A5159] dark:text-[#9EABB5] text-xs">
            No caregivers connected. Sharing is currently completely off.
          </div>
        ) : (
          consents.map((g) => (
            <div
              key={g.id}
              className={`bg-white dark:bg-[#1E2226] border rounded-md p-5 space-y-4 ${
                g.revoked_at ? 'border-neutral-300 dark:border-neutral-700 opacity-60' : 'border-[#D9D5CA] dark:border-[#2E363D]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base text-[#1B1F23] dark:text-[#ECEFF1]">
                      {g.caregiver_name || 'Caregiver'}
                    </span>
                    {g.revoked_at ? (
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[10px] font-bold uppercase rounded">
                        Access Revoked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Active Grant
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-1">
                    Granted: {new Date(g.granted_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {!g.revoked_at && (
                    <button
                      onClick={() => handleRevoke(g.id)}
                      className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 rounded text-xs font-semibold transition-colors"
                    >
                      Revoke Access
                    </button>
                  )}

                  <button
                    onClick={() => handleRemoveCaregiver(g.id)}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 hover:bg-rose-100 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              {/* Scopes display */}
              <div className="border-t border-[#D9D5CA] dark:border-[#2E363D] pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] block mb-2">
                  Permitted Scopes:
                </span>
                <div className="flex flex-wrap gap-2">
                  {g.scopes.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 bg-[#F7F5F0] dark:bg-[#121416] border border-[#D9D5CA] dark:border-[#2E363D] rounded text-xs text-neutral-800 dark:text-neutral-200 capitalize font-medium"
                    >
                      {s.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
            Pending Invitation Codes
          </h3>
          <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded divide-y divide-[#D9D5CA] dark:divide-[#2E363D]">
            {pendingInvitations.map((inv) => (
              <div key={inv.invitation_id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono-numbers font-bold text-sm text-[#0F5C5A] dark:text-[#1EB8B4] flex items-center gap-2">
                    <span>{inv.raw_token}</span>
                    <button
                      onClick={() => handleCopy(inv.raw_token)}
                      title="Copy code"
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-500"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[#4A5159] dark:text-[#9EABB5] mt-0.5">
                    Expires: {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 rounded font-medium border border-amber-300 dark:border-amber-700">
                  Awaiting Acceptance
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Channel Invite Wizard Modal (Phone / Email / Code) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1E2226] max-w-lg w-full rounded-md border border-[#D9D5CA] dark:border-[#2E363D] shadow-2xl overflow-hidden">
            <div className="bg-[#F7F5F0] dark:bg-[#252A2F] px-6 py-4 border-b border-[#D9D5CA] dark:border-[#2E363D] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1B1F23] dark:text-[#ECEFF1]">Invite Caregiver</h3>
                <p className="text-xs text-[#4A5159] dark:text-[#9EABB5]">
                  Invite via Phone (WhatsApp/SMS), Email, or Direct Code
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23] text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {generatedInvite ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded text-center space-y-2">
                    <Check className="w-8 h-8 mx-auto text-emerald-700 dark:text-emerald-400" />
                    <h4 className="font-bold text-emerald-950 dark:text-emerald-100">Caregiver Invitation Ready</h4>
                    <p className="text-xs text-emerald-900 dark:text-emerald-300">
                      Share this 6-digit code or send directly via WhatsApp / SMS:
                    </p>
                    <div className="p-3 bg-white dark:bg-[#121416] border border-emerald-400 dark:border-emerald-700 rounded font-mono font-bold text-xl text-emerald-950 dark:text-emerald-200 select-all flex items-center justify-between">
                      <span className="mx-auto">{generatedInvite.invite_token}</span>
                      <button
                        onClick={() => handleCopy(generatedInvite.invite_token)}
                        className="text-xs text-emerald-700 dark:text-emerald-400 p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
                      >
                        {copiedCode ? 'Copied!' : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Quick WhatsApp Share Button */}
                    {generatedInvite.whatsapp_link && (
                      <a
                        href={generatedInvite.whatsapp_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded font-semibold text-xs shadow-xs transition-colors mt-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send Invitation via WhatsApp</span>
                      </a>
                    )}

                    {generatedInvite.mailto_link && (
                      <a
                        href={generatedInvite.mailto_link}
                        className="inline-flex items-center justify-center gap-2 w-full py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded font-semibold text-xs border border-neutral-300 dark:border-neutral-700 mt-1"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Send Invitation via Email</span>
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="w-full py-2 bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416] rounded text-sm font-semibold"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Method Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1 bg-[#F7F5F0] dark:bg-[#121416] p-1 rounded border border-[#D9D5CA] dark:border-[#2E363D] text-xs">
                    <button
                      type="button"
                      onClick={() => setInviteMethod('phone')}
                      className={`py-1.5 rounded font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        inviteMethod === 'phone'
                          ? 'bg-white dark:bg-[#1E2226] text-[#0F5C5A] dark:text-[#1EB8B4] shadow-2xs'
                          : 'text-[#4A5159] dark:text-[#9EABB5]'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" /> Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteMethod('email')}
                      className={`py-1.5 rounded font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        inviteMethod === 'email'
                          ? 'bg-white dark:bg-[#1E2226] text-[#0F5C5A] dark:text-[#1EB8B4] shadow-2xs'
                          : 'text-[#4A5159] dark:text-[#9EABB5]'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteMethod('code')}
                      className={`py-1.5 rounded font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        inviteMethod === 'code'
                          ? 'bg-white dark:bg-[#1E2226] text-[#0F5C5A] dark:text-[#1EB8B4] shadow-2xs'
                          : 'text-[#4A5159] dark:text-[#9EABB5]'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5" /> Code Only
                    </button>
                  </div>

                  {inviteMethod === 'phone' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] mb-1">
                        Caregiver Mobile Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +91 9876543210"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
                      />
                      <p className="text-[10px] text-neutral-500 mt-1">
                        Allows 1-click invitation sharing via WhatsApp & SMS.
                      </p>
                    </div>
                  )}

                  {inviteMethod === 'email' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] mb-1">
                        Caregiver Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. rahul@example.com"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
                      />
                    </div>
                  )}

                  {inviteMethod === 'code' && (
                    <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded text-xs text-teal-950 dark:text-teal-200">
                      Generate a single-use 6-digit invitation code to share verbally or via any messaging channel.
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] mb-2">
                      Select Permitted Data Scopes:
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <label
                          key={scope.id}
                          className="flex items-start gap-2.5 p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(scope.id)}
                            onChange={() => toggleScope(scope.id)}
                            className="mt-1"
                          />
                          <div>
                            <div className="text-xs font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">
                              {scope.label}
                            </div>
                            <div className="text-[11px] text-[#4A5159] dark:text-[#9EABB5] leading-tight mt-0.5">
                              {scope.desc}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleCreateInvite}
                      disabled={submitting || (inviteMethod !== 'code' && !contact.trim()) || selectedScopes.length === 0}
                      className="w-full py-2.5 bg-[#0F5C5A] dark:bg-[#1EB8B4] hover:bg-teal-900 text-white dark:text-[#121416] rounded text-sm font-semibold shadow-xs disabled:opacity-50"
                    >
                      {submitting ? 'Generating Invitation…' : 'Generate Invitation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
