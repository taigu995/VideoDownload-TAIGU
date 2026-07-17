'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  fps?: number;
  tbr?: number;
  format_note?: string;
}

interface VideoInfo {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  webpage_url?: string;
  description?: string;
  formats: VideoFormat[];
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(bytes?: number): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getResolutionLabel(f: VideoFormat): string {
  if (f.resolution && f.resolution !== 'audio only') {
    const match = f.resolution.match(/(\d+)x(\d+)/);
    if (match) {
      const h = parseInt(match[2]);
      if (h >= 2160) return '4K';
      if (h >= 1440) return '2K';
      if (h >= 1080) return '1080p';
      if (h >= 720) return '720p';
      if (h >= 480) return '480p';
      if (h >= 360) return '360p';
      return f.resolution;
    }
    return f.resolution;
  }
  if (f.format_note) return f.format_note;
  return 'Audio Only';
}

function hasVideo(f: VideoFormat): boolean {
  return !!f.vcodec && f.vcodec !== 'none';
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleParse = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setVideoInfo(null);
    setProgress('Connecting to video source...');

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Parse failed');
        return;
      }

      setVideoInfo(data);
      setProgress('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleDownload = useCallback(async (format: VideoFormat) => {
    if (!videoInfo) return;
    const key = format.format_id;
    setDownloading(key);
    setDownloadProgress(0);

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          formatId: format.format_id,
          ext: format.ext,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Download failed');
        setDownloading(null);
        return;
      }

      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const blob = await res.blob();
      clearInterval(progressInterval);
      setDownloadProgress(100);

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${videoInfo.title.slice(0, 50).replace(/[^\w\s-]/g, '_')}.${format.ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setTimeout(() => {
        setDownloading(null);
        setDownloadProgress(0);
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed');
      setDownloading(null);
      setDownloadProgress(0);
    }
  }, [videoInfo, url]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleParse();
  };

  const videoFormats = videoInfo?.formats.filter(f => hasVideo(f)) || [];
  const audioFormats = videoInfo?.formats.filter(f => !hasVideo(f)) || [];

  const seenRes = new Set<string>();
  const uniqueVideoFormats = videoFormats.filter(f => {
    const label = getResolutionLabel(f);
    if (seenRes.has(label)) return false;
    seenRes.add(label);
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">VideoSniffer</h1>
              <p className="text-xs text-slate-400">Web Video Detector & Downloader</p>
            </div>
          </div>
          <a
            href="/api/package"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-medium transition-all duration-200 shadow-lg shadow-violet-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Build EXE
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* URL Input */}
        <div className="relative mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste video page URL here (YouTube, Bilibili, TikTok, etc.)"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.06] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-base"
              />
            </div>
            <button
              onClick={handleParse}
              disabled={loading || !url.trim()}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-base transition-all duration-200 shadow-lg shadow-violet-500/20 flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Detecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Detect
                </>
              )}
            </button>
          </div>
          {progress && (
            <p className="mt-3 text-sm text-slate-400 flex items-center gap-2">
              <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="3" />
              </svg>
              {progress}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Video Info */}
        {videoInfo && (
          <div className="space-y-6">
            {/* Video Card */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {videoInfo.thumbnail && (
                  <div className="md:w-80 shrink-0">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-full h-48 md:h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 flex-1">
                  <h2 className="text-xl font-bold mb-2 line-clamp-2">{videoInfo.title}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                    {videoInfo.uploader && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {videoInfo.uploader}
                      </span>
                    )}
                    {videoInfo.duration ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDuration(videoInfo.duration)}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {uniqueVideoFormats.length} video + {audioFormats.length} audio
                    </span>
                  </div>
                  {videoInfo.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{videoInfo.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Video Formats */}
            {uniqueVideoFormats.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Video Formats
                </h3>
                <div className="grid gap-2">
                  {uniqueVideoFormats.map(format => (
                    <div
                      key={format.format_id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 rounded-lg bg-violet-500/20 text-violet-300 text-sm font-bold min-w-[70px] text-center">
                          {getResolutionLabel(format)}
                        </span>
                        <div className="text-sm">
                          <span className="text-slate-300">{format.ext.toUpperCase()}</span>
                          {format.fps && <span className="text-slate-500 ml-2">{format.fps}fps</span>}
                          {format.filesize && <span className="text-slate-500 ml-2">{formatSize(format.filesize)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(format)}
                        disabled={downloading !== null}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-violet-600 disabled:opacity-40 text-sm font-medium transition-all flex items-center gap-2"
                      >
                        {downloading === format.format_id ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            {downloadProgress > 0 ? `${Math.round(downloadProgress)}%` : 'Loading...'}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Formats */}
            {audioFormats.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Audio Formats
                </h3>
                <div className="grid gap-2">
                  {audioFormats.slice(0, 5).map(format => (
                    <div
                      key={format.format_id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm font-bold min-w-[70px] text-center">
                          Audio
                        </span>
                        <div className="text-sm">
                          <span className="text-slate-300">{format.ext.toUpperCase()}</span>
                          {format.tbr && <span className="text-slate-500 ml-2">{Math.round(format.tbr)}kbps</span>}
                          {format.filesize && <span className="text-slate-500 ml-2">{formatSize(format.filesize)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(format)}
                        disabled={downloading !== null}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-cyan-600 disabled:opacity-40 text-sm font-medium transition-all flex items-center gap-2"
                      >
                        {downloading === format.format_id ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!videoInfo && !loading && !error && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">Paste a video URL to get started</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Support YouTube, Bilibili, TikTok, Twitter, Instagram, and 1000+ websites.
              Detect and download video resources with one click.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {['YouTube', 'Bilibili', 'TikTok', 'Twitter/X', 'Instagram', 'Vimeo'].map(site => (
                <span key={site} className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400">
                  {site}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
