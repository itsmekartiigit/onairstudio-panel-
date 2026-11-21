import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import {
  Bell,
  Search,
  ChevronDown,
  User,
  ShieldAlert,
  Globe,
  Settings,
  RotateCcw,
  Sparkles,
  LogOut,
  Menu,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../Firebase';

export const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const {
    profile,
    announcements,
    setActiveTab,
    isSuperAdmin,
    setIsSuperAdmin,
    setShowGuestPreviewModal,
    markAnnouncementRead,
    notify,
  } = useStudio();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = announcements.filter((a) => !a.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E7E9F0] px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3 shadow-2xs">
      {/* Left: Dynamic Welcome message */}
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={onMenuClick} aria-label="Open navigation" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#E7E9F0] text-gray-700 md:hidden"><Menu className="h-5 w-5" /></button>
        <div className="min-w-0">
        <h1 className="text-base sm:text-xl md:text-2xl font-bold text-[#171717] flex items-center gap-2 truncate">
          Welcome Back, {profile.studioName}
          <span className="text-xl">👋</span>
        </h1>
        <p className="hidden sm:block text-xs md:text-sm text-[#737783] mt-0.5 truncate">
          Manage your events, photo sharing and live streaming in one place.
        </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Super Admin Toggle Pill */}
       

        {/* View Guest Site Button */}
    

        {/* Notification Bell */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-full border border-[#E7E9F0] bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 relative transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#F20D24] ring-2 ring-white live-dot" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E7E9F0] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-[#E7E9F0] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Announcements & Alerts</h4>
                  <p className="text-xs text-gray-500">{unreadCount} unread notices</p>
                </div>
                <button
                  onClick={() => {
                    announcements.forEach((a) => markAnnouncementRead(a.id));
                  }}
                  className="text-xs text-[#F20D24] font-medium hover:underline"
                >
                  Mark all as read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => {
                      markAnnouncementRead(ann.id);
                      setActiveTab('announcement');
                      setShowNotifications(false);
                    }}
                    className={`p-3.5 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 ${
                      !ann.isRead ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#F20D24] mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900 line-clamp-1">{ann.title}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{ann.publishDate}</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{ann.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-[#E7E9F0] text-center">
                <button
                  onClick={() => {
                    setActiveTab('announcement');
                    setShowNotifications(false);
                  }}
                  className="text-xs font-semibold text-[#F20D24] hover:underline"
                >
                  View All Announcements →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Studio Profile dropdown button */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-full border border-[#E7E9F0] hover:border-gray-300 bg-white transition-colors cursor-pointer"
          >
            {/* Dark circular avatar badge */}
            <div className="w-8 h-8 rounded-full bg-[#111116] flex flex-col items-center justify-center text-white shrink-0 shadow-xs">
              <span className="text-[8px] font-black tracking-tight leading-none text-white">ON AIR</span>
              <span className="text-[6px] font-bold text-[#F20D24] leading-none uppercase">Studio</span>
            </div>

            <span className="text-sm font-semibold text-[#171717] hidden sm:inline max-w-[120px] truncate">
              {profile.studioName}
            </span>

            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {/* Profile Menu Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E7E9F0] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-[#E7E9F0]">
                <p className="text-sm font-bold text-gray-900">{profile.studioName}</p>
                <p className="text-xs text-gray-500">{profile.ownerName} • {profile.mobileNumber}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  {profile.plan} (Expires {profile.planExpiry})
                </div>
              </div>

              <div className="py-1 text-sm text-gray-700">
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span>Studio Settings</span>
                </button>


              

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    void signOut(auth).catch((error: unknown) => {
                      const message = error instanceof Error ? error.message : 'Firebase sign-out failed.';
                      notify(`Could not sign out: ${message}`, 'error');
                    });
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-red-700"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
