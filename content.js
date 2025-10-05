// Skip running in iframes (only run in top window)
if (window.top !== window) {
  console.log('WITT content script running in iframe; skipping.');
} else if (document.documentElement.getAttribute('data-witt-initialized') === '1') {
  console.log('WITT content script already initialized (DOM flag); skipping.');
} else {
  // mark DOM so re-injected scripts in the same document don't reinitialize
  try { document.documentElement.setAttribute('data-witt-initialized', '1'); } catch (e) {}
  window.__witt_content_initialized = true;
  console.log('Content script loaded!');

  // simple dedupe map to avoid duplicate insertions: key -> timestamp
  try { window.__witt_lastInserted = window.__witt_lastInserted || {}; } catch (e) {}

  // debounce map for waitForElement calls to avoid multiple concurrent waiters per selector
  const __witt_waiting = {};


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
  // Global class-based removal
  const existing = document.querySelectorAll('.witt-snapshot');
  if (existing && existing.length) {
    existing.forEach((el) => el.remove());
    console.log('Removed previous injected snapshot(s) by class.');
  }

  // Remove nearby data: images after the anchor if provided, otherwise scan body
  const startNode = anchor || document.body;
  let node = startNode.nextElementSibling || startNode.firstElementChild;
  let checks = 0;
  while (node && checks < 16) {
    const next = node.nextElementSibling;
    try {
      if (node.nodeType === 1) {
        const tag = node.tagName;
        const src = node.src || (node.getAttribute && node.getAttribute('src'));
        const isDataImg = tag === 'IMG' && src && src.startsWith && src.startsWith('data:');
        const hasAttr = node.getAttribute && node.getAttribute('data-witt-snapshot') !== null;
        if (isDataImg || hasAttr) node.remove();
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
  // don't run concurrently for the same key
  window.__witt_lastInserted = window.__witt_lastInserted || {};
  if (window.__witt_lastInserted[extractedValue] && Date.now() - window.__witt_lastInserted[extractedValue] < 3000) {
    console.log('Recently inserted snapshot for', extractedValue, '- skipping');
    return;
  }
  // mark pending to avoid concurrent activity
  window.__witt_lastInserted[extractedValue] = Date.now();

  waitForElement('.pendo-page-header', (filterBar) => {
    // If a snapshot for this extractedValue already exists, do nothing
    const existingForKey = document.querySelector('.witt-snapshot[data-witt-key="' + extractedValue + '"]');
    if (existingForKey) {
      console.log('Snapshot already present for', extractedValue);
      return;
    }

    // Always remove any existing snapshots adjacent to this anchor first
    removeSnapshotIfPresent(filterBar);

    chrome.storage.local.get([extractedValue], (result) => {
        if (result[extractedValue]) {
        const img = new Image();
        img.src = result[extractedValue];
        img.className = 'witt-snapshot';
        img.setAttribute('data-witt-snapshot', '1');
        img.setAttribute('data-witt-key', extractedValue);
        img.style.maxWidth = '900px';
        img.style.height = '500px';
        img.style.display = 'block';
        img.style.margin = '8px 0';
        filterBar.insertAdjacentElement('afterend', img);
        console.log('Snapshot inserted for', extractedValue);
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

  const url = new URL(message.url);
  const pathParts = url.pathname.split('/');
  if (message.action === 'handlePageLoaded') {
    console.log('Starting load tag screenshot!');
    console.log(message.url);
    const extractedValue = pathParts[pathParts.indexOf('pages') + 1];
    ensureSnapshotFor(extractedValue);
  } else if (message.action === 'handleFeatureLoaded') {
    console.log('Starting load tag screenshot!');
    console.log(message.url);
    const extractedValue = pathParts[pathParts.indexOf('features') + 1];
    console.log(extractedValue);
    ensureSnapshotFor(extractedValue);
  }
});

// Watch for SPA URL changes (pushState/replaceState/popstate) and re-run snapshot logic
(() => {
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  function onUrlChange() {
    const url = location.href;
    // Send a message to the background or just handle locally: inspect current URL
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      if (parts.includes('pages')) {
        const extractedValue = parts[parts.indexOf('pages') + 1];
        ensureSnapshotFor(extractedValue);
      } else if (parts.includes('features')) {
        const extractedValue = parts[parts.indexOf('features') + 1];
        ensureSnapshotFor(extractedValue);
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

}

// MutationObserver to remove reinserted snapshots in real-time
try {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes || []) {
        try {
          if (node && node.nodeType === 1) {
            const el = node;
            const isWitt = el.matches && (el.matches('.witt-snapshot') || el.getAttribute('data-witt-snapshot') !== null || el.getAttribute('data-witt-key') !== null);
            const isDataImg = el.tagName === 'IMG' && el.src && el.src.startsWith && el.src.startsWith('data:');
            if (isWitt || isDataImg) {
             // el.remove();
              console.log('MutationObserver removed reinserted snapshot element');
            }
          }
        } catch(e) {}
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
} catch (e) {
  // ignore
}