import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import {
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  EllipsisVertical,
  ImagePlus,
  Grid2x2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { FamilyMember } from '../../types';
import { deleteMoreImage, uploadMoreImage } from '../../services/moreMediaService';

type MoreTab = 'schedules' | 'venue' | 'family' | 'wishes';

type ScheduleEntry = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  isCurrent: boolean;
};

type MoreEventState = {
  schedules: ScheduleEntry[];
  venueName: string;
  venueAddress: string;
  mapUrl: string;
  imageUrl: string;
  imagePath?: string;
  wishesEnabled: boolean;
};

const STORAGE_KEY = 'onair_more_event_state_v1';

const readStoredMoreState = (): Record<string, MoreEventState> => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const writeStoredMoreState = (data: Record<string, MoreEventState>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const getDefaultEventState = (): MoreEventState => ({
  schedules: [],
  venueName: '',
  venueAddress: '',
  mapUrl: '',
  imageUrl: '',
  wishesEnabled: false,
});

const toTimeInputValue = (value: string): string => {
  const parsed = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!parsed) return value;
  let hour = Number(parsed[1]) % 12;
  if (parsed[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${parsed[2]}`;
};

const formatScheduleTime = (value: string): string => {
  if (!/^\d{2}:\d{2}$/.test(value)) return value;
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${String(hours % 12 || 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

export const MoreGuestPagesPage: React.FC = () => {
  const {
    events,
    activeEventId,
    setActiveEventId,
    setShowGuestPreviewModal,
    guestPages,
    updateGuestPages,
    notify,
  } = useStudio();
  const [selectedTab, setSelectedTab] = useState<MoreTab>('schedules');
  const [familySide, setFamilySide] = useState<'bride' | 'groom'>('bride');
  const [isFamilyFormOpen, setIsFamilyFormOpen] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyRelation, setFamilyRelation] = useState('Bride');
  const [familyAbout, setFamilyAbout] = useState('');
  const [familyImage, setFamilyImage] = useState<File | null>(null);
  const [familyImagePreview, setFamilyImagePreview] = useState('');
  const [familySaving, setFamilySaving] = useState(false);
  const familyFileInput = useRef<HTMLInputElement>(null);
  const venueFileInput = useRef<HTMLInputElement>(null);
  const [venueDraft, setVenueDraft] = useState({ name: '', address: '', mapUrl: '', imageUrl: '', imagePath: '' });
  const [venueImageFile, setVenueImageFile] = useState<File | null>(null);
  const [venueImagePreview, setVenueImagePreview] = useState('');
  const [venueSaving, setVenueSaving] = useState(false);
  const [allEventState, setAllEventState] = useState<Record<string, MoreEventState>>(() => readStoredMoreState());
  const [scheduleDraft, setScheduleDraft] = useState({
    id: '',
    name: '',
    date: '',
    startTime: '',
    endTime: '',
    markCurrent: false,
  });

  const selectedEvent = useMemo(() => {
    return events.find((event) => event.id === activeEventId) ?? events[0] ?? null;
  }, [activeEventId, events]);

  useEffect(() => {
    if (!selectedEvent && events[0]) {
      setActiveEventId(events[0].id);
    }
  }, [events, selectedEvent, setActiveEventId]);

  useEffect(() => {
    if (!selectedEvent) return;
    const stored = readStoredMoreState();
    const currentState = stored[selectedEvent.id];
    if (!currentState) {
      const seeded = getDefaultEventState();
      const nextState = { ...stored, [selectedEvent.id]: seeded };
      setAllEventState(nextState);
      writeStoredMoreState(nextState);
    } else {
      setAllEventState(stored);
    }
  }, [selectedEvent]);

  const currentEventState = selectedEvent ? allEventState[selectedEvent.id] ?? getDefaultEventState() : getDefaultEventState();
  const schedules = currentEventState.schedules;

  useEffect(() => {
    setVenueDraft({
      name: currentEventState.venueName,
      address: currentEventState.venueAddress,
      mapUrl: currentEventState.mapUrl,
      imageUrl: currentEventState.imageUrl,
      imagePath: currentEventState.imagePath || '',
    });
    setVenueImageFile(null);
    setVenueImagePreview('');
  }, [selectedEvent?.id, currentEventState.venueName, currentEventState.venueAddress, currentEventState.mapUrl, currentEventState.imageUrl, currentEventState.imagePath]);

  useEffect(() => {
    if (!familyImage) {
      setFamilyImagePreview('');
      return;
    }
    const objectUrl = URL.createObjectURL(familyImage);
    setFamilyImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [familyImage]);

  useEffect(() => {
    if (!venueImageFile) {
      setVenueImagePreview('');
      return;
    }
    const objectUrl = URL.createObjectURL(venueImageFile);
    setVenueImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [venueImageFile]);

  const saveEventState = (nextState: MoreEventState) => {
    if (!selectedEvent) return;
    const nextAllState = {
      ...allEventState,
      [selectedEvent.id]: nextState,
    };
    setAllEventState(nextAllState);
    writeStoredMoreState(nextAllState);
    const eventContent = guestPages.eventContent ?? {};
    updateGuestPages({
      ...guestPages,
      eventContent: {
        ...eventContent,
        [selectedEvent.id]: {
          ...eventContent[selectedEvent.id],
          schedules: nextState.schedules,
        },
      },
    });
    notify('Changes saved', 'success');
  };

  const handleSelectCurrentSchedule = (scheduleId: string) => {
    const nextSchedules = schedules.map((schedule) => ({
      ...schedule,
      isCurrent: schedule.id === scheduleId,
    }));
    saveEventState({ ...currentEventState, schedules: nextSchedules });
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    const target = schedules.find((schedule) => schedule.id === scheduleId);
    if (!target) return;

    const confirmDelete = window.confirm(`Delete “${target.name}”?`);
    if (!confirmDelete) return;

    const nextSchedules = schedules.filter((schedule) => schedule.id !== scheduleId);
    if (nextSchedules.length > 0 && target.isCurrent) {
      nextSchedules[0].isCurrent = true;
    }
    saveEventState({ ...currentEventState, schedules: nextSchedules });
  };

  const handleScheduleSave = () => {
    if (!selectedEvent) return;
    const trimmedName = scheduleDraft.name.trim();
    if (!trimmedName || !scheduleDraft.date || !scheduleDraft.startTime || !scheduleDraft.endTime) {
      notify('Please complete all schedule details.', 'error');
      return;
    }

    const nextSchedules = scheduleDraft.id
      ? schedules.map((schedule) => {
          if (schedule.id !== scheduleDraft.id) {
            return scheduleDraft.markCurrent ? { ...schedule, isCurrent: false } : schedule;
          }

          return {
            ...schedule,
            name: trimmedName,
            date: scheduleDraft.date,
            startTime: scheduleDraft.startTime,
            endTime: scheduleDraft.endTime,
            isCurrent: scheduleDraft.markCurrent || schedule.isCurrent,
          };
        })
      : [
          ...schedules,
          {
            id: `sched-${Date.now()}`,
            name: trimmedName,
            date: scheduleDraft.date,
            startTime: scheduleDraft.startTime,
            endTime: scheduleDraft.endTime,
            isCurrent: scheduleDraft.markCurrent || schedules.length === 0,
          },
        ];

    const finalSchedules = nextSchedules.map((schedule) => ({
      ...schedule,
      isCurrent: scheduleDraft.markCurrent ? schedule.id === (scheduleDraft.id || nextSchedules[nextSchedules.length - 1].id) : schedule.isCurrent,
    }));

    saveEventState({ ...currentEventState, schedules: finalSchedules });
    setScheduleDraft({
      id: '',
      name: '',
      date: selectedEvent.date || '',
      startTime: '',
      endTime: '',
      markCurrent: false,
    });
  };

  const startEditingSchedule = (schedule: ScheduleEntry) => {
    setScheduleDraft({
      id: schedule.id,
      name: schedule.name,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      markCurrent: schedule.isCurrent,
    });
  };

  const getFamilyMembers = () => (
    familySide === 'bride'
      ? guestPages.eventContent?.[selectedEvent?.id || '']?.brideFamily ?? guestPages.familyDetails.brideFamily
      : guestPages.eventContent?.[selectedEvent?.id || '']?.groomFamily ?? guestPages.familyDetails.groomFamily
  );

  const resetFamilyForm = () => {
    setFamilyName('');
    setFamilyRelation(familySide === 'bride' ? 'Bride' : 'Groom');
    setFamilyAbout('');
    setFamilyImage(null);
    if (familyFileInput.current) familyFileInput.current.value = '';
    setIsFamilyFormOpen(false);
  };

  const saveFamilyMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEvent || !familyName.trim() || !familyImage) {
      notify('Enter a name and choose an image from your device.', 'error');
      return;
    }

    setFamilySaving(true);
    let uploadedImage: { url: string; storagePath: string } | undefined;
    try {
      uploadedImage = await uploadMoreImage(selectedEvent.id, 'family', familyImage);
      const member: FamilyMember = {
        id: crypto.randomUUID(),
        name: familyName.trim(),
        relation: familyRelation,
        about: familyAbout.trim(),
        image: uploadedImage.url,
        imagePath: uploadedImage.storagePath,
      };
      const eventFamily = guestPages.eventContent?.[selectedEvent.id];
      const brideFamily = eventFamily?.brideFamily ?? guestPages.familyDetails.brideFamily;
      const groomFamily = eventFamily?.groomFamily ?? guestPages.familyDetails.groomFamily;
      updateGuestPages({
        ...guestPages,
        eventContent: {
          ...guestPages.eventContent,
          [selectedEvent.id]: {
            ...eventFamily,
            brideFamily: familySide === 'bride' ? [...brideFamily, member] : brideFamily,
            groomFamily: familySide === 'groom' ? [...groomFamily, member] : groomFamily,
          },
        },
        familyDetails: { ...guestPages.familyDetails, isActive: true },
      });
      resetFamilyForm();
    } catch (error) {
      if (uploadedImage) {
        await deleteMoreImage(uploadedImage.storagePath).catch((cleanupError: unknown) => {
          console.error('Could not remove the failed family image upload.', cleanupError);
        });
      }
      const message = error instanceof Error ? error.message : 'Family member could not be saved.';
      notify(message, 'error');
    } finally {
      setFamilySaving(false);
    }
  };

  const deleteFamilyMember = async (member: FamilyMember) => {
    if (!window.confirm(`Remove ${member.name} from the ${familySide}'s family?`)) return;
    if (!selectedEvent) return;
    const eventFamily = guestPages.eventContent?.[selectedEvent.id];
    const currentMembers = familySide === 'bride'
      ? eventFamily?.brideFamily ?? guestPages.familyDetails.brideFamily
      : eventFamily?.groomFamily ?? guestPages.familyDetails.groomFamily;
    const updatedMembers = currentMembers.filter((item) => item.id !== member.id);
    updateGuestPages({
      ...guestPages,
      eventContent: {
        ...guestPages.eventContent,
        [selectedEvent.id]: {
          ...eventFamily,
          brideFamily: familySide === 'bride' ? updatedMembers : eventFamily?.brideFamily ?? guestPages.familyDetails.brideFamily,
          groomFamily: familySide === 'groom' ? updatedMembers : eventFamily?.groomFamily ?? guestPages.familyDetails.groomFamily,
        },
      },
    });
    if (member.imagePath) {
      try {
        await deleteMoreImage(member.imagePath);
      } catch (error) {
        console.error('Could not remove the family image from Firebase Storage.', error);
        notify('Family member removed, but the stored image could not be deleted.', 'error');
      }
    }
  };

  const saveVenue = async () => {
    if (!selectedEvent || !venueDraft.name.trim() || !venueDraft.address.trim()) {
      notify('Venue name and complete address are required.', 'error');
      return;
    }
    if (venueDraft.mapUrl) {
      try {
        const parsedUrl = new URL(venueDraft.mapUrl);
        const host = parsedUrl.hostname.toLowerCase();
        const isGoogleMapsHost = host === 'goo.gl'
          || host.endsWith('.goo.gl')
          || host === 'google.com'
          || host.endsWith('.google.com')
          || host.startsWith('maps.google.');
        if (parsedUrl.protocol !== 'https:' || !isGoogleMapsHost) {
          throw new Error('Use a valid HTTPS Google Maps URL.');
        }
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Enter a valid Google Maps URL.', 'error');
        return;
      }
    }

    setVenueSaving(true);
    let uploadedImage: { url: string; storagePath: string } | undefined;
    try {
      if (venueImageFile) uploadedImage = await uploadMoreImage(selectedEvent.id, 'venue', venueImageFile);
      const nextState = {
        ...currentEventState,
        venueName: venueDraft.name.trim(),
        venueAddress: venueDraft.address.trim(),
        mapUrl: venueDraft.mapUrl.trim(),
        imageUrl: uploadedImage?.url || venueDraft.imageUrl,
        imagePath: uploadedImage?.storagePath || venueDraft.imagePath,
      };
      saveEventState(nextState);
      updateGuestPages({
        ...guestPages,
        venueDetails: {
          ...guestPages.venueDetails,
          venueName: nextState.venueName,
          address: nextState.venueAddress,
          googleMapsUrl: nextState.mapUrl,
          venueImage: nextState.imageUrl,
          venueImagePath: nextState.imagePath,
          isActive: true,
        },
        eventContent: {
          ...guestPages.eventContent,
          [selectedEvent.id]: {
            ...guestPages.eventContent?.[selectedEvent.id],
            venueDetails: {
              ...guestPages.eventContent?.[selectedEvent.id]?.venueDetails,
              venueName: nextState.venueName,
              address: nextState.venueAddress,
              googleMapsUrl: nextState.mapUrl,
              venueImage: nextState.imageUrl,
              venueImagePath: nextState.imagePath,
              isActive: true,
            },
          },
        },
      });
      if (uploadedImage && venueDraft.imagePath) {
        await deleteMoreImage(venueDraft.imagePath).catch((error: unknown) => {
          console.error('Could not remove the replaced venue image.', error);
          notify('Venue saved, but the previous image could not be deleted.', 'error');
        });
      }
      setVenueDraft({ ...venueDraft, imageUrl: nextState.imageUrl, imagePath: nextState.imagePath || '' });
      setVenueImageFile(null);
    } catch (error) {
      if (uploadedImage) {
        await deleteMoreImage(uploadedImage.storagePath).catch((cleanupError: unknown) => {
          console.error('Could not remove the failed venue image upload.', cleanupError);
        });
      }
      notify(error instanceof Error ? error.message : 'Venue details could not be saved.', 'error');
    } finally {
      setVenueSaving(false);
    }
  };

  const renderScheduleTab = () => (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-2xl border border-[#E7E9F0] bg-white p-6 shadow-2xs">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEE7E8] text-[#F20D24]">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900">Event Schedule</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setScheduleDraft({
                id: '',
                name: '',
                date: selectedEvent?.date || '',
                startTime: '',
                endTime: '',
                markCurrent: false,
              });
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#d60b1d]"
          >
            <Plus className="h-4 w-4" />
            Add Schedule
          </button>
        </div>

        <div className="space-y-3">
          {schedules.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
              <CalendarClock className="mx-auto mb-2 h-6 w-6 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">No schedules added</p>
              <p className="mt-1 text-xs text-gray-500">Add the first schedule for this event.</p>
            </div>
          )}
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                schedule.isCurrent ? 'border-[#F20D24] bg-red-50/30' : 'border-[#E7E9F0] bg-[#F7F8FC]'
              }`}
            >
              <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-[#FEE7E8] text-[#F20D24]">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">{new Date(`${schedule.date}T00:00:00`).toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3)}</span>
                <span className="text-2xl font-black leading-none">{new Date(`${schedule.date}T00:00:00`).getDate()}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <p className="text-[18px] font-extrabold text-[#171717]">{schedule.name}</p>
                  {schedule.isCurrent && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Current</span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm font-medium text-[#555B6A]">
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4" />
                    {formatScheduleTime(schedule.startTime)} - {formatScheduleTime(schedule.endTime)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectCurrentSchedule(schedule.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                    schedule.isCurrent ? 'border-[#32A852] bg-[#EAFBF0] text-[#1F8B42]' : 'border-[#dfe1e8] bg-white text-gray-500'
                  }`}
                  aria-label={`Mark ${schedule.name} as current`}
                >
                  {schedule.isCurrent && <Check className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => startEditingSchedule(schedule)}
                  className="rounded-lg px-2 py-1 text-xs font-bold text-[#171717] hover:bg-white"
                >
                  <EllipsisVertical className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSchedule(schedule.id)}
                  className="rounded-lg p-1.5 text-[#F20D24] transition hover:bg-[#FEE7E8]"
                  aria-label={`Delete ${schedule.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E7E9F0] bg-white p-6 shadow-2xs">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEE7E8] text-[#F20D24]">
            <CalendarClock className="h-5 w-5" />
          </span>
          <h3 className="text-base font-bold text-gray-900">{scheduleDraft.id ? 'Edit Schedule' : 'Add Schedule'}</h3>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <label className="mb-2 block text-[13px] font-bold text-[#333843]">Schedule Name *</label>
            <input
              value={scheduleDraft.name}
              onChange={(event) => setScheduleDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Haldi Ceremony"
              className="w-full rounded-xl border border-[#E7E9F0] bg-[#F8F9FB] px-3 py-3 text-[#171717] outline-none transition focus:border-[#F20D24]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[13px] font-bold text-[#333843]">Date *</label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduleDraft.date}
                  onChange={(event) => setScheduleDraft((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-xl border border-[#E7E9F0] bg-[#F8F9FB] px-3 py-3 pr-10 text-[#171717] outline-none focus:border-[#F20D24]"
                />
                <CalendarClock className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#6B7280]" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-bold text-[#333843]">Start Time *</label>
              <div className="relative">
                <input
                  type="time"
                  value={toTimeInputValue(scheduleDraft.startTime)}
                  onChange={(event) => setScheduleDraft((current) => ({ ...current, startTime: event.target.value }))}
                  className="w-full rounded-xl border border-[#E7E9F0] bg-[#F8F9FB] px-3 py-3 pr-10 text-[#171717] outline-none focus:border-[#F20D24]"
                />
                <Clock3 className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#6B7280]" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-bold text-[#333843]">End Time *</label>
            <div className="relative">
              <input
                type="time"
                value={toTimeInputValue(scheduleDraft.endTime)}
                onChange={(event) => setScheduleDraft((current) => ({ ...current, endTime: event.target.value }))}
                className="w-full rounded-xl border border-[#E7E9F0] bg-[#F8F9FB] px-3 py-3 pr-10 text-[#171717] outline-none focus:border-[#F20D24]"
              />
              <Clock3 className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#6B7280]" />
            </div>
          </div>

          <div className="rounded-xl border border-[#E7E9F0] bg-[#F8F9FB] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold text-[#171717]">Mark as Current Schedule</p>
                <p className="mt-1 text-sm text-[#555B6A]">This will highlight the schedule in the guest app.</p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleDraft((current) => ({ ...current, markCurrent: !current.markCurrent }))}
                className={`relative h-7 w-12 rounded-full transition ${scheduleDraft.markCurrent ? 'bg-[#F20D24]' : 'bg-[#cfd4df]'}`}
                aria-label="Toggle current schedule"
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition ${scheduleDraft.markCurrent ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setScheduleDraft({ id: '', name: '', date: selectedEvent?.date || '', startTime: '', endTime: '', markCurrent: false })}
            className="rounded-xl border border-[#D5D9E2] bg-white px-5 py-3 text-[15px] font-bold text-[#333843] hover:bg-[#f8f9fb]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleScheduleSave}
            className="rounded-xl bg-[#F20D24] px-5 py-3 text-[15px] font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#d60b1d]"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );

  const renderVenueTab = () => (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 rounded-2xl border border-[#E7E9F0] bg-white p-6 shadow-2xs lg:col-span-7">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#F20D24]">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Venue Details</h3>
            <p className="text-xs text-gray-500">Update the venue information shown on the guest page.</p>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Venue Name <span className="text-[#F20D24]">*</span></label>
            <input
              value={venueDraft.name}
              onChange={(event) => setVenueDraft((draft) => ({ ...draft, name: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-[#F20D24]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Complete Address <span className="text-[#F20D24]">*</span></label>
            <textarea
              rows={3}
              value={venueDraft.address}
              onChange={(event) => setVenueDraft((draft) => ({ ...draft, address: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#F20D24]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Google Maps URL</label>
            <input
              type="url"
              value={venueDraft.mapUrl}
              onChange={(event) => setVenueDraft((draft) => ({ ...draft, mapUrl: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#F20D24]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Venue Image</label>
            <input
              ref={venueFileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => setVenueImageFile(event.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => venueFileInput.current?.click()}
              className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm font-semibold text-gray-600 hover:border-[#F20D24]"
            >
              {(venueImagePreview || venueDraft.imageUrl) ? (
                <img src={venueImagePreview || venueDraft.imageUrl} alt="Venue preview" className="max-h-44 w-full rounded-lg object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-[#F20D24]" />
                  Choose an image from your device
                  <span className="text-xs font-normal text-gray-500">JPG, PNG or WebP, up to 5 MB</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button type="button" onClick={() => setVenueDraft({ name: currentEventState.venueName, address: currentEventState.venueAddress, mapUrl: currentEventState.mapUrl, imageUrl: currentEventState.imageUrl, imagePath: currentEventState.imagePath || '' })} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" disabled={venueSaving} onClick={() => void saveVenue()} className="rounded-xl bg-[#F20D24] px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{venueSaving ? 'Saving…' : 'Update Venue'}</button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#E7E9F0] bg-white p-6 shadow-2xs lg:col-span-5">
        <div>
          <h3 className="text-base font-bold text-gray-900">Guest Preview</h3>
          <p className="text-xs text-gray-500">A preview of venue details for your guests.</p>
        </div>
        {venueImagePreview || venueDraft.imageUrl ? (
          <img src={venueImagePreview || venueDraft.imageUrl} alt={venueDraft.name || 'Venue'} className="aspect-video w-full rounded-xl border border-gray-100 object-cover" />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">No venue image selected</div>
        )}
        <div>
          <p className="font-bold text-gray-900">{venueDraft.name || 'Venue name'}</p>
          <p className="mt-1 text-sm text-gray-500">{venueDraft.address || 'Complete address will appear here.'}</p>
        </div>
      </div>
    </div>
  );

  const renderFamilyTab = () => (
    <div className="space-y-5 rounded-2xl border border-[#E7E9F0] bg-white p-6 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#F20D24]"><Users className="h-4 w-4" /></div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Family Details</h3>
            <p className="text-xs text-gray-500">Add profiles that appear in the guest website preview.</p>
          </div>
        </div>
        <button type="button" onClick={() => { setFamilyRelation(familySide === 'bride' ? 'Bride' : 'Groom'); setIsFamilyFormOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">
          <Plus className="h-4 w-4" /> Add {familySide === 'bride' ? 'Bride' : 'Groom'} Family Member
        </button>
      </div>

      <div className="flex w-full max-w-md gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
        {(['bride', 'groom'] as const).map((side) => (
          <button key={side} type="button" onClick={() => setFamilySide(side)} className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold uppercase transition ${familySide === side ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:bg-white'}`}>
            {side}
          </button>
        ))}
      </div>

      {getFamilyMembers().length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {getFamilyMembers().map((member) => (
            <article key={member.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <img src={member.image} alt={member.name} className="aspect-[16/10] w-full bg-gray-50 object-cover" />
              <div className="space-y-1.5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-gray-900">{member.name}</h4>
                    <p className="text-xs text-[#F20D24]">{member.relation}</p>
                  </div>
                  <button type="button" onClick={() => void deleteFamilyMember(member)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-[#F20D24]" aria-label={`Remove ${member.name}`}><Trash2 className="h-4 w-4" /></button>
                </div>
                {member.about && <p className="line-clamp-3 text-xs leading-relaxed text-gray-500">{member.about}</p>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
          <Users className="mx-auto mb-2 h-6 w-6 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">No {familySide} family members yet</p>
          <p className="mt-1 text-xs text-gray-500">Add a profile to show it in the guest application.</p>
        </div>
      )}

      {isFamilyFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !familySaving) resetFamilyForm(); }}>
          <form onSubmit={(event) => void saveFamilyMember(event)} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-[#E7E9F0] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add {familySide === 'bride' ? 'Bride' : 'Groom'} Family Member</h3>
                <p className="text-xs text-gray-500">The saved profile will appear in the matching guest family section.</p>
              </div>
              <button type="button" disabled={familySaving} onClick={resetFamilyForm} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Profile Image <span className="text-[#F20D24]">*</span></label>
              <input ref={familyFileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setFamilyImage(event.target.files?.[0] || null)} />
              <button type="button" onClick={() => familyFileInput.current?.click()} className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-3 text-left hover:border-[#F20D24]">
                {familyImagePreview ? <img src={familyImagePreview} alt="Selected family member" className="h-20 w-24 rounded-lg object-cover" /> : <span className="flex h-20 w-24 items-center justify-center rounded-lg bg-red-50 text-[#F20D24]"><ImagePlus className="h-6 w-6" /></span>}
                <span><span className="block text-sm font-semibold text-gray-700">Choose image from gallery</span><span className="mt-1 block text-xs text-gray-500">JPG, PNG or WebP, up to 5 MB</span></span>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Name <span className="text-[#F20D24]">*</span></label>
                <input required value={familyName} onChange={(event) => setFamilyName(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#F20D24]" placeholder="Enter name" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Relation Type <span className="text-[#F20D24]">*</span></label>
                <select required value={familyRelation} onChange={(event) => setFamilyRelation(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#F20D24]">
                  {(familySide === 'bride' ? ['Bride', 'Father', 'Mother', 'Relative'] : ['Groom', 'Father', 'Mother', 'Relative']).map((relation) => <option key={relation}>{relation}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">About</label>
              <textarea rows={4} value={familyAbout} onChange={(event) => setFamilyAbout(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#F20D24]" placeholder="Add a short introduction" />
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button type="button" disabled={familySaving} onClick={resetFamilyForm} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={familySaving} className="rounded-xl bg-[#F20D24] px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{familySaving ? 'Uploading…' : 'Save Profile'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  const renderWishesTab = () => (
    <div className="rounded-2xl border border-[#E7E9F0] bg-white p-6 shadow-2xs">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEE7E8] text-[#F20D24]">
          <Sparkles className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold text-gray-900">Wishes</h3>
      </div>

      <div className="rounded-2xl border border-[#E7E9F0] bg-[#F7F8FC] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-bold text-[#171717]">Enable Guest Wishes</p>
            <p className="mt-1 text-sm text-[#5E6472]">Guests can submit messages and blessings for the couple.</p>
          </div>
          <button
            type="button"
            onClick={() => saveEventState({ ...currentEventState, wishesEnabled: !currentEventState.wishesEnabled })}
            className={`relative h-7 w-12 rounded-full transition ${currentEventState.wishesEnabled ? 'bg-[#F20D24]' : 'bg-[#cfd4df]'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition ${currentEventState.wishesEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="rounded-2xl border border-[#E7E9F0] bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#F20D24]">
              <Grid2x2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#171717]">More</h2>
              <p className="text-xs text-[#737783]">Manage guest website pages, event details, family, schedules and wishes.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <Check className="h-4 w-4" /> Changes saved
            </span>
            <button
              type="button"
              onClick={() => setShowGuestPreviewModal(true)}
              className="flex items-center gap-2 rounded-xl bg-[#F20D24] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#d60b1d]"
            >
              <X className="h-4 w-4 rotate-45" /> Preview Guest Page
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E7E9F0] bg-white p-4 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#F20D24]">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#737783]">Select Event</label>
              <div className="relative">
                <select
                  value={selectedEvent?.id ?? ''}
                  onChange={(event) => setActiveEventId(event.target.value)}
                  className="min-w-64 appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-[#171717] outline-none focus:border-[#F20D24]"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#171717]" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#EAFBF0] px-3 py-1.5 text-xs font-bold text-[#1F8B42]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2ECC71]" /> Active
          </div>
        </div>
      </div>

      <div className="border-b border-[#E7E9F0] pb-2">
        <div className="grid gap-2 md:grid-cols-4">
          {[
            { id: 'schedules', label: 'Schedules', icon: CalendarClock },
            { id: 'venue', label: 'Venue', icon: MapPin },
            { id: 'family', label: 'Family', icon: Users },
            { id: 'wishes', label: 'Wishes', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id as MoreTab)}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  isActive ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedTab === 'schedules' && renderScheduleTab()}
      {selectedTab === 'venue' && renderVenueTab()}
      {selectedTab === 'family' && renderFamilyTab()}
      {selectedTab === 'wishes' && renderWishesTab()}
    </div>
  );
};
