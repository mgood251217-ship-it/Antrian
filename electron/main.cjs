const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('./server.cjs');

let mainWindow;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  mainWindow = win;

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

ipcMain.on('print-ticket', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.print({ silent: true, printBackground: true }, () => {});
  }
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

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