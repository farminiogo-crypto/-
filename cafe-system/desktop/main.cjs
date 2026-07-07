// كابانا — غلاف تطبيق الديسك توب (Electron)
// يشغّل خادم النظام داخلياً ثم يفتح الواجهة فُل سكرين — مهيّأ لشاشة التاتش
const { app, BrowserWindow, globalShortcut } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 4000;
const SERVER_DIR = path.join(__dirname, '..', 'server');
const SERVER_ENTRY = path.join(SERVER_DIR, 'src', 'index.js');

let serverProc = null;
let win = null;

// تشغيل خادم النظام كعملية Node منفصلة (better-sqlite3 يعمل مع Node المثبّت)
function startServer() {
  const nodeBin = process.platform === 'win32' ? 'node.exe' : 'node';
  serverProc = spawn(nodeBin, [SERVER_ENTRY], {
    cwd: SERVER_DIR,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit',
  });
  serverProc.on('error', (err) => {
    console.error('تعذّر تشغيل الخادم — تأكد أن Node.js مثبّت:', err.message);
  });
}

// الانتظار حتى يستجيب الخادم قبل فتح النافذة
function waitForServer(done, tries = 0) {
  const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
    res.resume();
    if (res.statusCode === 200) return done();
    retry();
  });
  req.on('error', retry);
  req.setTimeout(1500, () => req.destroy());
  function retry() {
    if (tries > 80) return done(); // ~40 ثانية كحد أقصى ثم نفتح على أي حال
    setTimeout(() => waitForServer(done, tries + 1), 500);
  }
}

function createWindow() {
  win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#f4f1ea',
    webPreferences: { contextIsolation: true, spellcheck: false },
  });
  win.loadURL(`http://localhost:${PORT}`);

  // اختصارات مفيدة على شاشة الكاشير
  globalShortcut.register('F11', () => win.setFullScreen(!win.isFullScreen()));
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit()); // خروج آمن
  globalShortcut.register('CommandOrControl+R', () => win.reload());
}

app.whenReady().then(() => {
  startServer();
  waitForServer(createWindow);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  if (serverProc) serverProc.kill();
});
app.on('will-quit', () => globalShortcut.unregisterAll());
