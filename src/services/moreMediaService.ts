import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../Firebase';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadEventHighlightMedia(
  eventId: string,
  kind: 'trailer' | 'photo' | 'video',
  file: File,
): Promise<{ url: string; storagePath: string }> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to upload event highlights.');
  const isImage = allowedImageTypes.has(file.type);
  const isVideo = file.type.startsWith('video/');
  if ((kind === 'photo' && !isImage) || (kind !== 'photo' && !isVideo)) {
    throw new Error(kind === 'photo' ? 'Choose a JPG, PNG, or WebP image.' : 'Choose a video file.');
  }
  const maxSize = kind === 'photo' ? 20 * 1024 * 1024 : 500 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(kind === 'photo' ? 'Images must be 20 MB or smaller.' : 'Videos must be 500 MB or smaller.');
  }

  const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || (isImage ? 'jpg' : 'mp4');
  const storagePath = `studioUploads/${uid}/events/${eventId}/highlights/${kind}/${crypto.randomUUID()}.${extension}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  try {
    return { url: await getDownloadURL(storageRef), storagePath };
  } catch (error) {
    await deleteObject(storageRef);
    throw error;
  }
}

export async function uploadMoreImage(
  eventId: string,
  category: 'venue' | 'family' | 'banners',
  file: File,
): Promise<{ url: string; storagePath: string }> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to upload images.');
  if (!allowedImageTypes.has(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image files must be 5 MB or smaller.');
  }

  const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'image';
  const storagePath = `studioUploads/${uid}/${eventId}/${category}/${crypto.randomUUID()}.${extension}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });

  try {
    return { url: await getDownloadURL(storageRef), storagePath };
  } catch (error) {
    await deleteObject(storageRef);
    throw error;
  }
}

export async function deleteMoreImage(storagePath: string): Promise<void> {
  await deleteObject(ref(storage, storagePath));
}
