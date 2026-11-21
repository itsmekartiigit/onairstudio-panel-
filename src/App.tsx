import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from './Firebase';
import type { EventItem } from './types';
import { StudioLogin } from './components/auth/StudioLogin';
import { StudioProvider, StudioServiceAccess, useStudio } from './context/StudioContext';
import { storageService } from './services/storageService';
import {
  configureStudioCloud,
  disconnectStudioCloud,
  loadStudioCloudState,
} from './services/firebaseDataService';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { EventsPage } from './components/events/EventsPage';
import { PhotoSharingPage } from './components/photo-sharing/PhotoSharingPage';
import { CameraUploadPage } from './components/camera-upload/CameraUploadPage';
import { LiveStreamPage } from './components/live-stream/LiveStreamPage';
import { HighlightsPage } from './components/highlights/HighlightsPage';
import { WalletPage } from './components/wallet/WalletPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { MoreGuestPagesPage } from './components/more/MoreGuestPagesPage';
import { TrainingPage } from './components/training/TrainingPage';
import { AnnouncementPage } from './components/announcement/AnnouncementPage';
import { CreateEventModal } from './components/events/CreateEventModal';
import { GuestWebsitePreviewModal } from './components/guest-preview/GuestWebsitePreviewModal';
import { AlbumSelectionPage } from './components/albums/AlbumSelectionPage';

