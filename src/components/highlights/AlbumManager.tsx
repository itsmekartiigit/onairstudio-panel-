import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Video, Trash2, Upload, Plus, Images, Play } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { deleteMoreImage, uploadEventHighlightMedia } from '../../services/moreMediaService';
import type { HighlightItem, HighlightPhoto, HighlightVideo } from '../../types';

interface AlbumManagerProps {
  eventId: string;
  kind: 'photo_album' | 'video_album';
  readOnly?: boolean;
  onBack: () => void;
}

export const AlbumManager: React.FC<AlbumManagerProps> = ({ eventId, kind, onBack, readOnly = false }) => {
  const { highlights, createHighlight, updateHighlight, deleteHighlight, notify } = useStudio();
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const isPhoto = kind === 'photo_album';
  const albums = useMemo(
    () => highlights.filter((item) => item.eventId === eventId && item.type === kind),
    [highlights, eventId, kind],
  );
  const activeAlbum = albums.find((album) => album.id === activeAlbumId) ?? null;

  const createAlbum = () => {
    const title = albumTitle.trim();
    if (!title) {
      notify('Enter an album name.', 'error');
      return;
    }

    createHighlight({
      eventId,
      type: kind,
      title,
      description: albumDescription.trim(),
      thumbnail: '',
      photos: isPhoto ? [] : undefined,
      videos: isPhoto ? undefined : [],
      photosCount: isPhoto ? 0 : undefined,
      videosCount: isPhoto ? undefined : 0,
      status: 'Published',
    });

    setAlbumTitle('');
    setAlbumDescription('');
    setShowCreate(false);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length || !activeAlbum || readOnly) return;

    setIsUploading(true);
    const uploaded: Array<{ url: string; storagePath: string; filename: string }> = [];

    try {
      for (const file of files) {
        const result = await uploadEventHighlightMedia(
          eventId,
          isPhoto ? 'photo' : 'video',
          file,
        );
        uploaded.push({ ...result, filename: file.name });
      }

      if (isPhoto) {
        const newPhotos: HighlightPhoto[] = uploaded.map((item) => ({
          id: crypto.randomUUID(),
          url: item.url,
          storagePath: item.storagePath,
          filename: item.filename,
        }));
        const photos = [...(activeAlbum.photos ?? []), ...newPhotos];
        updateHighlight(activeAlbum.id, {
          photos,
          photosCount: photos.length,
          thumbnail: photos[0]?.url ?? activeAlbum.thumbnail,
        });
      } else {
        const newVideos: HighlightVideo[] = uploaded.map((item) => ({
          id: crypto.randomUUID(),
          title: item.filename.replace(/\.[^.]+$/, ''),
          videoUrl: item.url,
          storagePath: item.storagePath,
          filename: item.filename,
          thumbnailUrl: activeAlbum.thumbnail,
          duration: '',
        }));
        const videos = [...(activeAlbum.videos ?? []), ...newVideos];
        updateHighlight(activeAlbum.id, {
          videos,
          videosCount: videos.length,
          thumbnail: activeAlbum.thumbnail || videos[0]?.thumbnailUrl || '',
        });
      }

      notify(`${uploaded.length} ${isPhoto ? 'photo(s)' : 'video(s)'} uploaded successfully.`, 'success');
    } catch (error) {
      await Promise.allSettled(uploaded.map((item) => deleteMoreImage(item.storagePath)));
      notify(error instanceof Error ? error.message : 'Upload failed. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteMedia = async (album: HighlightItem, mediaId: string) => {
    const media = isPhoto
      ? (album.photos ?? []).find((item) => item.id === mediaId)
      : (album.videos ?? []).find((item) => item.id === mediaId);

    if (!media || readOnly) return;
    const label = isPhoto ? (media as HighlightPhoto).filename : (media as HighlightVideo).filename;
    if (!window.confirm(`Delete "${label}" from this album? This also deletes the stored file.`)) return;

    if (isPhoto) {
      const photos = (album.photos ?? []).filter((item) => item.id !== mediaId);
      updateHighlight(album.id, {
        photos,
        photosCount: photos.length,
        thumbnail: photos[0]?.url ?? '',
      });
    } else {
      const videos = (album.videos ?? []).filter((item) => item.id !== mediaId);
      updateHighlight(album.id, {
        videos,
        videosCount: videos.length,
        thumbnail: album.thumbnail,
      });
    }

    try {
      if (media.storagePath) await deleteMoreImage(media.storagePath);
      notify('Media deleted from the album.', 'success');
    } catch {
      notify('The media was removed from the album, but its Firebase Storage file could not be deleted.', 'error');
    }
  };

  const removeAlbum = async (album: HighlightItem) => {
    if (readOnly || !window.confirm(`Delete the entire album "${album.title}" and all its media? This cannot be undone.`)) return;

    const paths = [
      ...(album.photos ?? []).map((item) => item.storagePath),
      ...(album.videos ?? []).map((item) => item.storagePath),
    ].filter(Boolean);

    deleteHighlight(album.id);
    setActiveAlbumId(null);

    const results = await Promise.allSettled(paths.map((path) => deleteMoreImage(path)));
    if (results.some((result) => result.status === 'rejected')) {
      notify('Album deleted, but one or more media files could not be deleted from Storage.', 'error');
    } else {
      notify('Album deleted successfully.', 'success');
    }
  };

  if (activeAlbum) {
    const photos = activeAlbum.photos ?? [];
    const videos = activeAlbum.videos ?? [];

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7E9F0] bg-white p-5">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setActiveAlbumId(null)} className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50" aria-label="Back to albums">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-gray-900">{activeAlbum.title}</h2>
              <p className="text-xs text-gray-500">{isPhoto ? `${photos.length} photos` : `${videos.length} videos`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && <>
            <input
              ref={fileInput}
              type="file"
              accept={isPhoto ? 'image/jpeg,image/png,image/webp' : 'video/*'}
              multiple
              className="hidden"
              onChange={(event) => void handleUpload(event)}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploading…' : isPhoto ? 'Upload Photos' : 'Upload Videos'}
            </button>
            <button onClick={() => void removeAlbum(activeAlbum)} className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50" title="Delete album">
              <Trash2 className="h-4 w-4" />
            </button>
            </>}
          </div>
        </div>

        {readOnly && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">This album plan has expired. Existing media is available in read-only mode. Renew your plan to upload or edit.</p>}

        {activeAlbum.description && <p className="text-sm text-gray-600">{activeAlbum.description}</p>}

        {isPhoto ? (
          photos.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <img src={photo.url} alt={photo.filename} className="aspect-square w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 p-2">
                    <span className="truncate text-xs text-gray-600" title={photo.filename}>{photo.filename}</span>
                    {!readOnly && <button onClick={() => void deleteMedia(activeAlbum, photo.id)} className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete photo">
                      <Trash2 className="h-4 w-4" />
                    </button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No photos in this album yet. Upload photos to get started." />
          )
        ) : (
          videos.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <div key={video.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="relative bg-black">
                    {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt={video.title} className="aspect-video w-full object-cover opacity-80" /> : <div className="aspect-video" />}
                    <a href={video.videoUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center text-white" title="Open video">
                      <span className="rounded-full bg-black/60 p-3"><Play className="h-5 w-5 fill-current" /></span>
                    </a>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-800">{video.title}</p>
                      <p className="text-[11px] text-gray-500">{video.duration || 'Duration not available'}</p>
                    </div>
                    {!readOnly && <button onClick={() => void deleteMedia(activeAlbum, video.id)} className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete video">
                      <Trash2 className="h-4 w-4" />
                    </button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No videos in this album yet. Upload videos to get started." />
          )
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7E9F0] bg-white p-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50" aria-label="Back to highlights">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isPhoto ? 'Wedding Photo Albums' : 'Wedding Video Albums'}</h2>
            <p className="text-xs text-gray-500">Create and manage multiple albums for this event.</p>
          </div>
        </div>
        {!readOnly && <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700">
          <Plus className="h-4 w-4" /> Create Album
        </button>}
      </div>

      {readOnly && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">Your plan has expired. Existing albums are read-only; renew to create or change albums.</p>}

      {showCreate && !readOnly && (
        <div className="rounded-2xl border border-[#E7E9F0] bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Create {isPhoto ? 'Photo' : 'Video'} Album</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={albumTitle} onChange={(event) => setAlbumTitle(event.target.value)} placeholder="Album title" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F20D24]" />
            <input value={albumDescription} onChange={(event) => setAlbumDescription(event.target.value)} placeholder="Description (optional)" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F20D24]" />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold">Cancel</button>
            <button onClick={createAlbum} className="rounded-xl bg-[#F20D24] px-4 py-2 text-xs font-bold text-white">Create Album</button>
          </div>
        </div>
      )}

      {albums.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {albums.map((album) => {
            const count = isPhoto ? (album.photos?.length ?? 0) : (album.videos?.length ?? 0);
            const cover = isPhoto ? (album.photos?.[0]?.url ?? album.thumbnail) : album.thumbnail;
            return (
              <button key={album.id} onClick={() => setActiveAlbumId(album.id)} className="overflow-hidden rounded-2xl border border-[#E7E9F0] bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md">
                {cover ? <img src={cover} alt={album.title} className="aspect-[16/10] w-full object-cover" /> : <div className="flex aspect-[16/10] items-center justify-center bg-gray-50 text-gray-400">{isPhoto ? <Images className="h-10 w-10" /> : <Video className="h-10 w-10" />}</div>}
                <div className="p-4">
                  <p className="truncate text-sm font-bold text-gray-900">{album.title}</p>
                  <p className="mt-1 text-xs text-gray-500">{count} {isPhoto ? 'photos' : 'videos'}</p>
                  {album.description && <p className="mt-2 line-clamp-2 text-xs text-gray-500">{album.description}</p>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState label={readOnly ? `No existing ${isPhoto ? 'photo' : 'video'} albums.` : `No ${isPhoto ? 'photo' : 'video'} albums yet. Create your first album.`} />
      )}
    </div>
  );
};

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">
    <ImagePlus className="mb-3 h-8 w-8 text-gray-300" />
    {label}
  </div>
);
