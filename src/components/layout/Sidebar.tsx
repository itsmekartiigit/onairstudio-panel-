import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { NavTab } from '../../types';
import {
  LayoutDashboard,
  CalendarDays,
  Image,
  Images,
  Radio,
  Film,
  Wallet,
  Settings,
  Grid,
  GraduationCap,
  Megaphone,
  Camera,
  Crown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
// Also import from react-icons as requested by user prompt
import { RiBroadcastLine } from 'react-icons/ri';

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const {
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    profile,
    serviceAccess,
    announcements,
    setShowGuestPreviewModal,
  } = useStudio();

  const unreadAnnouncements = announcements.filter((a) => !a.isRead).length;

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
    { id: 'events', label: 'Events', icon: <CalendarDays className="w-5 h-5 shrink-0" /> },
    { id: 'album-selection', label: 'Album Selection', icon: <Images className="w-5 h-5 shrink-0" /> },
    { id: 'photo-sharing', label: 'Photo Sharing', icon: <Image className="w-5 h-5 shrink-0" /> },
    { id: 'camera-upload', label: 'Camera Upload', icon: <Camera className="w-5 h-5 shrink-0" /> },
    { id: 'live-stream', label: 'Live Stream', icon: <Radio className="w-5 h-5 shrink-0" /> },
    { id: 'highlights', label: 'Highlights', icon: <Film className="w-5 h-5 shrink-0" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="w-5 h-5 shrink-0" /> },
    { id: 'more', label: 'More', icon: <Grid className="w-5 h-5 shrink-0" /> },
    { id: 'training', label: 'Training', icon: <GraduationCap className="w-5 h-5 shrink-0" /> },
    {
      id: 'announcement',
      label: 'Announcement',
      icon: <Megaphone className="w-5 h-5 shrink-0" />,
      badge: unreadAnnouncements > 0 ? unreadAnnouncements : undefined,
    },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5 shrink-0" /> },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.id === 'photo-sharing' || item.id === 'camera-upload') return serviceAccess.aiPhotoSharing;
    if (item.id === 'live-stream') return serviceAccess.liveStreaming;
    if (item.id === 'highlights') return serviceAccess.highlights;
    if (item.id === 'wallet') return serviceAccess.wallet;
    return true;
  });

  return (
    <>
      {isMobileOpen && <button aria-label="Close navigation" onClick={onMobileClose} className="fixed inset-0 z-30 bg-black/50 md:hidden" />}
      <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[min(18rem,85vw)] shrink-0 flex-col overflow-hidden border-r border-[#1F1F28] bg-[#111116] text-white transition-all duration-300 select-none md:sticky md:top-0 md:z-30 md:h-screen ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}
    >
      {/* Sidebar Header / Logo */}
      <div className="pt-6 pb-4 px-4 flex flex-col items-center justify-center border-b border-white/5 relative">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('dashboard'); onMobileClose(); }}>
          <span className="font-extrabold tracking-tight text-2xl text-white flex items-center gap-1.5">
            ON AIR
            <RiBroadcastLine className="text-[#F20D24] text-2xl -mt-1" />
          </span>
        </div>

        {!isSidebarCollapsed && (
          <div className="mt-1.5">
            <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[#F20D24] text-white tracking-wide shadow-sm">
              Studio Panel
            </span>
          </div>
        )}

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-7 hidden h-6 w-6 items-center justify-center rounded-full border border-gray-700 bg-[#1E1E24] text-xs text-gray-300 shadow-md transition-transform hover:scale-110 z-40 md:flex"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-none">
        {visibleNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); onMobileClose(); }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-[#F20D24] text-white shadow-md shadow-red-950/40 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                } ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''}`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <span className={`transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                {item.icon}
              </span>

              {(!isSidebarCollapsed || isMobileOpen) && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {item.badge && (!isSidebarCollapsed || isMobileOpen) && (
                <span className="ml-auto bg-white text-[#F20D24] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}

              {item.badge && isSidebarCollapsed && !isMobileOpen && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F20D24]" />
              )}
            </button>
          );
        })}
      </nav>


      {/* Ambient Red Wave Glow at the bottom of sidebar as in the screenshot */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-30">
        <svg viewBox="0 0 200 120" className="w-full h-auto text-[#F20D24] fill-current">
          <path d="M0,60 C40,90 100,20 200,80 L200,120 L0,120 Z" />
        </svg>
      </div>
      </aside>
    </>
  );
};
