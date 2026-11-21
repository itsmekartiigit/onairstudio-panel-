import React, { useRef, useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { X, Film, Upload } from 'lucide-react';
import { deleteMoreImage, uploadEventHighlightMedia } from '../../services/moreMediaService';
import type { HighlightPhoto, HighlightVideo } from '../../types';

interface CreateHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType: 'trailer' | 'photo_album' | 'video_album';
  eventId: string;
}

export const CreateHighlightModal: React.FC<CreateHighlightModalProps> = ({
  isOpen,
  onClose,
  defaultType,
  eventId,
}) => {
  const { createHighlight, events, notify } = useStudio();
  const type = defaultType;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentEvent = events.find((e) => e.id === eventId) || events[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      notify(type === 'photo_album' ? 'Choose at least one photo.' : 'Choose a video file.', 'error');
      return;
    }
    if (type === 'trailer' && files.length !== 1) {
      notify('A trailer must contain exactly one video.', 'error');
      return;
    }
    setIsUploading(true);
    const uploaded: Array<{ url: string; storagePath: string }> = [];
    try {
      for (const file of files) {
        uploaded.push(await uploadEventHighlightMedia(
          currentEvent.id,
          type === 'photo_album' ? 'photo' : type === 'trailer' ? 'trailer' : 'video',
          file,
        ));
      }
      const photos: HighlightPhoto[] = type === 'photo_album'
        ? uploaded.map((media, index) => ({
            id: crypto.randomUUID(), url: media.url, storagePath: media.storagePath, filename: files[index].name, sizeBytes: files[index].size,
          }))
        : [];
      const videos: HighlightVideo[] = type === 'video_album'
        ? uploaded.map((media, index) => ({
            id: crypto.randomUUID(), title: files[index].name.replace(/\.[^.]+$/, ''), videoUrl: media.url,
            storagePath: media.storagePath, filename: files[index].name, thumbnailUrl: currentEvent.thumbnail, duration: '', sizeBytes: files[index].size,
          }))
        : [];
      createHighlight({
        eventId: currentEvent.id,
        type,
        title: title.trim(),
        description: description.trim(),
        thumbnail: type === 'photo_album' ? photos[0]?.url : currentEvent.thumbnail,
        mediaUrl: type === 'trailer' ? uploaded[0].url : videos[0]?.videoUrl,
        storagePath: type === 'trailer' ? uploaded[0].storagePath : undefined,
        photos: type === 'photo_album' ? photos : undefined,
        videos: type === 'video_album' ? videos : undefined,
        photosCount: type === 'photo_album' ? photos.length : undefined,
        videosCount: type === 'video_album' ? videos.length : undefined,
        status: 'Published',
      });
      onClose();
    } catch (error) {
      await Promise.allSettled(uploaded.map((media) => deleteMoreImage(media.storagePath)));
      notify(error instanceof Error ? error.message : 'Could not publish this highlight.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-[#E7E9F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-[#F20D24]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {type === 'trailer'
                  ? 'Create Wedding Trailer'
                  : type === 'photo_album'
                  ? 'Create Wedding Photo Album'
                  : 'Create Wedding Video Album'}
              </h3>
              <p className="text-xs text-gray-500">{currentEvent.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Highlight Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F20D24]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#F20D24]" />
          </div>

          <div>
            <input
              ref={fileInput}
              type="file"
              accept={type === 'photo_album' ? 'image/jpeg,image/png,image/webp' : 'video/*'}
              multiple={type !== 'trailer'}
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="hidden"
              required
            />
            <button type="button" onClick={() => fileInput.current?.click()} className="w-full rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-sm font-semibold text-gray-700 hover:border-[#F20D24]">
              <span className="flex items-center justify-center gap-2"><Upload className="h-4 w-4" />Choose {type === 'photo_album' ? 'photos' : 'video'} from gallery</span>
              <span className="mt-1 block text-xs font-normal text-gray-500">{type === 'trailer' ? 'One video, up to 500 MB' : type === 'photo_album' ? 'JPG, PNG or WebP, up to 20 MB each' : 'Select one or more videos, up to 500 MB each'}</span>
            </button>
            {files.length > 0 && <p className="mt-2 text-xs text-gray-600">{files.length} file{files.length === 1 ? '' : 's'} selected: {files.map((file) => file.name).join(', ')}</p>}
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !title.trim() || files.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#F20D24] hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-900/20 cursor-pointer"
            >
              {isUploading ? 'Uploading…' : 'Publish Highlight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
