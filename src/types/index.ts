export type NavTab = 
  | 'dashboard' 
  | 'events' 
  | 'photo-sharing' 
  | 'live-stream' 
  | 'highlights' 
  | 'wallet' 
  | 'settings' 
  | 'more' 
  | 'training' 
  | 'announcement'
  | 'camera-upload'
  | 'album-selection';

export interface StudioProfile {
  studioName: string;
  ownerName: string;
  mobileNumber: string;
  studioLogo: string;
  joinedDate: string;
  plan: string;
  planExpiry: string;
  storageUsedGB: number;
  storageTotalGB: number;
}

export type EventType = 'Wedding' | 'Engagement' | 'Reception' | 'Haldi' | 'Birthday' | 'Other';
export type EventStatus = 'Ongoing' | 'Active' | 'Completed';
export type LiveStreamStatus = 'live' | 'upcoming' | 'completed' | 'none';

export interface EventServices {
  aiPhotoSharing: boolean;
  liveStreaming: boolean;
  highlights: boolean;
  guestWebsite: boolean;
}

export interface PhotoQuota {
  purchased: number;
  uploaded: number;
  extraPackagesPurchased?: number;
}

export interface StreamQuota {
  purchasedHours: number;
  consumedMinutes: number;
  consumedSeconds?: number;
  extraHourPrice: number;
  extraHoursPurchased?: number;
}

export interface EventItem {
  id: string;
  name: string;
  type: EventType;
  brideName: string;
  groomName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  googleMapsUrl: string;
  thumbnail: string;
  thumbnailStoragePath?: string;
  photosCount: number;
  liveStreamStatus: LiveStreamStatus;
  liveStreamStartedAtMs?: number | null;
  status: EventStatus;
  services: EventServices;
  photoQuota: PhotoQuota;
  streamQuota: StreamQuota;
  guestLinkSlug: string;
  banners?: EventBanner[];
}

export interface EventBanner {
  id: string;
  url: string;
  storagePath: string;
  filename: string;
  uploadedAt: string;
}

export interface StreamConfig {
  rtmpServerUrl: string;
  streamKey: string;
  resolution: string;
  bitrate: string;
  fps: number;
  autoStart: boolean;
  recordStream: boolean;
  isLiveNow: boolean;
  currentViewers: number;
  currentBitrate: string;
  liveDuration: string;
}

export interface HighlightItem {
  id: string;
  eventId: string;
  type: 'trailer' | 'photo_album' | 'video_album';
  title: string;
  description: string;
  thumbnail: string;
  mediaUrl?: string;
  storagePath?: string;
  photos?: HighlightPhoto[];
  videos?: HighlightVideo[];
  duration?: string;
  photosCount?: number;
  videosCount?: number;
  status: 'Published' | 'Draft';
  createdAt: string;
  galleryStorageGB?: number;
}

export interface HighlightPhoto {
  id: string;
  url: string;
  storagePath: string;
  filename: string;
  sizeBytes?: number;
}

export interface HighlightVideo {
  id: string;
  title: string;
  videoUrl: string;
  storagePath: string;
  filename: string;
  thumbnailUrl: string;
  duration: string;
  sizeBytes?: number;
}

export type TransactionType = 'Add Money' | 'Debit' | 'Refund';
export type TransactionCategory =
  | 'Wallet top-up'
  | 'Wallet Adjustment'
  | 'Live Streaming'
  | 'Photo Sharing'
  | 'Plan Purchase';

export interface WalletTransaction {
  id: string;
  date: string;
  timestamp: number;
  type: TransactionType;
  category: TransactionCategory;
  eventName?: string;
  description: string;
  amount: number;
  balanceAfter: number;
  invoiceId: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  image: string;
  about?: string;
  imagePath?: string;
}

export interface GuestPagesData {
  privacyPolicy: {
    title: string;
    content: string;
    isActive: boolean;
    lastUpdated: string;
  };
  venueDetails: {
    venueName: string;
    address: string;
    googleMapsUrl: string;
    directions: string;
    venueImage: string;
    venueImagePath?: string;
    isActive: boolean;
  };
  familyDetails: {
    brideFamily: FamilyMember[];
    groomFamily: FamilyMember[];
    isActive: boolean;
  };
  helpSupport: {
    contactNumber: string;
    whatsappNumber: string;
    email: string;
    description: string;
    isActive: boolean;
  };
  eventContent?: Record<string, {
    venueDetails?: Partial<GuestPagesData['venueDetails']>;
    brideFamily?: FamilyMember[];
    groomFamily?: FamilyMember[];
    schedules?: Array<{ id: string; name: string; date: string; startTime: string; endTime: string; isCurrent: boolean }>;
  }>;
}

export interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  category: 'Studio Setup' | 'Events & Highlights' | 'Photo Sharing' | 'Live Streaming' | 'Wallet' | 'Advanced Tips';
  duration: string;
  views: string;
  thumbnail: string;
  videoUrl: string;
  published: boolean;
  addedDate: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  category: 'Updates' | 'New Features' | 'Offers' | 'Maintenance';
  image: string;
  publishDate: string;
  expiryDate: string;
  published: boolean;
  isRead: boolean;
}

export interface UploadedPhoto {
  id: string;
  eventId: string;
  url: string;
  filename: string;
  sizeMB: number;
  uploadedAt: string;
  storagePath?: string;
  storageProvider?: 'firebase' | 'r2';
  publicEventSlug?: string;
  facesDetected?: number;
  tags?: string[];
}
