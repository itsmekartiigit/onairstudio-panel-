import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../Firebase';
import studioLogo from '../../assets/image.png';

export const StudioLogin: React.FC<{ initialError?: string }> = ({ initialError = '' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => setError(initialError), [initialError]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (signInError) {
      const code = typeof signInError === 'object' && signInError && 'code' in signInError
        ? String(signInError.code)
        : '';
      setError(
        code === 'auth/user-disabled'
          ? 'Your studio account is currently disabled. Please contact ON AIR Super Admin.'
          : code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Email or password is incorrect.'
          : code === 'auth/too-many-requests'
            ? 'Too many attempts. Please wait and try again.'
            : 'Could not sign in. Check your connection and Firebase Authentication setup.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative flex min-h-[38vh] items-center justify-center overflow-hidden bg-[#080b1c] sm:min-h-[48vh] lg:min-h-screen">
        <img
          src={studioLogo}
          alt="ON AIR Studio Panel logo"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </section>

      <section className="flex min-h-[62vh] items-center justify-center bg-white px-6 py-12 sm:min-h-[52vh] sm:px-12 lg:min-h-screen lg:px-16">
        <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F20D24]">ON AIR Studio</p>
              <h1 className="mt-2 text-2xl font-bold text-gray-950 sm:text-3xl">Sign in to your studio</h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">Manage your events, galleries, and live streams.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="studio-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Studio email
                </label>
                <input
                  id="studio-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 outline-none focus:border-[#F20D24] focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label htmlFor="studio-password" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="studio-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 outline-none focus:border-[#F20D24] focus:ring-2 focus:ring-red-100"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#F20D24] px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-xs leading-relaxed text-gray-500">
              Sign in with the email and password registered for your studio in Firebase Authentication.
            </p>
        </div>
      </section>
    </main>
  );
};
