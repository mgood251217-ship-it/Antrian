const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printTicket: () => ipcRenderer.send('print-ticket'),
  restartApp: () => ipcRenderer.send('restart-app')
});
