import React, { useState, useRef } from 'react';
import { useStudio } from '../../context/StudioContext';
import { UploadedPhoto } from '../../types';
import { BuyPhotosModal } from './BuyPhotosModal';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Share2,
  MoreVertical,
  Layers,
  UploadCloud,
  Clock4,
  XCircle,
  Sparkles,
  Settings as SettingsIcon,
  BarChart2,
  Search,
  Check,
  Grid,
  List,
  ChevronDown,
  Camera,
  Trash2,
  Download,
  Copy,
  QrCode,
  ArrowLeft,
} from 'lucide-react';
import { RiShoppingBag3Line } from 'react-icons/ri';

export const PhotoSharingPage: React.FC = () => {
  const {
    events,
    activeEventId,
    setActiveEventId,
    uploadedPhotos,
    uploadPhotos,
    deletePhoto,
    setShowBuyPhotosModal,
    showBuyPhotosModal,
    setShowGuestPreviewModal,
    setActiveTab: setNavigationTab,
    setEventDetailsId,
    notify,
  } = useStudio();

  const [activeTab, setActiveTab] = useState<'upload' | 'ai-search' | 'settings' | 'share' | 'analytics'>('upload');
  const [eventSearch, setEventSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAllUploads, setShowAllUploads] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery settings state
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [allowGuestDownloads, setAllowGuestDownloads] = useState(true);
  const [pinProtected, setPinProtected] = useState(false);
  const [galleryPin, setGalleryPin] = useState('1234');

  const selectedEvent =
    events.find((e) => e.id === activeEventId) ||
    events[0];

  if (!selectedEvent) {
    return (
      <div className="rounded-2xl border border-[#E7E9F0] bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-gray-900">No events yet</h2>
        <p className="mt-2 text-sm text-gray-600">Create an event and purchase Photo Sharing to manage its gallery.</p>
      </div>
    );
  }

  // Filter events for left panel
  const filteredEvents = events.filter((ev) => {
    const matchesSearch = ev.name.toLowerCase().includes(eventSearch.toLowerCase());
    if (eventFilter === 'active') return matchesSearch && ev.status === 'Active';
    if (eventFilter === 'completed') return matchesSearch && ev.status === 'Completed';
    return matchesSearch;
  });

  const photoQuota = selectedEvent.photoQuota;
  const eventPhotos = uploadedPhotos.filter((photo) => photo.eventId === selectedEvent.id);
  const uploadedCount = photoQuota.uploaded;
  const purchasedCount = photoQuota.purchased;
  const remainingPhotos = Math.max(0, purchasedCount - uploadedCount);
  const percentageUsed = purchasedCount > 0
    ? Math.min(100, Math.round((uploadedCount / purchasedCount) * 100))
    : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    if (files.length > 10) {
      notify('Upload up to 10 photos at a time.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      await uploadPhotos(files, selectedEvent.id);
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDeletePhoto = (photo: UploadedPhoto) => {
    if (!window.confirm(`Delete ${photo.filename} from this event gallery? This will remove it from Firebase Storage and guest galleries.`)) return;
    void deletePhoto(photo.id);
  };

  const copyGuestLink = () => {
    const link = `https://onairstudio.in/g/${selectedEvent.guestLinkSlug}`;
    navigator.clipboard.writeText(link);
    notify('Guest gallery link copied to clipboard!', 'info');
  };

  if (!selectedEvent.services.aiPhotoSharing) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#E7E9F0] bg-white p-8 text-center shadow-2xs">
        <Sparkles className="mx-auto h-10 w-10 text-purple-600" />
        <h2 className="mt-4 text-xl font-bold text-gray-900">Photo Sharing is not enabled</h2>
        <p className="mt-2 text-sm text-gray-600">Purchase Photo Sharing for {selectedEvent.name} from its event details to use this feature.</p>
        <button
          onClick={() => {
            setEventDetailsId(selectedEvent.id);
            setNavigationTab('events');
          }}
          className="mt-5 rounded-xl bg-[#F20D24] px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
        >
          View Event Services
        </button>
      </div>
    );
  }

  if (showAllUploads) {
    return (
      <div className="space-y-5 pb-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => setShowAllUploads(false)} className="font-semibold text-slate-500 hover:text-slate-900">Photo Sharing</button>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900">All Uploads</span>
        </nav>

        <section className="overflow-hidden rounded-3xl border border-[#E7E9F0] bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowAllUploads(false)} aria-label="Back to Photo Sharing" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
              <div>
                <h1 className="text-lg font-black text-slate-900">Uploaded Photos</h1>
                <p className="mt-0.5 text-xs text-slate-500">{selectedEvent.name} · {eventPhotos.length.toLocaleString()} photos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-200 p-0.5">
                <button type="button" onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={viewMode === 'grid'} className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-[#F20D24] text-white' : 'text-slate-400 hover:text-slate-700'}`}><Grid className="h-4 w-4" /></button>
                <button type="button" onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'} className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-[#F20D24] text-white' : 'text-slate-400 hover:text-slate-700'}`}><List className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={() => setShowAllUploads(false)} className="text-xs font-bold text-[#F20D24] hover:underline">Back to uploads</button>
            </div>
          </header>

          <div className="p-5">
            {eventPhotos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <Camera className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-600">No photos have been uploaded for this event.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {eventPhotos.map((photo) => (
                  <article key={photo.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative aspect-square bg-slate-100">
                      <img src={photo.url} alt={photo.filename} loading="lazy" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => confirmDeletePhoto(photo)} title="Delete photo" aria-label={`Delete ${photo.filename}`} className="absolute right-2 top-2 rounded-lg bg-white/95 p-2 text-red-600 opacity-100 shadow transition hover:bg-red-600 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs font-bold text-slate-800" title={photo.filename}>{photo.filename}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{photo.uploadedAt} · {photo.sizeMB} MB</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                {eventPhotos.map((photo) => (
                  <article key={photo.id} className="flex items-center gap-3 p-3 sm:gap-4">
                    <img src={photo.url} alt={photo.filename} loading="lazy" className="h-14 w-14 rounded-xl bg-slate-100 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{photo.filename}</p>
                      <p className="mt-1 text-xs text-slate-500">{photo.uploadedAt} · {photo.sizeMB} MB</p>
                    </div>
                    <button type="button" onClick={() => confirmDeletePhoto(photo)} title="Delete photo" aria-label={`Delete ${photo.filename}`} className="rounded-xl border border-red-100 p-2.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Title & Subtitle */}
      <div className="bg-white p-5 rounded-2xl border border-[#E7E9F0] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#F20D24]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#171717]">Photo Sharing</h2>
            <p className="text-xs text-[#737783]">
              Upload, manage and share event photos with AI face search for your guests.
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-column layout: Left Event Selector + Right Event Details & Quota */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Select Event (approx 3.5 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#F20D24]" />
            <h3 className="text-sm font-bold text-[#171717]">Select Event</h3>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event by name..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E7E9F0] focus:outline-none focus:border-[#F20D24]"
            />
          </div>

          {/* Filter pills: All (8), Active (4), Completed (3) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setEventFilter('all')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                eventFilter === 'all'
                  ? 'bg-[#F20D24] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setEventFilter('active')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                eventFilter === 'active'
                  ? 'bg-[#F20D24] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Active ({events.filter((e) => e.status === 'Active' || e.status === 'Ongoing').length})
            </button>
            <button
              onClick={() => setEventFilter('completed')}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                eventFilter === 'completed'
                  ? 'bg-[#F20D24] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Completed ({events.filter((e) => e.status === 'Completed').length})
            </button>
          </div>

          {/* Event cards list */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredEvents.map((evt) => {
              const isSelected = evt.id === activeEventId;
              return (
                <div
                  key={evt.id}
                  onClick={() => setActiveEventId(evt.id)}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#F20D24] bg-red-50/20 shadow-xs'
                      : 'border-[#E7E9F0] hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={evt.thumbnail}
                      alt={evt.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{evt.name}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{evt.date}</span>
                      </div>
                    </div>
                  </div>

                  {evt.status === 'Ongoing' || evt.status === 'Active' ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                      Completed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Selected Event Details, Quota, Tabs, and Uploads (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Top Event Banner Card */}
          <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={selectedEvent.thumbnail}
                alt={selectedEvent.name}
                className="w-14 h-14 rounded-2xl object-cover border border-gray-200 shadow-xs"
              />
              <div>
                <h3 className="text-lg font-bold text-[#171717]">{selectedEvent.name}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#737783] mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {selectedEvent.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {selectedEvent.startTime} – {selectedEvent.endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {selectedEvent.location}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setShowGuestPreviewModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E7E9F0] text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Guest Gallery</span>
              </button>
              <button
                onClick={copyGuestLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E7E9F0] text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </button>
            </div>
          </div>

          {/* Photo Quota Summary (3 Cards + Progress Bar + Buy Button) */}
          <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Total Photos */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500">Total Photos</p>
                  <p className="text-xl font-black text-gray-900">{photoQuota.purchased.toLocaleString()}</p>
                </div>
              </div>

              {/* Card 2: Uploaded */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500">Uploaded</p>
                  <p className="text-xl font-black text-gray-900">{photoQuota.uploaded.toLocaleString()}</p>
                </div>
              </div>

              {/* Card 3: Remaining */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Clock4 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500">Remaining</p>
                  <p className="text-xl font-black text-gray-900">{remainingPhotos.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Quota Progress Bar + Buy Extra Photos Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>{percentageUsed}% Used</span>
                  <span>{photoQuota.uploaded.toLocaleString()} / {photoQuota.purchased.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5">
                  <div
                    className="bg-linear-to-r from-[#F20D24] to-red-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentageUsed}%` }}
                  />
                </div>
              </div>

              {/* Buy Extra Photos Button */}
              <div className="flex flex-col items-center sm:items-end shrink-0">
                <button
                  onClick={() => setShowBuyPhotosModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#F20D24] hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-900/20 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <RiShoppingBag3Line className="w-4 h-4" />
                  <span>Buy Extra Photos</span>
                </button>
                <span className="text-[11px] text-gray-400 mt-1 font-semibold">+1,000 Photos @ ₹399</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E7E9F0] pb-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-[#F20D24] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload & Manage</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-search')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ai-search'
                  ? 'bg-[#F20D24] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Search (Guest Photos)</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-[#F20D24] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Gallery Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('share')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'share'
                  ? 'bg-[#F20D24] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Share & Links</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-[#F20D24] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
          </div>

          {/* TAB 1: Upload & Manage */}
          {activeTab === 'upload' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Drag & Drop upload zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white rounded-2xl border-2 border-dashed border-red-200 hover:border-[#F20D24] p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-red-50 group-hover:scale-110 flex items-center justify-center text-[#F20D24] transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {isUploading ? 'Uploading to Firebase Storage…' : 'Upload photos to Firebase Storage'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">Select up to 10 images for this event</p>
                  </div>
                  <span className="text-[10px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                    Supports: JPG, JPEG, PNG, HEIC | Max file size: 20 MB
                  </span>
                  <button
                    type="button"
                    className="px-5 py-2 rounded-xl bg-[#F20D24] text-white text-xs font-bold shadow-xs hover:bg-red-700 transition-colors"
                  >
                    {isUploading ? 'Uploading…' : 'Choose Photos'}
                  </button>
                </div>

                {/* Right: Upload Progress Card */}
                <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900">Upload Progress</h4>
                    <span className="text-[11px] text-gray-500">{isUploading ? 'Uploading…' : 'Ready'}</span>
                  </div>

                  <p className="text-3xl font-black text-gray-900">{eventPhotos.length}</p>
                  <p className="text-xs text-gray-500">Photos uploaded for this event</p>
                </div>
              </div>

              {/* Recent Uploads Grid */}
              <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#F20D24]" />
                    <h4 className="text-sm font-bold text-gray-900">
                      Recent Uploads ({eventPhotos.length.toLocaleString()} Photos)
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-lg p-0.5">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1 rounded ${viewMode === 'grid' ? 'bg-[#F20D24] text-white' : 'text-gray-400'}`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1 rounded ${viewMode === 'list' ? 'bg-[#F20D24] text-white' : 'text-gray-400'}`}
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => setShowAllUploads(true)}
                      className="text-xs font-bold text-[#F20D24] hover:underline flex items-center gap-1"
                    >
                      View All <span>→</span>
                    </button>
                  </div>
                </div>

                {/* Photos Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {eventPhotos.slice(0, 6).map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-2xs cursor-pointer"
                    >
                      <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => confirmDeletePhoto(photo)}
                          className="p-1 rounded-full bg-white text-red-600 hover:scale-110 shadow-sm"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {eventPhotos.length > 6 && (
                    <div className="relative aspect-square rounded-xl bg-gray-900 text-white flex flex-col items-center justify-center">
                      <span className="text-xl font-black">+{eventPhotos.length - 6}</span>
                      <span className="text-xs font-semibold text-gray-300">More</span>
                    </div>
                  )}
                  {eventPhotos.length === 0 && (
                    <p className="col-span-full py-8 text-center text-xs text-gray-400">No photos have been uploaded for this event.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI Search (Guest Photos) */}
          {activeTab === 'ai-search' && (
            <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-6 space-y-6">
              <div className="max-w-xl">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI Face Recognition Search
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  AI face matching is unavailable until a recognition service is connected.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 text-center">
                  <Camera className="mx-auto h-8 w-8 text-purple-600" />
                  <p className="mt-3 text-sm font-bold text-gray-900">Recognition service not connected</p>
                  <p className="mt-1 text-xs text-gray-600">No simulated scan or match results are shown.</p>
                </div>

                {/* Match Results */}
                <div className="p-6 rounded-2xl border border-[#E7E9F0] bg-white space-y-4">
                  <h5 className="text-sm font-bold text-gray-900">Recognition Results</h5>
                  <p className="text-xs text-gray-400 py-8 text-center">No recognition results available.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Gallery Settings */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-6 space-y-5">
              <h4 className="text-base font-bold text-gray-900">Event Gallery Settings</h4>

              <div className="space-y-4 max-w-xl text-xs">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E7E9F0] hover:bg-gray-50 cursor-pointer">
                  <div>
                    <p className="font-bold text-gray-900">Apply Studio Watermark</p>
                    <p className="text-gray-500">Overlay studio logo on guest previews to protect copyright</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={watermarkEnabled}
                    onChange={(e) => setWatermarkEnabled(e.target.checked)}
                    className="w-4 h-4 text-[#F20D24] accent-[#F20D24]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E7E9F0] hover:bg-gray-50 cursor-pointer">
                  <div>
                    <p className="font-bold text-gray-900">Allow Guest Full-Res Downloads</p>
                    <p className="text-gray-500">Allow invited guests to download 4K original camera files</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowGuestDownloads}
                    onChange={(e) => setAllowGuestDownloads(e.target.checked)}
                    className="w-4 h-4 text-[#F20D24] accent-[#F20D24]"
                  />
                </label>

                <div className="p-3.5 rounded-xl border border-[#E7E9F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">PIN Code Protection</p>
                      <p className="text-gray-500">Require guests to enter a 4-digit code to view photos</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={pinProtected}
                      onChange={(e) => setPinProtected(e.target.checked)}
                      className="w-4 h-4 text-[#F20D24] accent-[#F20D24]"
                    />
                  </div>
                  {pinProtected && (
                    <input
                      type="text"
                      maxLength={6}
                      value={galleryPin}
                      onChange={(e) => setGalleryPin(e.target.value)}
                      placeholder="Enter 4-digit PIN"
                      className="w-32 px-3 py-1.5 rounded-lg border border-gray-300 font-mono text-sm tracking-widest text-center"
                    />
                  )}
                </div>

                <button
                  onClick={() => notify('Gallery settings saved successfully!', 'success')}
                  className="px-5 py-2.5 rounded-xl bg-[#F20D24] text-white font-bold text-xs shadow-md shadow-red-900/20 hover:bg-red-700 cursor-pointer"
                >
                  Save Gallery Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Share & Links */}
          {activeTab === 'share' && (
            <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-6 space-y-6">
              <h4 className="text-base font-bold text-gray-900">Share Guest Gallery</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700">Direct Guest URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://onairstudio.in/g/${selectedEvent.guestLinkSlug}`}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono bg-gray-50 text-gray-700"
                    />
                    <button
                      onClick={copyGuestLink}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                      title="Copy link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2">
                    <a
                      href={`https://api.whatsapp.com/send?text=View%20photos%20and%20live%20stream%20for%20${encodeURIComponent(
                        selectedEvent.name
                      )}%20at%20https://onairstudio.in/g/${selectedEvent.guestLinkSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                    >
                      <span>Share on WhatsApp</span>
                    </a>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-32 h-32 bg-white rounded-xl border p-2 flex items-center justify-center shadow-xs">
                    <QrCode className="w-24 h-24 text-gray-800" />
                  </div>
                  <p className="text-xs font-bold text-gray-800">Printable Guest QR Standee</p>
                  <p className="text-[11px] text-gray-500">Place on reception tables so guests can scan & selfie-match</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Analytics */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-6 space-y-5">
              <h4 className="text-base font-bold text-gray-900">Event Gallery Analytics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500">Total Guest Visits</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">1,842</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500">AI Face Searches Run</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">426</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500">Photos Downloaded</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">3,190</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buy Extra Photos Modal */}
      <BuyPhotosModal
        isOpen={showBuyPhotosModal}
        onClose={() => setShowBuyPhotosModal(false)}
        eventId={selectedEvent.id}
      />
    </div>
  );
};
