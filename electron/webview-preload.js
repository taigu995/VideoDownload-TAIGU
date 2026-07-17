const { contextBridge } = require('electron');

// This preload script runs in the BrowserView (web content)
// It provides a bridge for video detection within the loaded page
contextBridge.exposeInMainWorld('__videoSniffer', {
  version: '1.0.0',
});
