import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Camera,
  Play,
  Film,
  Users,
  HelpCircle,
  Shield,
  Heart,
  Share2,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Send,
  Download,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { RiBroadcastLine } from 'react-icons/ri';

interface GuestWebsitePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestWebsitePreviewModal: React.FC<GuestWebsitePreviewModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeEvent,
    profile,
    guestPages,
    highlights,
    uploadedPhotos,
    streamConfig,
    notify,
  } = useStudio();

  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [activeSection, setActiveSection] = useState<'home' | 'live' | 'photos' | 'venue' | 'family' | 'wishes'>('home');
  const [familySide, setFamilySide] = useState<'bride' | 'groom'>('bride');
  const [wishes, setWishes] = useState<string[]>([]);
  const [newWish, setNewWish] = useState('');

  if (!isOpen || !activeEvent) return null;

  const eventHighlights = highlights.filter(
    (h) => h.eventId === activeEvent.id
  );
  const eventPhotos = uploadedPhotos.filter((photo) => photo.eventId === activeEvent.id);
  const eventContent = guestPages.eventContent?.[activeEvent.id];
  const venueDetails = { ...guestPages.venueDetails, ...eventContent?.venueDetails };
  const brideFamily = eventContent?.brideFamily ?? guestPages.familyDetails.brideFamily;
  const groomFamily = eventContent?.groomFamily ?? guestPages.familyDetails.groomFamily;

  const handlePostWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWish.trim()) return;
    setWishes([newWish, ...wishes]);
    setNewWish('');
    notify('Your blessing has been posted to the couple!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className={`flex max-h-full w-full flex-col items-center ${deviceView === 'desktop' ? 'max-w-6xl' : ''}`}>
        {/* Top Control Bar */}
        <div className="mb-3 flex w-full shrink-0 items-center justify-between rounded-2xl border border-white/10 bg-[#111116] px-4 py-3 text-white shadow-xl sm:px-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="min-w-0 text-xs font-bold text-gray-300">
              <span className="hidden sm:inline">Live Guest Experience Preview: </span>
              <span className="truncate text-white font-mono">{activeEvent.guestLinkSlug}</span>
              <span className="ml-2 hidden text-[10px] font-medium text-emerald-300 md:inline">Studio edits update here automatically</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg bg-gray-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDeviceView('desktop')}
                aria-pressed={deviceView === 'desktop'}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 font-bold transition-colors sm:px-3 ${
                  deviceView === 'desktop' ? 'bg-[#F20D24] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" /><span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceView('mobile')}
                aria-pressed={deviceView === 'mobile'}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 font-bold transition-colors sm:px-3 ${
                  deviceView === 'mobile' ? 'bg-[#F20D24] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close guest preview"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-300 transition-colors hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Device viewport */}
        <div className={`flex min-h-0 flex-col overflow-hidden bg-[#F7F8FC] font-sans shadow-2xl transition-all duration-200 ${
          deviceView === 'mobile'
            ? 'h-[min(780px,calc(100dvh-92px))] w-[min(390px,calc(100vw-24px))] rounded-[2.5rem] border-[9px] border-[#111116] ring-1 ring-white/30'
            : 'h-[calc(100dvh-100px)] w-full max-w-6xl rounded-2xl border border-gray-300'
        }`}>
          {deviceView === 'mobile' && (
            <div className="relative z-40 flex h-7 shrink-0 items-center justify-center bg-white">
              <div className="absolute top-1 h-4 w-20 rounded-full bg-[#111116]" />
              <span className="sr-only">Mobile device preview</span>
            </div>
          )}
          {/* Guest Website Content (Scrollable) */}
          <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-[#F7F8FC]">
          {/* Guest Portal Top Studio Branding Bar */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 sm:px-5 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {/* Studio Logo circle */}
              <div className="w-8 h-8 rounded-full bg-[#111116] flex flex-col items-center justify-center text-white shrink-0 shadow-xs">
                <span className="text-[8px] font-black leading-none">ON AIR</span>
                <span className="text-[6px] font-bold text-[#F20D24] leading-none uppercase">Studio</span>
              </div>
              <div>
              <p className="max-w-28 truncate text-[10px] font-extrabold leading-none text-gray-900 sm:text-xs">{profile.studioName}</p>
              <p className="mt-0.5 truncate text-[8px] uppercase tracking-widest text-gray-400 sm:text-[9px]">Official Media Partner</p>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex shrink-0 items-center gap-1 sm:gap-4 text-[10px] font-bold text-gray-600 sm:text-xs">
              <button onClick={() => setActiveSection('home')} className={activeSection === 'home' ? 'text-[#F20D24]' : ''}>
                Home
              </button>
              <button onClick={() => setActiveSection('live')} className={activeSection === 'live' ? 'text-[#F20D24]' : ''}>
                Live Stream
              </button>
              <button onClick={() => setActiveSection('photos')} className={activeSection === 'photos' ? 'text-[#F20D24]' : ''}>
                Photos
              </button>
              <button onClick={() => setActiveSection('venue')} className={activeSection === 'venue' ? 'text-[#F20D24]' : ''}>
                Venue
              </button>
            </nav>
          </header>

          {/* Hero Couple Section */}
          <div className="relative aspect-16/9 sm:aspect-21/9 min-h-[260px] flex items-center justify-center text-center text-white p-6">
            <img
              src={activeEvent.thumbnail}
              alt={activeEvent.name}
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.35]"
            />

            <div className="relative z-10 space-y-2 max-w-xl">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-xs text-white uppercase tracking-widest">
                The Wedding Celebrations of
              </span>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md">
                {activeEvent.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-200 mt-2 font-medium">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-red-400" />
                  {activeEvent.date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-red-400" />
                  {activeEvent.startTime}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  {activeEvent.location}
                </span>
              </div>
            </div>
          </div>

          {/* Main Sections */}
          <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
            {/* 1. Live Stream Section */}
            {activeEvent.services?.liveStreaming && (
              <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${activeEvent.liveStreamStatus === 'live' ? 'bg-[#F20D24] live-dot' : 'bg-gray-400'}`} />
                    <h3 className="text-base font-bold text-gray-900">Live Ceremony Stream</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-[#F20D24] border border-red-200 flex items-center gap-1">
                    <RiBroadcastLine className="w-3.5 h-3.5" />
                    {activeEvent.liveStreamStatus === 'live' ? 'Live' : 'Not Live'}
                  </span>
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-950 shadow-md">
                  {activeEvent.liveStreamStatus === 'live' ? (
                    <img src={activeEvent.thumbnail} alt={`${activeEvent.name} live stream`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-300">
                      This event is not currently live.
                    </div>
                  )}
                  {activeEvent.liveStreamStatus === 'live' && (
                    <div className="absolute top-3 left-3 bg-[#F20D24] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      LIVE
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 2. AI Photo Search & Gallery */}
            {activeEvent.services?.aiPhotoSharing && (
              <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Find Your Photos with AI</h3>
                      <p className="text-xs text-gray-500">Upload a quick selfie to discover all your wedding candid moments</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/30 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Take or Upload a Selfie</h4>
                  <p className="text-xs text-gray-600">AI face matching is unavailable until a recognition service is connected.</p>
                </div>

                {/* Photo grid preview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  {eventPhotos.slice(0, 4).map((p) => (
                    <div key={p.id} className="aspect-square rounded-xl overflow-hidden border border-gray-200 group relative">
                      <img src={p.url} alt="event preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                        <Download className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. Wedding Highlights */}
            {activeEvent.services?.highlights && (
              <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-900">Wedding Highlights</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {eventHighlights.slice(0, 3).map((hl) => (
                    <div key={hl.id} className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                      <div className="relative aspect-video">
                        <img src={hl.thumbnail} alt={hl.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                      </div>
                      <div className="p-3">
                        <h5 className="font-bold text-xs text-gray-900 line-clamp-1">{hl.title}</h5>
                        <p className="text-[10px] text-gray-400 mt-0.5">{hl.duration || `${hl.photosCount} Photos`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Venue Details */}
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#F20D24]" />
                <h3 className="text-base font-bold text-gray-900">Ceremony Venue</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <img
                  src={venueDetails.venueImage}
                  alt="Venue"
                  className="rounded-xl aspect-video object-cover border"
                />
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-sm text-gray-900">{venueDetails.venueName}</h4>
                  <p className="text-gray-600 leading-relaxed">{venueDetails.address}</p>
                  <p className="text-gray-500 pt-1">{venueDetails.directions}</p>
                  <div className="pt-2">
                    <a
                      href={venueDetails.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>Get Directions on Google Maps</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Family Details */}
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-gray-900">Family Members</h3>
              </div>
              <div className="flex w-full max-w-sm gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
                {(['bride', 'groom'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setFamilySide(side)}
                    className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold uppercase ${
                      familySide === side ? 'bg-[#F20D24] text-white' : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(familySide === 'bride' ? brideFamily : groomFamily).map((member) => (
                  <div key={member.id} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <img src={member.image} alt={member.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-gray-900">{member.name}</p>
                      <p className="text-[10px] text-gray-500">{member.relation}</p>
                      {member.about && <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{member.about}</p>}
                    </div>
                  </div>
                ))}
                {(familySide === 'bride' ? brideFamily : groomFamily).length === 0 && (
                  <p className="col-span-full rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-500">
                    Family details will be shared here soon.
                  </p>
                )}
              </div>
            </section>

            {/* 6. Guest Wishes Book */}
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#F20D24]" />
                <h3 className="text-base font-bold text-gray-900">Send Your Blessings & Wishes</h3>
              </div>

              <form onSubmit={handlePostWish} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Leave a warm message for the couple..."
                  value={newWish}
                  onChange={(e) => setNewWish(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#F20D24]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#F20D24] text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>

              <div className="space-y-2 pt-2 text-xs divide-y divide-gray-100">
                {wishes.map((w, idx) => (
                  <div key={idx} className="pt-2 text-gray-700">
                    "{w}"
                  </div>
                ))}
              </div>
            </section>

            {/* 7. Help & Support / Privacy Policy Footer */}
            <footer className="text-center py-6 text-xs text-gray-500 space-y-3 border-t">
              <p>
                Need assistance? Call media coordinator at{' '}
                <span className="font-bold text-gray-800">{guestPages.helpSupport.contactNumber}</span> or{' '}
                <span className="font-bold text-gray-800">{guestPages.helpSupport.email}</span>
              </p>
              <div className="flex items-center justify-center gap-4 text-[11px] text-gray-400">
                <span>Privacy Policy Active</span>
                <span>•</span>
                <span>Photographed by {profile.studioName}</span>
                <span>•</span>
                <span>Powered by ON AIR Studio Panel</span>
              </div>
            </footer>
          </main>
          </div>
        </div>
      </div>
    </div>
  );
};
