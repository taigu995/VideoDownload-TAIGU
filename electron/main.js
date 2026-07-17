const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'VideoSniffer - Video Detector & Downloader',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: true,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
  });

  // Load the Next.js app
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5000');
  } else {
    mainWindow.loadURL('http://localhost:5000');
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Start Next.js server
  const serverPath = path.join(process.resourcesPath || path.join(__dirname, '..'), 'next-server');
  const nodePath = process.execPath;

  // In packaged app, start the Next.js standalone server
  if (app.isPackaged) {
    const serverFile = path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js');
    if (fs.existsSync(serverFile)) {
      const server = spawn(process.execPath, [serverFile], {
        env: { ...process.env, PORT: '5000', HOSTNAME: '127.0.0.1' },
        stdio: 'pipe',
      });
      server.stdout.on('data', (data) => console.log(`[Server] ${data}`));
      server.stderr.on('data', (data) => console.error(`[Server] ${data}`));
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Handle video download with native file dialog
ipcMain.handle('save-video', async (event, { data, defaultName }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'flv'] },
      { name: 'Audio Files', extensions: ['mp3', 'm4a', 'ogg', 'wav'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (filePath) {
    const buffer = Buffer.from(data);
    fs.writeFileSync(filePath, buffer);
    return { success: true, path: filePath };
  }
  return { success: false };
});
