import React, { useEffect, useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { EventType } from '../../types';
import {
  X,
  Calendar,
  Upload,
} from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose }) => {
  const { createEvent, notify } = useStudio();

  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('Wedding');
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview('');
      return;
    }
    const previewUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [thumbnailFile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !thumbnailFile || isSubmitting) return;

    // Format date string nicely
    const dateObj = new Date(date);
    const formattedDate = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : date;

    setIsSubmitting(true);
    try {
      await createEvent({
        name,
        type,
        brideName,
        groomName,
        date: formattedDate,
        startTime,
        endTime,
        location,
        googleMapsUrl: googleMapsUrl || (location ? `https://maps.google.com/?q=${encodeURIComponent(location)}` : ''),
      }, thumbnailFile);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the event.';
      notify(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E7E9F0] flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Create New Wedding Event</h3>
            <p className="text-xs text-gray-500">Enter event details and upload a thumbnail</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-sm">
          {/* Section 1: Event Basics */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#F20D24] uppercase tracking-wider">1. Basic Information</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Event Title / Couple <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter event title or couple names"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24] focus:ring-1 focus:ring-[#F20D24]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Event Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EventType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24]"
                >
                  <option value="Wedding">Wedding</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Reception">Reception</option>
                  <option value="Haldi">Haldi</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bride Name</label>
                <input
                  type="text"
                  placeholder="Bride's name"
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Groom Name</label>
                <input
                  type="text"
                  placeholder="Groom's name"
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Date, Time & Venue */}
          <div className="space-y-4 pt-2 border-t border-[#E7E9F0]">
            <h4 className="text-xs font-bold text-[#F20D24] uppercase tracking-wider">2. Date, Time & Location</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Event Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Time</label>
                <input
                  type="text"
                  placeholder="10:00 AM"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Time</label>
                <input
                  type="text"
                  placeholder="04:00 PM"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Venue Location</label>
                <input
                  type="text"
                  placeholder="Venue location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Google Maps URL</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E9F0] text-sm focus:outline-none focus:border-[#F20D24]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Event Thumbnail */}
          <div className="space-y-3 pt-2 border-t border-[#E7E9F0]">
            <h4 className="text-xs font-bold text-[#F20D24] uppercase tracking-wider">3. Upload Event Thumbnail</h4>
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#E7E9F0] bg-gray-50 px-4 py-5 text-center hover:border-[#F20D24]">
              {thumbnailPreview ? (
                <img src={thumbnailPreview} alt="Event thumbnail preview" className="h-40 max-w-full rounded-lg object-cover" />
              ) : (
                <Upload className="h-7 w-7 text-gray-400" />
              )}
              <span className="text-xs font-semibold text-gray-700">
                {thumbnailFile?.name || 'Choose a thumbnail image from your gallery'}
              </span>
              <input
                type="file"
                accept="image/*"
                required
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && !file.type.startsWith('image/')) {
                    notify('Please select a valid image file.', 'error');
                    event.target.value = '';
                    return;
                  }
                  if (file && file.size > 20 * 1024 * 1024) {
                    notify('Event thumbnails must be 20 MB or smaller.', 'error');
                    event.target.value = '';
                    return;
                  }
                  setThumbnailFile(file || null);
                }}
              />
            </label>
            <p className="text-xs text-gray-500">Image files up to 20 MB.</p>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#E7E9F0] flex items-center justify-end gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E7E9F0] text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !thumbnailFile}
              className="px-5 py-2.5 rounded-xl bg-[#F20D24] hover:bg-red-700 text-white text-xs font-bold cursor-pointer shadow-md shadow-red-900/20 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading & Creating...' : '+ Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
