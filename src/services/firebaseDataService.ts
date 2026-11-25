import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, db, storage, functions } from '../Firebase';
import {
  EventItem,
  GuestPagesData,
  HighlightItem,
  StudioProfile,
  UploadedPhoto,
} from '../types';

export interface StudioCloudState {
  profile: StudioProfile;
  events: EventItem[];
  activeEventId: string;
  streamConfigs: Record<string, unknown>;
  highlights: HighlightItem[];
  transactions: unknown[];
  walletBalance: number;
  guestPages: GuestPagesData;
  trainingVideos: unknown[];
  announcements: unknown[];
  uploadedPhotos: UploadedPhoto[];
  isSuperAdmin: boolean;
}

type CloudErrorHandler = (error: unknown) => void;

export async function indexStudioPhoto(
  eventId: string,
  photoId: string,
): Promise<{
  success: boolean;
  photoId: string;
  facesDetected: number;
  indexDocumentsWritten: number;
  indexDocumentsVerified: number | null;
  failureReason: string | null;
  indexStatus: string;
}> {
  if (!activeUid) {
    throw new Error('Studio Firebase is not connected.');
  }

  if (!auth.currentUser || auth.currentUser.uid !== activeUid) {
    throw new Error('Your studio sign-in is required to index photos.');
  }

  const callable = httpsCallable<
    { eventId: string; photoId: string },
    {
      success: boolean;
      photoId: string;
      facesDetected: number;
      indexDocumentsWritten: number;
      indexDocumentsVerified: number | null;
      failureReason: string | null;
      indexStatus: string;
    }
  >(functions, 'indexStudioPhoto');

  const result = await callable({ eventId, photoId });
  return result.data;
}

const STATE_COLLECTION = 'state';
let activeUid: string | null = null;
let cloudErrorHandler: CloudErrorHandler = (error) => console.error('Firebase sync failed:', error);

const stateRef = (uid: string, key: string) => doc(db, 'studios', uid, STATE_COLLECTION, key);

export function configureStudioCloud(uid: string, onError: CloudErrorHandler): void {
  activeUid = uid;
  cloudErrorHandler = onError;
}

export function disconnectStudioCloud(): void {
  activeUid = null;
}

export async function persistStudioEvents(events: EventItem[]): Promise<void> {
  if (!activeUid) throw new Error('Studio Firebase is not connected.');
  await syncPublicEvents(
    activeUid,
    events,
    readLocalValue<StudioProfile>('onair_studio_profile'),
    readLocalValue<GuestPagesData>('onair_guest_pages'),
    readLocalValue<HighlightItem[]>('onair_highlights'),
  );
}

function removeUndefined<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => removeUndefined(item)) as T;
  }

  if (data !== null && typeof data === 'object') {
    const cleaned: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(data)) {
      if (item !== undefined) {
        cleaned[key] = removeUndefined(item);
      }
    }

    return cleaned as T;
  }

  return data;
}

export async function loadStudioCloudState(
  uid: string,
  fallback: StudioCloudState,
): Promise<StudioCloudState> {
  const keys: (keyof StudioCloudState)[] = [
    'profile',
    'activeEventId',
    'streamConfigs',
    'highlights',
    'guestPages',
    'trainingVideos',
    'announcements',
    'isSuperAdmin',
  ];
  const result = { ...fallback };

  await Promise.all(keys.map(async (key) => {
    const snapshot = await getDoc(stateRef(uid, key));
    if (snapshot.exists()) {
      result[key] = snapshot.data().value as never;
    }
  }));

  const eventSnapshots = await getDocs(collection(db, 'studios', uid, 'events'));
  if (eventSnapshots.empty) {
    const legacyEventsSnapshot = await getDoc(stateRef(uid, 'events'));
    result.events = legacyEventsSnapshot.exists()
      ? legacyEventsSnapshot.data().value as EventItem[]
      : [];
  } else {
    result.events = eventSnapshots.docs.map((snapshot) => snapshot.data().value as EventItem);
  }

  const photosSnapshot = await getDocs(collection(db, 'studios', uid, 'photos'));
  result.uploadedPhotos = photosSnapshot.docs.map(
    (photo) => photo.data().value as UploadedPhoto,
  );

  return result;
}

