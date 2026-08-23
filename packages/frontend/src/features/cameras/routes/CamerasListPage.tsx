import React, { useState, useRef } from 'react';
import {
  Upload,
  Play,
  Clock,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  FileText,
  RotateCcw,
  Bot,
  Layers,
  ChevronRight,
  Sliders,
  Plus,
  Tv,
  X,
  RefreshCw,
  Film,
  Cpu,
} from 'lucide-react';
import { useAssets } from '@/features/assets/api/useAssets';
import {
  useVideoAnalyses,
  useVideoAnalysisDetail,
  useUploadVideo,
  useReanalyzeVideo,
} from '../api/useVideoAnalysis';
import { useCameras } from '../api/useCameras';
import { CameraManagementModal } from '../components/CameraManagementModal';
import { SiteAnalystPanel } from '@/features/ai/components/SiteAnalystPanel';

export const CamerasListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'videos' | 'devices'>('videos');
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAnalystOpen, setIsAnalystOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Video Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('DRONE');
  const [targetBudget, setTargetBudget] = useState<number>(45);

  // Queries
  const { data: videoData, isLoading: isVideosLoading } = useVideoAnalyses();
  const { data: assetData } = useAssets({ take: 100 });
  const { data: cameraData } = useCameras();
  const { data: selectedVideo } = useVideoAnalysisDetail(selectedVideoId);

  // Mutations
  const { mutateAsync: uploadVideo, isPending: isUploading } = useUploadVideo();
  const { mutateAsync: reanalyzeVideo, isPending: isReanalyzing } = useReanalyzeVideo();

  // Video Player Ref
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  const videos = videoData?.videos || [];
  const assets = assetData?.assets || [];
  const cameras = cameraData?.cameras || [];

  // Summary Metrics
  const totalVideos = videos.length;
  const completedVideos = videos.filter((v) => v.status === 'COMPLETED').length;
  const totalFindings = videos.reduce((sum, v) => sum + (v.findings?.length || 0), 0);
  const totalFrames = videos.reduce((sum, v) => sum + (v.frameCount || 0), 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedAssetId) return;

    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('assetId', selectedAssetId);
    formData.append('sourceType', sourceType);
    formData.append('targetFrameBudget', String(targetBudget));

    try {
      await uploadVideo(formData);
      setIsUploadOpen(false);
      setSelectedFile(null);
      setSelectedAssetId('');
    } catch (err: any) {
      alert(`Upload failed: ${err.message || 'Error occurred'}`);
    }
  };

  const seekToTimestamp = (seconds: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = seconds;
      videoPlayerRef.current.play();
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ANALYZED
          </span>
        );
      case 'ANALYZING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1.5 shadow-xs animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin text-teal-600" />
            ROBOFLOW VISION
          </span>
        );
      case 'EXTRACTING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 shadow-xs animate-pulse">
            <Layers className="w-3 h-3 animate-spin text-amber-600" />
            SAMPLING FRAMES
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 shadow-xs">
            <X className="w-3 h-3 text-rose-600" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-500" />
            QUEUED
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-16 pt-2 space-y-6 text-slate-800 font-sans">
      {/* ─── COMMAND CENTER HERO PANEL ─── */}
      <div className="glass-panel p-7 sm:p-8 rounded-3xl relative overflow-hidden border border-white/80 bg-white/70 shadow-xl backdrop-blur-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-[#7FB8B0]/15 border border-[#7FB8B0]/30 text-[#428178] flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#52938B]" /> Visual Inspection Intelligence
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">Agentic Pipeline v4.0</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              Inspection Video Intelligence Hub
            </h1>
            <p className="text-sm mt-2 text-slate-600 max-w-2xl font-medium leading-relaxed">
              Upload drone flyovers, structural walkthroughs, and inspection footage for automated frame extraction,
              Roboflow computer vision defect localization, and engineering-gated triage reports.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAnalystOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold shadow-md flex items-center gap-2 transition-all hover:scale-105"
            >
              <Bot className="w-4 h-4 text-[#52938B]" />
              Ask Site Analyst
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-[#7FB8B0] hover:bg-[#6DA9A0] text-white text-sm font-bold shadow-lg shadow-teal-500/25 flex items-center gap-2 transition-all hover:scale-105"
            >
              <Upload className="w-4 h-4" />
              Upload Footage
            </button>
          </div>
        </div>

        {/* Top Intelligence Metrics Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-7 pt-6 border-t border-slate-200/70">
          <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-[#7FB8B0]/15 text-[#52938B]">
                <Film className="w-3.5 h-3.5" />
              </span>
              Monitored Videos
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {totalVideos} <span className="text-xs font-semibold text-slate-500 font-mono">({completedVideos} done)</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                <Layers className="w-3.5 h-3.5" />
              </span>
              Extracted Frames
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
              {totalFrames} <span className="text-xs font-semibold text-slate-500">budgeted</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-amber-50 text-amber-600">
                <ShieldAlert className="w-3.5 h-3.5" />
              </span>
              Detected Defect Findings
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {totalFindings} <span className="text-xs font-bold text-amber-600 font-mono">triaged</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                <Cpu className="w-3.5 h-3.5" />
              </span>
              Model Pipeline
            </span>
            <div className="text-sm font-bold text-emerald-700 mt-2 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Roboflow + Gemini
            </div>
          </div>
        </div>
      </div>

      {/* ─── TAB NAVIGATION ─── */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'videos'
                ? 'bg-white text-slate-900 border border-white/90 shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Film className="w-4 h-4 text-[#52938B]" />
            Inspection Footage Analyses ({videos.length})
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'devices'
                ? 'bg-white text-slate-900 border border-white/90 shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Tv className="w-4 h-4 text-slate-500" />
            Registered CCTV Camera Fleet ({cameras.length})
          </button>
        </div>

        {activeTab === 'devices' && (
          <button
            onClick={() => setIsCameraModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#52938B]" /> Register Camera Device
          </button>
        )}
      </div>

      {/* ─── TAB 1: INSPECTION FOOTAGE ANALYSES ─── */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          {isVideosLoading ? (
            <div className="glass-panel p-12 text-center text-slate-600 rounded-3xl bg-white/70 border border-white/80 shadow-md flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#52938B] animate-spin" />
              <p className="font-semibold text-sm">Loading inspection video records...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="glass-panel p-14 text-center rounded-3xl border border-white/80 bg-white/75 shadow-xl flex flex-col items-center justify-center gap-5 backdrop-blur-2xl">
              <div className="w-16 h-16 rounded-3xl bg-[#7FB8B0]/20 border border-[#7FB8B0]/40 flex items-center justify-center text-[#428178] shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-lg mx-auto">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Inspection Footage Analyzed Yet</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Upload a drone video flyover, structural walkthrough clip, or field camera capture to initiate automated
                  frame extraction and Roboflow defect intelligence.
                </p>
              </div>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-6 py-3 rounded-2xl bg-[#7FB8B0] hover:bg-[#6DA9A0] text-white font-bold text-sm shadow-lg shadow-teal-500/25 flex items-center gap-2 transition-transform hover:scale-105"
              >
                <Upload className="w-4 h-4" /> Upload First Inspection Video
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {videos.map((video) => {
                const findingsCount = video.findings?.length || 0;
                const criticalCount = video.findings?.filter((f) => f.severity === 'CRITICAL').length || 0;
                const highCount = video.findings?.filter((f) => f.severity === 'HIGH').length || 0;

                return (
                  <div
                    key={video.id}
                    className="glass-panel p-5 rounded-3xl border border-white/80 bg-white/80 hover:bg-white/95 transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl group"
                  >
                    <div>
                      {/* Video Top Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 truncate">
                          <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            #{video.id}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {video.asset?.name || `Asset #${video.assetId}`}
                          </span>
                        </div>
                        {getStatusBadge(video.status)}
                      </div>

                      {/* Video Thumbnail Box */}
                      <div
                        onClick={() => setSelectedVideoId(video.id)}
                        className="relative w-full h-44 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 cursor-pointer group/thumb flex items-center justify-center mb-4 shadow-sm"
                      >
                        <video
                          src={video.fileUrl}
                          className="w-full h-full object-cover opacity-75 group-hover/thumb:scale-105 group-hover/thumb:opacity-95 transition-all duration-500"
                          muted
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        <div className="w-12 h-12 rounded-2xl bg-white/90 border border-white text-slate-800 flex items-center justify-center backdrop-blur-md shadow-xl group-hover/thumb:scale-110 transition-transform">
                          <Play className="w-5 h-5 ml-0.5 text-[#52938B]" />
                        </div>
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs font-mono text-white">
                          <span className="bg-black/60 px-2.5 py-0.5 rounded-md backdrop-blur-md font-semibold">
                            ⏱️ {video.durationSeconds ? `${video.durationSeconds}s` : 'Processing'}
                          </span>
                          <span className="bg-black/60 px-2.5 py-0.5 rounded-md backdrop-blur-md font-semibold">
                            🎞️ {video.frameCount} frames
                          </span>
                        </div>
                      </div>

                      {/* Video Metadata */}
                      <h4 className="font-extrabold text-slate-900 text-base truncate mb-1" title={video.fileName}>
                        {video.fileName}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3 font-medium">
                        {video.summary || 'Awaiting agentic pipeline completion...'}
                      </p>
                    </div>

                    {/* Findings Breakdown & Action Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {findingsCount > 0 ? (
                          <>
                            <span className="text-xs font-extrabold text-slate-900 font-mono">{findingsCount}</span>
                            <span className="text-xs font-medium text-slate-500">findings:</span>
                            {criticalCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {criticalCount} Crit
                              </span>
                            )}
                            {highCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {highCount} High
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Nominal scan
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedVideoId(video.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#7FB8B0]/15 hover:bg-[#7FB8B0]/25 border border-[#7FB8B0]/40 text-[#3B776E] text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        Inspect <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: REGISTERED CCTV CAMERA FLEET ─── */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cameras.map((camera) => (
              <div key={camera.id} className="glass-panel p-5 rounded-3xl border border-white/80 bg-white/80 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="font-bold text-slate-900 text-sm">{camera.name}</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#428178] uppercase bg-[#7FB8B0]/15 px-2.5 py-0.5 rounded-md border border-[#7FB8B0]/30">
                    {camera.cameraType}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-mono space-y-1 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="truncate">RTSP: {camera.rtspUrl}</p>
                  <p>IP: {camera.ipAddress || 'DHCP'}</p>
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 font-medium">
                  <span>Registered Device</span>
                  <span className="text-emerald-700 font-bold">{camera.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: UPLOAD FOOTAGE ─── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in pt-20 pb-8">
          <div className="relative w-full max-w-xl bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto my-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Ingest Inspection Footage</h3>
                  <p className="text-xs text-slate-400">Upload video for automated 4-agent defect extraction</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Video Recording File (.mp4, .mov, .avi, .mkv)
                </label>
                <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/50 group">
                  <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-cyan-400 mb-2 transition-colors" />
                  <span className="text-sm font-semibold text-white">
                    {selectedFile ? selectedFile.name : 'Click or drag video file here'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Supports up to 500 MB per file'}
                  </span>
                </label>
              </div>

              {/* Asset Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Target Infrastructure Asset *
                </label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select an asset...</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.assetType?.name || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Capture Source
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'DRONE', label: '🛰️ Drone Flyover' },
                    { id: 'WALKTHROUGH', label: '🚶 Walkthrough' },
                    { id: 'UPLOAD', label: '📹 Fixed Scan' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSourceType(s.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        sourceType === s.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Frame Budget Settings */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Target Frame Budget:
                  </span>
                  <span className="text-xs font-mono font-extrabold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    {targetBudget} frames
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dynamic sampling extracts a bounded frame budget regardless of video length, ensuring predictable inference
                  latency and zero wasted API quotas.
                </p>
                <div className="flex gap-2 pt-1">
                  {[
                    { budget: 20, label: '⚡ Fast (20)' },
                    { budget: 45, label: '🎯 Standard (45)' },
                    { budget: 90, label: '🔍 High-Res (90)' },
                  ].map((b) => (
                    <button
                      key={b.budget}
                      type="button"
                      onClick={() => setTargetBudget(b.budget)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                        targetBudget === b.budget
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || !selectedAssetId || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting & Queueing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Start Pipeline
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: INTERACTIVE VIDEO INSPECTOR & TIMELINE ─── */}
      {selectedVideoId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-fade-in pt-16 pb-6">
          <div className="relative w-full max-w-6xl bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Play className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="font-extrabold text-white text-base truncate">
                    {selectedVideo?.fileName || 'Video Inspection Timeline'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Asset: <span className="text-cyan-300 font-semibold">{selectedVideo?.asset?.name}</span> •{' '}
                    {selectedVideo?.frameCount} Sampled Frames • {selectedVideo?.findings?.length || 0} Detected Findings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    selectedVideo && reanalyzeVideo({ id: selectedVideo.id, targetFrameBudget: 45 })
                  }
                  disabled={isReanalyzing}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
                  Re-Analyze
                </button>
                <button
                  onClick={() => setSelectedVideoId(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Inspection Split Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
              {/* Left Column: Synchronized Video Player */}
              <div className="lg:col-span-7 p-4 sm:p-6 bg-slate-950 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="relative w-full aspect-video rounded-2xl bg-black overflow-hidden border border-slate-800 shadow-2xl">
                    <video
                      ref={videoPlayerRef}
                      src={selectedVideo?.fileUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Executive Report Summary Banner */}
                  {selectedVideo?.summary && (
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                        <FileText className="w-4 h-4" /> Synthesized Inspection Intelligence
                      </div>
                      <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto font-sans">
                        {selectedVideo.summary}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Finding Timeline & Frames */}
              <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" /> Defect Timeline Findings ({selectedVideo?.findings?.length || 0})
                  </h4>
                  <span className="text-xs font-mono text-slate-400">Click to seek video</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {selectedVideo?.findings && selectedVideo.findings.length > 0 ? (
                    selectedVideo.findings.map((finding) => (
                      <div
                        key={finding.id}
                        onClick={() => seekToTimestamp(Number(finding.frameTimestamp))}
                        className="p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-cyan-500/50 cursor-pointer transition-all space-y-2 group shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                              ⏱️ {finding.frameTimestamp}s
                            </span>
                            <span className="text-xs font-bold text-white">{finding.defectType}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase border ${getSeverityBadge(
                              finding.severity
                            )}`}
                          >
                            {finding.severity}
                          </span>
                        </div>

                        {/* Finding Frame Thumbnail */}
                        {finding.frameImageUrl && (
                          <div className="relative w-full h-28 rounded-xl bg-slate-950 overflow-hidden border border-slate-800">
                            <img
                              src={finding.frameImageUrl}
                              alt={finding.defectType}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs font-mono font-bold text-cyan-300 border border-white/10 backdrop-blur-sm">
                              {finding.confidence}% Conf
                            </div>
                          </div>
                        )}

                        {/* Engineering Triage Notes */}
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {finding.triageNotes || 'Visual feature detected and queued for inspector sign-off.'}
                        </p>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-700/40">
                          <span>Review: {finding.status}</span>
                          <span className="text-cyan-400 font-semibold group-hover:underline">Seek to frame →</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-xs font-medium">No visual defects detected across sampled frames.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SITE ANALYST COPILOT MODAL ─── */}
      <SiteAnalystPanel
        isOpen={isAnalystOpen}
        onClose={() => setIsAnalystOpen(false)}
      />

      {/* ─── CAMERA REGISTRATION MODAL ─── */}
      {isCameraModalOpen && (
        <CameraManagementModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
        />
      )}
    </div>
  );
};
