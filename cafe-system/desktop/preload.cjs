// جسر آمن بين الواجهة وتطبيق الديسك توب (للطباعة الصامتة على ماكينة الفواتير)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kabana', {
  desktop: true,
  // طباعة صامتة مباشرة على ماكينة الفواتير بدون نافذة حوار (opts.deviceName اختياري)
  printSilent: (opts) => ipcRenderer.invoke('print-silent', opts),
  // قائمة الطابعات المتاحة (لو حبينا نختار طابعة معينة لاحقاً)
  listPrinters: () => ipcRenderer.invoke('list-printers'),
});
