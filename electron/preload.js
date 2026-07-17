const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveVideo: (data, defaultName) => ipcRenderer.invoke('save-video', { data, defaultName }),
  isElectron: true,
});
