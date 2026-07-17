const { app, BrowserWindow, BrowserView, shell, ipcMain, dialog, session } = require('electron');
const path = require('path');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;
let browserView;
let downloadPath = path.join(os.homedir(), 'Downloads', 'VideoSniffer');

// Ensure download directory exists
function ensureDownloadDir() {
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'VideoSniffer - Browser & Video Downloader',
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: true,
    autoHideMenuBar: true,
  });

  // Load the Next.js UI
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5000');
  } else {
    const serverFile = path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js');
    if (fs.existsSync(serverFile)) {
      spawn(process.execPath, [serverFile], {
        env: { ...process.env, PORT: '5000', HOSTNAME: '127.0.0.1' },
        stdio: 'pipe',
      });
    }
    mainWindow.loadURL('http://localhost:5000');
  }

  // Create BrowserView for web content
  browserView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'webview-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  });

  mainWindow.setBrowserView(browserView);

  // Position the BrowserView below the UI controls
  // Top area: tabs (40px) + nav bar (48px) + bookmarks (32px) = ~120px
  // Bottom: status bar (28px)
  const updateViewBounds = () => {
    const [width, height] = mainWindow.getContentSize();
    const topOffset = 120;
    const bottomOffset = 28;
    const sidePanelWidth = 0; // Will be adjusted when panels open

    browserView.setBounds({
      x: 0,
      y: topOffset,
      width: width - sidePanelWidth,
      height: height - topOffset - bottomOffset,
    });
  };

  updateViewBounds();
  mainWindow.on('resize', updateViewBounds);

  // Navigate to initial URL
  browserView.webContents.loadURL('https://www.bilibili.com');

  // Track navigation events
  browserView.webContents.on('did-navigate', (_, url) => {
    mainWindow.webContents.send('url-changed', url);
  });
  browserView.webContents.on('did-navigate-in-page', (_, url) => {
    mainWindow.webContents.send('url-changed', url);
  });

  // Open external links in default browser
  browserView.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    browserView = null;
  });
}

