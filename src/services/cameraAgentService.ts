import { onSnapshot, collection } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../Firebase';

export interface CameraAgentDevice {
  deviceId: string;
  deviceName: string;
  status: 'active' | 'revoked';
  createdAt: string;
  lastSeenAt: string;
}

interface PairingCodeResponse {
  success: boolean;
  pairingCode: string;
  expiresAt: number;
  expiresInSeconds: number;
}

function formatTimestamp(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const date = (value as { toDate?: () => Date }).toDate?.();
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  return 'Not yet connected';
}

export function watchCameraAgents(
  uid: string,
  onDevices: (devices: CameraAgentDevice[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(collection(db, 'studios', uid, 'cameraAgents'), (snapshot) => {
    onDevices(snapshot.docs.map((device) => {
      const data = device.data();
      return {
        deviceId: device.id,
        deviceName: String(data.deviceName || 'Camera agent'),
        status: data.status === 'revoked' ? 'revoked' : 'active',
        createdAt: formatTimestamp(data.createdAt),
        lastSeenAt: formatTimestamp(data.lastSeenAt),
      };
    }));
  }, (error) => onError(error));
}

export async function createCameraAgentPairingCode(): Promise<PairingCodeResponse> {
  const callable = httpsCallable<Record<string, never>, PairingCodeResponse>(
    functions,
    'createCameraAgentPairingCode',
  );
  const result = await callable({});
  return result.data;
}

export async function revokeCameraAgent(deviceId: string): Promise<void> {
  const callable = httpsCallable<{ deviceId: string }, { success: boolean }>(
    functions,
    'revokeCameraAgent',
  );
  await callable({ deviceId });
}
