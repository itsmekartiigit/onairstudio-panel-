import React, { useState, useRef } from 'react';
import { useStudio } from '../../context/StudioContext';
import { uploadStudioLogo } from '../../services/firebaseDataService';
import {
  Settings,
  Store,
  User,
  Phone,
  UploadCloud,
  Eye,
  Info,
  Save,
  RotateCcw,
  Pencil,
  Bell,
  Shield,
  Sliders,
  Check,
} from 'lucide-react';
import { AlbumPlanPurchase } from './AlbumPlanPurchase';

export const SettingsPage: React.FC = () => {
  const { profile, updateProfile, notify } = useStudio();

  const [activeTab, setActiveTab] = useState<'studio' | 'notifications' | 'security' | 'preferences' | 'album-storage'>('studio');
  const [studioName, setStudioName] = useState(profile.studioName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [mobileNumber, setMobileNumber] = useState(profile.mobileNumber);
  const [studioLogo, setStudioLogo] = useState(profile.studioLogo);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const logoUrl = logoFile ? await uploadStudioLogo(logoFile) : studioLogo;
      await updateProfile({ studioName, ownerName, mobileNumber, studioLogo: logoUrl });
      setStudioLogo(logoUrl);
      setLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save studio settings to Firebase.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStudioName(profile.studioName);
    setOwnerName(profile.ownerName);
    setMobileNumber(profile.mobileNumber);
    setStudioLogo(profile.studioLogo);
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    notify('Settings reset to saved values', 'info');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      notify('Studio logo must be a PNG, JPG, or WebP image.', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('Studio logo must be 5 MB or smaller.', 'error');
      e.target.value = '';
      return;
    }
    setLogoFile(file);
    setStudioLogo(URL.createObjectURL(file));
    notify('Studio logo selected. Click "Save Changes" to upload it to Firebase.', 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E7E9F0] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#F20D24]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#171717]">Settings</h2>
            <p className="text-xs text-[#737783]">
              Manage your studio profile, branding and account preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold border-b border-[#E7E9F0] pb-2">
        <button
          onClick={() => setActiveTab('studio')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'studio'
              ? 'bg-[#F20D24] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Studio Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-[#F20D24] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'security'
              ? 'bg-[#F20D24] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'preferences'
              ? 'bg-[#F20D24] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Preferences</span>
        </button>
        <button
          onClick={() => setActiveTab('album-storage')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'album-storage' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          <Store className="w-4 h-4" />
          <span>Album Storage Plans</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'studio' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form: Studio Details (approx 7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-6 space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-[#F20D24]">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Studio Details</h3>
                <p className="text-xs text-gray-500">Update your studio information and branding.</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              {/* Studio Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Studio Name <span className="text-[#F20D24]">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#F20D24]"
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Owner Name <span className="text-[#F20D24]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#F20D24]"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Mobile Number <span className="text-[#F20D24]">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#F20D24]"
                  />
                </div>
              </div>

              {/* Studio Logo */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Studio Logo <span className="text-[#F20D24]">*</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Current Logo / Badge Preview */}
                  <div className="relative w-28 h-28 rounded-2xl bg-[#111116] border-2 border-gray-300 p-3 flex flex-col items-center justify-center text-center shadow-xs shrink-0 group">
                    {studioLogo ? <img src={studioLogo} alt="Studio logo preview" className="absolute inset-0 h-full w-full rounded-2xl object-contain bg-white p-2" /> : <><span className="text-sm font-black tracking-tight text-white">ON AIR</span><span className="text-[9px] font-bold text-[#F20D24] uppercase tracking-wider">Studio</span></>}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-gray-700 hover:text-[#F20D24]"
                      title="Change logo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Upload Drop Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 w-full p-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#F20D24] bg-gray-50 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <UploadCloud className="w-7 h-7 text-[#F20D24] mb-1.5" />
                    <p className="text-xs font-bold text-gray-900">Upload Studio Logo</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Drag & drop or click to upload</p>
                    <p className="text-[10px] text-gray-400 mt-1">Supported: JPG, PNG, WebP | Max size: 5 MB</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#F20D24] hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-red-900/20 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Side: Studio Preview & Studio Information (approx 5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Studio Preview Card */}
            <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#F20D24]" />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Studio Preview</h4>
                  <p className="text-[11px] text-gray-400">This is how your studio name and logo will appear to your guests.</p>
                </div>
              </div>

              {/* Preview Display Banner */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-inner flex flex-col items-center justify-center p-6 text-center text-white">
                <img
                  src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80"
                  alt="Wedding background"
                  className="absolute inset-0 w-full h-full object-cover filter brightness-[0.4]"
                />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-[#111116] border-2 border-white/60 shadow-xl flex items-center justify-center overflow-hidden mb-2">
                    {studioLogo ? <img src={studioLogo} alt="Studio logo" className="w-full h-full object-contain bg-white p-1" /> : <div className="flex flex-col items-center"><span className="text-[10px] font-black text-white leading-none">ON AIR</span><span className="text-[8px] font-bold text-[#F20D24] uppercase leading-none mt-0.5">Studio</span></div>}
                  </div>
                  <h4 className="text-xl font-extrabold tracking-tight drop-shadow-md">
                    {studioName}
                  </h4>
                  <p className="text-[10px] text-gray-300 font-medium tracking-widest uppercase mt-0.5">
                    Official Media & Live Stream Partner
                  </p>
                </div>
              </div>
            </div>

            {/* Studio Information Summary Card */}
            <div className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#F20D24]" />
                <h4 className="text-sm font-bold text-gray-900">Studio Information</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-gray-400" />
                    Studio Name
                  </span>
                  <span className="font-bold text-gray-900">{profile.studioName}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    Owner Name
                  </span>
                  <span className="font-bold text-gray-900">{profile.ownerName}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    Mobile Number
                  </span>
                  <span className="font-bold text-gray-900">{profile.mobileNumber}</span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-gray-400" />
                    Joined On
                  </span>
                  <span className="font-bold text-gray-900">{profile.joinedDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'album-storage' ? (
        <AlbumPlanPurchase />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E7E9F0] p-8 text-center text-xs text-gray-500">
          Settings for {activeTab} configured with default enterprise studio policies.
        </div>
      )}
    </div>
  );
};
