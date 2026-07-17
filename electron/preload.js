const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation
  navigate: (url) => ipcRenderer.invoke('navigate', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  refresh: () => ipcRenderer.invoke('refresh'),
  getUrl: () => ipcRenderer.invoke('get-url'),

  // Video detection
  scanVideos: () => ipcRenderer.invoke('scan-videos'),

  // Download
  downloadVideo: (options) => ipcRenderer.invoke('download-video', options),

  // Folder management
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  getDownloadPath: () => ipcRenderer.invoke('get-download-path'),
  setDownloadPath: (path) => ipcRenderer.invoke('set-download-path', path),

  // View adjustment
  adjustView: (sidePanelWidth) => ipcRenderer.invoke('adjust-view', sidePanelWidth),

  // Events from main process
  onUrlChanged: (callback) => {
    ipcRenderer.on('url-changed', (_, url) => callback(url));
  },

  // Platform info
  isElectron: true,
  platform: process.platform,
});
