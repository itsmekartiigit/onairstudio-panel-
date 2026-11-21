import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { VideoPlayerModal } from './VideoPlayerModal';
import {
  GraduationCap,
  Search,
  Play,
  Eye,
  Clock,
  Sparkles,
  HelpCircle,
  BookOpen,
  Clapperboard,
} from 'lucide-react';

export const TrainingPage: React.FC = () => {
  const {
    trainingVideos,
    activePlayingVideo,
    setActivePlayingVideo,
  } = useStudio();

  const [activeTab, setActiveTab] = useState<'videos' | 'tips' | 'faqs' | 'docs'>('videos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Studio Setup', 'Events & Highlights', 'Photo Sharing', 'Live Streaming', 'Wallet', 'Advanced Tips'];

  const filteredVideos = trainingVideos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || v.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E7E9F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#F20D24]">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#171717]">Training</h2>
            <p className="text-xs text-[#737783]">
              Watch training videos to learn how to use all features and grow your business.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search training videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#F20D24]"
            />
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold border-b border-[#E7E9F0] pb-2">
        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'videos' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Training Videos</span>
        </button>

        <button
          onClick={() => setActiveTab('tips')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'tips' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Quick Tips</span>
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'faqs' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>FAQs</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'docs' ? 'bg-[#F20D24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Documentation</span>
        </button>
      </div>

      {/* Hero Training Banner matching image_d3681f23.png */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#111116] via-[#1E1E28] to-[#990B18] p-6 sm:p-8 text-white shadow-lg border border-[#272736] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div
            onClick={() => setActivePlayingVideo(trainingVideos[0] ?? null)}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#F20D24] flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform cursor-pointer shrink-0"
          >
            <Play className="w-8 h-8 fill-current ml-1 text-white" />
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              ON AIR Studio <span className="text-[#F20D24]">Training Center</span>
            </h3>
            <p className="text-xs text-gray-300 mt-1 max-w-md">
              Learn • Practice • Grow | Get the most out of ON AIR features with our step-by-step masterclasses.
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-xs font-semibold bg-black/40 backdrop-blur-xs p-3 rounded-xl border border-white/10">
          <Clapperboard className="w-6 h-6 text-[#F20D24]" />
          <span>Official 2026 Studio Certification Courses</span>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVideos.map((video) => (
          <div
            key={video.id}
            className="bg-white rounded-2xl border border-[#E7E9F0] shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
          >
            {/* Thumbnail with duration badge and play icon */}
            <div
              onClick={() => setActivePlayingVideo(video)}
              className="relative aspect-video overflow-hidden bg-gray-900 cursor-pointer"
            >
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950">
                  <Play className="h-12 w-12 text-white/70" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                <div className="w-11 h-11 rounded-full bg-[#F20D24] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
              {video.duration && (
                <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-black/80 text-white">
                  {video.duration}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-[#F20D24] transition-colors">
                  {video.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  {video.description}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {video.views}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivePlayingVideo(video)}
                    className="px-3 py-1.5 rounded-lg bg-[#F20D24] hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Watch Now</span>
                  </button>


                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {activeTab === 'videos' && filteredVideos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          {trainingVideos.length === 0 ? 'No training videos have been published yet.' : 'No videos match your search.'}
        </div>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={activePlayingVideo}
        onClose={() => setActivePlayingVideo(null)}
      />

    </div>
  );
};
