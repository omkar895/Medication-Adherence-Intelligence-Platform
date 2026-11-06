import React, { useState } from 'react';
import { User, HeartHandshake, LogIn } from 'lucide-react';
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
      setError(err.message || 'Firebase Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  // Firebase Email / Password Sign In or Registration
  const handleFirebaseEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
      // If unauthorized-domain (e.g. browsing 127.0.0.1 instead of localhost) or network error, fallback directly to local backend auth
      try {
        let fallbackUser: UserType;
        if (isRegister) {
          fallbackUser = await api.register(name || email.split('@')[0], email, password, role);
        } else {
          fallbackUser = await api.login(email, password);
        }
        onSuccess(fallbackUser);
      } catch (backendErr: any) {
        if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
          setError(
            "Firebase domain restriction: Please open the app via http://localhost:8000 instead of 127.0.0.1 (Firebase whitelists 'localhost' by default)."
          );
        } else {
          setError(backendErr.message || err.message || 'Authentication failed');
        }
      }
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

        {/* 1-Click Interactive Demo Access */}
        <div className="p-4 bg-teal-50 border-b border-teal-200 text-xs space-y-2">
          <span className="font-semibold text-[#0F5C5A] block uppercase tracking-wider text-[10px]">
            ⚡ 1-Click Interactive Demo:
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

        {/* Firebase Authentication Section */}
        <div className="p-6 space-y-4">
          {window.location.hostname === '127.0.0.1' && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950 space-y-1">
              <span className="font-semibold block">⚠️ Firebase Domain Notice:</span>
              <span>
                You are on <code className="bg-amber-100 px-1 py-0.5 rounded">127.0.0.1</code>. Firebase requires <code className="bg-amber-100 px-1 py-0.5 rounded">localhost</code> for Google Sign-In.{' '}
                <a
                  href={`http://localhost:${window.location.port || '8000'}`}
                  className="font-bold underline text-[#0F5C5A] hover:text-teal-900"
                >
                  Click here to switch to http://localhost:{window.location.port || '8000'}
                </a>
              </span>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white border border-neutral-300 hover:bg-neutral-50 rounded text-xs font-semibold text-neutral-800 flex items-center justify-center gap-2 shadow-xs transition-colors"
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
              <div className="flex-grow border-t border-neutral-200" />
              <span className="flex-shrink mx-3 text-[11px] text-[#4A5159] uppercase tracking-wider">
                or email
              </span>
              <div className="flex-grow border-t border-neutral-200" />
            </div>
          </div>

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
              Register
            </button>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleFirebaseEmailAuth} className="space-y-3">
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
              className="w-full py-2.5 bg-[#0F5C5A] hover:bg-teal-900 text-white rounded text-sm font-medium transition-colors shadow-sm disabled:opacity-50 mt-4 flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating…' : isRegister ? 'Register with Firebase' : 'Sign In with Firebase'}</span>
            </button>
          </form>

          <p className="text-[11px] text-[#4A5159] text-center pt-2">
            Firebase Authentication enabled with server-enforced role authorization.
          </p>
        </div>
      </div>
    </div>
  );
};
