// ─── Electron Main Process ────────────────────────────────────────────────────
const { app, BrowserWindow, Menu } = require('electron');
const os   = require('os');
const path = require('path');

// ── Inicia o servidor de jogo embutido ───────────────────────────────────────
const { serverReady } = require('../server.js');

function getLocalIPs() {
  const result = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) result.push(iface.address);
    }
  }
  return result;
}

// ── Janela principal ─────────────────────────────────────────────────────────
let win;

function createWindow() {
  Menu.setApplicationMenu(null); // remove barra de menus padrão

  win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    frame: false,
    backgroundColor: '#07070f',
    show: false,
    title: 'Bomberman LAN',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Gamepad API precisa de secure context — localhost já é seguro
    },
  });

  serverReady.then(port => {
    const ips = getLocalIPs();
    // Injeta o IP local como variável global antes da página carregar
    win.webContents.on('did-finish-load', () => {
      win.webContents.executeJavaScript(
        `window.__LOCAL_IPS__ = ${JSON.stringify(ips)}; window.__PORT__ = ${port};`
      );
    });
    win.loadURL(`http://localhost:${port}`);
    win.once('ready-to-show', () => win.show());
  });

  // ── Atalhos de teclado ────────────────────────────────────────────────────
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.key === 'F4' && input.alt) app.quit();
    if (input.key === 'F12') win.webContents.toggleDevTools();
    // Escape sai do fullscreen (mas não fecha o app)
    if (input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false);
    }
  });

  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // No Windows/Linux, fechar a janela encerra o processo (e o servidor embutido)
  if (process.platform !== 'darwin') app.quit();
});
