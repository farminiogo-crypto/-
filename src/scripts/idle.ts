// ينفذ الدالة بعد اكتمال التحميل وعند أول لحظة خمول (بحد أقصى timeout)
export function whenIdle(fn: () => void, extraDelay = 0, timeout = 1200) {
  const run = () => {
    const go = () => window.setTimeout(fn, extraDelay);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout });
    else setTimeout(go, 200);
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}
