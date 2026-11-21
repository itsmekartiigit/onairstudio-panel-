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
} from '../types';
import {
  persistStudioPhotos,
  persistStudioEvents,
  persistStudioState,
  removePublicEvent,
} from './firebaseDataService';
import { removeEventGuestPin } from './studioAccountService';

import type { StudioCloudState } from './firebaseDataService';

const STUDIO_OWNER_UID_KEY = 'onair_studio_owner_uid';
let activeStudioUid: string | null = null;

function getStudioStorageKey(key: string): string {
  const uid = activeStudioUid || 'anonymous';
  return `${key}::${uid}`;
}

const STORAGE_KEYS = {
  get PROFILE() { return getStudioStorageKey('onair_studio_profile'); },
  get EVENTS() { return getStudioStorageKey('onair_events'); },
  get ACTIVE_EVENT() { return getStudioStorageKey('onair_active_event_id'); },
  get STREAM_CONFIGS() { return getStudioStorageKey('onair_stream_configs'); },
  get HIGHLIGHTS() { return getStudioStorageKey('onair_highlights'); },
  get TRANSACTIONS() { return getStudioStorageKey('onair_wallet_transactions'); },
  get WALLET_BALANCE() { return getStudioStorageKey('onair_wallet_balance'); },
  get GUEST_PAGES() { return getStudioStorageKey('onair_guest_pages'); },
  get TRAINING_VIDEOS() { return getStudioStorageKey('onair_training_videos'); },
  get ANNOUNCEMENTS() { return getStudioStorageKey('onair_announcements'); },
  get UPLOADED_PHOTOS() { return getStudioStorageKey('onair_uploaded_photos'); },
  get IS_SUPER_ADMIN() { return getStudioStorageKey('onair_is_super_admin'); },
};

const defaultProfile: StudioProfile = {
  studioName: '',
  ownerName: '',
  mobileNumber: '',
  studioLogo: '',
  joinedDate: '',
  plan: '',
  planExpiry: '',
  storageUsedGB: 0,
  storageTotalGB: 0,
};

const emptyGuestPages: GuestPagesData = {
  privacyPolicy: { title: '', content: '', isActive: false, lastUpdated: '' },
  venueDetails: {
    venueName: '',
    address: '',
    googleMapsUrl: '',
    directions: '',
    venueImage: '',
    isActive: false,
  },
  familyDetails: { brideFamily: [], groomFamily: [], isActive: false },
  helpSupport: { contactNumber: '', whatsappNumber: '', email: '', description: '', isActive: false },
};

const defaultStreamConfig: StreamConfig = {
  rtmpServerUrl: '',
  streamKey: '',
  resolution: '1080p (Full HD)',
  bitrate: '',
  fps: 30,
  autoStart: false,
  recordStream: false,
  isLiveNow: false,
  currentViewers: 0,
  currentBitrate: '',
  liveDuration: '00:00:00',
};

