const { app, BrowserWindow, shell, Menu, nativeImage } = require('electron')
const path = require('path')

const PRODUCTION_URL = 'https://memster.pl'

let splashWindow = null
let mainWindow = null            // globalna ref do głównego okna
let splashReady = false          // splash załadowany
let appReady = false             // główne okno gotowe
let splashShownAt = 0            // timestamp pojawienia się splash

const SPLASH_MIN_MS = 2000       // minimum 2 sekundy

// ── Splash screen ────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 340,
    height: 400,
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
    splashShownAt = Date.now()
    splashReady = true
    // Jeśli główne okno zdążyło się już załadować — sprawdź czy można zamknąć
    maybeCloseSplash(mainWindow)
  })
}

// Fade-out + zamknięcie z zachowaniem minimum 2s
function maybeCloseSplash(win) {
  if (!splashReady || !appReady) return

  const elapsed = Date.now() - splashShownAt
  const remaining = Math.max(0, SPLASH_MIN_MS - elapsed)

  setTimeout(() => {
    // Wyślij sygnał CSS fade-out
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.executeJavaScript(
        `document.getElementById('container').classList.add('fade-out')`
      ).catch(() => {})
    }
    // Zamknij okno po zakończeniu animacji (350ms)
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close()
        splashWindow = null
      }
      if (win && !win.isDestroyed()) {
        win.show()
        win.focus()
      }
    }, 370)
  }, remaining)
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

  mainWindow = win   // globalna ref dla splash callback

  // Ukryj domyślne menu
  Menu.setApplicationMenu(null)

  // Ustaw niestandardowy User-Agent — React może sprawdzić czy działa jako desktop
  const baseUA = win.webContents.getUserAgent()
  win.webContents.setUserAgent(baseUA + ' MemsterDesktop/1.0.0')

  // Załaduj aplikację
  win.loadURL(PRODUCTION_URL)

  // Fallback — brak internetu / timeout 12 s
  const splashTimeout = setTimeout(() => {
    appReady = true
    maybeCloseSplash(win)
  }, 12000)

  // Główne okno gotowe — zgłoś i sprawdź czy można zamknąć splash
  win.once('ready-to-show', () => {
    clearTimeout(splashTimeout)
    appReady = true
    maybeCloseSplash(win)
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