export function persistStudioState(key: keyof StudioCloudState, value: unknown): void {
  if (!activeUid || key === 'uploadedPhotos') return;
  const uid = activeUid;
  if (key === 'events') {
    void syncPublicEvents(
      uid,
      value as EventItem[],
      readLocalValue<StudioProfile>('onair_studio_profile'),
      readLocalValue<GuestPagesData>('onair_guest_pages'),
      readLocalValue<HighlightItem[]>('onair_highlights'),
    ).catch(cloudErrorHandler);
    return;
  }

  if (key === 'highlights') {
    const saveHighlights = httpsCallable<{ value: unknown }, { success: boolean }>(functions, 'saveStudioHighlights');
    void saveHighlights({ value })
      .then(() => syncPublicEvents(
        uid,
        readLocalValue<EventItem[]>('onair_events'),
        readLocalValue<StudioProfile>('onair_studio_profile'),
        readLocalValue<GuestPagesData>('onair_guest_pages'),
        value as HighlightItem[],
      ))
      .catch(cloudErrorHandler);
    return;
  }

  void setDoc(stateRef(uid, key), {
    value: removeUndefined(value),
    updatedAt: serverTimestamp(),
  })
    .then(() => {
      if (key === 'profile' || key === 'guestPages') {
        return syncPublicEvents(
          uid,
          readLocalValue<EventItem[]>('onair_events'),
          key === 'profile' ? value as StudioProfile : readLocalValue<StudioProfile>('onair_studio_profile'),
          key === 'guestPages' ? value as GuestPagesData : readLocalValue<GuestPagesData>('onair_guest_pages'),
          readLocalValue<HighlightItem[]>('onair_highlights'),
        );
      }
    })
    .catch(cloudErrorHandler);
}

export async function persistStudioPhotos(
  photos: UploadedPhoto[],
  events: EventItem[],
): Promise<void> {
  if (!activeUid) return;
  await syncStudioPhotos(activeUid, photos, events);
  await setDoc(stateRef(activeUid, 'photosInitialized'), {
    value: true,
    updatedAt: serverTimestamp(),
  });
}

export async function removeStudioPhoto(photo: UploadedPhoto): Promise<void> {
  if (!activeUid) return;
  if (!photo.storagePath) return;
  if (!auth.currentUser || auth.currentUser.uid !== activeUid) {
    throw new Error('Your studio sign-in is required to remove photos.');
  }

  const removePhoto = httpsCallable<
    {
      eventId: string;
      photoId: string;
      storagePath: string;
      storageProvider?: 'firebase' | 'r2';
    },
    { success: boolean }
  >(functions, 'deleteStudioPhoto');
  await removePhoto({
    eventId: photo.eventId,
    photoId: photo.id,
    storagePath: photo.storagePath,
    storageProvider: photo.storageProvider,
  });
}