export const storageService = {
  getProfile(): StudioProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  },

  saveProfile(profile: StudioProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    persistStudioState('profile', profile);
  },

  getEvents(): EventItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (!data) return [];
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return (parsed as EventItem[]).map((item) => {
        return {
          ...item,
          streamQuota: {
            purchasedHours: item.streamQuota?.purchasedHours ?? 0,
            consumedMinutes: item.streamQuota?.consumedMinutes ?? 0,
            consumedSeconds: item.streamQuota?.consumedSeconds,
            extraHourPrice: item.streamQuota?.extraHourPrice ?? 99,
            extraHoursPurchased: item.streamQuota?.extraHoursPurchased ?? 0,
          },
          photoQuota: {
            purchased: item.photoQuota?.purchased ?? 0,
            uploaded: item.photoQuota?.uploaded ?? 0,
            extraPackagesPurchased: item.photoQuota?.extraPackagesPurchased ?? 0,
          },
          services: {
            aiPhotoSharing: item.services?.aiPhotoSharing ?? false,
            liveStreaming: item.services?.liveStreaming ?? false,
            highlights: item.services?.highlights ?? false,
            guestWebsite: item.services?.guestWebsite ?? false,
          },
        };
      });
    } catch {
      return [];
    }
  },

  saveEvents(events: EventItem[]): void {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    persistStudioState('events', events);
  },

  getActiveEventId(): string {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT);
    return saved || '';
  },

  setActiveEventId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT, id);
    persistStudioState('activeEventId', id);
  },

  getStreamConfig(eventId: string): StreamConfig {
    try {
      const all = localStorage.getItem(STORAGE_KEYS.STREAM_CONFIGS);
      if (all) {
        const parsed = JSON.parse(all);
        if (parsed[eventId]) return parsed[eventId];
      }
      return defaultStreamConfig;
    } catch {
      return defaultStreamConfig;
    }
  },

  saveStreamConfig(eventId: string, config: StreamConfig): void {
    try {
      const all = localStorage.getItem(STORAGE_KEYS.STREAM_CONFIGS);
      const parsed = all ? JSON.parse(all) : {};
      parsed[eventId] = config;
      localStorage.setItem(STORAGE_KEYS.STREAM_CONFIGS, JSON.stringify(parsed));
      persistStudioState('streamConfigs', parsed);
    } catch (e) {
      console.error(e);
    }
  },

  getHighlights(): HighlightItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveHighlights(items: HighlightItem[]): void {
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(items));
    persistStudioState('highlights', items);
  },

  getWalletBalance(): number {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WALLET_BALANCE);
      return data !== null ? Number(data) : 0;
    } catch {
      return 0;
    }
  },

  saveWalletBalance(balance: number): void {
    localStorage.setItem(STORAGE_KEYS.WALLET_BALANCE, String(balance));
  },

  getTransactions(): WalletTransaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveTransactions(transactions: WalletTransaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getGuestPages(): GuestPagesData {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GUEST_PAGES);
      return data ? JSON.parse(data) : emptyGuestPages;
    } catch {
      return emptyGuestPages;
    }
  },

  saveGuestPages(pages: GuestPagesData): void {
    localStorage.setItem(STORAGE_KEYS.GUEST_PAGES, JSON.stringify(pages));
    persistStudioState('guestPages', pages);
  },

  getTrainingVideos(): TrainingVideo[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRAINING_VIDEOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveTrainingVideos(videos: TrainingVideo[]): void {
    localStorage.setItem(STORAGE_KEYS.TRAINING_VIDEOS, JSON.stringify(videos));
    persistStudioState('trainingVideos', videos);
  },

  getAnnouncements(): AnnouncementItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveAnnouncements(announcements: AnnouncementItem[]): void {
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
    persistStudioState('announcements', announcements);
  },

  getUploadedPhotos(): UploadedPhoto[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.UPLOADED_PHOTOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveUploadedPhotos(photos: UploadedPhoto[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.UPLOADED_PHOTOS, JSON.stringify(photos));
    await persistStudioPhotos(photos, this.getEvents());
  },

  getIsSuperAdmin(): boolean {
    return localStorage.getItem(STORAGE_KEYS.IS_SUPER_ADMIN) === 'true';
  },

  setIsSuperAdmin(val: boolean): void {
    localStorage.setItem(STORAGE_KEYS.IS_SUPER_ADMIN, String(val));
    persistStudioState('isSuperAdmin', val);
  },

  getCloudState(profile: StudioProfile, walletBalance: number): StudioCloudState {
    return {
      profile,
      events: [],
      activeEventId: '',
      streamConfigs: {},
      highlights: [],
      transactions: [],
      walletBalance,
      guestPages: emptyGuestPages,
      trainingVideos: [],
      announcements: [],
      uploadedPhotos: [],
      isSuperAdmin: false,
    };
  },

  saveEventsLocally(events: EventItem[]): void {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  },

  async persistEventsToCloud(events: EventItem[]): Promise<void> {
    await persistStudioEvents(events);
  },

  hydrateFromCloud(data: StudioCloudState): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data.profile));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(data.events));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT, data.activeEventId);
    localStorage.setItem(STORAGE_KEYS.STREAM_CONFIGS, JSON.stringify(data.streamConfigs));
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(data.highlights));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
    localStorage.setItem(STORAGE_KEYS.WALLET_BALANCE, String(data.walletBalance));
    localStorage.setItem(STORAGE_KEYS.GUEST_PAGES, JSON.stringify(data.guestPages));
    localStorage.setItem(STORAGE_KEYS.TRAINING_VIDEOS, JSON.stringify(data.trainingVideos));
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(data.announcements));
    localStorage.setItem(STORAGE_KEYS.UPLOADED_PHOTOS, JSON.stringify(data.uploadedPhotos));
    localStorage.setItem(STORAGE_KEYS.IS_SUPER_ADMIN, String(data.isSuperAdmin));
  },

  getCloudOwnerUid(): string | null {
    return localStorage.getItem(STUDIO_OWNER_UID_KEY);
  },

  setCloudOwnerUid(uid: string): void {
    activeStudioUid = uid;
    localStorage.setItem(STUDIO_OWNER_UID_KEY, uid);
  },

  resetStudioData(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  },

  async removeEventFromCloud(id: string, slug: string): Promise<void> {
    await removeEventGuestPin(id);
    await removePublicEvent(id, slug);
  },

  getStreamConfigs(): Record<string, StreamConfig> {
    try {
      const all = localStorage.getItem(STORAGE_KEYS.STREAM_CONFIGS);
      return all ? JSON.parse(all) : {};
    } catch {
      return {};
    }
  },

  resetAll(): void {
    this.resetStudioData();
  },
};
