
// Ensure the waiting map exists (safe for repeated injections)
try {
  var __witt_waiting = window.__witt_waiting = window.__witt_waiting || {};
} catch (e) {
  var __witt_waiting = __witt_waiting || {};
}

function waitForElement(selector, callback) {
  if (__witt_waiting[selector]) return; // already waiting
  __witt_waiting[selector] = true;
  console.log('Waiting for element:', selector);
  const check = () => {
    const element = document.querySelector(selector);
    if (element) {
      console.log('Element found!');
      delete __witt_waiting[selector];
      callback(element);
    } else {
      setTimeout(check, 100);
    }
  };
  check();
}

// Helper: remove any existing injected snapshot(s)
function removeSnapshotIfPresent(anchor) {
  // Remove the deterministic wrapper container if present
  try {
    const container = document.getElementById('witt-snapshot-container');
    if (container) {
      container.remove();
      console.log('Removed previous witt snapshot container.');
    }
  } catch (e) {
    // ignore
  }

  // Remove any nearby elements that explicitly declare they are our snapshots
  const startNode = anchor || document.body;
  let node = startNode.nextElementSibling || startNode.firstElementChild;
  let checks = 0;
  while (node && checks < 16) {
    const next = node.nextElementSibling;
    try {
      if (node.nodeType === 1) {
        const hasAttr = node.getAttribute && (node.getAttribute('data-witt-snapshot') !== null || node.getAttribute('data-witt-key') !== null);
        if (hasAttr) node.remove();
      }
    } catch (e) {
      // ignore
    }
    node = next;
    checks++;
  }
}

// Helper: ensure snapshot is installed for a particular extractedValue
function ensureSnapshotFor(extractedValue) {
  // don't attempt to insert for empty/undefined keys (list views like '/features/')
  if (!extractedValue) {
    console.log('No extractedValue provided, removing any existing snapshot.');
    try { removeSnapshotIfPresent(); } catch (e) {}
    return;
  }
  // don't run concurrently for the same key
  window.__witt_lastInserted = window.__witt_lastInserted || {};
  if (window.__witt_lastInserted[extractedValue] && Date.now() - window.__witt_lastInserted[extractedValue] < 3000) {
    console.log('Recently inserted snapshot for', extractedValue, '- skipping');
    return;
  }
  // mark pending to avoid concurrent activity
  window.__witt_lastInserted[extractedValue] = Date.now();

  waitForElement('.pendo-page-header', (filterBar) => {
    // If a snapshot for this extractedValue already exists in our container, do nothing
    const existingContainer = document.getElementById('witt-snapshot-container');
    if (existingContainer && existingContainer.getAttribute('data-witt-key') === extractedValue) {
      console.log('Snapshot container already present for', extractedValue);
      return;
    }

    // Remove the previous container (if any) and any explicit snapshot nodes nearby
    removeSnapshotIfPresent(filterBar);

    chrome.storage.local.get([extractedValue], (result) => {
      if (result[extractedValue]) {
        // create a deterministic wrapper so we can manage the snapshot reliably
        try {
          const wrapper = document.createElement('div');
          wrapper.id = 'witt-snapshot-container';
          wrapper.setAttribute('data-witt-key', extractedValue);
          wrapper.style.margin = '8px 0';
          wrapper.style.display = 'block';

          const img = new Image();
          img.src = result[extractedValue];
          img.className = 'witt-snapshot';
          img.setAttribute('data-witt-snapshot', '1');
          img.setAttribute('data-witt-key', extractedValue);
          img.style.maxWidth = '900px';
          img.style.height = '500px';
          img.style.display = 'block';

          wrapper.appendChild(img);
          filterBar.insertAdjacentElement('afterend', wrapper);
          console.log('Snapshot inserted for', extractedValue);
        } catch (e) {
          console.log('Failed to insert snapshot for', extractedValue, e);
        }
      } else {
        console.log('No snapshot found for', extractedValue);
        // clear timestamp so a future attempt can try again
        try { delete window.__witt_lastInserted[extractedValue]; } catch (e) {}
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'ready' });
    return;
  }

  // Prefer the actual document URL (location.href) over message.url from background
  // because the extension was receiving stale/previous URLs from background messages.
  let msgUrl = null;
  try { msgUrl = message.url ? new URL(message.url) : null; } catch (e) { msgUrl = null; }
  const currentUrl = new URL(location.href);
  console.log('message.url:', msgUrl ? msgUrl.href : null, 'location.href:', currentUrl.href);
  const pathParts = currentUrl.pathname.split('/');
  if (message.action === 'handlePageLoaded') {
    console.log('Starting load tag screenshot!');
    console.log(message.url);
    const extractedValue = pathParts[pathParts.indexOf('pages') + 1] || null;
    if (!extractedValue) {
      console.log('Page list view detected, removing snapshot.');
      removeSnapshotIfPresent();
    } else {
      ensureSnapshotFor(extractedValue);
    }
  } else if (message.action === 'handleFeatureLoaded') {
    console.log('Starting load tag screenshot!');
    console.log(message.url);
    const extractedValue = pathParts[pathParts.indexOf('features') + 1] || null;
    console.log(extractedValue);
    if (!extractedValue) {
      console.log('Features list view detected, removing snapshot.');
      removeSnapshotIfPresent();
    } else {
      ensureSnapshotFor(extractedValue);
    }
  }
});

// Watch for SPA URL changes (pushState/replaceState/popstate) and re-run snapshot logic
(() => {
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  function onUrlChange() {
    // Immediately remove any existing injected img.witt-snapshot on URL change
    try {
      const existingImgs = document.querySelectorAll('img.witt-snapshot');
      if (existingImgs && existingImgs.length) {
        existingImgs.forEach((el) => el.remove());
        console.log('Removed existing img.witt-snapshot on URL change');
      }
    } catch (e) {
      // ignore
    }

    const url = location.href;
    // Send a message to the background or just handle locally: inspect current URL
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      if (parts.includes('pages')) {
        const extractedValue = parts[parts.indexOf('pages') + 1] || null;
        if (!extractedValue) {
          console.log('URL change to pages list detected — removing snapshot.');
          removeSnapshotIfPresent();
        } else {
          ensureSnapshotFor(extractedValue);
        }
      } else if (parts.includes('features')) {
        const extractedValue = parts[parts.indexOf('features') + 1] || null;
        if (!extractedValue) {
          console.log('URL change to features list detected — removing snapshot.');
          removeSnapshotIfPresent();
        } else {
          ensureSnapshotFor(extractedValue);
        }
      } else {
        // Not a page/feature view — remove any snapshot if present
        removeSnapshotIfPresent();
      }
    } catch (e) {
      // ignore
    }
  }
  history.pushState = function () {
    origPush.apply(this, arguments);
    onUrlChange();
  };
  history.replaceState = function () {
    origReplace.apply(this, arguments);
    onUrlChange();
  };
  window.addEventListener('popstate', onUrlChange);
  // Run once on load
  setTimeout(onUrlChange, 500);
})();
