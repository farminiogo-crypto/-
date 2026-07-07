// جسر آمن بين الواجهة وتطبيق الديسك توب (للطباعة الصامتة على ماكينة الفواتير)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kabana', {
  desktop: true,
  // طباعة صامتة مباشرة على الطابعة الافتراضية (ماكينة الفواتير) بدون نافذة حوار
  printSilent: () => ipcRenderer.invoke('print-silent'),
  // قائمة الطابعات المتاحة (لو حبينا نختار طابعة معينة لاحقاً)
  listPrinters: () => ipcRenderer.invoke('list-printers'),
});
