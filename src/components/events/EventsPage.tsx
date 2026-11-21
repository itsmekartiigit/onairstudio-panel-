import React, { useEffect, useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import {
  EventServicePurchase,
  getAvailableStudioServices,
  getEventGuestPinStatus,
  getEventServicePurchases,
  setEventGuestPin,
  StudioCatalogService,
  StudioServicePackage,
} from '../../services/studioAccountService';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Copy,
  Trash2,
  ExternalLink,
  Sparkles,
  Radio,
  Film,
  Globe,
  ArrowLeft,
  Check,
  QrCode,
  CalendarDays,
  MapPin,
  Wallet,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Pencil,
  Share2,
  Download,
  Link2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { EventType } from '../../types';

export const EventsPage: React.FC = () => {
  const {
    events,
    walletBalance,
    eventDetailsId,
    setEventDetailsId,
    setActiveEventId,
    duplicateEvent,
    deleteEvent,
    buyEventService,
    updateEvent,
    setActiveTab,
    notify,
    setShowCreateEventModal,
    setShowGuestPreviewModal,
  } = useStudio();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [processingService, setProcessingService] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<StudioCatalogService[]>([]);
  const [eventPurchases, setEventPurchases] = useState<EventServicePurchase[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [qrCodeError, setQrCodeError] = useState('');
  const [eventEdit, setEventEdit] = useState<{
    name: string;
    type: EventType;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  } | null>(null);
  const [isGuestPinOpen, setIsGuestPinOpen] = useState(false);
  const [guestPin, setGuestPin] = useState('');
  const [isSavingGuestPin, setIsSavingGuestPin] = useState(false);
  const [guestPinStatus, setGuestPinStatus] = useState<{
    eventId: string;
    hasPin: boolean;
    loading: boolean;
  } | null>(null);
  const [savedGuestPins, setSavedGuestPins] = useState<Record<string, string>>({});
  const selectedEvent = events.find((event) => event.id === eventDetailsId);
  const guestUrl = selectedEvent
    ? `https://onairstudio.in/g/${selectedEvent.guestLinkSlug}`
    : '';

  useEffect(() => {
    if (!guestUrl) {
      setQrCodeDataUrl('');
      setQrCodeError('');
      return;
    }

    let cancelled = false;
    setQrCodeDataUrl('');
    setQrCodeError('');
    QRCode.toDataURL(guestUrl, { width: 240, margin: 2 })
      .then((dataUrl) => {
        if (!cancelled) setQrCodeDataUrl(dataUrl);
      })
      .catch((error: unknown) => {
        console.error('Could not generate guest QR code:', error);
        if (!cancelled) setQrCodeError('QR code could not be generated. You can still copy the guest link.');
      });

    return () => {
      cancelled = true;
    };
  }, [guestUrl]);

  useEffect(() => {
    if (!selectedEvent) return;
    let active = true;
    setCatalogLoading(true);
    void Promise.all([
      getAvailableStudioServices(),
      getEventServicePurchases(selectedEvent.id),
    ]).then(([availableServices, purchases]) => {
      if (!active) return;
      setCatalog(availableServices);
      setEventPurchases(purchases);
    }).catch((error: unknown) => {
      console.error('Could not load event service packages.', error);
      if (active) notify('Service packages could not be loaded. Please try again.', 'error');
    }).finally(() => {
      if (active) setCatalogLoading(false);
    });
    return () => { active = false; };
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!selectedEvent) {
      setGuestPinStatus(null);
      return;
    }

    let active = true;
    setGuestPinStatus({ eventId: selectedEvent.id, hasPin: false, loading: true });
    void getEventGuestPinStatus(selectedEvent.id)
      .then((hasPin) => {
        if (active) setGuestPinStatus({ eventId: selectedEvent.id, hasPin, loading: false });
      })
      .catch((error: unknown) => {
        console.error('Could not load event guest PIN status:', error);
        if (active) {
          setGuestPinStatus({ eventId: selectedEvent.id, hasPin: false, loading: false });
          notify('Guest PIN status could not be loaded.', 'error');
        }
      });

    return () => { active = false; };
  }, [selectedEvent?.id]);

  // Filter events
  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || ev.type === selectedType;
    const matchesStatus = selectedStatus === 'All' || ev.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const purchaseService = async (service: StudioCatalogService, item: StudioServicePackage) => {
    if (!selectedEvent || processingService) return;
    if (!window.confirm(`Purchase ${item.name} for ${service.serviceName} at ₹${item.price.toLocaleString('en-IN')} for ${selectedEvent.name}?`)) {
      return;
    }
    const requestKey = `${service.serviceId}:${item.packageId}`;
    setProcessingService(requestKey);
    try {
      const purchased = await buyEventService(selectedEvent.id, service.serviceId, item.packageId);
      if (purchased) {
        setEventPurchases(await getEventServicePurchases(selectedEvent.id));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const insufficient = message.match(/INSUFFICIENT_BALANCE:(\d+)/);
      if (insufficient) {
        notify(`Insufficient wallet balance. Add ₹${Number(insufficient[1]).toLocaleString('en-IN')} to complete this purchase.`, 'error');
      } else {
        notify(message || 'Service purchase could not be completed.', 'error');
      }
    } finally {
      setProcessingService(null);
    }
  };

  if (selectedEvent) {
    const remainingPhotos = Math.max(0, selectedEvent.photoQuota.purchased - selectedEvent.photoQuota.uploaded);
    const remainingHours = Math.max(0, selectedEvent.streamQuota.purchasedHours - selectedEvent.streamQuota.consumedMinutes / 60);
    const photoUsage = selectedEvent.photoQuota.purchased
      ? Math.min(100, (selectedEvent.photoQuota.uploaded / selectedEvent.photoQuota.purchased) * 100)
      : 0;
    const streamUsage = selectedEvent.streamQuota.purchasedHours
      ? Math.min(100, (selectedEvent.streamQuota.consumedMinutes / 60 / selectedEvent.streamQuota.purchasedHours) * 100)
      : 0;
    const photoPackages = eventPurchases.filter((purchase) => purchase.quotaUnit === 'photos');
    const streamPackages = eventPurchases.filter((purchase) => purchase.quotaUnit === 'hours');
    const copyGuestLink = async () => {
      try {
        await navigator.clipboard.writeText(guestUrl);
        notify('Guest link copied to clipboard.', 'success');
      } catch (error) {
        console.error('Could not copy guest link:', error);
        notify('Guest link could not be copied. Please copy it from the QR panel.', 'error');
      }
    };

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEventDetailsId(null)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E7E9F0] bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-2xs hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              All Events
            </button>
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Event Details</h2>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#E7E9F0] bg-white px-4 py-2 shadow-2xs">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#F20D24]"><Wallet className="h-5 w-5" /></span>
            <div>
              <p className="text-[11px] font-semibold text-gray-500">Wallet Balance</p>
              <p className="text-lg font-extrabold leading-tight text-[#F20D24]">₹{walletBalance.toLocaleString('en-IN')}</p>
            </div>
            <button onClick={() => setActiveTab('wallet')} className="ml-2 rounded-lg bg-[#F20D24] px-3 py-2 text-xs font-bold text-white hover:bg-red-700">
              <Plus className="mr-1 inline h-3.5 w-3.5" />Add Money
            </button>
          </div>
        </div>

        <section className="relative isolate overflow-hidden rounded-2xl border border-[#E7E9F0] bg-white p-4 shadow-2xs sm:p-5">
          <div
            className="absolute inset-y-0 right-0 z-0 w-3/5 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `linear-gradient(90deg, white 0%, rgba(255,255,255,.35) 100%), url("${selectedEvent.thumbnail}")` }}
          />
          <div className="absolute inset-y-0 right-0 z-0 w-2/3 bg-gradient-to-r from-white via-pink-50/60 to-rose-100/70" />
          <div className="relative z-10 grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl border border-white bg-white/70 p-2 md:h-36">
              <img src={selectedEvent.thumbnail} alt={selectedEvent.name} className="h-full w-full rounded-lg object-cover" />
            </div>
            <div className="flex flex-col justify-center border-l-0 md:border-l md:border-[#E7E9F0] md:pl-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#F20D24]">{selectedEvent.type} · Event ID: {selectedEvent.id}</p>
                  <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">{selectedEvent.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
                    <span id="event-date" className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{selectedEvent.date} · {selectedEvent.startTime} – {selectedEvent.endTime}</span>
                    <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{selectedEvent.location || 'Location not set'}</span>
                  </div>
                  <button
                    onClick={() => setShowGuestPreviewModal(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white/90 px-3 py-2 text-xs font-bold text-gray-800 shadow-2xs hover:bg-white"
                  >
                    <ExternalLink className="h-4 w-4" />Preview Guest Application
                  </button>
                  {guestPinStatus?.eventId === selectedEvent.id && guestPinStatus.hasPin && (
                    <div className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                      <KeyRound className="h-4 w-4 text-emerald-700" />
                      <span className="font-semibold text-emerald-800">Guest PIN:</span>
                      <code className="font-mono font-bold tracking-widest text-gray-900">
                        {savedGuestPins[selectedEvent.id] || 'Set (hidden)'}
                      </code>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEventEdit({
                    name: selectedEvent.name,
                    type: selectedEvent.type,
                    date: selectedEvent.date,
                    startTime: selectedEvent.startTime,
                    endTime: selectedEvent.endTime,
                    location: selectedEvent.location,
                  })} className="inline-flex items-center gap-2 rounded-xl border border-[#E1E4EC] bg-white/90 px-3 py-2.5 text-xs font-bold text-gray-800 hover:bg-white">
                    <Pencil className="h-4 w-4" />Edit Event
                  </button>
                  <button
                    disabled={guestPinStatus?.eventId === selectedEvent.id && guestPinStatus.loading}
                    onClick={() => { setGuestPin(''); setIsGuestPinOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#E1E4EC] bg-white/90 px-3 py-2.5 text-xs font-bold text-gray-800 hover:bg-white disabled:cursor-wait disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    {guestPinStatus?.eventId === selectedEvent.id && guestPinStatus.loading
                      ? 'Checking PIN…'
                      : guestPinStatus?.eventId === selectedEvent.id && guestPinStatus.hasPin
                        ? 'Edit PIN'
                        : 'Set PIN'}
                  </button>
                  <button onClick={() => document.getElementById('event-date')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="inline-flex items-center gap-2 rounded-xl border border-[#E1E4EC] bg-white/90 px-3 py-2.5 text-xs font-bold text-gray-800 hover:bg-white">
                    <CalendarDays className="h-4 w-4" />Event Schedule
                  </button>
                  <button onClick={() => void copyGuestLink()} className="inline-flex items-center gap-2 rounded-xl border border-[#E1E4EC] bg-white/90 px-3 py-2.5 text-xs font-bold text-gray-800 hover:bg-white">
                    <Share2 className="h-4 w-4" />Share Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)_minmax(210px,.68fr)]">
          <section className="rounded-2xl border border-[#E7E9F0] bg-white p-3.5 shadow-2xs sm:p-4">
            <div className="mb-3">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900"><Layers className="h-5 w-5 text-[#F20D24]" />Purchase Services</h3>
              <p className="mt-1 text-xs text-gray-600">Select and purchase services for this event. The amount will be deducted from your wallet.</p>
            </div>
            {catalogLoading ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Loading active packages…</p>
            ) : catalog.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No active packages are currently available. Contact your administrator.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {(['liveStreaming', 'aiPhotoSharing'] as const).map((category) => {
                  const services = catalog.filter((service) => service.category === category);
                  if (!services.length) return null;
                  const isStreaming = category === 'liveStreaming';
                  const ServiceIcon = isStreaming ? Radio : ImageIcon;
                  return (
                    <article key={category} className={`overflow-hidden rounded-2xl border ${isStreaming ? 'border-red-200' : 'border-purple-200'}`}>
                      {services.map((service) => (
                        <div key={service.serviceId}>
                          <div className={`flex items-center gap-2.5 border-b p-3 ${isStreaming ? 'border-red-100 bg-gradient-to-r from-red-50 to-white' : 'border-purple-100 bg-gradient-to-r from-purple-50 to-white'}`}>
                            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isStreaming ? 'bg-red-100 text-[#F20D24]' : 'bg-purple-100 text-purple-700'}`}><ServiceIcon className="h-5 w-5" /></span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-extrabold text-gray-900">{service.serviceName}</h4>
                              <p className="text-[10px] leading-4 text-gray-600">{service.description}</p>
                            </div>
                          </div>
                          <div className="space-y-1.5 p-2">
                            {service.packages.filter((item) => item.status === 'active').map((item) => {
                              const requestKey = `${service.serviceId}:${item.packageId}`;
                              const processing = processingService === requestKey;
                              const shortfall = Math.max(0, item.price - walletBalance);
                              const purchasedCount = eventPurchases.filter((purchase) => purchase.packageName === item.name && purchase.serviceName === service.serviceName).length;
                              return (
                                <div key={item.packageId} className="flex items-center justify-between gap-2 rounded-xl border border-[#ECEEF3] px-2.5 py-2 hover:border-gray-300">
                                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${processing ? 'border-red-400 bg-red-50 text-[#F20D24]' : 'border-gray-300 text-gray-400'}`}>
                                    {processing && <Check className="h-3 w-3" />}
                                  </span>
                                  <span className="min-w-0 flex-1 text-xs font-bold text-gray-800">{item.name}</span>
                                  <span className="shrink-0 text-xs font-extrabold text-[#F20D24]">₹{item.price.toLocaleString('en-IN')}</span>
                                  <button
                                    onClick={() => void purchaseService(service, item)}
                                    disabled={processingService !== null || shortfall > 0}
                                    title={shortfall > 0 ? `Add ₹${shortfall.toLocaleString('en-IN')} to your wallet` : purchasedCount ? `Purchased ${purchasedCount} time(s)` : `Buy ${item.name}`}
                                    className="min-w-[58px] rounded-lg border border-[#F20D24] px-2.5 py-1 text-xs font-bold text-[#F20D24] hover:bg-[#F20D24] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {processing ? '…' : 'Buy'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="space-y-3">
            <section className="rounded-2xl border border-[#E7E9F0] bg-white p-3.5 shadow-2xs sm:p-4">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900"><CheckCircle2 className="h-5 w-5 fill-emerald-500 text-white" />Purchased Services</h3>
              <p className="mt-1 text-xs text-gray-600">Services already activated for this event.</p>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-red-100 bg-gradient-to-r from-red-50 to-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-[#F20D24]"><Radio className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-gray-900">Live Streaming</p>
                      <p className="text-[10px] text-gray-600">Package: {streamPackages.at(-1)?.packageName || `${selectedEvent.streamQuota.purchasedHours} Hours`}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedEvent.streamQuota.purchasedHours > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {selectedEvent.streamQuota.purchasedHours > 0 ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-2 pl-10 text-[10px] text-gray-600">Consumed: <strong className="text-gray-900">{(selectedEvent.streamQuota.consumedMinutes / 60).toFixed(1)} h</strong><span className="mx-2 text-gray-300">|</span>Remaining: <strong className="text-[#F20D24]">{remainingHours.toFixed(1)} h</strong></p>
                </div>
                <div className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700"><ImageIcon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-gray-900">AI Photo Sharing</p>
                      <p className="text-[10px] text-gray-600">Package: {photoPackages.at(-1)?.packageName || `${selectedEvent.photoQuota.purchased.toLocaleString('en-IN')} Photos`}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedEvent.photoQuota.purchased > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {selectedEvent.photoQuota.purchased > 0 ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-2 pl-10 text-[10px] text-gray-600">Uploaded: <strong className="text-gray-900">{selectedEvent.photoQuota.uploaded.toLocaleString('en-IN')}</strong><span className="mx-2 text-gray-300">|</span>Remaining: <strong className="text-[#F20D24]">{remainingPhotos.toLocaleString('en-IN')}</strong></p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E7E9F0] bg-white p-3.5 shadow-2xs sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><span className="text-fuchsia-600"><ArrowRight className="h-4 w-4 -rotate-45" /></span>Service Usage</h3>
                <button onClick={() => notify('Usage reflects this event’s current service quotas.', 'info')} className="text-[10px] font-bold text-[#F20D24] hover:underline">View Details →</button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <Radio className="h-4 w-4 text-[#F20D24]" /><span className="flex-1">Live Streaming</span>
                    <span className="font-semibold text-gray-600">{(selectedEvent.streamQuota.consumedMinutes / 60).toFixed(1)} h / {selectedEvent.streamQuota.purchasedHours.toFixed(1)} h</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 pl-6">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-[#F20D24]" style={{ width: `${streamUsage}%` }} /></div>
                    <span className="w-7 text-right text-[10px] font-bold text-gray-600">{Math.round(streamUsage)}%</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <ImageIcon className="h-4 w-4 text-purple-600" /><span className="flex-1">AI Photo Sharing</span>
                    <span className="font-semibold text-gray-600">{selectedEvent.photoQuota.uploaded.toLocaleString('en-IN')} / {selectedEvent.photoQuota.purchased.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 pl-6">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-purple-500" style={{ width: `${photoUsage}%` }} /></div>
                    <span className="w-7 text-right text-[10px] font-bold text-gray-600">{Math.round(photoUsage)}%</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-[#E7E9F0] bg-white p-3.5 text-center shadow-2xs sm:p-4">
            <h3 className="flex items-center justify-center gap-2 text-base font-extrabold text-gray-900"><QrCode className="h-5 w-5 text-[#F20D24]" />Guest Application QR</h3>
            <p className="mt-1 text-xs text-gray-600">Guests can scan this code to open the event page.</p>
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR code for guest application" className="mx-auto mt-3 aspect-square w-full max-w-[190px] object-contain" />
            ) : (
              <div className="mx-auto mt-3 flex aspect-square w-full max-w-[190px] items-center justify-center rounded-xl bg-gray-50 px-4 text-xs text-gray-500">
                {qrCodeError || 'Generating QR code...'}
              </div>
            )}
            {qrCodeDataUrl && (
              <a
                href={qrCodeDataUrl}
                download={`${selectedEvent.guestLinkSlug}-guest-qr.png`}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F20D24] px-3 py-2.5 text-xs font-bold text-white hover:bg-red-700"
              >
                <Download className="h-4 w-4" />Download QR
              </a>
            )}
            <button onClick={() => void copyGuestLink()} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-[#C90A1D] hover:bg-red-100">
              <Link2 className="h-4 w-4" />Copy Link
            </button>
            {qrCodeError && <p className="mt-2 text-[10px] text-red-600">{qrCodeError}</p>}
          </section>
        </div>
        {eventEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-event-title">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                updateEvent(selectedEvent.id, eventEdit);
                setEventEdit(null);
              }}
              className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 id="edit-event-title" className="text-lg font-extrabold text-gray-900">Edit Event</h3>
                  <p className="text-xs text-gray-500">Update the details shown to your guests.</p>
                </div>
                <button type="button" onClick={() => setEventEdit(null)} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100" aria-label="Close">✕</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-gray-700 sm:col-span-2">Event name
                  <input required value={eventEdit.name} onChange={(event) => setEventEdit({ ...eventEdit, name: event.target.value })} className="mt-1 w-full rounded-lg border border-[#E7E9F0] px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold text-gray-700">Type
                  <select value={eventEdit.type} onChange={(event) => setEventEdit({ ...eventEdit, type: event.target.value as EventType })} className="mt-1 w-full rounded-lg border border-[#E7E9F0] bg-white px-3 py-2 text-sm">
                    {['Wedding', 'Engagement', 'Reception', 'Haldi', 'Birthday', 'Other'].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-gray-700">Date
                  <input required value={eventEdit.date} onChange={(event) => setEventEdit({ ...eventEdit, date: event.target.value })} className="mt-1 w-full rounded-lg border border-[#E7E9F0] px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold text-gray-700">Start time
                  <input required value={eventEdit.startTime} onChange={(event) => setEventEdit({ ...eventEdit, startTime: event.target.value })} className="mt-1 w-full rounded-lg border border-[#E7E9F0] px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold text-gray-700">End time
                  <input required value={eventEdit.endTime} onChange={(event) => setEventEdit({ ...eventEdit, endTime: event.target.value })} className="mt-1 w-full rounded-lg border border-[#E7E9F0] px-3 py-2 text-sm" />
                </label>
                <label className="text-xs font-semibold text-gray-700 sm:col-span-2">Location
                  <input value={eventEdit.location} onChange={(event) => setEventEdit({ ...eventEdit, location: event.target.value })} className="mt-1 w-full rounded-lg border border-[#E7E9F0] px-3 py-2 text-sm" />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setEventEdit(null)} className="rounded-lg border border-[#E7E9F0] px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
                <button type="submit" className="rounded-lg bg-[#F20D24] px-4 py-2 text-sm font-bold text-white hover:bg-red-700">Save Changes</button>
              </div>
            </form>
          </div>
        )}
        {isGuestPinOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="guest-pin-title">
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!selectedEvent || !/^\d{6}$/.test(guestPin)) return;
                setIsSavingGuestPin(true);
                try {
                  await setEventGuestPin(selectedEvent.id, guestPin);
                  setSavedGuestPins((pins) => ({ ...pins, [selectedEvent.id]: guestPin }));
                  setGuestPinStatus({ eventId: selectedEvent.id, hasPin: true, loading: false });
                  notify(`Guest PIN saved for ${selectedEvent.name}.`, 'success');
                  setIsGuestPinOpen(false);
                  setGuestPin('');
                } catch (error) {
                  console.error('Could not save guest PIN:', error);
                  notify(error instanceof Error ? error.message : 'Guest PIN could not be saved.', 'error');
                } finally {
                  setIsSavingGuestPin(false);
                }
              }}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 id="guest-pin-title" className="text-lg font-extrabold text-gray-900">
                    {guestPinStatus?.eventId === selectedEvent.id && guestPinStatus.hasPin
                      ? 'Edit Guest App PIN'
                      : 'Set Guest App PIN'}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">Guests will enter this 6-digit PIN to open {selectedEvent.name}.</p>
                </div>
                <button type="button" onClick={() => setIsGuestPinOpen(false)} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100" aria-label="Close">✕</button>
              </div>
              <label className="block text-xs font-semibold text-gray-700">
                6-digit PIN
                <input
                  autoFocus
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={guestPin}
                  onChange={(event) => setGuestPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6 digits"
                  className="mt-1 w-full rounded-lg border border-[#E7E9F0] px-3 py-3 text-center font-mono text-lg tracking-[0.5em] text-gray-900 focus:border-[#F20D24] focus:outline-none"
                />
              </label>
              <p className="mt-2 text-[11px] text-gray-500">The PIN is stored securely and is never shown in the public event data. Set a new PIN to replace the current one.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" disabled={isSavingGuestPin} onClick={() => setIsGuestPinOpen(false)} className="rounded-lg border border-[#E7E9F0] px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSavingGuestPin || guestPin.length !== 6} className="rounded-lg bg-[#F20D24] px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSavingGuestPin ? 'Saving…' : guestPinStatus?.eventId === selectedEvent.id && guestPinStatus.hasPin ? 'Update PIN' : 'Save PIN'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E9F0] shadow-2xs">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#171717]">Events Management</h2>
          <p className="text-xs md:text-sm text-[#737783] mt-1">
            Create and monitor events, active services, guest links, and photo galleries.
          </p>
        </div>
        <button
          onClick={() => setShowCreateEventModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F20D24] hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-900/20 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E7E9F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by event name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24] text-gray-800"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>Type:</span>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E7E9F0] text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-[#F20D24]"
          >
            <option value="All">All Types</option>
            <option value="Wedding">Wedding</option>
            <option value="Engagement">Engagement</option>
            <option value="Reception">Reception</option>
            <option value="Haldi">Haldi</option>
            <option value="Birthday">Birthday</option>
            <option value="Other">Other</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 ml-2">
            <span>Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E7E9F0] text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-[#F20D24]"
          >
            <option value="All">All Statuses</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FD] border-b border-[#E7E9F0] text-[11px] font-bold text-[#737783] uppercase tracking-wider">
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Services</th>
                <th className="py-3 px-4">Photos</th>
                <th className="py-3 px-4">Live Stream</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E9F0] text-sm">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                    No events found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Event ID */}
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-500">
                      {evt.id}
                    </td>

                    {/* Thumbnail & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={evt.thumbnail}
                          alt={evt.name}
                          className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                        />
                        <div>
                          <p className="font-bold text-[#171717] hover:text-[#F20D24] cursor-pointer transition-colors"
                            onClick={() => {
                              setActiveEventId(evt.id);
                              setEventDetailsId(evt.id);
                            }}
                          >
                            {evt.name}
                          </p>
                          <span className="text-xs text-[#737783] line-clamp-1">{evt.location}</span>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-gray-700">
                      {evt.type}
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{evt.date}</div>
                      <div className="text-[11px] text-gray-400">{evt.startTime} – {evt.endTime}</div>
                    </td>

                    {/* Services enabled icons */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`p-1.5 rounded-md ${
                            evt.services?.aiPhotoSharing ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400 opacity-40'
                          }`}
                          title="AI Photo Sharing"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                        <span
                          className={`p-1.5 rounded-md ${
                            evt.services?.liveStreaming ? 'bg-red-100 text-[#F20D24]' : 'bg-gray-100 text-gray-400 opacity-40'
                          }`}
                          title="Live Streaming"
                        >
                          <Radio className="w-3.5 h-3.5" />
                        </span>
                        <span
                          className={`p-1.5 rounded-md ${
                            evt.services?.highlights ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 opacity-40'
                          }`}
                          title="Highlights"
                        >
                          <Film className="w-3.5 h-3.5" />
                        </span>
                        <span
                          className={`p-1.5 rounded-md ${
                            evt.services?.guestWebsite ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400 opacity-40'
                          }`}
                          title="Guest Website"
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </td>

                    {/* Photos Count */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {evt.photosCount.toLocaleString()}
                    </td>

                    {/* Live Stream Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {evt.liveStreamStatus === 'live' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-[#F20D24] border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F20D24] live-dot" />
                          Live
                        </span>
                      )}
                      {evt.liveStreamStatus === 'upcoming' && (
                        <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Upcoming
                        </span>
                      )}
                      {evt.liveStreamStatus === 'completed' && (
                        <span className="text-xs text-gray-500 font-medium">Completed</span>
                      )}
                      {evt.liveStreamStatus === 'none' && (
                        <span className="text-xs text-gray-400">–</span>
                      )}
                    </td>

                    {/* Event Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {evt.status === 'Ongoing' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ongoing
                        </span>
                      )}
                      {evt.status === 'Active' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Active
                        </span>
                      )}
                      {evt.status === 'Completed' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          Completed
                        </span>
                      )}
                    </td>

                    {/* Actions: View, Edit, Duplicate, Delete */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setActiveEventId(evt.id);
                            setEventDetailsId(evt.id);
                          }}
                          className="p-1.5 text-gray-500 hover:text-[#F20D24] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="View Event Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setActiveEventId(evt.id);
                            setShowGuestPreviewModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Open Guest Website"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => duplicateEvent(evt.id)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Duplicate Event"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(evt.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-gray-900">Delete Event?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete this event? All associated photos, stream configurations, and guest links will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteEvent(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-900/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