const AppContent: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const {
    activeTab,
    showCreateEventModal,
    setShowCreateEventModal,
    showGuestPreviewModal,
    setShowGuestPreviewModal,
    serviceAccess,
  } = useStudio();
  const restrictedFeature = activeTab === 'live-stream' && !serviceAccess.liveStreaming
    ? 'Live Streaming'
    : activeTab === 'photo-sharing' && !serviceAccess.aiPhotoSharing
      ? 'AI Photo Sharing'
        : activeTab === 'camera-upload' && !serviceAccess.aiPhotoSharing
          ? 'AI Photo Sharing'
      : activeTab === 'highlights' && !serviceAccess.highlights
        ? 'Highlights'
        : activeTab === 'wallet' && !serviceAccess.wallet
          ? 'Studio Wallet'
          : '';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F8FC] text-[#171717] antialiased">
      {/* Persistent Left Sidebar */}
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16">
          {restrictedFeature ? (
            <section className="mx-auto max-w-xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-2xs">
              <h2 className="text-xl font-bold text-gray-900">{restrictedFeature} is disabled</h2>
              <p className="mt-2 text-sm text-gray-600">
                Your administrator has disabled this service for your studio. Contact them to restore access.
              </p>
            </section>
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardPage />}
              {activeTab === 'events' && <EventsPage />}
              {activeTab === 'album-selection' && <AlbumSelectionPage />}
              {activeTab === 'photo-sharing' && <PhotoSharingPage />}
              {activeTab === 'camera-upload' && <CameraUploadPage />}
              {activeTab === 'live-stream' && <LiveStreamPage />}
              {activeTab === 'highlights' && <HighlightsPage />}
              {activeTab === 'wallet' && <WalletPage />}
              {activeTab === 'settings' && <SettingsPage />}
              {activeTab === 'more' && <MoreGuestPagesPage />}
              {activeTab === 'training' && <TrainingPage />}
              {activeTab === 'announcement' && <AnnouncementPage />}
            </>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
      />

      <GuestWebsitePreviewModal
        isOpen={showGuestPreviewModal}
        onClose={() => setShowGuestPreviewModal(false)}
      />

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};

interface MaintenanceNotice {
  enabled: boolean;
  title: string;
  description: string;
  expectedRestorationDate: string;
  expectedRestorationTime: string;
}

const MaintenanceScreen: React.FC<{ notice: MaintenanceNotice }> = ({ notice }) => (
  <main className="grid min-h-screen place-items-center bg-[#111116] p-5 text-center text-white">
    <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white p-8 text-[#171717] shadow-2xl sm:p-10">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700">
        <span className="text-2xl font-black" aria-hidden="true">!</span>
      </div>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F20D24]">ON AIR Studio</p>
      <h1 className="mt-3 text-2xl font-black tracking-tight">{notice.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{notice.description}</p>
      {(notice.expectedRestorationDate || notice.expectedRestorationTime) && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          Expected service restoration: {notice.expectedRestorationDate} {notice.expectedRestorationTime && `at ${notice.expectedRestorationTime}`}
        </p>
      )}
      <p className="mt-6 text-xs text-gray-400">Your studio data is safe. Please check back soon.</p>
    </section>
  </main>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [cloudUid, setCloudUid] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [serviceAccess, setServiceAccess] = useState<StudioServiceAccess>({
    liveStreaming: true,
    aiPhotoSharing: true,
    highlights: true,
    wallet: true,
  });
  const [albumPlanActive, setAlbumPlanActive] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceNotice, setMaintenanceNotice] = useState<MaintenanceNotice>({
    enabled: false,
    title: 'Scheduled Platform Maintenance',
    description: 'The ON AIR Studio platform is temporarily unavailable while we complete scheduled maintenance.',
    expectedRestorationDate: '',
    expectedRestorationTime: '',
  });

  useEffect(() => {
    if (!user) {
      setMaintenanceLoading(false);
      setMaintenanceNotice((current) => ({ ...current, enabled: false }));
      return undefined;
    }

    setMaintenanceLoading(true);
    return onSnapshot(doc(db, 'platformSettings', 'maintenance'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMaintenanceNotice({
          enabled: data.enabled === true,
          title: typeof data.title === 'string' ? data.title : 'Scheduled Platform Maintenance',
          description: typeof data.description === 'string' ? data.description : 'The ON AIR Studio platform is temporarily unavailable while we complete scheduled maintenance.',
          expectedRestorationDate: typeof data.expectedRestorationDate === 'string' ? data.expectedRestorationDate : '',
          expectedRestorationTime: typeof data.expectedRestorationTime === 'string' ? data.expectedRestorationTime : '',
        });
      } else {
        setMaintenanceNotice((current) => ({ ...current, enabled: false }));
      }
      setMaintenanceLoading(false);
    }, (error) => {
      console.error('Could not load platform maintenance settings:', error);
      setMaintenanceLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) { setAlbumPlanActive(false); return undefined; }
    let expiryTimer: number | undefined;
    const unsubscribe = onSnapshot(query(collection(db, 'albumPlanSubscriptions'), where('studioId', '==', user.uid)), (snapshot) => {
      const now = Date.now();
      const expirations = snapshot.docs.flatMap((item) => {
        const value = item.data();
        const expiry = value.expirationDate?.toMillis?.() ?? value.expiresAt?.toMillis?.() ?? 0;
        return value.status === 'active' && expiry > now ? [expiry] : [];
      });
      setAlbumPlanActive(expirations.length > 0);
      if (expiryTimer !== undefined) window.clearTimeout(expiryTimer);
      if (expirations.length) {
        expiryTimer = window.setTimeout(() => setAlbumPlanActive(expirations.some((expiry) => expiry > Date.now())), Math.min(...expirations) - now);
      }
    }, (error) => {
      console.error('Could not verify album plan access:', error);
      setAlbumPlanActive(false);
    });
    return () => { unsubscribe(); if (expiryTimer !== undefined) window.clearTimeout(expiryTimer); };
  }, [user]);

  const readServiceAccess = (value: unknown): StudioServiceAccess => {
    const quotas = value && typeof value === 'object'
      ? value as Record<string, { enabled?: unknown }>
      : {};
    return {
      liveStreaming: quotas.liveStreaming?.enabled !== false,
      aiPhotoSharing: quotas.aiPhotoSharing?.enabled !== false,
      highlights: quotas.highlights?.enabled !== false,
      wallet: quotas.wallet?.enabled !== false,
    };
  };

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setAuthLoading(false);
    setLoadError('');
    if (!nextUser) {
      setServiceAccess({
        liveStreaming: true,
        aiPhotoSharing: true,
        highlights: true,
        wallet: true,
      });
      disconnectStudioCloud();
      setDataLoading(false);
      setCloudUid(null);
    }
  }), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let unsubscribeDirectory: (() => void) | undefined;
    let storageExpiryTimer: number | undefined;
    let unsubscribeWalletTransactions: (() => void) | undefined;
    let unsubscribeEvents: (() => void) | undefined;
    setDataLoading(true);
    setCloudUid(null);
    setLoadError('');

    const initialize = async () => {
      try {

        storageService.setCloudOwnerUid(user.uid);

        const studioSnapshot = await getDoc(doc(db, 'studios', user.uid));
        if (!studioSnapshot.exists()) {
          throw new Error('Your studio profile could not be found. Contact ON AIR Super Admin.');
        }
        const studio = studioSnapshot.data();

        if (studio.authUid !== user.uid) {
          throw new Error('Studio account UID verification failed.');
        }

        if (studio.status !== 'active') {
          throw new Error('Your studio account is not active. Contact ON AIR Super Admin.');
        }
        setServiceAccess(readServiceAccess(studio.serviceQuotas));

        const directoryProfile = {
          studioName: String(studio.studioName || ''),
          ownerName: String(studio.ownerName || ''),
          mobileNumber: String(studio.ownerMobile || ''),
          studioLogo: String(studio.logoUrl || ''),
          joinedDate: '',
          plan: '',
          planExpiry: '',
          storageUsedGB: Number(studio.storageUsedGB) || 0,
          storageTotalGB: studio.albumStorageExpiresAt?.toMillis?.() > Date.now()
            ? Number(studio.albumStorageGB) || 0
            : 0,
        };
        const fallback = storageService.getCloudState(
          directoryProfile,
          Number(studio.walletBalance) || 0,
        );

        const cloudState = await loadStudioCloudState(user.uid, fallback);
        if (cancelled) return;
        cloudState.profile = {
          ...cloudState.profile,
          ...directoryProfile,
        };
        storageService.hydrateFromCloud(cloudState);
        configureStudioCloud(user.uid, (error) => {
          console.error('Firebase sync failed:', error);
          const message = error instanceof Error ? error.message : 'Firebase could not save the latest change.';
          window.dispatchEvent(new CustomEvent('studio-cloud-error', { detail: message }));
        });
        unsubscribeDirectory = onSnapshot(doc(db, 'studios', user.uid), (snapshot) => {
          if (!snapshot.exists()) return;
          const currentDirectory = snapshot.data();
          setServiceAccess(readServiceAccess(currentDirectory.serviceQuotas));
          if (storageExpiryTimer !== undefined) window.clearTimeout(storageExpiryTimer);
          const storageExpiry = currentDirectory.albumStorageExpiresAt?.toMillis?.() || 0;
          const activeAlbumStorage = storageExpiry > Date.now() ? Number(currentDirectory.albumStorageGB) || 0 : 0;
          window.dispatchEvent(new CustomEvent('studio-album-storage', { detail: activeAlbumStorage }));
          if (storageExpiry > Date.now()) {
            storageExpiryTimer = window.setTimeout(() => window.dispatchEvent(new CustomEvent('studio-album-storage', { detail: 0 })), storageExpiry - Date.now());
          }
          if (currentDirectory.status !== 'active') {
            void signOut(auth);
            return;
          }
          window.dispatchEvent(new CustomEvent('studio-wallet-balance', {
            detail: { walletBalance: Number(currentDirectory.walletBalance) || 0 },
          }));
        }, (error) => {
          console.error('Could not listen for studio wallet updates.', error);
          window.dispatchEvent(new CustomEvent('studio-cloud-error', {
            detail: 'Wallet balance updates could not be loaded from Firebase.',
          }));
        });
        const walletTransactionsQuery = query(
          collection(db, 'studios', user.uid, 'walletTransactions'),
          orderBy('createdAt', 'desc'),
          limit(100),
        );
        unsubscribeWalletTransactions = onSnapshot(walletTransactionsQuery, (snapshot) => {
          const walletTransactions = snapshot.docs.map((walletTransaction) => {
            const data = walletTransaction.data();
            const createdAt = data.createdAt as { toMillis?: () => number; toDate?: () => Date } | undefined;
            return {
              id: walletTransaction.id,
              date: String(data.date || data.dateTime || createdAt?.toDate?.().toISOString() || ''),
              timestamp: Number(data.timestamp) || createdAt?.toMillis?.() || 0,
              type: data.type === 'credit' ? 'Add Money' as const : 'Debit' as const,
              category: data.category === 'Live Streaming'
                || data.category === 'Photo Sharing'
                || data.category === 'Plan Purchase'
                || data.category === 'Wallet Adjustment'
                ? data.category
                : 'Wallet top-up',
              eventName: data.eventName || undefined,
              description: String(data.description || data.details || 'Wallet transaction'),
              amount: Number(data.amount) || 0,
              balanceAfter: Number(data.balanceAfter) || 0,
              invoiceId: String(data.invoiceId || data.transactionId || walletTransaction.id),
            };
          });
          window.dispatchEvent(new CustomEvent('studio-wallet-transactions', { detail: walletTransactions }));
        }, (error) => {
          console.error('Could not listen for studio wallet transactions.', error);
          window.dispatchEvent(new CustomEvent('studio-cloud-error', {
            detail: 'Wallet transactions could not be loaded from Firebase.',
          }));
        });
        unsubscribeEvents = onSnapshot(collection(db, 'studios', user.uid, 'events'), (snapshot) => {
          const currentEvents = snapshot.docs
            .flatMap((event) => {
              const value: unknown = event.data().value;
              return value && typeof value === 'object' ? [value as EventItem] : [];
            });
          window.dispatchEvent(new CustomEvent('studio-events', { detail: currentEvents }));
        }, (error) => {
          console.error('Could not listen for studio event updates.', error);
          window.dispatchEvent(new CustomEvent('studio-cloud-error', {
            detail: 'Event updates could not be loaded from Firebase.',
          }));
        });
        setCloudUid(user.uid);
        setDataLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error('Could not load studio data from Firebase:', error);
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : '';
        const message = error instanceof Error ? error.message : 'Could not load studio data from Firebase.';
        setLoadError(code === 'permission-denied' || code === 'firestore/permission-denied'
          ? 'Firebase sign-in succeeded, but Firestore denied Studio data access. Publish the project Firestore rules and verify studios/' +
            `${user.uid} is accessible to this studio account.`
          : message);
        setDataLoading(false);
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      unsubscribeDirectory?.();
      if (storageExpiryTimer !== undefined) window.clearTimeout(storageExpiryTimer);
      unsubscribeWalletTransactions?.();
      unsubscribeEvents?.();
    };
  }, [user, retry]);

  if (authLoading) {
    return <div className="min-h-screen bg-[#111116] grid place-items-center text-white">Checking sign-in…</div>;
  }
  if (!user) return <StudioLogin />;
  if (loadError) {
    return (
      <main className="min-h-screen bg-[#111116] flex items-center justify-center p-4">
        <section className="w-full max-w-lg rounded-2xl bg-white p-6">
          <h1 className="text-lg font-bold text-gray-900">
            {loadError.includes('could not be found') || loadError.includes('not active')
              ? 'Studio access unavailable'
              : 'Could not connect to Firebase'}
          </h1>
          <p className="mt-2 break-words text-sm text-red-700">{loadError}</p>
          <p className="mt-3 text-sm text-gray-600">
            Check that Firestore is enabled and the Studio rules are deployed, then try again.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setRetry((value) => value + 1)}
              className="rounded-lg bg-[#F20D24] px-4 py-2 text-sm font-bold text-white"
            >
              Retry
            </button>
            <button
              onClick={() => { void signOut(auth); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }
  if (dataLoading || cloudUid !== user.uid) {
    return <div className="min-h-screen bg-[#111116] grid place-items-center text-white">Connecting to Firebase…</div>;
  }

  if (maintenanceLoading) {
    return <div className="min-h-screen bg-[#111116] grid place-items-center text-white">Checking platform status...</div>;
  }
  if (maintenanceNotice.enabled) return <MaintenanceScreen notice={maintenanceNotice} />;

  return (
      <StudioProvider key={user.uid} initialServiceAccess={serviceAccess} initialAlbumPlanActive={albumPlanActive}>
      <AppContent />
    </StudioProvider>
  );
}
