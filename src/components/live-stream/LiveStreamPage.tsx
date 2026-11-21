import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { httpsCallable } from 'firebase/functions';
import { useStudio } from '../../context/StudioContext';
import { BuyHoursModal } from './BuyHoursModal';
import { functions } from '../../Firebase';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  MapPin,
  Plus,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Square,
  Video,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';

type MuxStatus = 'idle' | 'starting' | 'live' | 'stopping' | 'disabled' | 'unknown';

interface StudioPlaybackResponse {
  success?: boolean;
  status?: string;
  playbackUrl?: string | null;
  expiresAt?: number;
}

interface MuxCredentials {
  success?: boolean;
  muxStreamId?: string;
  playbackId?: string;
  streamKey?: string;
  rtmpUrl?: string;
  rtmpsUrl?: string;
  quality?: string;
  status?: string;
}

const getErrorMessage = (error: unknown) => {
  const value = error as { message?: string; code?: string };
  return value?.message?.replace(/^FirebaseError:\s*/, '') || 'Something went wrong. Please try again.';
};

const normalizeStatus = (value?: string): MuxStatus => {
  const status = (value || '').toLowerCase();
  if (status === 'live' || status === 'active') return 'live';
  if (status === 'starting' || status === 'idle' || status === 'upcoming') return 'starting';
  if (status === 'stopping') return 'stopping';
  if (status === 'disabled' || status === 'quota_exhausted') return 'disabled';
  return 'unknown';
};

