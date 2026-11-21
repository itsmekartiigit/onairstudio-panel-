import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, functions } from '../Firebase';
import type { EventItem } from '../types';

export interface StudioServicePackage {
  packageId: string;
  name: string;
  quota: number;
  quotaUnit: 'hours' | 'photos';
  price: number;
  status: 'active' | 'inactive';
}

export interface StudioCatalogService {
  serviceId: string;
  serviceName: string;
  category: 'liveStreaming' | 'aiPhotoSharing';
  description: string;
  packages: StudioServicePackage[];
  status: 'active' | 'inactive';
}

export interface EventServicePurchase {
  purchaseId: string;
  packageName: string;
  serviceName: string;
  purchasedQuota: number;
  quotaUnit: 'hours' | 'photos';
  purchaseAmount: number;
  purchasedAt?: { toDate?: () => Date };
}

export async function getAvailableStudioServices(): Promise<StudioCatalogService[]> {
  const snapshots = await getDocs(query(collection(db, 'services'), where('status', '==', 'active')));
  return snapshots.docs.map((snapshot) => ({
    serviceId: snapshot.id,
    ...snapshot.data(),
  })) as StudioCatalogService[];
}

export async function getEventServicePurchases(eventId: string): Promise<EventServicePurchase[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to view event purchases.');
  const snapshots = await getDocs(query(
    collection(db, 'servicePurchases'),
    where('studioId', '==', uid),
  ));
  return snapshots.docs.filter((snapshot) => snapshot.data().eventId === eventId).map((snapshot) => ({
    purchaseId: snapshot.id,
    ...snapshot.data(),
  })) as EventServicePurchase[];
}

export async function getStudioDetails(uid: string): Promise<void> {
  const callable = httpsCallable<{ uid: string }, unknown>(functions, 'getStudioDetails');
  await callable({ uid });
}

export async function setEventGuestPin(eventId: string, pin: string): Promise<void> {
  const callable = httpsCallable<{ eventId: string; pin: string }, { success: boolean }>(
    functions,
    'setEventGuestPin',
  );
  await callable({ eventId, pin });
}

export async function getEventGuestPinStatus(eventId: string): Promise<boolean> {
  const callable = httpsCallable<{ eventId: string }, { hasPin: boolean }>(
    functions,
    'getEventGuestPinStatus',
  );
  const result = await callable({ eventId });
  return result.data.hasPin;
}

export async function removeEventGuestPin(eventId: string): Promise<void> {
  const callable = httpsCallable<{ eventId: string }, { success: boolean }>(
    functions,
    'removeEventGuestPin',
  );
  await callable({ eventId });
}

export interface CatalogPurchaseResult {
  success: boolean;
  purchaseId: string;
  transactionId: string;
  balance: number;
  amount: number;
  purchasedQuota: number;
  serviceName: string;
  packageName: string;
  serviceCategory: 'liveStreaming' | 'aiPhotoSharing';
  updatedEvent: EventItem;
}

export async function purchaseServicePackage(input: {
  eventId: string;
  serviceId: string;
  packageId: string;
  requestId: string;
}): Promise<CatalogPurchaseResult> {
  const callable = httpsCallable<typeof input, CatalogPurchaseResult>(
    functions,
    'purchaseServicePackage',
  );
  const result = await callable(input);
  return result.data;
}
