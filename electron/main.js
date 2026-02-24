const { app, BrowserWindow, shell, Menu, nativeImage } = require('electron')
const path = require('path')

const PRODUCTION_URL = 'https://memster.pl'

let splashWindow = null

// ── Splash screen ────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 320,
    height: 390,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  splashWindow.loadFile(path.join(__dirname, 'splash.html'))

  splashWindow.once('ready-to-show', () => {
    splashWindow.show()
  })
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
    splashWindow = null
  }
}

// ── Główne okno ───────────────────────────────────────────────
function createWindow() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'))

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // Zachowaj sesję między uruchomieniami
      partition: 'persist:memster',
    },
    icon,
    title: 'Memster',
    backgroundColor: '#0a0a0c',
    autoHideMenuBar: true,
    show: false,
  })

  // Ukryj domyślne menu
  Menu.setApplicationMenu(null)

  // Ustaw niestandardowy User-Agent — React może sprawdzić czy działa jako desktop
  const baseUA = win.webContents.getUserAgent()
  win.webContents.setUserAgent(baseUA + ' MemsterDesktop/1.0.0')

  // Załaduj aplikację
  win.loadURL(PRODUCTION_URL)

  // Fallback — jeśli po 12 s strona nadal nie gotowa (brak internetu), zamknij splash
  const splashTimeout = setTimeout(() => {
    closeSplash()
    win.show()
    win.focus()
  }, 12000)

  // Pokaż okno po załadowaniu, zamknij splash
  win.once('ready-to-show', () => {
    clearTimeout(splashTimeout)
    closeSplash()
    win.show()
    win.focus()
  })

  // Linki zewnętrzne otwieraj w przeglądarce systemowej
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(PRODUCTION_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Nawigacja do zewnętrznych URLi — otwieraj w przeglądarce
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(PRODUCTION_URL)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
}

// ── Start ─────────────────────────────────────────────────────
app.whenReady().then(() => {
  createSplash()
  createWindow()

  app.on('activate', () => {
    // macOS: odtwórz okno po kliknięciu ikony w docku
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
