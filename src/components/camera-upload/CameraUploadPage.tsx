import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  AlertCircle,
  Cable,
  Camera,
  CheckCircle2,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Wifi,
  Copy,
  Ban,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { auth } from '../../Firebase';
import {
  CameraAgentDevice,
  createCameraAgentPairingCode,
  revokeCameraAgent,
  watchCameraAgents,
} from '../../services/cameraAgentService';

type TransferMethod = 'ftp' | 'folder' | 'usb' | 'sd-card';

const transferMethods = [
  {
    id: 'ftp' as const,
    title: 'FTP / Wi-Fi',
    description: 'Receive photos directly from supported cameras over your studio network.',
    icon: Wifi,
  },
  {
    id: 'folder' as const,
    title: 'Folder Watcher',
    description: 'Automatically detect photos saved by camera companion or tethering software.',
    icon: FolderOpen,
  },
  {
    id: 'usb' as const,
    title: 'USB Tethering',
    description: 'Import photos from a camera connected to your computer through supported software.',
    icon: Cable,
  },
  {
    id: 'sd-card' as const,
    title: 'SD Card Import',
    description: 'Automatically detect or manually import photos from an SD card folder.',
    icon: HardDrive,
  },
];

export const CameraUploadPage: React.FC = () => {
  const { events, activeEventId, activeEvent, setActiveEventId, notify } = useStudio();
  const [method, setMethod] = useState<TransferMethod>('folder');
  const [studioUid, setStudioUid] = useState('');
  const [devices, setDevices] = useState<CameraAgentDevice[]>([]);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: number } | null>(null);
  const [pairingSeconds, setPairingSeconds] = useState(0);
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState('');
  const [deviceError, setDeviceError] = useState('');

  const selectedEvent = events.find((event) => event.id === activeEventId)
    || activeEvent
    || events[0];
  const selectedMethod = transferMethods.find((item) => item.id === method)!;
  const MethodIcon = selectedMethod.icon;
  const activeDevices = devices.filter((device) => device.status === 'active');

  useEffect(() => onAuthStateChanged(auth, (user) => setStudioUid(user?.uid || '')), []);

  useEffect(() => {
    if (!studioUid) return;
    setDeviceError('');
    return watchCameraAgents(studioUid, setDevices, (error) => {
      console.error('Could not load paired camera agents.', error);
      setDeviceError('Could not load paired camera agents. Refresh the page and try again.');
    });
  }, [studioUid]);

  useEffect(() => {
    if (!pairing) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((pairing.expiresAt - Date.now()) / 1000));
      setPairingSeconds(remaining);
      if (remaining === 0) setPairing(null);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [pairing]);

  const handleCreatePairingCode = async () => {
    setIsCreatingCode(true);
    setDeviceError('');
    try {
      const result = await createCameraAgentPairingCode();
      setPairing({ code: result.pairingCode, expiresAt: result.expiresAt });
      notify('One-time camera pairing code created.', 'success');
    } catch (error) {
      console.error('Could not create a camera pairing code.', error);
      setDeviceError('Could not create a pairing code. Confirm that the Functions deployment is current and try again.');
      notify('Could not create a camera pairing code.', 'error');
    } finally {
      setIsCreatingCode(false);
    }
  };

  const handleCopyPairingCode = async () => {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.code);
      notify('Pairing code copied.', 'success');
    } catch {
      notify('Could not copy the pairing code. Select and copy it manually.', 'error');
    }
  };

  const handleRevokeDevice = async (device: CameraAgentDevice) => {
    if (!window.confirm(`Revoke camera access for “${device.deviceName}”?`)) return;
    setRevokingDeviceId(device.deviceId);
    setDeviceError('');
    try {
      await revokeCameraAgent(device.deviceId);
      notify(`${device.deviceName} was revoked.`, 'success');
    } catch (error) {
      console.error('Could not revoke camera agent.', error);
      setDeviceError('Could not revoke this device. Try again.');
      notify('Could not revoke the camera agent.', 'error');
    } finally {
      setRevokingDeviceId('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
            <Camera size={17} />
            ON AIR AUTOMATION
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Camera Upload</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automatically transfer wedding photos into your ON AIR event.
          </p>
        </div>

        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${activeDevices.length > 0
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          <span className={`h-2 w-2 rounded-full ${activeDevices.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {activeDevices.length > 0 ? `${activeDevices.length} paired device${activeDevices.length === 1 ? '' : 's'}` : 'Agent not connected'}
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Select wedding event</h2>
            <p className="mt-1 text-sm text-gray-500">Incoming photos will be assigned to this event.</p>
          </div>
          <div className="w-full sm:max-w-sm">
            <select
              aria-label="Select wedding event"
              value={selectedEvent?.id || ''}
              onChange={(event) => setActiveEventId(event.target.value)}
              disabled={events.length === 0}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
            >
              {events.length === 0 ? (
                <option value="">No events available</option>
              ) : (
                events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)
              )}
            </select>
          </div>
        </div>

        {selectedEvent && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-3 text-sm">
            <span className="font-medium text-gray-800">{selectedEvent.name}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">
              {selectedEvent.services?.aiPhotoSharing
                ? 'AI Photo Sharing enabled on event'
                : 'AI Photo Sharing not enabled on event'}
            </span>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Choose transfer method</h2>
          <p className="mt-1 text-sm text-gray-500">
            Different studios can use different camera transfer methods.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {transferMethods.map((item) => {
            const Icon = item.icon;
            const active = method === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setMethod(item.id)}
                className={`relative rounded-2xl border p-5 text-left transition ${active
                  ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-100'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {active && <CheckCircle2 size={19} className="absolute right-4 top-4 text-blue-600" />}
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${active
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
                }`}>
                  <Icon size={22} />
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <MethodIcon size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{selectedMethod.title} setup</h2>
              <p className="text-sm text-gray-500">Connect your studio computer to ON AIR.</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${activeDevices.length > 0
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
          }`}>
            <AlertCircle className={`shrink-0 ${activeDevices.length > 0 ? 'text-emerald-600' : 'text-amber-600'}`} size={21} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${activeDevices.length > 0 ? 'text-emerald-900' : 'text-amber-900'}`}>
                {activeDevices.length > 0 ? 'Camera agent paired' : 'No camera agent is paired'}
              </p>
              <p className={`mt-1 text-sm ${activeDevices.length > 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                Pair the ON AIR background agent on the computer connected to your camera. Device tokens stay with the agent and are never shown here.
              </p>
            </div>
          </div>

          <section className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Pair a studio computer</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Generate a one-time code. It expires after five minutes and can pair only one device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCreatePairingCode()}
                disabled={isCreatingCode || !studioUid}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} className={isCreatingCode ? 'animate-spin' : ''} />
                {isCreatingCode ? 'Creating code…' : 'Generate pairing code'}
              </button>
            </div>

            {pairing && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">One-time pairing code</p>
                  <code className="mt-1 block break-all text-lg font-bold tracking-wider text-gray-900">{pairing.code}</code>
                  <p className="mt-1 text-xs text-amber-700">
                    Expires in {Math.floor(pairingSeconds / 60)}:{String(pairingSeconds % 60).padStart(2, '0')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyPairingCode()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Copy size={15} /> Copy code
                </button>
              </div>
            )}
            {deviceError && <p role="alert" className="mt-3 text-sm text-red-700">{deviceError}</p>}
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900">Paired devices</h3>
            {devices.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No camera devices have been paired with this studio.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {devices.map((device) => (
                  <li key={device.deviceId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{device.deviceName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${device.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}>
                          {device.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Last seen: {device.lastSeenAt}</p>
                    </div>
                    {device.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => void handleRevokeDevice(device)}
                        disabled={revokingDeviceId === device.deviceId}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Ban size={14} />
                        {revokingDeviceId === device.deviceId ? 'Revoking…' : 'Revoke device'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Setup overview</h3>
            <div className="mt-3 space-y-3">
              {[
                'Install the ON AIR camera agent on your studio computer.',
                `Configure ${selectedMethod.title} as your transfer method.`,
                'Pair the computer securely with your studio account.',
                'Choose the event and start automatic photo ingestion.',
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm text-gray-600">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
            <ShieldCheck size={16} className="text-green-600" />
            Secure device pairing and authenticated uploads will be handled by the local agent and backend.
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Photos received', value: '0', icon: ImageIcon },
          { label: 'Currently uploading', value: '0', icon: UploadCloud },
          { label: 'Failed uploads', value: '0', icon: AlertCircle },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{item.label}</p>
                <Icon size={19} className="text-gray-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Upload activity</h2>
            <p className="mt-1 text-sm text-gray-500">Monitor incoming photos and processing status.</p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-400"
            title="Available after the local agent is connected"
          >
            <RefreshCw size={16} />
            Refresh activity
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <UploadCloud size={27} />
          </div>
          <h3 className="mt-4 font-semibold text-gray-800">No upload activity yet</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Once your camera agent is connected and photos arrive, upload progress and AI indexing status will appear here.
          </p>
        </div>
      </section>
    </div>
  );
};
