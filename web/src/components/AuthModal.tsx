import React, { useState } from 'react';
import { User, HeartHandshake, LogIn, ExternalLink, ShieldAlert } from 'lucide-react';
import { api, User as UserType } from '../services/api';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '../services/firebase';

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

  const isIpAddress = window.location.hostname === '127.0.0.1';

  const handleSwitchToLocalhost = () => {
    window.location.href = window.location.href.replace('127.0.0.1', 'localhost');
  };

  // 1-Click Demo Login (local synthetic data)
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

  // Firebase Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const user = await api.firebaseLogin(idToken, role);
      onSuccess(user);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setError(
          "Firebase domain notice: Google Sign-In requires 'localhost' instead of '127.0.0.1'. Please click the 'Switch to localhost' button above."
        );
      } else {
        setError(err.message || 'Firebase Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Firebase Email / Password Sign In or Registration
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Try Firebase first if on localhost, else fallback seamlessly to local backend
    try {
      let userCredential;
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      const idToken = await userCredential.user.getIdToken();
      const user = await api.firebaseLogin(idToken, role);
      onSuccess(user);
      return;
    } catch (fbErr: any) {
      // If unauthorized-domain (e.g. on 127.0.0.1), or email/password not enabled in Firebase, fallback directly to local backend
      try {
        let localUser: UserType;
        if (isRegister) {
          localUser = await api.register(name || email.split('@')[0], email, password, role);
        } else {
          localUser = await api.login(email, password);
        }
        onSuccess(localUser);
        return;
      } catch (backendErr: any) {
        if (fbErr.code === 'auth/unauthorized-domain' || fbErr.message?.includes('unauthorized-domain')) {
          setError(
            `Firebase domain check blocked 127.0.0.1. Local auth also reported: ${backendErr.message}. Switch to localhost:8000 using the button above.`
          );
        } else {
          setError(backendErr.message || fbErr.message || 'Authentication failed');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] dark:bg-[#121416] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-[#0F5C5A] dark:bg-[#0A4240] p-6 text-white text-center space-y-1">
          <h1 className="text-xl font-bold tracking-tight">MAIP</h1>
          <p className="text-xs text-teal-100 uppercase tracking-wider font-semibold">
            Medication Adherence Intelligence Platform
          </p>
        </div>

        {/* Quick Access Section */}
        <div className="p-4 bg-teal-50 dark:bg-teal-950/50 border-b border-teal-200 dark:border-teal-800 text-xs space-y-2">
          <span className="font-semibold text-[#0F5C5A] dark:text-[#1EB8B4] block uppercase tracking-wider text-[10px]">
            ⚡ Quick Direct Access (Live Real-time Mode):
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoLogin('patient')}
              disabled={loading}
              className="py-2 px-3 bg-white dark:bg-[#121416] border border-[#0F5C5A] dark:border-[#1EB8B4] hover:bg-teal-50 dark:hover:bg-teal-950 text-[#0F5C5A] dark:text-[#1EB8B4] rounded font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <User className="w-3.5 h-3.5" /> Patient Portal
            </button>
            <button
              onClick={() => handleDemoLogin('caregiver')}
              disabled={loading}
              className="py-2 px-3 bg-white dark:bg-[#121416] border border-[#0F5C5A] dark:border-[#1EB8B4] hover:bg-teal-50 dark:hover:bg-teal-950 text-[#0F5C5A] dark:text-[#1EB8B4] rounded font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <HeartHandshake className="w-3.5 h-3.5" /> Caregiver Portal
            </button>
          </div>
        </div>

        {/* Firebase Authentication Section */}
        <div className="p-6 space-y-4">
          {isIpAddress && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded text-xs text-amber-950 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                <span>Notice: Browsing on 127.0.0.1</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Firebase Authentication strictly permits <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.2 rounded font-mono">localhost</code>.
              </p>
              <button
                type="button"
                onClick={handleSwitchToLocalhost}
                className="w-full py-1.5 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-950 dark:text-amber-100 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <span>Switch to http://localhost:{window.location.port || '8000'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white dark:bg-[#121416] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google (Firebase)</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700" />
              <span className="flex-shrink mx-3 text-[11px] text-[#4A5159] dark:text-[#9EABB5] uppercase tracking-wider">
                or email
              </span>
              <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700" />
            </div>
          </div>

          <div className="flex border-b border-[#D9D5CA] dark:border-[#2E363D]">
            <button
              onClick={() => setIsRegister(false)}
              className={`pb-2 flex-1 text-center text-xs font-semibold uppercase tracking-wider ${
                !isRegister
                  ? 'border-b-2 border-[#0F5C5A] dark:border-[#1EB8B4] text-[#0F5C5A] dark:text-[#1EB8B4]'
                  : 'text-[#4A5159] dark:text-[#9EABB5]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`pb-2 flex-1 text-center text-xs font-semibold uppercase tracking-wider ${
                isRegister
                  ? 'border-b-2 border-[#0F5C5A] dark:border-[#1EB8B4] text-[#0F5C5A] dark:text-[#1EB8B4]'
                  : 'text-[#4A5159] dark:text-[#9EABB5]'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded text-xs leading-relaxed space-y-2">
              <div className="flex items-start gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {error.includes('unauthorized-domain') ? (
                    <span>
                      <strong>Firebase Domain Restriction:</strong> Firebase Auth blocks requests from <code className="font-mono bg-rose-100 dark:bg-rose-900 px-1 py-0.5 rounded">127.0.0.1</code>. Please switch your URL to <code className="font-mono bg-rose-100 dark:bg-rose-900 px-1 py-0.5 rounded">localhost</code>.
                    </span>
                  ) : (
                    <span>{error}</span>
                  )}
                </div>
              </div>
              {(error.includes('unauthorized-domain') || isIpAddress) && (
                <button
                  type="button"
                  onClick={handleSwitchToLocalhost}
                  className="w-full py-2 bg-rose-200 hover:bg-rose-300 dark:bg-rose-900 dark:hover:bg-rose-800 text-rose-950 dark:text-rose-100 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Switch URL to http://localhost:{window.location.port || '8000'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#4A5159] dark:text-[#9EABB5] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4A5159] dark:text-[#9EABB5] mb-1">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
                  >
                    <option value="patient">Patient</option>
                    <option value="caregiver">Caregiver / Family</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#4A5159] dark:text-[#9EABB5] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A5159] dark:text-[#9EABB5] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#0F5C5A] dark:bg-[#1EB8B4] hover:bg-teal-900 text-white dark:text-[#121416] rounded text-sm font-medium transition-colors shadow-xs disabled:opacity-50 mt-4 flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating…' : isRegister ? 'Register' : 'Sign In'}</span>
            </button>
          </form>

          <p className="text-[11px] text-[#4A5159] dark:text-[#9EABB5] text-center pt-2">
            Firebase Authentication enabled with server-enforced role authorization.
          </p>
        </div>
      </div>
    </div>
  );
};
