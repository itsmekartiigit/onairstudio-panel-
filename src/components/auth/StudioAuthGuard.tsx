import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../Firebase';

const DISABLED_MESSAGE = 'Your studio account is currently disabled. Please contact ON AIR Super Admin.';

interface StudioAuthGuardProps {
  uid: string;
  children: ReactNode;
  onDenied: (message: string) => void;
}

export const StudioAuthGuard: React.FC<StudioAuthGuardProps> = ({ uid, children, onDenied }) => {
  const [authorized, setAuthorized] = useState(false);
  const onDeniedRef = useRef(onDenied);
  onDeniedRef.current = onDenied;

  useEffect(() => {
    let active = true;
    setAuthorized(false);
    const unsubscribe = onSnapshot(doc(db, 'studios', uid), (snapshot) => {
      if (!active) return;
      if (!snapshot.exists() || snapshot.data().authUid !== uid) {
        setAuthorized(false);
        onDeniedRef.current('Your studio profile could not be found. Please contact ON AIR Super Admin.');
        void signOut(auth);
        return;
      }

      const studio = snapshot.data();
      if (studio.status !== 'active') {
        setAuthorized(false);
        onDeniedRef.current(DISABLED_MESSAGE);
        void signOut(auth);
        return;
      }

      setAuthorized(true);
      window.dispatchEvent(new CustomEvent('studio-wallet-balance', {
        detail: { walletBalance: Number(studio.walletBalance) || 0 },
      }));
    }, (error) => {
      if (!active) return;
      console.error('Studio account access could not be verified.', error);
      setAuthorized(false);
      onDeniedRef.current('Could not verify studio access. Please sign in again.');
      void signOut(auth);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  if (!authorized) {
    return <div className="min-h-screen bg-[#111116] grid place-items-center text-white">Verifying studio access…</div>;
  }

  return <>{children}</>;
};
