import React, { useRef, useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { CreateHighlightModal } from './CreateHighlightModal';
import { AlbumManager } from './AlbumManager';
import {
  Film,
  Calendar,
  Play,
  Image as ImageIcon,
  Video,
  Plus,
  Eye,
  Edit,
  Share2,
  Download,
  MoreHorizontal,
  Trash2,
  Database,
  ExternalLink,
  ImagePlus,
  X,
} from 'lucide-react';
import { RiBroadcastLine } from 'react-icons/ri';
import { deleteMoreImage, uploadMoreImage } from '../../services/moreMediaService';
import type { EventBanner } from '../../types';

export const HighlightsPage: React.FC = () => {
  const {
    events,
    activeEventId,
    setActiveEventId,
    highlights,
    deleteHighlight,
    updateEvent,
    setShowGuestPreviewModal,
    notify,
    albumPlanActive,
  } = useStudio();

  const [modalType, setModalType] = useState<'trailer' | null>(null);
  const [albumManagerType, setAlbumManagerType] = useState<'photo_album' | 'video_album' | null>(null);
  const [isUploadingBanners, setIsUploadingBanners] = useState(false);
  const bannerFileInput = useRef<HTMLInputElement>(null);

  const selectedEvent =
    events.find((e) => e.id === activeEventId) ||
    events[0];

  if (!selectedEvent) {
    return (
      <div className="rounded-2xl border border-[#E7E9F0] bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-gray-900">No events yet</h2>
        <p className="mt-2 text-sm text-gray-600">Create an event to manage its highlights.</p>
      </div>
    );
  }
  const eventHighlights = highlights.filter(
    (h) => h.eventId === selectedEvent.id
  );
  const banners = selectedEvent.banners ?? [];

  if (albumManagerType) {
    return (
      <AlbumManager
        eventId={selectedEvent.id}
        kind={albumManagerType}
        readOnly={!albumPlanActive}
        onBack={() => setAlbumManagerType(null)}
      />
    );
  }

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    const availableSlots = Math.max(0, 4 - banners.length);
    if (availableSlots === 0) {
      notify('This event already has the maximum of 4 banners.', 'error');
      return;
    }
    if (files.length > availableSlots) {
      notify(`You can add up to ${availableSlots} more banner${availableSlots === 1 ? '' : 's'} for this event.`, 'error');
      return;
    }

    setIsUploadingBanners(true);
    const uploaded: EventBanner[] = [];
    try {
      for (const file of files) {
        const result = await uploadMoreImage(selectedEvent.id, 'banners', file);
        uploaded.push({
          id: crypto.randomUUID(),
          url: result.url,
          storagePath: result.storagePath,
          filename: file.name,
          uploadedAt: new Date().toISOString(),
        });
      }
      updateEvent(selectedEvent.id, { banners: [...banners, ...uploaded] });
      notify(`${uploaded.length} banner${uploaded.length === 1 ? '' : 's'} uploaded for ${selectedEvent.name}.`, 'success');
    } catch (error) {
      await Promise.allSettled(uploaded.map((banner) => deleteMoreImage(banner.storagePath)));
      const message = error instanceof Error ? error.message : 'Banner upload failed.';
      notify(message, 'error');
    } finally {
      setIsUploadingBanners(false);
    }
  };

  const handleBannerDelete = async (banner: EventBanner) => {
    if (!window.confirm('Remove this banner from the studio home screen?')) return;
    const updatedBanners = banners.filter((item) => item.id !== banner.id);
    updateEvent(selectedEvent.id, { banners: updatedBanners });
    try {
      await deleteMoreImage(banner.storagePath);
    } catch (error) {
      console.error('Could not delete the banner image from Firebase Storage.', error);
      notify('Banner removed from the home screen, but its stored image could not be deleted.', 'error');
    }
  };

  const handleHighlightDelete = async (highlight: (typeof eventHighlights)[number]) => {
    deleteHighlight(highlight.id);
    const storagePaths = [
      highlight.storagePath,
      ...(highlight.photos ?? []).map((photo) => photo.storagePath),
      ...(highlight.videos ?? []).map((video) => video.storagePath),
    ].filter((path): path is string => Boolean(path));
    const results = await Promise.allSettled(storagePaths.map((path) => deleteMoreImage(path)));
    if (results.some((result) => result.status === 'rejected')) {
      notify('The highlight was removed, but some media files could not be deleted.', 'error');
    }
  };

  const handleShare = (title: string) => {
    const link = `https://onairstudio.in/g/${selectedEvent.guestLinkSlug}#highlights`;
    navigator.clipboard.writeText(link);
    notify(`Link to ${title} copied!`, 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E7E9F0] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#F20D24]">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#171717]">Highlights</h2>
            <p className="text-xs text-[#737783]">
              Create and manage Wedding Trailer, Photo Album and Video Album for your events.
            </p>
          </div>
        </div>
      </div>

      {/* Select Event and 3 Creation Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Select Event (approx 3.5 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#F20D24]" />
              <h3 className="text-sm font-bold text-gray-900">Select Event</h3>
            </div>

            {/* Event selector dropdown card */}
            <div className="relative">
              <select
                value={activeEventId}
                onChange={(e) => setActiveEventId(e.target.value)}
                className="w-full appearance-none p-3.5 pr-10 rounded-xl border-2 border-[#F20D24] bg-white text-xs font-bold text-gray-900 cursor-pointer shadow-xs focus:outline-none"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.type} | {ev.date})
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                ▾
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 p-3 bg-red-50/30 rounded-xl border border-red-100">
              <img
                src={selectedEvent.thumbnail}
                alt={selectedEvent.name}
                className="w-12 h-12 rounded-xl object-cover border border-red-200"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{selectedEvent.name}</p>
                <p className="text-[11px] text-gray-500">{selectedEvent.type} • {selectedEvent.date}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#E7E9F0] flex items-center justify-between text-xs text-[#737783]">
            <span>Active Highlights:</span>
            <span className="font-bold text-gray-900">{eventHighlights.length} Published</span>
          </div>
        </div>

        {/* 3 Creation Cards (approx 8.5 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-[#F20D24]" />
            <h3 className="text-sm font-bold text-gray-900">
              Create Highlight for <span className="text-[#F20D24]">{selectedEvent.name}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Wedding Trailer */}
            <div className="p-4 rounded-xl border border-red-100 bg-red-50/30 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-[#F20D24]">
                  <Film className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Wedding Trailer</h4>
                <p className="text-[11px] text-gray-500">Create a short cinematic wedding teaser</p>
              </div>
              <button
                onClick={() => setModalType('trailer')}
                disabled={eventHighlights.some((highlight) => highlight.type === 'trailer')}
                className="w-full py-2 px-3 rounded-xl bg-[#F20D24] hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors text-center disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {eventHighlights.some((highlight) => highlight.type === 'trailer') ? 'Trailer Published' : '+ Create Trailer'}
              </button>
            </div>

            {/* 2. Wedding Photo Album */}
            <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Wedding Photo Album</h4>
                <p className="text-[11px] text-gray-500">Create a curated photo highlights album</p>
              </div>
              <button
                onClick={() => setAlbumManagerType('photo_album')}
                className="w-full py-2 px-3 rounded-xl bg-[#F20D24] hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors text-center"
              >
                Manage Photo Albums
              </button>
            </div>

            {/* 3. Wedding Video Album */}
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Video className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Wedding Video Album</h4>
                <p className="text-[11px] text-gray-500">Create full wedding ceremony video collection</p>
              </div>
              <button
                onClick={() => setAlbumManagerType('video_album')}
                className="w-full py-2 px-3 rounded-xl bg-[#F20D24] hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors text-center"
              >
                Manage Video Albums
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-[#E7E9F0] bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#F20D24]">
              <ImagePlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Home Screen Banners</h3>
              <p className="text-xs text-gray-500">Upload up to 4 banners for {selectedEvent.name} from your gallery.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">{banners.length} / 4 uploaded</span>
            <input
              ref={bannerFileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => void handleBannerUpload(event)}
              className="hidden"
              disabled={isUploadingBanners || banners.length >= 4}
            />
            <button
              type="button"
              onClick={() => bannerFileInput.current?.click()}
              disabled={isUploadingBanners || banners.length >= 4}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" />
              {isUploadingBanners ? 'Uploading…' : 'Upload Banners'}
            </button>
          </div>
        </div>

        {banners.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {banners.map((banner) => (
              <div key={banner.id} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <img src={banner.url} alt={banner.filename} className="aspect-[16/7] w-full object-cover" />
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <p className="truncate text-xs font-semibold text-gray-700" title={banner.filename}>{banner.filename}</p>
                  <button
                    type="button"
                    onClick={() => void handleBannerDelete(banner)}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-[#F20D24]"
                    aria-label={`Remove banner ${banner.filename}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => bannerFileInput.current?.click()}
            disabled={isUploadingBanners}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm font-semibold text-gray-600 hover:border-[#F20D24] disabled:opacity-60"
          >
            <ImagePlus className="h-6 w-6 text-[#F20D24]" />
            Choose banners from your gallery
            <span className="text-xs font-normal text-gray-500">JPG, PNG or WebP images</span>
          </button>
        )}
      </section>

      {/* Event Highlights List Table */}
      <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs overflow-hidden space-y-0">
        {/* Table Header Bar */}
        <div className="p-5 border-b border-[#E7E9F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#F20D24]" />
            <h3 className="text-base font-bold text-gray-900">
              Event Highlights – <span className="text-[#F20D24]">{selectedEvent.name}</span>
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Database className="w-3.5 h-3.5 text-purple-600" />
              <span>Gallery Storage:</span>
              <span className="font-bold text-gray-900">12.4 GB / 100 GB</span>
              <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden ml-1">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '12.4%' }} />
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Highlights Rows */}
        <div className="divide-y divide-[#E7E9F0]">
          {eventHighlights.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              No highlights created yet for this event. Click one of the buttons above to publish a trailer or album!
            </div>
          ) : (
            eventHighlights.map((hl) => (
              <div
                key={hl.id}
                className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-28 h-18 sm:w-36 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-gray-200 group">
                    <img src={hl.thumbnail} alt={hl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    {hl.type !== 'photo_album' ? (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-sm">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-gray-900" />
                        </div>
                      </div>
                    ) : null}
                    {hl.duration && (
                      <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/75 text-white">
                        {hl.duration}
                      </span>
                    )}
                    {hl.photosCount && (
                      <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/75 text-white flex items-center gap-1">
                        <ImageIcon className="w-2.5 h-2.5" />
                        {hl.photosCount.toLocaleString()} Photos
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {hl.type === 'trailer' && <Film className="w-4 h-4 text-[#F20D24] shrink-0" />}
                      {hl.type === 'photo_album' && <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />}
                      {hl.type === 'video_album' && <Video className="w-4 h-4 text-blue-600 shrink-0" />}
                      <h4 className="text-sm font-bold text-gray-900 truncate">{hl.title}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {hl.photosCount ? `${hl.photosCount} Photos | ` : ''}
                      {hl.videosCount ? `${hl.videosCount} Video | ` : ''}
                      Created on {hl.createdAt}
                    </p>
                  </div>
                </div>

                {/* Right: Status Badge & Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 mr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Published
                  </span>

                  <button
                    onClick={() => setShowGuestPreviewModal(true)}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-[#E7E9F0] text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 transition-colors"
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View</span>
                  </button>

                  <button
                    onClick={() => notify(`Opening editor for ${hl.title}`, 'info')}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-[#E7E9F0] text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  <button
                    onClick={() => handleShare(hl.title)}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-[#E7E9F0] text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </button>

                  <button
                    onClick={() => notify(`Downloading ${hl.title} master archive...`, 'success')}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-[#E7E9F0] text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </button>

                  <button
                    onClick={() => void handleHighlightDelete(hl)}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete highlight"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Highlight Modal */}
      {modalType && (
        <CreateHighlightModal
          isOpen={true}
          onClose={() => setModalType(null)}
          defaultType={modalType}
          eventId={selectedEvent.id}
        />
      )}
    </div>
  );
};
