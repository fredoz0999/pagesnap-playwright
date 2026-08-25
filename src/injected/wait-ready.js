const finish = () => { try { observer.disconnect(); } catch (e) {} callback(); };

const maxTimer = setTimeout(finish, max);
let timer;
const bump = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      clearTimeout(maxTimer);
      finish();
    } else {
      bump();
    }
  }, stable);
};
const observer = new MutationObserver(bump);
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
}
if (document.readyState === 'complete') {
  bump();
} else {
  window.addEventListener('load', bump, { once: true });
  bump();
}
