import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../../Firebase';

type Plan = { planId: string; name: string; priceMonthly: number; storageGB: number; status: string };
type Subscription = { id: string; planName: string; monthlyPrice: number; storageGB: number; status: string; purchaseDate?: { toDate?: () => Date }; expiresAt?: { toDate?: () => Date } };

export const AlbumPlanPurchase: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const offPlans = onSnapshot(collection(db, 'albumPlans'), (snap) => { setPlans(snap.docs.map((doc) => { const data = doc.data(); return { planId: doc.id, name: String(data.planName ?? data.name ?? ''), priceMonthly: Number(data.pricePerMonth ?? data.priceMonthly ?? 0), storageGB: Number(data.storagePerMonthGB ?? data.storageGB ?? 0), status: String(data.status ?? 'inactive') }; }).filter((plan) => plan.status === 'active')); setLoading(false); }, () => { setError('Could not load album plans.'); setLoading(false); });
    const uid = auth.currentUser?.uid;
    const offSubs = uid ? onSnapshot(query(collection(db, 'albumPlanSubscriptions'), where('studioId', '==', uid)), (snap) => setSubscriptions(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Subscription))) : () => {};
    return () => { offPlans(); offSubs(); };
  }, []);
  const active = subscriptions.filter((item) => item.status === 'active' && (item.expiresAt?.toDate?.().getTime() ?? 0) > Date.now());
  const purchase = async (plan: Plan) => {
    if (purchasing) return;
    setPurchasing(plan.planId); setError('');
    try {
      await httpsCallable(functions, 'purchaseAlbumPlan')({ planId: plan.planId, requestId: crypto.randomUUID().replace(/-/g, '') });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Purchase failed. Check your wallet balance and try again.'); }
    finally { setPurchasing(''); }
  };
  return <section className="space-y-5">
    <div className="rounded-2xl border border-[#E7E9F0] bg-white p-5"><h3 className="font-bold text-gray-900">Album Storage Plan</h3><p className="mt-1 text-xs text-gray-500">Choose monthly album storage. Payment is charged from your studio wallet; renew before expiry to keep paid storage active.</p>
      {active.map((item) => <div key={item.id} className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><b>{item.planName}</b> · {item.storageGB} GB · expires {item.expiresAt?.toDate?.().toLocaleDateString('en-IN') ?? '—'}</div>)}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    </div>
    {loading ? <p className="text-sm text-gray-500">Loading plans…</p> : plans.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <article key={plan.planId} className="rounded-2xl border border-[#E7E9F0] bg-white p-5 shadow-sm"><h4 className="font-bold text-gray-900">{plan.name}</h4><p className="mt-3 text-2xl font-black text-gray-900">₹{plan.priceMonthly}<small className="text-xs font-medium text-gray-500"> / month</small></p><p className="mt-2 text-sm text-gray-600">{plan.storageGB} GB storage</p><button disabled={!!purchasing} onClick={() => void purchase(plan)} className="mt-5 w-full rounded-xl bg-[#F20D24] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{purchasing === plan.planId ? 'Processing…' : active.length ? 'Renew / Upgrade' : 'Purchase Plan'}</button></article>)}</div> : <p className="rounded-xl bg-white p-5 text-sm text-gray-500">No album storage plans are available right now.</p>}
  </section>;
};
