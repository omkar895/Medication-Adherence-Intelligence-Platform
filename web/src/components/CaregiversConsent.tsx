import React, { useState } from 'react';
import { UserPlus, ShieldAlert, Check, X, Key, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ConsentGrant, api } from '../services/api';

interface Props {
  consents: ConsentGrant[];
  pendingInvitations: any[];
  onRefresh: () => void;
}

const AVAILABLE_SCOPES = [
  { id: 'medication_names', label: 'Medication Names', desc: 'Allows caregiver to see names and forms of active medicines.' },
  { id: 'schedule_summary', label: 'Schedule Summary', desc: 'Allows caregiver to see times of day and days of week.' },
  { id: 'dose_status_summary', label: 'Today Dose Status', desc: "Allows caregiver to see today's Taken, Skipped, and Unresolved counts." },
  { id: 'dose_history', label: 'Dose History Ledger', desc: 'Allows caregiver to inspect chronological dose records.' },
  { id: 'adherence_dashboard', label: 'Adherence Dashboard', desc: 'Allows caregiver to see aggregate adherence percentages with denominators.' },
  { id: 'notifications', label: 'Caregiver Alerts', desc: 'Sends neutral alerts for unresolved doses and reported skips.' },
];

export const CaregiversConsent: React.FC<Props> = ({ consents, pendingInvitations, onRefresh }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
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

  const toggleScope = (scopeId: string) => {
    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scopeId));
    } else {
      setSelectedScopes([...selectedScopes, scopeId]);
    }
  };

  const handleCreateInvite = async () => {
    if (!contact.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.createCaregiverInvite(contact, selectedScopes);
      setGeneratedInvite(res);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (consentId: string) => {
    if (window.confirm('Are you sure you want to revoke this caregiver’s access? Server-side access will cease immediately.')) {
      try {
        await api.revokeConsent(consentId);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1B1F23]">Caregiver Sharing & Consent</h2>
          <p className="text-xs text-[#4A5159] mt-0.5">
            You have full control. Access is opt-in, granular, and can be revoked at any time.
          </p>
        </div>

        <button
          onClick={() => {
            setShowInviteModal(true);
            setGeneratedInvite(null);
          }}
          className="h-10 px-4 bg-[#0F5C5A] hover:bg-teal-900 text-white rounded text-sm font-medium flex items-center gap-1.5 shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Invite Caregiver
        </button>
      </div>

      {/* Active Caregiver Grants */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159]">
          Active Consent Grants
        </h3>

        {consents.length === 0 ? (
          <div className="bg-white border border-[#D9D5CA] rounded p-6 text-center text-[#4A5159] text-xs">
            No caregivers connected. Sharing is currently completely off.
          </div>
        ) : (
          consents.map((g) => (
            <div
              key={g.id}
              className={`bg-white border rounded-md p-5 space-y-4 ${
                g.revoked_at ? 'border-neutral-300 opacity-60' : 'border-[#D9D5CA]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base text-[#1B1F23]">
                      {g.caregiver_name || 'Caregiver'}
                    </span>
                    {g.revoked_at ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold uppercase rounded">
                        Access Revoked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Active Grant
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#4A5159] mt-1">
                    Granted: {new Date(g.granted_at).toLocaleDateString()}
                  </div>
                </div>

                {!g.revoked_at && (
                  <button
                    onClick={() => handleRevoke(g.id)}
                    className="px-3 py-1.5 bg-rose-50 border border-rose-300 text-rose-800 hover:bg-rose-100 rounded text-xs font-medium transition-colors"
                  >
                    Revoke Access Immediately
                  </button>
                )}
              </div>

              {/* Scopes display */}
              <div className="border-t border-[#D9D5CA] pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4A5159] block mb-2">
                  Permitted Scopes:
                </span>
                <div className="flex flex-wrap gap-2">
                  {g.scopes.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 bg-[#F7F5F0] border border-[#D9D5CA] rounded text-xs text-neutral-800 capitalize"
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159]">
            Pending Invitation Codes
          </h3>
          <div className="bg-white border border-[#D9D5CA] rounded divide-y divide-[#D9D5CA]">
            {pendingInvitations.map((inv) => (
              <div key={inv.invitation_id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono-numbers font-semibold text-sm text-[#0F5C5A]">
                    {inv.raw_token}
                  </div>
                  <div className="text-[#4A5159] mt-0.5">
                    Expires: {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-medium">
                  Awaiting Acceptance
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Wizard Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-md border border-[#D9D5CA] shadow-2xl overflow-hidden">
            <div className="bg-[#F7F5F0] px-6 py-4 border-b border-[#D9D5CA] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1B1F23]">Invite Caregiver</h3>
                <p className="text-xs text-[#4A5159]">Specify recipient and permitted scopes</p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[#4A5159] hover:text-[#1B1F23] text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {generatedInvite ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded text-center space-y-2">
                    <Check className="w-8 h-8 mx-auto text-emerald-700" />
                    <h4 className="font-semibold text-emerald-950">Invitation Created</h4>
                    <p className="text-xs text-emerald-900">
                      Share this single-use code with your family member or caregiver:
                    </p>
                    <div className="p-3 bg-white border border-emerald-400 rounded font-mono font-bold text-lg text-emerald-950 select-all">
                      {generatedInvite.invite_token}
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Expires in 7 days. They must log in to the Caregiver portal and enter this code to activate access.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="w-full py-2 bg-[#0F5C5A] text-white rounded text-sm font-medium"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] mb-1">
                      Caregiver Email or Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. rahul@example.com or +91..."
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] mb-2">
                      Select Permitted Data Scopes:
                    </label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <label
                          key={scope.id}
                          className="flex items-start gap-2.5 p-2 bg-neutral-50 rounded border border-neutral-200 cursor-pointer hover:bg-neutral-100"
                        >
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(scope.id)}
                            onChange={() => toggleScope(scope.id)}
                            className="mt-1"
                          />
                          <div>
                            <div className="text-xs font-semibold text-[#1B1F23]">
                              {scope.label}
                            </div>
                            <div className="text-[11px] text-[#4A5159] leading-tight mt-0.5">
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
                      disabled={submitting || !contact.trim() || selectedScopes.length === 0}
                      className="w-full py-2.5 bg-[#0F5C5A] hover:bg-teal-900 text-white rounded text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                      {submitting ? 'Generating Invitation…' : 'Generate Invitation Code'}
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
