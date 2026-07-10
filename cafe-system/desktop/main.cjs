// كابانا — غلاف تطبيق الديسك توب (Electron)
// يشغّل خادم النظام داخلياً ثم يفتح الواجهة فُل سكرين — مهيّأ لشاشة التاتش
const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// ===== منع تجميد النافذة والإدخال على ويندوز =====
// ويندوز أحياناً يفتكر إن النافذة "مغطّاة" فيجمّد الرسم والكيبورد والماوس لحد ما
// تعمل alt-tab أو تضغط زر ويندوز. الأسطر دي بتطفّي السلوك ده وتمنع تجميد النافذة.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

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
    autoHideMenuBar: true,
    backgroundColor: '#f4f1ea',
    webPreferences: {
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: false, // لا تُبطّئ/تجمّد الصفحة لما تفقد التركيز
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  // نافذة مكبّرة تملأ الشاشة بس تسيب شريط مهام ويندوز ظاهر (يوصله باللمس)
  win.maximize();
  win.loadURL(`http://localhost:${PORT}`);

  // منع النوافذ المنبثقة (وضع الكشك): لو ضغطة على قايمة جانبية اتفهمت غلط
  // كـ"افتح في نافذة جديدة"، نفتح الصفحة جوه نفس النافذة بدل نافذة صغيرة منفصلة
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url && url.startsWith(`http://localhost:${PORT}`)) win.loadURL(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) e.preventDefault();
  });

  // اختصارات مفيدة على شاشة الكاشير
  globalShortcut.register('F11', () => win.setFullScreen(!win.isFullScreen()));
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit()); // خروج آمن
  globalShortcut.register('CommandOrControl+R', () => win.reload());
}

// ===== الطباعة الصامتة على ماكينة الفواتير =====
// الواجهة بتبعت صفحة HTML مستقلة فيها الإيصال فقط (opts.html)، بنحمّلها في
// نافذة مخفية ونطبعها بمقاس رول 80مم وارتفاع بطول محتوى الإيصال فعلياً.
// (طباعة صفحة البرنامج نفسها بإخفاء الواجهة كانت بتطلع صفحة فاضية —
//  الطابعة تقص الورق من غير ما تطبع حاجة)
ipcMain.handle('print-silent', async (e, opts) => {
  const printOptions = { silent: true, printBackground: true, margins: { marginType: 'none' } };
  if (opts && opts.deviceName) printOptions.deviceName = opts.deviceName; // ماكينة محددة بالاسم

  // تحقق مبكر بدل الفشل الصامت: الاسم المحفوظ لازم يطابق طابعة موجودة فعلاً،
  // ولو مفيش اسم محفوظ لازم تكون الطابعة الافتراضية حقيقية (مش Print to PDF)
  try {
    const printers = await e.sender.getPrintersAsync();
    if (printOptions.deviceName) {
      const found = printers.some((p) => p.name === printOptions.deviceName);
      if (!found) {
        const names = printers.map((p) => p.name).join(' | ') || 'لا يوجد';
        return {
          success: false,
          reason:
            'الطابعة المحفوظة "' + printOptions.deviceName + '" مش موجودة على الجهاز.\n' +
            'الطابعات المتاحة: ' + names + '\nروح للإعدادات واختار الطابعة الصح.',
        };
      }
    } else {
      // مفيش اسم محفوظ: خد الافتراضية الحقيقية، ولو ويندوز مش معلّم افتراضية
      // (وضع Let Windows manage) استخدم الطابعة الحقيقية الوحيدة تلقائياً
      const isVirtual = (n) => /PDF|XPS|OneNote|Fax/i.test(n);
      const real = printers.filter((p) => !isVirtual(p.name));
      const def = printers.find((p) => p.isDefault);
      if (def && !isVirtual(def.name)) {
        printOptions.deviceName = def.name;
      } else if (real.length === 1) {
        printOptions.deviceName = real[0].name; // طابعة حقيقية واحدة بس — دي ماكينة الفواتير أكيد
      } else if (real.length === 0) {
        return { success: false, reason: 'مفيش طابعة حقيقية متوصلة بالجهاز — وصّل ماكينة الفواتير الأول.' };
      } else {
        return {
          success: false,
          reason: 'في أكتر من طابعة على الجهاز (' + real.map((p) => p.name).join(' | ') + ') — اختار ماكينة الفواتير من الإعدادات.',
        };
      }
    }
  } catch { /* لو القائمة فشلت نكمّل ونحاول الطباعة عادي */ }

  // الطريقة القديمة (طباعة الصفحة الحالية) كبديل لو مفيش html
  if (!opts || !opts.html) {
    return new Promise((resolve) => {
      e.sender.print(printOptions, (success, reason) => resolve({ success, reason }));
    });
  }

  let pw = null;
  try {
    pw = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true },
    });
    await pw.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(opts.html));

    // استنى تحميل الخط ثم قيس ارتفاع الإيصال الحقيقي بالبكسل
    const heightPx = await pw.webContents.executeJavaScript(
      'document.fonts.ready.then(() => Math.max(document.body.scrollHeight, 120))'
    );
    // تحويل بكسل → ميكرون (96px = بوصة = 25.4مم) + هامش أمان بسيط قبل القص
    const heightMicrons = Math.ceil((heightPx * 25.4 * 1000) / 96) + 4000;
    printOptions.pageSize = { width: 80000, height: heightMicrons }; // رول 80مم

    return await new Promise((resolve) => {
      pw.webContents.print(printOptions, (success, reason) => resolve({ success, reason }));
    });
  } catch (err) {
    return { success: false, reason: String(err && err.message) };
  } finally {
    // اقفل نافذة الطباعة المخفية بعد ما الأمر يتبعت للطابعة
    if (pw) setTimeout(() => { try { pw.close(); } catch {} }, 15000);
  }
});

ipcMain.handle('list-printers', async (e) => {
  try {
    return await e.sender.getPrintersAsync();
  } catch {
    return [];
  }
});

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