export const LiveStreamPage: React.FC = () => {
  const {
    events,
    activeEventId,
    setActiveEventId,
    showBuyHoursModal,
    setShowBuyHoursModal,
    setShowCreateEventModal,
    setShowGuestPreviewModal,
    notify,
    setActiveTab: setNavigationTab,
    setEventDetailsId,
  } = useStudio();

  const [eventSearch, setEventSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [credentials, setCredentials] = useState<MuxCredentials | null>(null);
  const [status, setStatus] = useState<MuxStatus>('unknown');
  const [busy, setBusy] = useState<'create' | 'refresh' | 'stop' | 'enable' | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<'rtmp' | 'key' | null>(null);
  const [loadError, setLoadError] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showObsPreview, setShowObsPreview] = useState(false);
  const [previewVideoReady, setPreviewVideoReady] = useState(false);
  const [previewVideoPlaying, setPreviewVideoPlaying] = useState(false);
  const [quotaClockMs, setQuotaClockMs] = useState(Date.now());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const promptedQuotaEventRef = useRef('');

  const selectedEvent = events.find((event) => event.id === activeEventId) || events[0];

  const streamQuota = selectedEvent?.streamQuota;
  const purchasedHours = Number(streamQuota?.purchasedHours || 0);
  const storedConsumedSeconds = Math.max(0, Number(streamQuota?.consumedSeconds ?? Number(streamQuota?.consumedMinutes || 0) * 60));
  const liveStartedAtMs = Number(selectedEvent?.liveStreamStartedAtMs || 0);
  const activeElapsedSeconds = selectedEvent?.liveStreamStatus === 'live' && liveStartedAtMs > 0
    ? Math.max(0, Math.floor((quotaClockMs - liveStartedAtMs) / 1000))
    : 0;
  const quotaLimitSeconds = Math.floor(purchasedHours * 3600);
  const consumedSeconds = quotaLimitSeconds > 0
    ? Math.min(quotaLimitSeconds, storedConsumedSeconds + activeElapsedSeconds)
    : storedConsumedSeconds;
  const remainingSeconds = Math.max(0, quotaLimitSeconds - consumedSeconds);
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  const formatDuration = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s`;
  const consumedHoursLabel = formatDuration(consumedSeconds);
  const remainingLabel = formatDuration(remainingSeconds);
  const quotaPercent = purchasedHours > 0
    ? Math.min(100, (consumedSeconds / quotaLimitSeconds) * 100)
    : 0;
  const quotaExhausted = purchasedHours > 0 && remainingSeconds < 60;

  useEffect(() => {
    const timer = window.setInterval(() => setQuotaClockMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    if (promptedQuotaEventRef.current && promptedQuotaEventRef.current !== selectedEvent.id) {
      promptedQuotaEventRef.current = '';
    }
    if (!quotaExhausted) {
      if (promptedQuotaEventRef.current === selectedEvent.id) promptedQuotaEventRef.current = '';
      return;
    }
    if (!credentials?.muxStreamId || selectedEvent.liveStreamStatus === 'live') return;
    if (promptedQuotaEventRef.current !== selectedEvent.id) {
      promptedQuotaEventRef.current = selectedEvent.id;
      setShowBuyHoursModal(true);
      notify('Livestream time is used up. Purchase more hours to continue broadcasting.', 'info');
    }
  }, [selectedEvent?.id, selectedEvent?.liveStreamStatus, credentials?.muxStreamId, quotaExhausted]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesSearch = (event.name || '').toLowerCase().includes(eventSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (eventFilter === 'live') return event.liveStreamStatus === 'live';
    if (eventFilter === 'upcoming') return event.liveStreamStatus === 'upcoming' || event.liveStreamStatus === 'none';
    if (eventFilter === 'completed') return event.liveStreamStatus === 'completed' || event.status === 'Completed';
    return true;
  }), [events, eventSearch, eventFilter]);

  const refreshCredentials = useCallback(async (quiet = false) => {
    if (!selectedEvent?.id) return;
    if (!quiet) setBusy('refresh');
    try {
      const callable = httpsCallable<{ eventId: string }, MuxCredentials>(functions, 'getMuxStreamCredentials');
      const result = await callable({ eventId: selectedEvent.id });
      const data = result.data;
      setCredentials(data);
      setStatus(normalizeStatus(data.status));
      setLoadError('');
    } catch (error) {
      // A stream that has not been provisioned yet is a normal first-use state.
      setCredentials(null);
      setStatus('unknown');
      const message = getErrorMessage(error);
      if (!/not-found|not found|does not exist|no mux/i.test(message)) {
        setLoadError(message);
      } else {
        setLoadError('');
      }
    } finally {
      if (!quiet) setBusy(null);
    }
  }, [selectedEvent?.id]);

  useEffect(() => {
    setCredentials(null);
    setStatus('unknown');
    setLoadError('');
    if (!selectedEvent?.id) return;
    void refreshCredentials(true);
  }, [selectedEvent?.id, refreshCredentials]);

  // Refresh Mux's server-side state; never infer "Live" from a local button click.
  useEffect(() => {
    if (!selectedEvent?.id) return;
    const timer = window.setInterval(() => {
      void refreshCredentials(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [selectedEvent?.id, refreshCredentials]);

  // Ask the owner-authorized backend for playback state whenever this event has a stream.
  // The callable returns a URL only after Mux reports the stream as live.
  const refreshStudioPlayback = useCallback(async (quiet = false) => {
    if (!selectedEvent?.id || !credentials?.muxStreamId) {
      setPlaybackUrl('');
      setPlaybackError('');
      return;
    }
    if (!quiet) setPlaybackLoading(true);
    try {
      const callable = httpsCallable<{ eventId: string }, StudioPlaybackResponse>(
        functions,
        'getStudioMuxPlaybackToken',
      );
      const result = await callable({ eventId: selectedEvent.id });
      if (result.data.success && result.data.playbackUrl) {
        setPlaybackUrl(result.data.playbackUrl);
        setPlaybackError('');
      } else {
        setPlaybackUrl('');
        setPlaybackError(`Mux stream status is "${result.data.status || 'unknown'}"; preview is available when it is live.`);
      }
    } catch (error) {
      setPlaybackUrl('');
      setPlaybackError(getErrorMessage(error));
    } finally {
      if (!quiet) setPlaybackLoading(false);
    }
  }, [selectedEvent?.id, credentials?.muxStreamId]);

  useEffect(() => {
    setPlaybackUrl('');
    setPlaybackError('');
    if (!selectedEvent?.id || !credentials?.muxStreamId) return;
    void refreshStudioPlayback();
    if (status !== 'live') return;
    // Renew the signed playback URL periodically before it expires.
    const timer = window.setInterval(() => void refreshStudioPlayback(true), 3 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [selectedEvent?.id, credentials?.muxStreamId, status, refreshStudioPlayback]);

  // Attach HLS playback to the monitor. Safari can play HLS natively; other
  // browsers use hls.js. This does not expose the private ingest stream key.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl || status !== 'live') return;

    let hls: Hls | null = null;
    let cancelled = false;
    let mediaRecoveryAttempts = 0;
    let nativeMetadataHandler: (() => void) | null = null;
    setPlaybackError('');
    setIsVideoPlaying(false);
    setIsVideoReady(false);

    const startPlayback = async () => {
      if (cancelled) return;
      video.muted = true;
      video.playsInline = true;
      try {
        await video.play();
        if (!cancelled) {
          setIsVideoPlaying(true);
          setPlaybackError('');
        }
      } catch (error) {
        if (!cancelled) {
          console.info('Studio video autoplay requires a user gesture:', error);
          setIsVideoPlaying(false);
        }
      }
    };

    if (Hls.isSupported()) {
      console.info('Using HLS.js for Studio Mux playback');
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 4,
      });
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        if (!cancelled) hls?.loadSource(playbackUrl);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        console.info('Studio Mux HLS manifest parsed successfully');
        setIsVideoReady(true);
        void startPlayback();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled) return;
        const httpStatus = data.response?.code;
        console.error('Studio Mux HLS playback error:', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          status: httpStatus,
          reason: data.reason,
          url: data.url ? data.url.split('?')[0] : undefined,
        });
        if (httpStatus === 401 || httpStatus === 403) {
          setPlaybackError('Mux rejected the signed playback URL. Refresh the preview to request a new URL.');
          return;
        }
        if (httpStatus === 404) {
          setPlaybackError('Mux has not published a playable video segment yet. Retry the preview shortly.');
          return;
        }
        if (!data.fatal || cancelled) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 2) {
          mediaRecoveryAttempts += 1;
          hls?.recoverMediaError();
        } else setPlaybackError(`Live playback failed (${data.details || data.type}). Refresh the monitor to retry.`);
      });
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.info('Using native HLS for Studio Mux playback');
      nativeMetadataHandler = () => {
        if (cancelled) return;
        setIsVideoReady(true);
        void startPlayback();
      };
      video.addEventListener('loadedmetadata', nativeMetadataHandler, { once: true });
      video.src = playbackUrl;
      video.load();
    } else {
      setPlaybackError('This browser does not support HLS playback. Try the latest Chrome, Edge or Safari.');
    }

    return () => {
      cancelled = true;
      if (nativeMetadataHandler) video.removeEventListener('loadedmetadata', nativeMetadataHandler);
      if (hls) hls.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [playbackUrl, status]);

  // The dedicated preview page has its own player so navigating to it does not
  // interrupt the small monitor on the controls page.
  useEffect(() => {
    const video = previewVideoRef.current;
    if (!showObsPreview || !video || !playbackUrl || status !== 'live') return;
    let hls: Hls | null = null;
    let cancelled = false;
    let mediaRecoveryAttempts = 0;
    let nativeMetadataHandler: (() => void) | null = null;
    setPreviewVideoPlaying(false);
    setPreviewVideoReady(false);

    const startPlayback = async () => {
      if (cancelled) return;
      video.muted = true;
      video.playsInline = true;
      try {
        await video.play();
        if (!cancelled) setPreviewVideoPlaying(true);
      } catch (error) {
        if (!cancelled) console.info('Studio preview autoplay requires a user gesture:', error);
      }
    };

    if (Hls.isSupported()) {
      console.info('Using HLS.js for Studio OBS preview');
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 4,
      });
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        if (!cancelled) hls?.loadSource(playbackUrl);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        console.info('Studio OBS preview HLS manifest parsed successfully');
        setPreviewVideoReady(true);
        void startPlayback();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled) return;
        const httpStatus = data.response?.code;
        console.error('Studio Mux HLS preview error:', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          status: httpStatus,
          reason: data.reason,
          url: data.url ? data.url.split('?')[0] : undefined,
        });
        if (httpStatus === 401 || httpStatus === 403) {
          setPlaybackError('Mux rejected the signed playback URL. Refresh the preview to request a new URL.');
          return;
        }
        if (httpStatus === 404) {
          setPlaybackError('Mux has not published a playable video segment yet. Retry the preview shortly.');
          return;
        }
        if (!data.fatal || cancelled) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 2) {
          mediaRecoveryAttempts += 1;
          hls?.recoverMediaError();
        } else setPlaybackError(`Live playback failed (${data.details || data.type}). Refresh the preview to retry.`);
      });
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.info('Using native HLS for Studio OBS preview');
      nativeMetadataHandler = () => {
        if (cancelled) return;
        setPreviewVideoReady(true);
        void startPlayback();
      };
      video.addEventListener('loadedmetadata', nativeMetadataHandler, { once: true });
      video.src = playbackUrl;
      video.load();
    } else {
      setPlaybackError('This browser does not support HLS playback. Try the latest Chrome, Edge or Safari.');
    }

    return () => {
      cancelled = true;
      if (nativeMetadataHandler) video.removeEventListener('loadedmetadata', nativeMetadataHandler);
      if (hls) hls.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [showObsPreview, playbackUrl, status]);

  const copyValue = async (value: string | undefined, label: string, kind: 'rtmp' | 'key') => {
    if (!value) {
      notify(`${label} is not available yet.`, 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
      notify(`${label} copied.`, 'success');
    } catch {
      notify(`Could not copy ${label.toLowerCase()}. Please copy it manually.`, 'error');
    }
  };

  const createStream = async () => {
    if (!selectedEvent) return;
    if (remainingMinutes < 60) {
      notify('At least 1 hour of streaming quota is required. Please buy extra hours.', 'error');
      setShowBuyHoursModal(true);
      return;
    }

    setBusy('create');
    setLoadError('');
    try {
      const callable = httpsCallable<{ eventId: string }, MuxCredentials>(functions, 'createMuxLiveStream');
      const result = await callable({ eventId: selectedEvent.id });
      setCredentials(result.data);
      setStatus(normalizeStatus(result.data.status));
      notify('Mux stream created. Copy the RTMPS details into your encoder.', 'success');
      // Fetch the canonical saved credentials after creation.
      await refreshCredentials(true);
    } catch (error) {
      const message = getErrorMessage(error);
      setLoadError(message);
      notify(message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const stopStream = async () => {
    if (!selectedEvent) return;
    const confirmed = window.confirm('Stop this live stream? This will disconnect the encoder and end guest playback. You can enable the stream again later.');
    if (!confirmed) return;

    setBusy('stop');
    try {
      const callable = httpsCallable<{ eventId: string }, { success?: boolean; status?: string }>(
        functions,
        'stopMuxLiveStream',
      );
      const result = await callable({ eventId: selectedEvent.id });
      setStatus(normalizeStatus(result.data.status));
      notify('Mux stream stopped. Enable it again when you are ready to broadcast.', 'success');
      await refreshCredentials(true);
    } catch (error) {
      const message = getErrorMessage(error);
      setLoadError(message);
      notify(message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const enableStream = async () => {
    if (!selectedEvent) return;

    setBusy('enable');
    setLoadError('');
    try {
      const callable = httpsCallable<{ eventId: string }, { success?: boolean; status?: string }>(
        functions,
        'enableMuxLiveStream',
      );
      const result = await callable({ eventId: selectedEvent.id });
      setStatus(normalizeStatus(result.data.status));
      notify('Mux stream enabled. Your encoder can connect now.', 'success');
      await refreshCredentials(true);
    } catch (error) {
      const message = getErrorMessage(error);
      setLoadError(message);
      notify(message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!selectedEvent) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#F20D24]">
          <Video className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">No events yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Create a wedding event first. You can then provision a secure Mux stream for that event.
        </p>
        <button
          onClick={() => setShowCreateEventModal(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F20D24] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> Create Event
        </button>
      </div>
    );
  }

  if (!selectedEvent.services?.liveStreaming) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-9 text-center shadow-sm">
        <LockKeyhole className="mx-auto h-10 w-10 text-[#F20D24]" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Live Streaming is not enabled</h2>
        <p className="mt-2 text-sm text-slate-500">
          Purchase Live Streaming for {selectedEvent.name} from its event services.
        </p>
        <button
          onClick={() => {
            setEventDetailsId(selectedEvent.id);
            setNavigationTab('events');
          }}
          className="mt-5 rounded-xl bg-[#F20D24] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
        >
          View Event Services
        </button>
      </div>
    );
  }

  const statusLabel = status === 'live'
    ? 'Live now'
    : status === 'starting'
      ? 'Waiting for encoder'
      : status === 'stopping'
        ? 'Stopping'
        : status === 'disabled'
          ? 'Stream disabled'
          : 'Not configured';

  if (showObsPreview) {
    return (
      <div className="space-y-5 pb-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => setShowObsPreview(false)} className="font-semibold text-slate-500 hover:text-slate-900">Live Stream</button>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900">OBS Preview</span>
        </nav>
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-white sm:px-7">
            <div>
              <h1 className="text-lg font-black">OBS Live Preview</h1>
              <p className="mt-1 text-sm text-slate-400">{selectedEvent.name} · Preview of the feed received from OBS</p>
            </div>
            <button type="button" onClick={() => setShowObsPreview(false)} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" /> Back to controls
            </button>
          </div>
          <div className="p-3 sm:p-6">
            <div className="relative mx-auto aspect-video w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-black">
              {status === 'live' && playbackUrl ? (
                <>
                <video ref={previewVideoRef} className="h-full w-full bg-black object-contain" controls playsInline muted autoPlay preload="auto" onCanPlay={() => setPreviewVideoReady(true)} onLoadedData={() => setPreviewVideoReady(true)} onPlay={() => setPreviewVideoPlaying(true)} onPlaying={() => { setPreviewVideoPlaying(true); setPreviewVideoReady(true); setPlaybackError(''); }} onPause={() => setPreviewVideoPlaying(false)} onError={() => setPlaybackError('The video player could not load the HLS feed. Check the playback URL and Mux playback status.')} aria-label={`OBS live preview for ${selectedEvent.name}`} />
                  {!previewVideoPlaying && previewVideoReady && <button type="button" onClick={async () => { const video = previewVideoRef.current; if (!video) return; try { await video.play(); } catch { setPlaybackError('Preview could not start. Check that Mux has finished preparing the live playback feed.'); } }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 text-white hover:bg-black/45" aria-label="Play OBS live preview"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F20D24]"><Play className="ml-1 h-7 w-7 fill-current" /></span><span className="rounded-full bg-black/70 px-4 py-2 text-sm font-bold">Play live preview</span></button>}
                  {!previewVideoPlaying && !previewVideoReady && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 text-white" role="status" aria-live="polite"><Loader2 className="h-10 w-10 animate-spin" /><span className="rounded-full bg-black/70 px-4 py-2 text-sm font-bold">Preparing live video…</span></div>}
                  <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-black tracking-widest text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE</span>
                  {playbackError && <div className="absolute inset-x-4 bottom-14 flex items-center justify-between gap-3 rounded-lg bg-black/85 p-3 text-sm text-amber-200"><span>{playbackError}</span><button type="button" onClick={() => void refreshStudioPlayback()} className="shrink-0 rounded-lg bg-[#F20D24] px-3 py-2 text-xs font-bold text-white">Retry</button></div>}
                </>
              ) : <div className="flex h-full flex-col items-center justify-center px-5 text-center text-white"><WifiOff className="h-12 w-12 text-slate-500" /><p className="mt-4 text-lg font-bold">{status === 'live' || playbackLoading ? 'Preparing live preview…' : status === 'disabled' ? 'Stream is disabled' : 'Waiting for OBS to connect'}</p><p className="mt-2 max-w-md text-sm text-slate-400">{playbackError || (status === 'live' ? 'Mux detected the encoder and is preparing playback.' : 'Start streaming from OBS. The preview will appear here when the feed is live.')}</p>{status === 'live' && <button onClick={() => void refreshStudioPlayback()} className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">Retry preview</button>}</div>}
            </div>
            <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between text-xs text-slate-400"><span>Stream status: <strong className="text-white">{statusLabel}</strong></span><span>Provider: Mux</span></div>
          </div>
        </section>
      </div>
    );
  }

  const statusClass = status === 'live'
    ? 'bg-red-50 text-red-700 border-red-200'
    : status === 'stopping'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="space-y-6 pb-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <span className="font-bold text-slate-900">Live Stream</span>
        <span className="text-slate-300">/</span>
        <button type="button" onClick={() => setShowObsPreview(true)} className="font-semibold text-[#D7192D] hover:underline">OBS Preview</button>
      </nav>
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#F20D24]">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">Live Streaming</h1>
            <p className="mt-0.5 text-sm text-slate-500">Mux broadcast control centre</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowGuestPreviewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" /> Guest Preview
          </button>
          <button
            onClick={() => setShowCreateEventModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" /> Create Event
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Your Events</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{events.length}</span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={eventSearch}
              onChange={(event) => setEventSearch(event.target.value)}
              placeholder="Search events..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(['all', 'live', 'upcoming', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setEventFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                  eventFilter === filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {filteredEvents.map((event) => (
              <button
                type="button"
                key={event.id}
                onClick={() => setActiveEventId(event.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  event.id === selectedEvent.id
                    ? 'border-red-300 bg-red-50/60 ring-1 ring-red-100'
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {event.thumbnail ? (
                  <img src={event.thumbnail} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{event.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{event.date || 'Date not set'}</span>
                </span>
                {event.liveStreamStatus === 'live' && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
              </button>
            ))}
            {filteredEvents.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">No matching events.</p>
            )}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
            <div className="flex min-w-0 items-center gap-4">
              {selectedEvent.thumbnail ? (
                <img src={selectedEvent.thumbnail} alt="" className="h-16 w-16 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"><Video className="h-6 w-6 text-slate-400" /></div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected wedding</p>
                <h2 className="truncate text-lg font-black text-slate-900">{selectedEvent.name}</h2>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{selectedEvent.date || 'Date not set'}</span>
                  {selectedEvent.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selectedEvent.location}</span>}
                </div>
              </div>
            </div>
            <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold ${statusClass}`}>
              <span className={`h-2 w-2 rounded-full ${status === 'live' ? 'animate-pulse bg-red-600' : 'bg-current opacity-60'}`} />
              {statusLabel}
            </span>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500"><Clock3 className="h-4 w-4" /><span className="text-xs font-semibold">Purchased quota</span></div>
              <p className="mt-2 text-2xl font-black text-slate-900">{purchasedHours} <span className="text-sm font-semibold text-slate-500">hours</span></p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500"><Activity className="h-4 w-4" /><span className="text-xs font-semibold">Consumed</span></div>
              <p className="mt-2 text-2xl font-black text-slate-900">{consumedHoursLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500"><Wallet className="h-4 w-4" /><span className="text-xs font-semibold">Remaining</span></div>
              <p className="mt-2 text-2xl font-black text-emerald-700">{remainingLabel}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-extrabold text-slate-900">Streaming quota</h3>
                <p className="mt-1 text-xs text-slate-500">Usage updates live while the broadcast is active.</p>
              </div>
              <button
                onClick={() => setShowBuyHoursModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-[#D7192D] hover:bg-red-100"
              >
                <Plus className="h-4 w-4" /> Buy Extra Hours
              </button>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#F20D24] transition-all" style={{ width: `${quotaPercent}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>{Math.round(quotaPercent)}% used</span>
              <span>{remainingMinutes} minutes remaining</span>
            </div>
            {quotaExhausted && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <span className="font-semibold">No usable livestream time remains. Buy more hours to continue broadcasting.</span>
                <button type="button" onClick={() => setShowBuyHoursModal(true)} className="rounded-lg bg-[#F20D24] px-3 py-2 font-bold text-white hover:bg-red-700">Purchase hours</button>
              </div>
            )}
            {purchasedHours === 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
                <CircleAlert className="h-4 w-4 shrink-0" /> No streaming hours are assigned to this event yet.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-extrabold text-slate-900">Mux encoder connection</h3>
                <p className="mt-1 text-xs text-slate-500">Provision secure ingest credentials for OBS, vMix or ATEM.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void refreshCredentials()}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === 'refresh' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh status
                </button>
                {remainingSeconds < 60 ? (
                  <button
                    onClick={() => setShowBuyHoursModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-red-700"
                  >
                    <Plus className="h-4 w-4" /> Buy hours to continue
                  </button>
                ) : !credentials?.muxStreamId ? (
                  <button
                    onClick={() => void createStream()}
                    disabled={busy !== null || remainingMinutes < 60}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create Mux Stream
                  </button>
                ) : status === 'disabled' || status === 'starting' ? (
                  <button
                    onClick={() => void enableStream()}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {busy === 'enable' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                    {status === 'disabled' ? 'Enable stream' : 'Continue stream'}
                  </button>
                ) : (
                  <button
                    onClick={() => void stopStream()}
                    disabled={busy !== null || status === 'stopping'}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-black disabled:opacity-50"
                  >
                    {busy === 'stop' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current" />}
                    Stop stream
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1.1fr_.9fr]">
              <div className="space-y-4">
                {loadError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {loadError}
                  </div>
                )}
                {!credentials?.muxStreamId ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <Server className="mx-auto h-8 w-8 text-slate-400" />
                    <h4 className="mt-3 font-bold text-slate-800">No Mux stream provisioned</h4>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                      Create a stream to generate a private stream key. The key is retrieved securely from Firebase when you need it.
                    </p>
                    {remainingMinutes < 60 && (
                      <button onClick={() => setShowBuyHoursModal(true)} className="mt-4 text-xs font-bold text-[#D7192D] underline">
                        Purchase streaming hours
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">RTMPS ingest URL</label>
                      <div className="flex gap-2">
                        <input readOnly value={credentials.rtmpsUrl || credentials.rtmpUrl || ''} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-xs text-slate-700" />
                        <button onClick={() => void copyValue(credentials.rtmpsUrl || credentials.rtmpUrl, 'RTMPS URL', 'rtmp')} className="rounded-xl border border-slate-200 px-3 text-slate-600 hover:bg-slate-50" title="Copy ingest URL">
                          {copied === 'rtmp' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-600">Stream key</label>
                        <button onClick={() => setShowKey((value) => !value)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
                          {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {showKey ? 'Hide key' : 'Reveal key'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input readOnly type={showKey ? 'text' : 'password'} value={credentials.streamKey || ''} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-xs text-slate-700" />
                        <button onClick={() => void copyValue(credentials.streamKey, 'Stream key', 'key')} className="rounded-xl border border-slate-200 px-3 text-slate-600 hover:bg-slate-50" title="Copy stream key">
                          {copied === 'key' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-amber-700">Keep this key private. Anyone with it can broadcast to this event.</p>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      Credentials are fetched through the authenticated studio callable; they are not stored in browser local storage by this page.
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-2xl bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold"><Wifi className="h-4 w-4 text-emerald-400" /> Broadcast monitor</div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${status === 'live' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-slate-300'}`}>{statusLabel}</span>
                </div>
                <div className="relative mt-6 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                  {status === 'live' && playbackUrl ? (
                    <>
                      <video
                        ref={videoRef}
                        className="h-full w-full bg-black object-contain"
                        controls
                        playsInline
                        muted
                        autoPlay
                        preload="auto"
                        onPlay={() => setIsVideoPlaying(true)}
                        onCanPlay={() => setIsVideoReady(true)}
                        onLoadedData={() => setIsVideoReady(true)}
                        onPlaying={() => { setIsVideoPlaying(true); setIsVideoReady(true); setPlaybackError(''); }}
                        onPause={() => setIsVideoPlaying(false)}
                        onWaiting={() => setIsVideoReady(false)}
                        onError={() => setPlaybackError('The video player could not load the HLS feed. Check the playback URL and Mux playback status.')}
                        aria-label={`Live broadcast monitor for ${selectedEvent.name}`}
                      />
                      {!isVideoPlaying && isVideoReady && (
                        <button
                          type="button"
                          onClick={async () => {
                            const video = videoRef.current;
                            if (!video) return;
                            setPlaybackError('');
                            try {
                              await video.play();
                            } catch {
                              setPlaybackError('Preview could not start. Check that Mux has finished preparing the live playback feed.');
                            }
                          }}
                          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/35 text-white transition hover:bg-black/45 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                          aria-label="Play live preview"
                        >
                          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F20D24] shadow-xl ring-4 ring-white/20">
                            <Play className="ml-1 h-7 w-7 fill-current" />
                          </span>
                          <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-bold">{isVideoReady ? 'Play live preview' : 'Start preview'}</span>
                        </button>
                      )}
                      {!isVideoPlaying && !isVideoReady && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/35 text-white" role="status" aria-live="polite">
                          <Loader2 className="h-9 w-9 animate-spin" />
                          <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-bold">Preparing live video…</span>
                        </div>
                      )}
                      <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black tracking-widest text-white shadow">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                      </span>
                      {playbackError && (
                        <div className="absolute inset-x-3 bottom-12 z-20 flex items-center justify-between gap-2 rounded-lg bg-black/85 p-2 text-xs text-amber-200" role="status" aria-live="polite">
                          <span>{playbackError}</span>
                          <button type="button" onClick={() => void refreshStudioPlayback()} className="shrink-0 rounded bg-[#F20D24] px-2.5 py-1.5 font-bold text-white">Retry</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                      {status === 'live' || playbackLoading ? (
                        <Loader2 className="h-9 w-9 animate-spin text-sky-300" />
                      ) : (
                        <WifiOff className="h-10 w-10 text-slate-500" />
                      )}
                      <p className="mt-3 text-sm font-bold">
                        {status === 'live' ? (playbackLoading ? 'Connecting to live preview…' : 'Preparing live preview…') : status === 'stopping' ? 'Mux is stopping the stream' : status === 'disabled' ? 'Stream disabled in Mux' : 'Waiting for encoder connection'}
                      </p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                        {playbackError || (status === 'live' ? 'Mux has detected the encoder. The live preview is being prepared.' : status === 'disabled' ? 'Enable the stream before reconnecting OBS or vMix.' : 'Start streaming from OBS or vMix after entering the ingest URL and stream key.')}
                      </p>
                      {status === 'live' && (
                        <button onClick={() => void refreshStudioPlayback()} className="mt-3 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10">
                          Retry preview
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Provider</p>
                    <p className="mt-1 text-sm font-bold">Mux</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ingest quality</p>
                    <p className="mt-1 text-sm font-bold">{credentials?.quality || 'Set by Mux'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-900">Encoder setup</h3>
            <p className="mt-1 text-xs text-slate-500">Use these settings in OBS Studio, vMix or a compatible hardware encoder.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Service', 'Custom'],
                ['Server', 'Paste the Mux RTMPS URL'],
                ['Stream key', 'Paste the private Mux key'],
                ['Video codec', 'H.264'],
                ['Rate control', 'CBR'],
                ['Keyframe interval', '2 seconds'],
                ['Audio codec', 'AAC'],
                ['Audio sample rate', '48 kHz'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 text-xs font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <BuyHoursModal
        isOpen={showBuyHoursModal}
        onClose={() => setShowBuyHoursModal(false)}
        eventId={selectedEvent.id}
      />
    </div>
  );
};
