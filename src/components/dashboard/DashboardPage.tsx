import React from 'react';
import { useStudio } from '../../context/StudioContext';
import {
  Calendar,
  Image as ImageIcon,
  Radio,
  Wallet,
  ArrowUpRight,
  ExternalLink,
  MoreHorizontal,
  Plus,
  ImagePlus,
} from 'lucide-react';
import { RiBroadcastLine } from 'react-icons/ri';

export const DashboardPage: React.FC = () => {
  const {
    events,
    activeEventId,
    walletBalance,
    serviceAccess,
    setActiveTab,
    setActiveEventId,
    setShowCreateEventModal,
    setShowGuestPreviewModal,
  } = useStudio();

  // Calculate live dynamic totals
  const totalEvents = events.length;
  const totalPhotos = events.reduce((sum, e) => sum + e.photosCount, 0);
  const liveStreamsCount = events.filter((e) => e.liveStreamStatus === 'live' || e.services?.liveStreaming).length;

  const recentEvents = events.slice(0, 5);
  const bannerEvent = events.find((event) => event.id === activeEventId) ?? events[0];
  const homeBanners = bannerEvent?.banners ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Events */}
        <div className="bg-white rounded-2xl p-5 border border-[#E7E9F0] shadow-2xs hover:shadow-sm transition-shadow relative overflow-hidden flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-red-50 flex items-center justify-center text-[#F20D24] shrink-0 border border-red-100">
              <Calendar className="w-6 h-6 text-[#F20D24]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#737783] uppercase tracking-wider">Total Events</p>
              <h3 className="text-2xl lg:text-3xl font-extrabold text-[#171717] mt-0.5">{totalEvents}</h3>
            </div>
          </div>
        </div>

        {serviceAccess.aiPhotoSharing && <>
        {/* Card 2: Total Photos */}
        <div className="bg-white rounded-2xl p-5 border border-[#E7E9F0] shadow-2xs hover:shadow-sm transition-shadow relative overflow-hidden flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 border border-purple-100">
              <ImageIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#737783] uppercase tracking-wider">Total Photos</p>
              <h3 className="text-2xl lg:text-3xl font-extrabold text-[#171717] mt-0.5">
                {totalPhotos.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        </>}
        {serviceAccess.liveStreaming && <>
        {/* Card 3: Live Streams */}
        <div className="bg-white rounded-2xl p-5 border border-[#E7E9F0] shadow-2xs hover:shadow-sm transition-shadow relative overflow-hidden flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-rose-50 flex items-center justify-center text-[#F20D24] shrink-0 border border-rose-100">
              <RiBroadcastLine className="w-6 h-6 text-[#F20D24]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#737783] uppercase tracking-wider">Live Streams</p>
              <h3 className="text-2xl lg:text-3xl font-extrabold text-[#171717] mt-0.5">{liveStreamsCount}</h3>
            </div>
          </div>
        </div>

        </>}
        {serviceAccess.wallet && <>
        {/* Card 4: Wallet Balance */}
        <div
          onClick={() => setActiveTab('wallet')}
          className="bg-white rounded-2xl p-5 border border-[#E7E9F0] shadow-2xs hover:shadow-sm transition-shadow relative overflow-hidden flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#737783] uppercase tracking-wider">Wallet Balance</p>
              <h3 className="text-2xl lg:text-3xl font-extrabold text-[#171717] mt-0.5">
                ₹{walletBalance.toLocaleString('en-IN')}
              </h3>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-[#F20D24] group-hover:text-white flex items-center justify-center text-gray-400 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        </>}
      </div>

      {serviceAccess.highlights && bannerEvent && (
        <section className="space-y-4 rounded-2xl border border-[#E7E9F0] bg-white p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#F20D24]">
                <ImagePlus className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#171717]">Home Screen Banners</h2>
                <p className="text-xs text-[#737783]">Banners uploaded for the selected event.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={bannerEvent.id}
                onChange={(event) => setActiveEventId(event.target.value)}
                className="max-w-64 rounded-xl border border-[#E7E9F0] bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-[#F20D24]"
                aria-label="Select event banners"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setActiveTab('highlights')}
                className="rounded-xl border border-[#E7E9F0] px-3 py-2 text-xs font-bold text-[#F20D24] hover:bg-red-50"
              >
                Manage Banners
              </button>
            </div>
          </div>

          {homeBanners.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {homeBanners.map((banner) => (
                <img
                  key={banner.id}
                  src={banner.url}
                  alt={banner.filename}
                  className="aspect-[16/7] w-full rounded-xl border border-gray-100 object-cover"
                />
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('highlights')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm font-semibold text-gray-500 hover:border-[#F20D24] hover:text-[#F20D24]"
            >
              <ImagePlus className="h-5 w-5" />
              No banners yet. Upload up to 4 from Highlights.
            </button>
          )}
        </section>
      )}

      {/* Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Events Card */}
        <div className="lg:col-span-12 bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-[#E7E9F0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-[#F20D24]">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-[#171717]">Recent Events</h2>
            </div>
            <button
              onClick={() => setActiveTab('events')}
              className="text-xs font-bold text-[#F20D24] hover:text-red-700 flex items-center gap-1 transition-colors"
            >
              View All <span>→</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FD] border-b border-[#E7E9F0] text-[11px] font-bold text-[#737783] uppercase tracking-wider">
                  <th className="py-3 px-5">Event</th>
                  <th className="py-3 px-4">Date</th>
                  {serviceAccess.aiPhotoSharing && <th className="py-3 px-4">Photos</th>}
                  {serviceAccess.liveStreaming && <th className="py-3 px-4">Live Stream</th>}
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E9F0] text-sm">
                {recentEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      setActiveEventId(evt.id);
                      setActiveTab(serviceAccess.aiPhotoSharing ? 'photo-sharing' : 'events');
                    }}
                  >
                    {/* Event Column with Thumbnail and Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={evt.thumbnail}
                          alt={evt.name}
                          className="w-11 h-11 rounded-xl object-cover border border-gray-200 shadow-2xs"
                        />
                        <div>
                          <p className="font-bold text-[#171717] group-hover:text-[#F20D24] transition-colors leading-tight">
                            {evt.name}
                          </p>
                          <span className="text-xs text-[#737783]">{evt.type}</span>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-[#737783] text-xs font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{evt.date}</span>
                      </div>
                    </td>

                    {serviceAccess.aiPhotoSharing && <>
                    {/* Photos Count */}
                    <td className="py-3.5 px-4 text-[#737783] text-xs font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{evt.photosCount.toLocaleString()}</span>
                      </div>
                    </td>
                    </>}

                    {serviceAccess.liveStreaming && <>
                    {/* Live Stream Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {evt.liveStreamStatus === 'live' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-[#F20D24] border border-red-200">
                          <span className="w-2 h-2 rounded-full bg-[#F20D24] live-dot" />
                          Live
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs font-medium">–</span>
                      )}
                    </td>
                    </>}

                    {/* Status badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {evt.status === 'Ongoing' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ongoing
                        </span>
                      )}
                      {evt.status === 'Active' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Active
                        </span>
                      )}
                      {evt.status === 'Completed' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          Completed
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setActiveEventId(evt.id);
                            setShowGuestPreviewModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Guest Website"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveEventId(evt.id);
                            setActiveTab('events');
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Manage Event"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
