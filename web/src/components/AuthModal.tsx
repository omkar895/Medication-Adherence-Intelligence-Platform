import React, { useState } from 'react';
import { Shield, User, HeartHandshake } from 'lucide-react';
import { api, User as UserType } from '../services/api';

interface Props {
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<Props> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async (targetRole: 'patient' | 'caregiver') => {
    setLoading(true);
    setError(null);
    try {
      const demoEmail = targetRole === 'patient' ? 'patient.demo@maip.local' : 'caregiver.demo@maip.local';
      const user = await api.login(demoEmail, 'Password123!');
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let user: UserType;
      if (isRegister) {
        user = await api.register(name, email, password, role);
      } else {
        user = await api.login(email, password);
      }
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-[#D9D5CA] rounded-md shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-[#0F5C5A] p-6 text-white text-center space-y-1">
          <h1 className="text-xl font-bold tracking-tight">MAIP</h1>
          <p className="text-xs text-teal-100 uppercase tracking-wider font-semibold">
            Medication Adherence Intelligence Platform
          </p>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="p-4 bg-teal-50 border-b border-teal-200 text-xs space-y-2">
          <span className="font-semibold text-[#0F5C5A] block uppercase tracking-wider text-[10px]">
            ⚡ 1-Click Interactive Demo Access:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoLogin('patient')}
              disabled={loading}
              className="py-2 px-3 bg-white border border-[#0F5C5A] hover:bg-teal-50 text-[#0F5C5A] rounded font-medium flex items-center justify-center gap-1.5 shadow-xs"
            >
              <User className="w-3.5 h-3.5" /> Patient Demo
            </button>
            <button
              onClick={() => handleDemoLogin('caregiver')}
              disabled={loading}
              className="py-2 px-3 bg-white border border-[#0F5C5A] hover:bg-teal-50 text-[#0F5C5A] rounded font-medium flex items-center justify-center gap-1.5 shadow-xs"
            >
              <HeartHandshake className="w-3.5 h-3.5" /> Caregiver Demo
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="flex border-b border-[#D9D5CA]">
            <button
              onClick={() => setIsRegister(false)}
              className={`pb-2 flex-1 text-center text-xs font-semibold uppercase tracking-wider ${
                !isRegister ? 'border-b-2 border-[#0F5C5A] text-[#0F5C5A]' : 'text-[#4A5159]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`pb-2 flex-1 text-center text-xs font-semibold uppercase tracking-wider ${
                isRegister ? 'border-b-2 border-[#0F5C5A] text-[#0F5C5A]' : 'text-[#4A5159]'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#4A5159] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4A5159] mb-1">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
                  >
                    <option value="patient">Patient</option>
                    <option value="caregiver">Caregiver / Family</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#4A5159] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A5159] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#0F5C5A] hover:bg-teal-900 text-white rounded text-sm font-medium transition-colors shadow-sm disabled:opacity-50 mt-4"
            >
              {loading ? 'Authenticating…' : isRegister ? 'Register Account' : 'Sign In'}
            </button>
          </form>

          <p className="text-[11px] text-[#4A5159] text-center pt-2">
            Protected with role-based access control. All sessions are encrypted.
          </p>
        </div>
      </div>
    </div>
  );
};