export async function uploadEventPhoto(
  event: EventItem,
  file: File,
): Promise<UploadedPhoto> {
  if (!activeUid) throw new Error('You must be signed in to upload photos.');

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `studioUploads/${activeUid}/events/${event.id}/${id}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  try {
    await uploadBytes(storageRef, file, { contentType: file.type });
    const url = await getDownloadURL(storageRef);
    return {
      id,
      eventId: event.id,
      url,
      filename: file.name,
      sizeMB: Number((file.size / (1024 * 1024)).toFixed(1)),
      uploadedAt: new Date().toLocaleString(),
      storagePath,
      publicEventSlug: event.guestLinkSlug,
    };
  } catch (error) {
    throw new Error(`Could not upload ${file.name}: ${getErrorMessage(error)}`);
  }
}

export async function uploadStudioLogo(file: File): Promise<string> {
  if (!activeUid || auth.currentUser?.uid !== activeUid) {
    throw new Error('Your studio sign-in is required to upload a logo.');
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Studio logo must be a PNG, JPG, or WebP image.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Studio logo must be 5 MB or smaller.');
  }

  const logoRef = ref(storage, `studioLogos/${activeUid}/logo`);
  await uploadBytes(logoRef, file, { contentType: file.type });
  return getDownloadURL(logoRef);
}

export async function saveStudioProfileToFirebase(profile: StudioProfile): Promise<void> {
  if (!activeUid || auth.currentUser?.uid !== activeUid) {
    throw new Error('Your studio sign-in is required to save settings.');
  }
  const saveProfile = httpsCallable<{
    studioName: string;
    ownerName: string;
    ownerMobile: string;
    logoUrl: string;
  }, { success: boolean }>(functions, 'updateOwnStudioProfile');
  await saveProfile({
    studioName: profile.studioName.trim(),
    ownerName: profile.ownerName.trim(),
    ownerMobile: profile.mobileNumber.trim(),
    logoUrl: profile.studioLogo,
  });
}

export async function uploadEventThumbnail(
  eventId: string,
  file: File,
): Promise<{ url: string; storagePath: string }> {
  const uid = auth.currentUser?.uid;

  if (!activeUid || !uid) {
    throw new Error('You must be signed in to upload event thumbnails.');
  }

  if (uid !== activeUid) {
    throw new Error('Studio UID mismatch. Please sign in again.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Event thumbnail must be an image.');
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Event thumbnail must be 20 MB or smaller.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `studioUploads/${uid}/events/${eventId}/thumbnail_${crypto.randomUUID()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  console.log('[THUMBNAIL DEBUG]', {
    bucket: storage.app.options.storageBucket,
    uid,
    activeUid,
    storagePath,
    contentType: file.type,
    size: file.size,
  });

  try {
    await uploadBytes(storageRef, file, { contentType: file.type });
  } catch (error) {
    console.error('[THUMBNAIL UPLOAD FAILED]', error);
    throw new Error(`Thumbnail upload failed: ${getErrorMessage(error)}`);
  }

  console.log('[THUMBNAIL] Upload succeeded. Getting download URL.');

  try {
    const url = await getDownloadURL(storageRef);
    console.log('[THUMBNAIL] Download URL retrieved successfully.');

    return { url, storagePath };
  } catch (error) {
    console.error('[THUMBNAIL DOWNLOAD URL FAILED]', error);
    throw new Error(
      `Thumbnail uploaded, but download URL retrieval failed: ${getErrorMessage(error)}`,
    );
  }
}

export async function removeEventThumbnail(storagePath: string): Promise<void> {
  if (!activeUid) return;
  await deleteObject(ref(storage, storagePath));
}

export async function removePublicEvent(id: string, slug: string): Promise<void> {
  const uid = activeUid;
  if (!uid) return;
  const publicEventRef = doc(db, 'publicEvents', slug);
  const publicEvent = await getDoc(publicEventRef);
  if (publicEvent.exists()) {
    const publicPhotos = await getDocs(collection(db, 'publicEvents', slug, 'photos'));
    for (let index = 0; index < publicPhotos.docs.length; index += 450) {
      const batch = writeBatch(db);
      publicPhotos.docs.slice(index, index + 450).forEach((photo) => batch.delete(photo.ref));
      await batch.commit();
    }
    await deleteDoc(publicEventRef);
  }
  await deleteDoc(doc(db, 'studios', uid, 'events', id));
}

async function syncStudioPhotos(
  uid: string,
  photos: UploadedPhoto[],
  events: EventItem[],
): Promise<void> {
  const photoCollection = collection(db, 'studios', uid, 'photos');
  const existing = await getDocs(photoCollection);
  const nextIds = new Set(photos.map((photo) => photo.id));
  const operations: Array<(batch: WriteBatch) => void> = [];

  photos.forEach((photo) => {
    operations.push((batch) => batch.set(doc(photoCollection, photo.id), {
      value: photo,
      updatedAt: serverTimestamp(),
    }));
    const event = events.find((item) => item.id === photo.eventId);
    const slug = photo.publicEventSlug || event?.guestLinkSlug;
    if (slug) {
      operations.push((batch) => batch.set(doc(db, 'publicEvents', slug, 'photos', photo.id), {
        id: photo.id,
        url: photo.url,
        filename: photo.filename,
        uploadedAt: photo.uploadedAt,
        ownerUid: uid,
      }));
    }
  });

  existing.docs.forEach((snapshot) => {
    if (!nextIds.has(snapshot.id)) operations.push((batch) => batch.delete(snapshot.ref));
  });

  const existingPublicPhotos = await Promise.all(events.map(async (event) => ({
    slug: event.guestLinkSlug,
    snapshot: await getDocs(collection(db, 'publicEvents', event.guestLinkSlug, 'photos')),
  })));
  existingPublicPhotos.forEach(({ slug, snapshot }) => {
    const eventPhotoIds = new Set(
      photos
        .filter((photo) => photo.publicEventSlug === slug || events.find((event) => event.id === photo.eventId)?.guestLinkSlug === slug)
        .map((photo) => photo.id),
    );
    snapshot.docs.forEach((photo) => {
      if (!eventPhotoIds.has(photo.id)) operations.push((batch) => batch.delete(photo.ref));
    });
  });

  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(db);
    operations.slice(index, index + 450).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

async function syncPublicEvents(
  uid: string,
  events: EventItem[],
  profile: StudioProfile,
  pages: GuestPagesData,
  highlights: HighlightItem[],
): Promise<void> {
  const operations: Array<(batch: WriteBatch) => void> = [];
  events.forEach((event) => {
    const publishedHighlights = highlights.filter(
      (item) => item.eventId === event.id && item.status === 'Published',
    );
    const trailer = publishedHighlights.find((item) => item.type === 'trailer');
    const photoAlbums = publishedHighlights
      .filter((item) => item.type === 'photo_album')
      .map((album) => ({
        id: album.id,
        title: album.title,
        photoCount: album.photos?.length ?? album.photosCount ?? 0,
        coverImageUrl: album.photos?.[0]?.url || album.thumbnail || event.thumbnail,
        description: album.description ?? '',
        photos: (album.photos ?? []).map((photo) => ({
          id: photo.id,
          url: photo.url,
          thumbnailUrl: photo.url,
          caption: photo.filename,
          category: 'wedding',
        })),
      }));
    const videoAlbums = publishedHighlights
      .filter((item) => item.type === 'video_album')
      .map((album) => ({
        id: album.id,
        title: album.title,
        videoCount: album.videos?.length ?? album.videosCount ?? 0,
        duration: (album.videos ?? [])
          .map((video) => video.duration)
          .filter(Boolean)
          .join(' + '),
        thumbnailUrl: album.videos?.[0]?.thumbnailUrl || album.thumbnail || event.thumbnail,
        description: album.description ?? '',
        videos: (album.videos ?? []).map((video) => ({
          id: video.id,
          title: video.title,
          duration: video.duration ?? '',
          videoUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl || event.thumbnail,
        })),
      }));
    const eventContent = pages.eventContent?.[event.id];
    const venueDetails = { ...pages.venueDetails, ...eventContent?.venueDetails };
    const brideFamily = eventContent?.brideFamily ?? pages.familyDetails.brideFamily;
    const groomFamily = eventContent?.groomFamily ?? pages.familyDetails.groomFamily;
    const locationParts = event.location.split(',').map((part) => part.trim());
    const publicEvent = {
      id: event.guestLinkSlug,
      title: event.name,
      brideName: event.brideName,
      groomName: event.groomName,
      eventDate: event.date,
      eventDay: '',
      locationCity: locationParts.length > 1 ? locationParts[locationParts.length - 2] : event.location,
      locationState: locationParts[locationParts.length - 1] || '',
      venueName: venueDetails.venueName || event.location,
      venueAddress: venueDetails.address || event.location,
      venueMapUrl: venueDetails.googleMapsUrl || event.googleMapsUrl,
      venueImageUrl: venueDetails.venueImage || event.thumbnail,
      brideFamily,
      groomFamily,
      heroImageUrl: event.thumbnail,
      banners: event.banners ?? [],
      studioName: profile.studioName,
      studioLogoUrl: profile.studioLogo,
      isLive: event.liveStreamStatus === 'live',
      liveViewersCount: 0,
      liveStreamUrl: '',
      trailerTitle: trailer?.title || '',
      trailerDescription: trailer?.description || '',
      trailerDuration: trailer?.duration || '',
      trailerThumbnailUrl: trailer?.thumbnail || event.thumbnail,
      trailerVideoUrl: trailer?.mediaUrl || '',
      photoAlbums,
      videoAlbums,
      schedules: eventContent?.schedules ?? [],
      ownerUid: uid,
      updatedAt: serverTimestamp(),
    };
    const publicEventRef = doc(db, 'publicEvents', event.guestLinkSlug);
    const studioEventRef = doc(db, 'studios', uid, 'events', event.id);
    operations.push((batch) => batch.set(publicEventRef, publicEvent, { merge: true }));
    operations.push((batch) => batch.set(studioEventRef, {
      value: event,
      updatedAt: serverTimestamp(),
    }));
  });

  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(db);
    operations.slice(index, index + 450).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

function readLocalValue<T>(key: string): T {
  if (!activeUid) throw new Error(`Missing studio owner UID while syncing ${key} to Firebase.`);
  const value = localStorage.getItem(`${key}::${activeUid}`);
  if (value === null) throw new Error(`Missing local value for ${key} while syncing Firebase.`);
  return JSON.parse(value) as T;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown Firebase error';
}
