var w = window;
var out = {
  visible: document.visibilityState === 'visible',
  focused: document.hasFocus(),
  capture: w.__snapshotCapture === true,
  note: '',
  end: w.__snapshotEnd === true,
  name: w.__snapshotSessionName || '',
  needsInject: !(w.__snapshotInit === true
                 && document.getElementById('__snapshot_toolbar_root'))
};
if (out.capture) {
  out.note = w.__snapshotNote || '';
  w.__snapshotCapture = false;
  w.__snapshotNote = '';
}
if (w.__pagesnapActions && w.__pagesnapActions.length) { out.actions = w.__pagesnapActions; w.__pagesnapActions = []; }
return out;
