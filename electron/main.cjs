const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');

process.env.ANTRIAN_DATA_DIR = app.getPath('userData');

nativeTheme.themeSource = 'light';

require('./server.cjs');

let mainWindow;
let printWin = null;
let printWinLoaded = null;

function getAppBaseUrl() {
  return app.isPackaged
    ? `file://${path.join(__dirname, '../dist/index.html')}`
    : 'http://localhost:5178';
}

function createPrintWindow() {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.on('closed', () => {
    if (printWin === win) {
      printWin = null;
      printWinLoaded = null;
    }
  });

  return win;
}

function warmupPrintWindow() {
  printWin = createPrintWindow();
  printWinLoaded = printWin.loadURL(`${getAppBaseUrl()}#/cetak`).catch((error) => {
    console.error('Gagal menyiapkan jendela cetak:', error);
  });
}

async function waitForPrintContentReady(win) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 60));
    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const start = Date.now();
        function checkReady() {
          const imgs = Array.from(document.images || []);
          const imagesReady = imgs.length === 0 || imgs.every((img) => img.complete);
          if (imagesReady || Date.now() - start > 3000) {
            resolve(true);
          } else {
            setTimeout(checkReady, 30);
          }
        }
        checkReady();
      });
    `);
  } catch (error) {

  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  mainWindow = win;

  win.setMenuBarVisibility(false);

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (input.key === 'F12') {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
      return;
    }

    const isDevToolsShortcut = input.key && input.key.toLowerCase() === 'i' && input.control && input.shift;
    if (isDevToolsShortcut) {
      event.preventDefault();
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools();
      }
    }
  });

  const startUrl = getAppBaseUrl();

  setTimeout(() => {
    win.loadURL(startUrl);
    warmupPrintWindow();
  }, 4000);
}

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('print-url', async (event, url) => {
  const hashIndex = url.indexOf('#');
  const hashPart = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';

  try {
    if (!printWin || printWin.isDestroyed()) {
      warmupPrintWindow();
    }
    await printWinLoaded;

    if (hashPart) {
      await printWin.webContents.executeJavaScript(
        `window.location.hash = ${JSON.stringify(hashPart)};`
      );
    } else {
      await printWin.loadURL(url);
    }

    await waitForPrintContentReady(printWin);

    const printers = await printWin.webContents.getPrintersAsync();
    const defaultPrinter = printers.find(p => p.isDefault) || printers[0];

    await new Promise((resolve, reject) => {
      printWin.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: defaultPrinter ? defaultPrinter.name : '',
          margins: { marginType: 'none' },
          dpi: { horizontal: 203, vertical: 203 }
        },
        (success, errorType) => {
          if (success) {
            resolve();
          } else {
            reject(new Error(errorType || 'Print gagal'));
          }
        }
      );
    });
  } catch (error) {
    console.error(error);
    if (printWin && !printWin.isDestroyed()) {
      printWin.destroy();
    }
    printWin = null;
    printWinLoaded = null;
    throw error;
  }
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
