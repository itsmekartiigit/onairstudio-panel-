import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { AnnouncementItem } from '../../types';
import {
  Megaphone,
  Calendar,
  Sparkles,
  Tag,
  Wrench,
  Gift,
  RefreshCw,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const AnnouncementPage: React.FC = () => {
  const {
    announcements,
    createAnnouncement,
    deleteAnnouncement,
    markAnnouncementRead,
    isSuperAdmin,
    notify,
  } = useStudio();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New announcement form for super admin
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<AnnouncementItem['category']>('New Features');
  const [newImage, setNewImage] = useState(
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80'
  );

  const filtered = announcements.filter((a) => {
    if (selectedCategory === 'All') return true;
    return a.category === selectedCategory;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createAnnouncement({
      title: newTitle,
      description: newDescription,
      category: newCategory,
      image: newImage,
      publishDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      expiryDate: '31 Dec 2026',
      published: true,
      isRead: false,
    });
    setShowCreateModal(false);
    setNewTitle('');
    setNewDescription('');
  };

  const getCategoryBadgeClass = (category: AnnouncementItem['category']) => {
    switch (category) {
      case 'New Features':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Updates':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Offers':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Maintenance':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E7E9F0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#F20D24]">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#171717]">Announcement</h2>
            <p className="text-xs text-[#737783]">
              View important updates, new features, offers and information from ON AIR.
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#F20D24] text-white font-bold text-xs shadow-md shadow-red-900/20 hover:bg-red-700 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Announcement</span>
          </button>
        )}
      </div>

      {/* Categories Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold border-b border-[#E7E9F0] pb-2">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            selectedCategory === 'All' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>All Announcements</span>
        </button>

        <button
          onClick={() => setSelectedCategory('Updates')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            selectedCategory === 'Updates' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Updates</span>
        </button>

        <button
          onClick={() => setSelectedCategory('New Features')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            selectedCategory === 'New Features' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Features</span>
        </button>

        <button
          onClick={() => setSelectedCategory('Offers')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            selectedCategory === 'Offers' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Offers</span>
        </button>

        <button
          onClick={() => setSelectedCategory('Maintenance')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            selectedCategory === 'Maintenance' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Maintenance</span>
        </button>
      </div>

      {/* Latest Announcements Header with red bar as in screenshot */}
      <div className="flex items-center gap-2 pt-1">
        <span className="w-1.5 h-5 bg-[#F20D24] rounded-full" />
        <h3 className="text-base font-bold text-gray-900">Latest Announcements</h3>
      </div>

      {/* Grid of Announcement Poster Cards matching image_acec9976.png */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              markAnnouncementRead(item.id);
              setSelectedAnnouncement(item);
            }}
            className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group cursor-pointer"
          >
            {/* Banner graphic */}
            <div className="relative aspect-21/9 overflow-hidden bg-gray-900">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-[0.7]"
              />

              {/* Bold overlaid card title & badge */}
              <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between text-white bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-tight text-white flex items-center gap-1">
                    ON AIR
                  </span>
                  {!item.isRead && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F20D24] text-white shadow-xs">
                      New
                    </span>
                  )}
                </div>

                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-1.5 ${getCategoryBadgeClass(item.category)}`}>
                    {item.category}
                  </span>
                  <h4 className="text-base sm:text-lg font-black leading-tight drop-shadow-md">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-gray-200 line-clamp-1 mt-1 drop-shadow-xs">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Meta Bar */}
            <div className="p-4 border-t border-[#E7E9F0] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                <Megaphone className="w-3.5 h-3.5 text-[#F20D24]" />
                <span className="font-semibold text-gray-900">{item.title}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.publishDate}
                </span>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(item.category)}`}>
                  {item.category === 'New Features' ? 'New Feature' : item.category === 'Updates' ? 'Update' : item.category}
                </span>

                {isSuperAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnouncement(item.id);
                    }}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete announcement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="relative aspect-video bg-gray-900">
              <img src={selectedAnnouncement.image} alt={selectedAnnouncement.title} className="w-full h-full object-cover" />
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(selectedAnnouncement.category)}`}>
                {selectedAnnouncement.category}
              </span>
              <h3 className="text-lg font-bold text-gray-900">{selectedAnnouncement.title}</h3>
              <p className="text-xs text-gray-400">Published: {selectedAnnouncement.publishDate}</p>
              <p className="text-xs text-gray-600 leading-relaxed pt-2 border-t">
                {selectedAnnouncement.description}
              </p>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-gray-900">Create New Announcement (Super Admin)</h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Discount on 4K Stream Hours"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs"
                >
                  <option value="New Features">New Features</option>
                  <option value="Updates">Updates</option>
                  <option value="Offers">Offers</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F20D24] text-white font-bold rounded-xl"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
