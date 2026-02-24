const { app, BrowserWindow, shell, Menu, nativeImage } = require('electron')
const path = require('path')

const PRODUCTION_URL = 'https://memster.pl'

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.png')
  const icon = nativeImage.createFromPath(iconPath)

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
    show: false, // Pokaż po załadowaniu (brak białego flashowania)
  })

  // Ukryj domyślne menu
  Menu.setApplicationMenu(null)

  // Załaduj aplikację
  win.loadURL(PRODUCTION_URL)

  // Pokaż okno po załadowaniu
  win.once('ready-to-show', () => {
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

  // Nawigacja do zewnętrznych URLi - otwieraj w przeglądarce
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(PRODUCTION_URL)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // macOS: odtwórz okno po kliknięciu ikony w docku
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
