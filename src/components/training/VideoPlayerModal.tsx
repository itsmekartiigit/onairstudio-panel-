import React, { useState } from 'react';
import { TrainingVideo } from '../../types';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Share2, Check, Download } from 'lucide-react';

interface VideoPlayerModalProps {
  video: TrainingVideo | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111116] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden text-white animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#F20D24] uppercase tracking-wider">{video.category}</span>
            <h3 className="text-base font-bold text-white leading-tight">{video.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video
            src={video.videoUrl}
            autoPlay
            controls
            className="w-full h-full object-contain"
          />
        </div>

        {/* Description & Meta */}
        <div className="p-6 space-y-3 bg-[#17171E]">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Duration: {video.duration} • {video.views}</span>
            <span>Published on {video.addedDate}</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{video.description}</p>
        </div>
      </div>
    </div>
  );
};
