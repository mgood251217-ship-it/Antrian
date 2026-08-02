const { app, BrowserWindow } = require('electron');
const path = require('path');
require('./server.cjs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.setMenuBarVisibility(false);

  win.webContents.on('before-input-event', (event, input) => {
    const isDevToolsShortcut =
      input.key === 'F12' ||
      (input.key && input.key.toLowerCase() === 'i' && input.control && input.shift);

    if (isDevToolsShortcut) {
      event.preventDefault();
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools();
      }
    }
  });

  const startUrl = process.env.NODE_ENV === 'production'
    ? `file://${path.join(__dirname, '../dist/index.html')}`
    : 'http://localhost:5178';

  setTimeout(() => {
    win.loadURL(startUrl);
  }, 4000);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});