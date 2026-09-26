const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printPdf: (base64Pdf, size) => ipcRenderer.invoke('print-pdf', base64Pdf, size),
  printUrl: (url, size) => ipcRenderer.invoke('print-url', url, size),
  restartApp: () => ipcRenderer.send('restart-app')
});