app.whenReady().then(() => {
  ensureDownloadDir();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============= IPC Handlers =============

// Navigate to URL
ipcMain.handle('navigate', (_, url) => {
  if (browserView) {
    browserView.webContents.loadURL(url);
    return { success: true };
  }
  return { success: false, error: 'No browser view' };
});

// Go back
ipcMain.handle('go-back', () => {
  if (browserView && browserView.webContents.canGoBack()) {
    browserView.webContents.goBack();
    return { success: true };
  }
  return { success: false };
});

// Go forward
ipcMain.handle('go-forward', () => {
  if (browserView && browserView.webContents.canGoForward()) {
    browserView.webContents.goForward();
    return { success: true };
  }
  return { success: false };
});

// Refresh
ipcMain.handle('refresh', () => {
  if (browserView) {
    browserView.webContents.reload();
    return { success: true };
  }
  return { success: false };
});

// Get current URL
ipcMain.handle('get-url', () => {
  if (browserView) {
    return browserView.webContents.getURL();
  }
  return '';
});

// Scan for videos on the current page
ipcMain.handle('scan-videos', async () => {
  if (!browserView) return [];

  // Inject video detection script
  const detectionScript = `
    (function() {
      const videos = [];
      
      // Find video elements
      document.querySelectorAll('video').forEach((v, i) => {
        const src = v.src || v.currentSrc || '';
        if (src) {
          videos.push({
            id: 'video-' + i,
            url: src,
            title: document.title || 'Video ' + (i + 1),
            duration: v.duration ? Math.round(v.duration) + 's' : '',
            type: v.type || 'video/mp4',
            thumbnail: '',
          });
        }
      });

      // Find source elements within video tags
      document.querySelectorAll('video source').forEach((s, i) => {
        const src = s.src || '';
        if (src) {
          videos.push({
            id: 'source-' + i,
            url: src,
            title: document.title || 'Video ' + (i + 1),
            duration: '',
            type: s.type || 'video/mp4',
            thumbnail: '',
          });
        }
      });

      // Find iframe embeds (YouTube, Bilibili, etc.)
      document.querySelectorAll('iframe[src*="video"], iframe[src*="player"]').forEach((f, i) => {
        videos.push({
          id: 'iframe-' + i,
          url: f.src,
          title: f.title || document.title || 'Embedded Video ' + (i + 1),
          duration: '',
          type: 'text/html',
          thumbnail: '',
        });
      });

      // Find .m3u8 and .mp4 links in page
      const pageText = document.documentElement.innerHTML;
      const m3u8Regex = /https?:\\/\\/[^"\\s']+\\.m3u8[^"\\s']*/g;
      const mp4Regex = /https?:\\/\\/[^"\\s']+\\.mp4[^"\\s']*/g;
      
      const m3u8Matches = pageText.match(m3u8Regex) || [];
      const mp4Matches = pageText.match(mp4Regex) || [];
      
      [...new Set(m3u8Matches)].forEach((url, i) => {
        videos.push({
          id: 'm3u8-' + i,
          url: url,
          title: 'HLS Stream ' + (i + 1),
          duration: '',
          type: 'application/x-mpegURL',
          thumbnail: '',
        });
      });

      [...new Set(mp4Matches)].forEach((url, i) => {
        videos.push({
          id: 'mp4-' + i,
          url: url,
          title: 'MP4 Video ' + (i + 1),
          duration: '',
          type: 'video/mp4',
          thumbnail: '',
        });
      });

      // Find Bilibili/YouTube specific patterns
      const bilibiliRegex = /https?:\\/\\/[^"\\s']*bilivideo[^"\\s']*/g;
      const biliMatches = pageText.match(bilibiliRegex) || [];
      [...new Set(biliMatches)].forEach((url, i) => {
        videos.push({
          id: 'bili-' + i,
          url: url,
          title: 'Bilibili Video ' + (i + 1),
          duration: '',
          type: 'video/mp4',
          thumbnail: '',
        });
      });

      return videos;
    })();
  `;

  try {
    const result = await browserView.webContents.executeJavaScript(detectionScript);
    return result || [];
  } catch (err) {
    console.error('Scan error:', err);
    return [];
  }
});

// Download video
ipcMain.handle('download-video', async (_, { url, title, ext }) => {
  if (!browserView) return { success: false, error: 'No browser view' };

  ensureDownloadDir();

  const filename = `${(title || 'video').replace(/[<>:"/\\|?*]/g, '_')}.${ext || 'mp4'}`;
  const outputPath = path.join(downloadPath, filename);

  try {
    // Use yt-dlp for downloading and converting to MP4
    const args = [
      '--no-playlist',
      '--no-warnings',
      '-f', 'best',
      '-o', outputPath,
      '--merge-output-format', 'mp4',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      url,
    ];

    return new Promise((resolve) => {
      const proc = execFile('yt-dlp', args, { timeout: 600000 }, (error, stdout, stderr) => {
        if (error) {
          // Fallback: try direct download
          browserView.webContents.downloadURL(url);
          resolve({ success: true, method: 'browser-download', path: downloadPath });
        } else {
          resolve({ success: true, method: 'yt-dlp', path: outputPath });
        }
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Choose download folder
ipcMain.handle('choose-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: downloadPath,
    title: 'Select Download Folder',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    downloadPath = result.filePaths[0];
    ensureDownloadDir();
    return { success: true, path: downloadPath };
  }
  return { success: false };
});

// Get download path
ipcMain.handle('get-download-path', () => {
  return downloadPath;
});

// Set download path
ipcMain.handle('set-download-path', (_, newPath) => {
  downloadPath = newPath;
  ensureDownloadDir();
  return { success: true };
});

// Adjust view bounds when side panels open/close
ipcMain.handle('adjust-view', (_, sidePanelWidth) => {
  if (!mainWindow || !browserView) return;
  const [width, height] = mainWindow.getContentSize();
  const topOffset = 120;
  const bottomOffset = 28;

  browserView.setBounds({
    x: 0,
    y: topOffset,
    width: width - sidePanelWidth,
    height: height - topOffset - bottomOffset,
  });
});
