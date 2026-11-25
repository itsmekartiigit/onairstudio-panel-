import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { auth } from '../Firebase';
import { db } from '../Firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  StudioProfile,
  EventItem,
  StreamConfig,
  HighlightItem,
  WalletTransaction,
  GuestPagesData,
  TrainingVideo,
  AnnouncementItem,
  UploadedPhoto,
  NavTab,
} from '../types';
import { storageService } from '../services/storageService';
import { purchaseServicePackage } from '../services/studioAccountService';
import {
  removeStudioPhoto,
  removeEventThumbnail,
  uploadEventPhoto,
  uploadEventThumbnail,
  indexStudioPhoto,
  saveStudioProfileToFirebase,
} from '../services/firebaseDataService';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface StudioServiceAccess {
  liveStreaming: boolean;
  aiPhotoSharing: boolean;
  highlights: boolean;
  wallet: boolean;
}

const DEFAULT_SERVICE_ACCESS: StudioServiceAccess = {
  liveStreaming: true,
  aiPhotoSharing: true,
  highlights: true,
  wallet: true,
};

interface StudioContextType {
  profile: StudioProfile;
  updateProfile: (profile: Partial<StudioProfile>) => Promise<void>;
  events: EventItem[];
  activeEventId: string;
  activeEvent: EventItem | undefined;
  setActiveEventId: (id: string) => void;
  createEvent: (newEvent: Partial<EventItem>, thumbnailFile: File) => Promise<EventItem>;
  eventDetailsId: string | null;
  setEventDetailsId: (id: string | null) => void;
  buyEventService: (eventId: string, serviceId: string, packageId: string) => Promise<boolean>;
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => Promise<void>;
  duplicateEvent: (id: string) => Promise<void>;
  walletBalance: number;
  transactions: WalletTransaction[];
  serviceAccess: StudioServiceAccess;
  albumPlanActive: boolean;
  streamConfig: StreamConfig;
  updateStreamConfig: (config: Partial<StreamConfig>) => void;
  buyExtraPhotos: (eventId: string, serviceId: string, packageId: string) => Promise<boolean>;
  buyExtraHours: (eventId: string, serviceId: string, packageId: string) => Promise<boolean>;
  highlights: HighlightItem[];
  createHighlight: (item: Omit<HighlightItem, 'id' | 'createdAt'>) => void;
  updateHighlight: (id: string, updates: Partial<HighlightItem>) => void;
  deleteHighlight: (id: string) => void;
  guestPages: GuestPagesData;
  updateGuestPages: (pages: GuestPagesData) => void;
  trainingVideos: TrainingVideo[];
  announcements: AnnouncementItem[];
  createAnnouncement: (ann: Omit<AnnouncementItem, 'id'>) => void;
  deleteAnnouncement: (id: string) => void;
  markAnnouncementRead: (id: string) => void;
  uploadedPhotos: UploadedPhoto[];
  uploadPhotos: (files: File[], eventId: string) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  isSuperAdmin: boolean;
  setIsSuperAdmin: (val: boolean) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  showBuyPhotosModal: boolean;
  setShowBuyPhotosModal: (val: boolean) => void;
  showBuyHoursModal: boolean;
  setShowBuyHoursModal: (val: boolean) => void;
  showCreateEventModal: boolean;
  setShowCreateEventModal: (val: boolean) => void;
  showGuestPreviewModal: boolean;
  setShowGuestPreviewModal: (val: boolean) => void;
  activePlayingVideo: TrainingVideo | null;
  setActivePlayingVideo: (video: TrainingVideo | null) => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  toasts: Toast[];
  triggerConfetti: () => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{
  children: ReactNode;
  initialServiceAccess?: StudioServiceAccess;
  initialAlbumPlanActive?: boolean;
}> = ({ children, initialServiceAccess = DEFAULT_SERVICE_ACCESS, initialAlbumPlanActive = false }) => {
  const [profile, setProfileState] = useState<StudioProfile>(storageService.getProfile);
  const [events, setEventsState] = useState<EventItem[]>(storageService.getEvents);
  const [activeEventId, setActiveEventIdState] = useState<string>(storageService.getActiveEventId);
  const [eventDetailsId, setEventDetailsId] = useState<string | null>(null);
  const [walletBalance, setWalletBalanceState] = useState<number>(storageService.getWalletBalance);
  const [transactions, setTransactionsState] = useState<WalletTransaction[]>(storageService.getTransactions);
  const [serviceAccess, setServiceAccess] = useState<StudioServiceAccess>(initialServiceAccess);
  const [albumPlanActive, setAlbumPlanActive] = useState(initialAlbumPlanActive);
  const [catalogAccess, setCatalogAccess] = useState({ liveStreaming: true, aiPhotoSharing: true });
  const [highlights, setHighlightsState] = useState<HighlightItem[]>(storageService.getHighlights);
  const [guestPages, setGuestPagesState] = useState<GuestPagesData>(storageService.getGuestPages);
  const [trainingVideos, setTrainingVideosState] = useState<TrainingVideo[]>(storageService.getTrainingVideos);
  const [announcements, setAnnouncementsState] = useState<AnnouncementItem[]>(storageService.getAnnouncements);
  const [uploadedPhotos, setUploadedPhotosState] = useState<UploadedPhoto[]>(storageService.getUploadedPhotos);
  const [isSuperAdmin, setIsSuperAdminState] = useState<boolean>(storageService.getIsSuperAdmin);
  const [streamConfig, setStreamConfigState] = useState<StreamConfig>(() => storageService.getStreamConfig(activeEventId));

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [showBuyPhotosModal, setShowBuyPhotosModal] = useState<boolean>(false);
  const [showBuyHoursModal, setShowBuyHoursModal] = useState<boolean>(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState<boolean>(false);
  const [showGuestPreviewModal, setShowGuestPreviewModal] = useState<boolean>(false);
  const [activePlayingVideo, setActivePlayingVideo] = useState<TrainingVideo | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setServiceAccess(initialServiceAccess);
  }, [initialServiceAccess]);

