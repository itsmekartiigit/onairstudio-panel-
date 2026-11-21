import React, { useEffect, useState } from 'react';
import { AlertCircle, Sparkles, Wallet, X } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import {
  getAvailableStudioServices,
  StudioCatalogService,
  StudioServicePackage,
} from '../../services/studioAccountService';

interface BuyPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export const BuyPhotosModal: React.FC<BuyPhotosModalProps> = ({ isOpen, onClose, eventId }) => {
  const { events, walletBalance, buyExtraPhotos, setActiveTab, notify } = useStudio();
  const [services, setServices] = useState<StudioCatalogService[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<{ service: StudioCatalogService; item: StudioServicePackage } | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    void getAvailableStudioServices().then((items) => {
      if (!active) return;
      const photoServices = items.filter((service) => service.category === 'aiPhotoSharing');
      setServices(photoServices);
      const firstService = photoServices[0];
      const firstPackage = firstService?.packages.find((item) => item.status === 'active');
      setSelectedPackage(firstService && firstPackage ? { service: firstService, item: firstPackage } : null);
    }).catch((error: unknown) => {
      console.error('Could not load photo packages.', error);
      if (active) notify('Photo packages could not be loaded.', 'error');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;
  const event = events.find((item) => item.id === eventId);
  if (!event) return null;
  const shortfall = selectedPackage ? Math.max(0, selectedPackage.item.price - walletBalance) : 0;

  const confirmPurchase = async () => {
    if (!selectedPackage || shortfall > 0) return;
    setProcessing(true);
    try {
      if (await buyExtraPhotos(event.id, selectedPackage.service.serviceId, selectedPackage.item.packageId)) onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Purchase could not be completed.';
      const shortfall = message.match(/INSUFFICIENT_BALANCE:(\d+)/);
      notify(
        shortfall
          ? `Insufficient balance. Add ₹${Number(shortfall[1]).toLocaleString('en-IN')} or contact your administrator.`
          : message,
        'error',
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#E7E9F0] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#E7E9F0] bg-gradient-to-r from-red-50/50 to-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-[#F20D24]"><Sparkles className="h-4 w-4" /></span>
            <div>
              <h3 className="text-base font-bold text-gray-900">Buy Photo Sharing Package</h3>
              <p className="text-xs text-gray-500">For: {event.name}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-5 p-6 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-xs">
            <div>
              <span className="text-gray-500">Event photo quota</span>
              <p className="mt-0.5 font-bold text-gray-900">{event.photoQuota.uploaded.toLocaleString()} / {event.photoQuota.purchased.toLocaleString()} photos</p>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Wallet balance</span>
              <p className="mt-0.5 font-bold text-emerald-700">₹{walletBalance.toLocaleString('en-IN')}</p>
            </div>
          </div>
          {loading ? <p className="text-sm text-gray-500">Loading active packages…</p> : services.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No active photo packages are available.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Select package</p>
              {services.flatMap((service) => service.packages.filter((item) => item.status === 'active').map((item) => {
                const key = `${service.serviceId}:${item.packageId}`;
                const active = selectedPackage?.service.serviceId === service.serviceId && selectedPackage.item.packageId === item.packageId;
                return (
                  <button key={key} onClick={() => setSelectedPackage({ service, item })} className={`flex w-full items-center justify-between rounded-xl border-2 p-3 text-left ${active ? 'border-[#F20D24] bg-red-50/30' : 'border-[#E7E9F0] hover:border-gray-300'}`}>
                    <span>
                      <span className="block font-bold text-gray-900">{item.name}</span>
                      <span className="text-xs text-gray-500">{item.quota.toLocaleString('en-IN')} photos</span>
                    </span>
                    <span className="font-black text-[#F20D24]">₹{item.price.toLocaleString('en-IN')}</span>
                  </button>
                );
              }))}
            </div>
          )}
          {shortfall > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>₹{shortfall.toLocaleString('en-IN')} more is required. Add money or contact your administrator.</span>
            </div>
          )}
          {selectedPackage && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
              <span className="text-gray-600">Total deducted</span>
              <span className="text-lg font-black text-gray-900">₹{selectedPackage.item.price.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E7E9F0] bg-gray-50 px-6 py-4">
          {shortfall > 0 && <button onClick={() => { onClose(); setActiveTab('wallet'); }} className="mr-auto text-xs font-bold text-[#F20D24] underline">Add Money / Contact Admin</button>}
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700">Cancel</button>
          <button onClick={() => void confirmPurchase()} disabled={!selectedPackage || loading || processing || shortfall > 0} className="inline-flex items-center gap-1.5 rounded-xl bg-[#F20D24] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
            <Wallet className="h-4 w-4" /> {processing ? 'Processing…' : 'Confirm & Pay'}
          </button>
        </footer>
      </section>
    </div>
  );
};
