'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

interface DetectedVideo {
  id: string;
  url: string;
  title: string;
  duration?: string;
  size?: string;
  type: string;
  thumbnail?: string;
}

interface HistoryItem {
  url: string;
  title: string;
  timestamp: number;
}

export default function Home() {
  // Browser state
  const [currentUrl, setCurrentUrl] = useState('https://www.bilibili.com');
  const [inputUrl, setInputUrl] = useState('https://www.bilibili.com');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Bookmarks
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([
    { id: '1', title: 'Bilibili', url: 'https://www.bilibili.com' },
    { id: '2', title: 'YouTube', url: 'https://www.youtube.com' },
    { id: '3', title: 'TikTok', url: 'https://www.tiktok.com' },
  ]);
  const [showBookmarkManager, setShowBookmarkManager] = useState(false);
  
  // Video detection
  const [detectedVideos, setDetectedVideos] = useState<DetectedVideo[]>([]);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // Download settings
  const [downloadPath, setDownloadPath] = useState('/Downloads/VideoSniffer');
  const [showSettings, setShowSettings] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'browser' | 'downloads'>('browser');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load bookmarks and settings from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('vs-bookmarks');
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }
    const savedPath = localStorage.getItem('vs-download-path');
    if (savedPath) {
      setDownloadPath(savedPath);
    }
  }, []);

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('vs-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Save download path
  useEffect(() => {
    localStorage.setItem('vs-download-path', downloadPath);
  }, [downloadPath]);

  // Navigate to URL
  const navigate = useCallback((url: string) => {
    let normalizedUrl = url.trim();
    if (!normalizedUrl) return;
    
    // Add protocol if missing
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      // Check if it looks like a domain
      if (normalizedUrl.includes('.') && !normalizedUrl.includes(' ')) {
        normalizedUrl = 'https://' + normalizedUrl;
      } else {
        // Treat as search query
        normalizedUrl = `https://www.google.com/search?q=${encodeURIComponent(normalizedUrl)}`;
      }
    }
    
    setCurrentUrl(normalizedUrl);
    setInputUrl(normalizedUrl);
    setIsLoading(true);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ url: normalizedUrl, title: normalizedUrl, timestamp: Date.now() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCanGoBack(newHistory.length > 1);
    setCanGoForward(false);
    
    // Clear detected videos for new page
    setDetectedVideos([]);
  }, [history, historyIndex]);

  // Handle URL input submit
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(inputUrl);
  };

  // Navigation controls
  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(history[newIndex].url);
      setInputUrl(history[newIndex].url);
      setCanGoBack(newIndex > 0);
      setCanGoForward(true);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(history[newIndex].url);
      setInputUrl(history[newIndex].url);
      setCanGoBack(true);
      setCanGoForward(newIndex < history.length - 1);
    }
  };

  const refresh = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  // Bookmark management
  const addBookmark = () => {
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      title: new URL(currentUrl).hostname,
      url: currentUrl,
    };
    setBookmarks([...bookmarks, newBookmark]);
  };

  const removeBookmark = (id: string) => {
    setBookmarks(bookmarks.filter(b => b.id !== id));
  };

  const isCurrentPageBookmarked = bookmarks.some(b => b.url === currentUrl);

  // Video scanning simulation
  const scanForVideos = async () => {
    setIsScanning(true);
    setShowVideoPanel(true);
    
    // Simulate video detection
    // In real Electron app, this would inject scripts into the webview
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock detected videos for demo
    const mockVideos: DetectedVideo[] = [
      {
        id: '1',
        url: 'https://example.com/video1.mp4',
        title: 'Sample Video 1 - HD Quality',
        duration: '5:32',
        size: '45.2 MB',
        type: 'video/mp4',
        thumbnail: 'https://via.placeholder.com/160x90/1e293b/64748b?text=Video+1',
      },
      {
        id: '2',
        url: 'https://example.com/video2.m3u8',
        title: 'Sample Video 2 - Stream',
        duration: '12:15',
        size: '128.5 MB',
        type: 'application/x-mpegURL',
        thumbnail: 'https://via.placeholder.com/160x90/1e293b/64748b?text=Video+2',
      },
      {
        id: '3',
        url: 'https://example.com/video3.webm',
        title: 'Sample Video 3 - WebM',
        duration: '3:45',
        size: '28.7 MB',
        type: 'video/webm',
        thumbnail: 'https://via.placeholder.com/160x90/1e293b/64748b?text=Video+3',
      },
    ];
    
    setDetectedVideos(mockVideos);
    setIsScanning(false);
  };

  // Download video
  const downloadVideo = async (video: DetectedVideo) => {
    // In real app, this would call the backend API
    alert(`Downloading: ${video.title}\nFormat: ${video.type}\nSave to: ${downloadPath}\n\nNote: In the desktop app, this will download and convert to MP4.`);
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Choose download folder (simulated)
  const chooseFolder = () => {
    const newPath = prompt('Enter download folder path:', downloadPath);
    if (newPath) {
      setDownloadPath(newPath);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Top Bar - Tabs */}
      <div className="flex items-center bg-slate-900/80 border-b border-white/5">
        <div className="flex items-center gap-1 px-2 py-1.5">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-800/50 rounded-t-lg border border-white/10 border-b-0 min-w-[200px]">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400" />
            <span className="text-sm truncate flex-1">
              {currentUrl ? new URL(currentUrl).hostname : 'New Tab'}
            </span>
            <button className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/10">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={() => setShowVideoPanel(!showVideoPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
              showVideoPanel 
                ? 'bg-violet-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Videos {detectedVideos.length > 0 && `(${detectedVideos.length})`}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 border-b border-white/5">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={refresh}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* URL Bar */}
        <form onSubmit={handleUrlSubmit} className="flex-1 flex">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="Enter URL or search..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={scanForVideos}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-50 text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
          >
            {isScanning ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Scan Videos
              </>
            )}
          </button>
          <button
            onClick={addBookmark}
            disabled={isCurrentPageBookmarked}
            className={`p-2 rounded-lg transition-all ${
              isCurrentPageBookmarked
                ? 'text-yellow-400 bg-yellow-400/10'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={isCurrentPageBookmarked ? 'Already bookmarked' : 'Add bookmark'}
          >
            <svg className="w-4 h-4" fill={isCurrentPageBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bookmarks Bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-900/40 border-b border-white/5 overflow-x-auto">
        {bookmarks.map(bookmark => (
          <button
            key={bookmark.id}
            onClick={() => navigate(bookmark.url)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap group"
          >
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-violet-500/50 to-cyan-500/50" />
            <span>{bookmark.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeBookmark(bookmark.id);
              }}
              className="opacity-0 group-hover:opacity-100 ml-1 text-slate-500 hover:text-red-400 transition-opacity"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </button>
        ))}
        {bookmarks.length === 0 && (
          <span className="text-xs text-slate-500 px-2">No bookmarks yet. Click the star icon to add one.</span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Browser Content */}
        <div className="flex-1 relative bg-white">
          <iframe
            ref={iframeRef}
            src={currentUrl}
            onLoad={handleIframeLoad}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            title="Browser Content"
          />
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-800">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>

        {/* Video Panel */}
        {showVideoPanel && (
          <div className="w-96 bg-slate-900/95 border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Detected Videos
              </h3>
              <button
                onClick={() => setShowVideoPanel(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {detectedVideos.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-slate-500">No videos detected</p>
                  <p className="text-xs text-slate-600 mt-1">Click "Scan Videos" to detect videos on this page</p>
                </div>
              ) : (
                detectedVideos.map(video => (
                  <div
                    key={video.id}
                    className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all"
                  >
                    <div className="flex gap-3">
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-24 h-14 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">{video.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          {video.duration && <span>{video.duration}</span>}
                          {video.size && <span>{video.size}</span>}
                          <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] uppercase">
                            {video.type.split('/')[1]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadVideo(video)}
                      className="mt-2 w-full py-1.5 rounded-md bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download as MP4
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 bg-slate-900/95 border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Download Location */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Download Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={downloadPath}
                    onChange={e => setDownloadPath(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <button
                    onClick={chooseFolder}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-all"
                  >
                    Browse
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Videos will be saved to this folder and converted to MP4 format
                </p>
              </div>

              {/* Output Format */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Output Format
                </label>
                <select className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                  <option value="mp4">MP4 (Recommended)</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                </select>
              </div>

              {/* Video Quality */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Preferred Quality
                </label>
                <select className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                  <option value="best">Best Available</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                </select>
              </div>

              {/* Auto-scan */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Auto-scan videos</p>
                  <p className="text-xs text-slate-500">Automatically detect videos when page loads</p>
                </div>
                <button className="relative w-10 h-5 rounded-full bg-violet-600 transition-colors">
                  <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-slate-900/80 border-t border-white/5 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>{currentUrl}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Save to: {downloadPath}</span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Ready
          </span>
        </div>
      </div>
    </div>
  );
}