  useEffect(() => setAlbumPlanActive(initialAlbumPlanActive), [initialAlbumPlanActive]);

  useEffect(() => {
    const updateAlbumStorage = (event: Event) => {
      const storageGB = Number((event as CustomEvent<number>).detail) || 0;
      setProfileState((current) => {
        const updated = { ...current, storageTotalGB: storageGB };
        storageService.saveProfile(updated);
        return updated;
      });
    };
    window.addEventListener('studio-album-storage', updateAlbumStorage);
    return () => window.removeEventListener('studio-album-storage', updateAlbumStorage);
  }, []);

  useEffect(() => onSnapshot(collection(db, 'services'), (snapshot) => {
    const enabled = { liveStreaming: false, aiPhotoSharing: false };
    snapshot.docs.forEach((item) => {
      const data = item.data();
      const category = data.category as keyof typeof enabled;
      if (data.status === 'active' && (category === 'liveStreaming' || category === 'aiPhotoSharing')) {
        enabled[category] = true;
      }
    });
    // Empty catalogs preserve legacy installations; initialized catalogs control service availability.
    setCatalogAccess(snapshot.empty ? { liveStreaming: true, aiPhotoSharing: true } : enabled);
  }), []);

  useEffect(() => {
    const videosQuery = query(collection(db, 'platformTrainingVideos'), orderBy('createdAt', 'desc'));
    return onSnapshot(videosQuery, (snapshot) => {
      const videos = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            ...data,
            id: item.id,
            published: data.status !== 'Draft',
            addedDate: typeof data.publishedOn === 'string' ? data.publishedOn : '',
            views: typeof data.views === 'number' ? `${data.views} views` : String(data.views || '0 views'),
          } as TrainingVideo;
        })
        .filter((video) => video.published !== false && (video as TrainingVideo & { status?: string }).status !== 'Draft');
      setTrainingVideosState(videos);
      storageService.saveTrainingVideos(videos);
    }, (error) => {
      console.error('Could not load platform training videos:', error);
    });
  }, []);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };


  useEffect(() => {
    const handleCloudError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      notify(message || 'Could not sync this change to Firebase.', 'error');
    };
    const handleWalletBalance = (event: Event) => {
      const { walletBalance: balance } = (event as CustomEvent<{ walletBalance: number }>).detail;
      if (!Number.isFinite(balance)) return;
      setWalletBalanceState(balance);
      storageService.saveWalletBalance(balance);
    };
    const handleWalletTransactions = (event: Event) => {
      const cloudTransactions = (event as CustomEvent<WalletTransaction[]>).detail;
      setTransactionsState(cloudTransactions);
      storageService.saveTransactions(cloudTransactions);
    };
    const handleStudioEvents = (event: Event) => {
      const cloudEvents = (event as CustomEvent<EventItem[]>).detail;
      if (!Array.isArray(cloudEvents)) return;
      setEventsState(cloudEvents);
      storageService.saveEventsLocally(cloudEvents);
      if (activeEventId && !cloudEvents.some((item) => item.id === activeEventId)) {
        const nextActiveEventId = cloudEvents[0]?.id || '';
        setActiveEventIdState(nextActiveEventId);
        storageService.setActiveEventId(nextActiveEventId);
      }
    };
    const handleStudioServiceAccess = (event: Event) => {
      const access = (event as CustomEvent<StudioServiceAccess>).detail;
      if (!access) return;
      setServiceAccess(access);
    };
    window.addEventListener('studio-cloud-error', handleCloudError);
    window.addEventListener('studio-wallet-balance', handleWalletBalance);
    window.addEventListener('studio-wallet-transactions', handleWalletTransactions);
    window.addEventListener('studio-events', handleStudioEvents);
    window.addEventListener('studio-service-access', handleStudioServiceAccess);
    return () => {
      window.removeEventListener('studio-cloud-error', handleCloudError);
      window.removeEventListener('studio-wallet-balance', handleWalletBalance);
      window.removeEventListener('studio-wallet-transactions', handleWalletTransactions);
      window.removeEventListener('studio-events', handleStudioEvents);
      window.removeEventListener('studio-service-access', handleStudioServiceAccess);
    };
  }, [activeEventId]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#F20D24', '#16A34A', '#2563EB', '#F59E0B'],
      });
    } catch {
      // safe fallback
    }
  };

  const activeEvent = events.find((e) => e.id === activeEventId) || events[0];

  useEffect(() => {
    setStreamConfigState(storageService.getStreamConfig(activeEventId));
  }, [activeEventId]);

  const setActiveEventId = (id: string) => {
    setActiveEventIdState(id);
    storageService.setActiveEventId(id);
  };

  const updateProfile = async (updates: Partial<StudioProfile>) => {
    const updated = { ...profile, ...updates };
    await saveStudioProfileToFirebase(updated);
    setProfileState(updated);
    storageService.saveProfile(updated);
    notify('Studio settings updated successfully!', 'success');
  };

  const createEvent = async (newEventData: Partial<EventItem>, thumbnailFile: File): Promise<EventItem> => {
    const generatedId = `EVT-${crypto.randomUUID()}`;
    const slug = (newEventData.name || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const created: EventItem = {
      id: generatedId,
      name: newEventData.name || '',
      type: newEventData.type || 'Wedding',
      brideName: newEventData.brideName || '',
      groomName: newEventData.groomName || '',
      date: newEventData.date || '',
      startTime: newEventData.startTime || '',
      endTime: newEventData.endTime || '',
      location: newEventData.location || '',
      googleMapsUrl: newEventData.googleMapsUrl || '',
      thumbnail: '',
      thumbnailStoragePath: undefined,
      photosCount: 0,
      liveStreamStatus: 'none',
      status: 'Active',
      services: {
        aiPhotoSharing: false,
        liveStreaming: false,
        highlights: false,
        guestWebsite: true,
      },
      photoQuota: {
        purchased: 0,
        uploaded: 0,
      },
      streamQuota: {
        purchasedHours: 0,
        consumedMinutes: 0,
        extraHourPrice: 99,
      },
      guestLinkSlug: `${slug}-${crypto.randomUUID().slice(0, 8)}`,
    };

    const updatedEvents = [created, ...events];
    const uploadedThumbnail = await uploadEventThumbnail(created.id, thumbnailFile);
    created.thumbnail = uploadedThumbnail.url;
    created.thumbnailStoragePath = uploadedThumbnail.storagePath;
    updatedEvents[0] = created;
    try {
      await storageService.persistEventsToCloud(updatedEvents);
    } catch (error) {
      try {
        await removeEventThumbnail(uploadedThumbnail.storagePath);
      } catch (cleanupError) {
        console.error('Could not remove the uploaded thumbnail after event creation failed.', cleanupError);
      }
      throw error;
    }

    setEventsState(updatedEvents);
    storageService.saveEventsLocally(updatedEvents);
    setActiveEventId(created.id);
    setActiveTab('events');
    setEventDetailsId(created.id);
    triggerConfetti();
    notify(`Event "${created.name}" created successfully!`, 'success');
    return created;
  };

  const updateEvent = (id: string, updates: Partial<EventItem>) => {
    const updatedEvents = events.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev));
    setEventsState(updatedEvents);
    storageService.saveEvents(updatedEvents);
    notify('Event updated successfully', 'success');
  };

  const deleteEvent = async (id: string) => {
    const eventToDelete = events.find((event) => event.id === id);
    const removedPhotos = uploadedPhotos.filter((photo) => photo.eventId === id);
    const remainingPhotos = uploadedPhotos.filter((photo) => photo.eventId !== id);
    const deletionResults = await Promise.allSettled(removedPhotos.map(removeStudioPhoto));
    const failedMediaDeletes = deletionResults.filter((result) => result.status === 'rejected');
    if (removedPhotos.length > 0) {
      setUploadedPhotosState(remainingPhotos);
      try {
        await storageService.saveUploadedPhotos(remainingPhotos);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Firebase could not update photo records.';
        notify(`Photo records could not be fully removed: ${message}`, 'error');
      }
    }

    const updatedEvents = events.filter((ev) => ev.id !== id);
    setEventsState(updatedEvents);
    storageService.saveEvents(updatedEvents);
    if (eventToDelete) {
      if (
        eventToDelete.thumbnailStoragePath &&
        !updatedEvents.some((event) => event.thumbnailStoragePath === eventToDelete.thumbnailStoragePath)
      ) {
        try {
          await removeEventThumbnail(eventToDelete.thumbnailStoragePath);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Firebase could not delete the event thumbnail.';
          notify(`Event thumbnail could not be deleted: ${message}`, 'error');
        }
      }
      try {
        await storageService.removeEventFromCloud(id, eventToDelete.guestLinkSlug);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Firebase could not delete this event.';
        notify(`Event data could not be fully removed: ${message}`, 'error');
      }
    }
    if (activeEventId === id && updatedEvents.length > 0) {
      setActiveEventId(updatedEvents[0].id);
    }
    if (eventDetailsId === id) setEventDetailsId(null);
    if (failedMediaDeletes.length > 0) {
      notify(`${failedMediaDeletes.length} photo file(s) could not be deleted from Storage.`, 'error');
    }
    notify('Event deleted successfully', 'info');
  };

  const duplicateEvent = async (id: string) => {
    const source = events.find((e) => e.id === id);
    if (!source) return;
    const duplicated: EventItem = {
      ...source,
      id: `EVT-${crypto.randomUUID()}`,
      name: `${source.name} (Copy)`,
      photosCount: 0,
      services: { ...source.services, aiPhotoSharing: false, liveStreaming: false },
      photoQuota: { ...source.photoQuota, purchased: 0, uploaded: 0, extraPackagesPurchased: 0 },
      streamQuota: { ...source.streamQuota, purchasedHours: 0, consumedMinutes: 0, extraHoursPurchased: 0 },
      liveStreamStatus: 'none',
      guestLinkSlug: `${source.guestLinkSlug}-${crypto.randomUUID().slice(0, 8)}`,
    };
    const updatedEvents = [duplicated, ...events];
    setEventsState(updatedEvents);
    storageService.saveEvents(updatedEvents);
    notify(`Duplicated event created: ${duplicated.name}`, 'success');
  };

  const purchasePackageForEvent = async (
    eventId: string,
    serviceId: string,
    packageId: string,
  ): Promise<boolean> => {
    const targetEvent = events.find((event) => event.id === eventId);
    if (!targetEvent) {
      notify('Event not found. Refresh the page and try again.', 'error');
      return false;
    }

    try {
      const requestStorageKey = [
        'onair_pending_service_purchase',
        auth.currentUser?.uid || 'unknown-studio',
        eventId,
        serviceId,
        packageId,
      ].join(':');
      const requestId = sessionStorage.getItem(requestStorageKey) || crypto.randomUUID();
      sessionStorage.setItem(requestStorageKey, requestId);
      const result = await purchaseServicePackage({
        eventId,
        serviceId,
        packageId,
        requestId,
      });
      const updatedEvents = events.map((event) =>
        event.id === eventId ? result.updatedEvent : event,
      );
      setEventsState(updatedEvents);
      storageService.saveEvents(updatedEvents);

      const timestamp = Date.now();
      const newTxn: WalletTransaction = {
        id: result.transactionId,
        date: new Date(timestamp).toLocaleString('en-IN'),
        timestamp,
        type: 'Debit',
        category: result.serviceCategory === 'liveStreaming' ? 'Live Streaming' : 'Photo Sharing',
        eventName: targetEvent.name,
        description: `${result.serviceName} — ${result.packageName} (${targetEvent.name})`,
        amount: result.amount,
        balanceAfter: result.balance,
        invoiceId: result.transactionId,
      };
      setWalletBalanceState(result.balance);
      storageService.saveWalletBalance(result.balance);
      const updatedTransactions = [newTxn, ...transactions];
      setTransactionsState(updatedTransactions);
      storageService.saveTransactions(updatedTransactions);
      sessionStorage.removeItem(requestStorageKey);
      triggerConfetti();
      notify(`${result.serviceName} — ${result.packageName} purchased for ${targetEvent.name}.`, 'success');
      return true;
    } catch (error) {
      console.error('Could not purchase a service package.', error);
      throw error;
    }
  };

  const buyEventService = (eventId: string, serviceId: string, packageId: string) =>
    purchasePackageForEvent(eventId, serviceId, packageId);

  const buyExtraPhotos = (eventId: string, serviceId: string, packageId: string) =>
    purchasePackageForEvent(eventId, serviceId, packageId);

  const buyExtraHours = (eventId: string, serviceId: string, packageId: string) =>
    purchasePackageForEvent(eventId, serviceId, packageId);

  const updateStreamConfig = (updates: Partial<StreamConfig>) => {
    const updated = { ...streamConfig, ...updates };
    setStreamConfigState(updated);
    storageService.saveStreamConfig(activeEventId, updated);
    notify('Live stream configuration saved successfully', 'success');
  };

  const createHighlight = (item: Omit<HighlightItem, 'id' | 'createdAt'>) => {
    if (item.type === 'trailer' && highlights.some(
      (highlight) => highlight.eventId === item.eventId && highlight.type === 'trailer',
    )) {
      notify('This event already has a trailer. Delete it before publishing a replacement.', 'error');
      return;
    }
    const newHighlight: HighlightItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' +
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [newHighlight, ...highlights];
    setHighlightsState(updated);
    storageService.saveHighlights(updated);
    triggerConfetti();
    notify(`"${item.title}" highlight published successfully!`, 'success');
  };

  const updateHighlight = (id: string, updates: Partial<HighlightItem>) => {
    const updated = highlights.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    );
    setHighlightsState(updated);
    storageService.saveHighlights(updated);
  };

  const deleteHighlight = (id: string) => {
    const updated = highlights.filter((h) => h.id !== id);
    setHighlightsState(updated);
    storageService.saveHighlights(updated);
    notify('Highlight deleted', 'info');
  };

  const updateGuestPages = (pages: GuestPagesData) => {
    setGuestPagesState(pages);
    storageService.saveGuestPages(pages);
    notify('Guest website pages updated and published live!', 'success');
  };

  const createAnnouncement = (ann: Omit<AnnouncementItem, 'id'>) => {
    const newAnn: AnnouncementItem = {
      ...ann,
      id: `ANN-${Math.floor(100 + Math.random() * 900)}`,
    };
    const updated = [newAnn, ...announcements];
    setAnnouncementsState(updated);
    storageService.saveAnnouncements(updated);
    notify(`Announcement "${newAnn.title}" published to studios!`, 'success');
  };

  const deleteAnnouncement = (id: string) => {
    const updated = announcements.filter((a) => a.id !== id);
    setAnnouncementsState(updated);
    storageService.saveAnnouncements(updated);
    notify('Announcement removed', 'info');
  };

  const markAnnouncementRead = (id: string) => {
    const updated = announcements.map((a) => (a.id === id ? { ...a, isRead: true } : a));
    setAnnouncementsState(updated);
    storageService.saveAnnouncements(updated);
  };

  const uploadPhotos = async (files: File[], eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      notify('Choose a valid event before uploading photos.', 'error');
      return;
    }

    const selectedFiles = files.slice(0, 10);
    const invalidFiles = selectedFiles.filter(
      (file) => !file.type.startsWith('image/') || file.size > 20 * 1024 * 1024,
    );
    if (invalidFiles.length > 0) {
      notify('Only image files up to 20 MB each can be uploaded.', 'error');
      return;
    }

    const results = await Promise.allSettled(
      selectedFiles.map((file) => uploadEventPhoto(event, file)),
    );
    const uploaded = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    const failures = results.filter((result) => result.status === 'rejected');

    if (uploaded.length === 0) {
      const firstFailure = failures[0];
      const message = firstFailure?.status === 'rejected' && firstFailure.reason instanceof Error
        ? firstFailure.reason.message
        : 'No photos were uploaded.';
      notify(message, 'error');
      return;
    }

    const updatedPhotos = [...uploaded, ...uploadedPhotos];
    try {
      await storageService.saveUploadedPhotos(updatedPhotos);
    } catch (error) {
      await Promise.allSettled(uploaded.map((photo) => removeStudioPhoto(photo)));
      const message = error instanceof Error ? error.message : 'Firebase could not save photo details.';
      notify(`Photo upload failed: ${message}`, 'error');
      return;
    }

    setUploadedPhotosState(updatedPhotos);
    const updatedEvents = events.map((item) => item.id === eventId
      ? {
          ...item,
          photosCount: item.photosCount + uploaded.length,
          photoQuota: {
            ...item.photoQuota,
            uploaded: item.photoQuota.uploaded + uploaded.length,
          },
        }
      : item);
    setEventsState(updatedEvents);
    storageService.saveEvents(updatedEvents);

    let indexed = 0;
    let noFaces = 0;
    let indexingFailed = 0;
    console.log('[AI INDEX] Upload completed:', uploaded.length);
    console.log('[AI INDEX] Event:', event.id);
    console.log('[AI INDEX] AI enabled:', event.services?.aiPhotoSharing);

    if (event.services?.aiPhotoSharing) {
      // Index sequentially to avoid overwhelming the private AI service.
      for (const photo of uploaded) {
        console.log('[AI INDEX] Calling function:', photo.id);
        try {
          const result = await indexStudioPhoto(eventId, photo.id);
          if (result.success) {
            if (result.indexStatus === 'no_faces' || result.facesDetected === 0) {
              noFaces += 1;
              console.info('[AI INDEX] NO FACES:', photo.id, result);
            } else {
              indexed += 1;
              console.log('[AI INDEX] SUCCESS:', photo.id, result);
            }
          } else {
            indexingFailed += 1;
            console.error('[AI INDEX] FAILED:', photo.id, result);
          }
        } catch (error) {
          indexingFailed += 1;
          console.error('[AI INDEX] FAILED:', photo.id, error);
        }
      }
    }

    if (failures.length > 0) {
      const indexingSummary = event.services?.aiPhotoSharing
        ? ` ${indexed} indexed; ${noFaces} had no faces; ${indexingFailed} need AI indexing retry.`
        : '';
      notify(
        `${uploaded.length} photos uploaded; ${failures.length} could not be uploaded.${indexingSummary}`,
        'info',
      );
      failures.forEach((result) => {
        if (result.status === 'rejected') console.error('Photo upload failed:', result.reason);
      });
    } else if (event.services?.aiPhotoSharing && indexingFailed > 0) {
      notify(
        `${uploaded.length} photos uploaded. ${indexed} indexed; ${noFaces} had no faces; ${indexingFailed} need AI indexing retry.`,
        'info',
      );
    } else if (event.services?.aiPhotoSharing && noFaces > 0) {
      notify(
        `${uploaded.length} photos uploaded. ${indexed} indexed; ${noFaces} had no faces detected.`,
        'info',
      );
    } else if (event.services?.aiPhotoSharing) {
      notify(`${uploaded.length} photos uploaded and AI indexed successfully.`, 'success');
    } else {
      notify(`${uploaded.length} photos uploaded to Firebase Storage.`, 'success');
    }
  };

  const deletePhoto = async (id: string) => {
    const photo = uploadedPhotos.find((item) => item.id === id);
    if (!photo) return;
    try {
      await removeStudioPhoto(photo);
      const updated = uploadedPhotos.filter((item) => item.id !== id);
      const updatedEvents = events.map((event) => event.id === photo.eventId
        ? {
            ...event,
            photosCount: Math.max(0, event.photosCount - 1),
            photoQuota: {
              ...event.photoQuota,
              uploaded: Math.max(0, event.photoQuota.uploaded - 1),
            },
          }
        : event);
      await storageService.saveUploadedPhotos(updated);
      await storageService.saveEvents(updatedEvents);
      setUploadedPhotosState(updated);
      setEventsState(updatedEvents);
      notify('Photo removed from event gallery', 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The photo could not be removed.';
      notify(`Could not remove photo: ${message}`, 'error');
    }
  };

  const setIsSuperAdmin = (val: boolean) => {
    setIsSuperAdminState(val);
    storageService.setIsSuperAdmin(val);
    notify(val ? 'Switched to Super Admin Mode (manage training & announcements)' : 'Switched back to Studio Mode', 'info');
  };

  return (
    <StudioContext.Provider
      value={{
        profile,
        updateProfile,
        events,
        activeEventId,
        activeEvent,
        setActiveEventId,
        createEvent,
        eventDetailsId,
        setEventDetailsId,
        buyEventService,
        updateEvent,
        deleteEvent,
        duplicateEvent,
        walletBalance,
        transactions,
        serviceAccess: {
          ...serviceAccess,
          liveStreaming: serviceAccess.liveStreaming && catalogAccess.liveStreaming,
          aiPhotoSharing: serviceAccess.aiPhotoSharing && catalogAccess.aiPhotoSharing,
        },
        albumPlanActive,
        streamConfig,
        updateStreamConfig,
        buyExtraPhotos,
        buyExtraHours,
        highlights,
        createHighlight,
        updateHighlight,
        deleteHighlight,
        guestPages,
        updateGuestPages,
        trainingVideos,
        announcements,
        createAnnouncement,
        deleteAnnouncement,
        markAnnouncementRead,
        uploadedPhotos,
        uploadPhotos,
        deletePhoto,
        isSuperAdmin,
        setIsSuperAdmin,
        activeTab,
        setActiveTab,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        showBuyPhotosModal,
        setShowBuyPhotosModal,
        showBuyHoursModal,
        setShowBuyHoursModal,
        showCreateEventModal,
        setShowCreateEventModal,
        showGuestPreviewModal,
        setShowGuestPreviewModal,
        activePlayingVideo,
        setActivePlayingVideo,
        notify,
        toasts,
        triggerConfetti,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
