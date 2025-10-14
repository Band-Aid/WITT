function captureSnapShot(subsid, id) {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error('Error capturing snapshot:', chrome.runtime.lastError);
      return;
    }
    console.log('Snapshot taken!');
    // Use a subsid key to avoid collisions across subscriptions
    const key = `${subsid}:${id}`;
    const value = { subsid: subsid, id: id, snapshot: dataUrl };
    // Save to storage
    chrome.storage.local.set({ [key]: value }, () => {
      console.log('Snapshot saved to storage under', key);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'tagButtonClicked') {
    console.log('Tag button clicked!', message.element, 'origin:', message.origin || null);

    console.log('Adding one-time webRequest listener for apply (page or feature)');
    // create a one-time listener that removes itself after the first match
    const applyListener = (details) => {
      try {
        let url;
        try { url = new URL(details.url); } catch (err) { url = null; }
        if (!url) return;
        const pathParts = url.pathname.split('/');

        // Determine whether this is a page or feature apply
        if (pathParts.includes('feature')) {
          const extractedValue = pathParts[pathParts.indexOf('feature') + 1];
          const subsid = pathParts[pathParts.indexOf('s') + 1] || null;
          console.log('Detected feature apply. featureId:', extractedValue, 'subsid:', subsid);
          captureSnapShot(subsid, extractedValue);
        } else if (pathParts.includes('page')) {
          const extractedValue = pathParts[pathParts.indexOf('page') + 1];
          const subsid = pathParts[pathParts.indexOf('s') + 1] || null;
          console.log('Detected page apply. pageId:', extractedValue, 'subsid:', subsid);
          captureSnapShot(subsid, extractedValue);
        } else {
          console.log('Apply request did not include page or feature in path:', details.url);
        }
      } finally {
        try { chrome.webRequest.onBeforeRequest.removeListener(applyListener); } catch(e) {}
      }
    };
    chrome.webRequest.onBeforeRequest.addListener(
      applyListener,
      { urls: [
          "https://app.pendo.io/api/s/*/page/*/apply",
          "https://app.pendo.io/api/s/*/feature/*/apply",
          "https://app.jpn.pendo.io/api/s/*/page/*/apply",
          "https://app.jpn.pendo.io/api/s/*/feature/*/apply"
        ] }
    );
  } else if (message.action === 'pageFeatureLoaded') {
    console.log('Page/Feature loaded!');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error('No active tab found.');
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab.id) {
        console.error('Active tab does not have an id.');
        return;
      }
      // ensure content script is injected before messaging
      injectContentScriptIfNeeded(activeTab.id, () => {
        try {
          chrome.tabs.sendMessage(activeTab.id, {
            action: 'handlePageFeatureLoaded',
            url: message.url
          }, (resp) => {
            if (chrome.runtime.lastError) {
              console.warn('sendMessage error:', chrome.runtime.lastError.message);
            }
          });
        } catch (e) {
          console.error('Error sending message to tab:', e && e.message);
        }
      });
    });
  }
});

function injectContentScriptIfNeeded(tabId, callback) {
  chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
    if (chrome.runtime.lastError || !response || response.status !== 'ready') {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }, callback);
    } else {
      callback();
    }
  });
}

chrome.webNavigation.onCompleted.addListener((details) => {
  //debug: console.log('Navigation completed:', details.url);
  const url = new URL(details.url);
  const pagesPattern = /^https:\/\/(?:app|app\.jpn)\.pendo\.io\/s\/[^\/]+\/pages\/[^\/]+/;
  const featuresPattern = /^https:\/\/(?:app|app\.jpn)\.pendo\.io\/s\/[^\/]+\/features\/[^\/]+/;

  if (pagesPattern.test(url.href)) {
    console.log('Page loaded:', details.url);
    if (!details.tabId) {
      console.warn('Navigation event missing tabId for onCompleted');
    } else {
      injectContentScriptIfNeeded(details.tabId, () => {
        chrome.tabs.sendMessage(details.tabId, { action: 'handlePageLoaded', url: details.url }, () => {
          if (chrome.runtime.lastError) console.warn('sendMessage warn:', chrome.runtime.lastError.message);
        });
      });
    }
  } else if (featuresPattern.test(url.href)) {
    console.log('Feature loaded:', details.url);
    if (!details.tabId) {
      console.warn('Navigation event missing tabId for onCompleted');
    } else {
      injectContentScriptIfNeeded(details.tabId, () => {
        chrome.tabs.sendMessage(details.tabId, { action: 'handleFeatureLoaded', url: details.url }, () => {
          if (chrome.runtime.lastError) console.warn('sendMessage warn:', chrome.runtime.lastError.message);
        });
      });
    }
  }
}, { url: [{ hostEquals: 'app.pendo.io' }, { hostEquals: 'app.jpn.pendo.io' }] });

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log('History state updated:', details.url);
  const url = new URL(details.url);
  const pagesPattern = /^https:\/\/(?:app|app\.jpn)\.pendo\.io\/s\/[^\/]+\/pages\/[^\/]+/;
  const featuresPattern = /^https:\/\/(?:app|app\.jpn)\.pendo\.io\/s\/[^\/]+\/features\/[^\/]+/;
  
  if (pagesPattern.test(url.href)) {
    console.log('Page loaded:', details.url);
    if (!details.tabId) {
      console.warn('HistoryStateUpdated event missing tabId');
    } else {
      injectContentScriptIfNeeded(details.tabId, () => {
        chrome.tabs.sendMessage(details.tabId, { action: 'handlePageLoaded', url: details.url }, () => {
          if (chrome.runtime.lastError) console.warn('sendMessage warn:', chrome.runtime.lastError.message);
        });
      });
    }
  } else if (featuresPattern.test(url.href)) {
    console.log('Feature loaded:', details.url);
    if (!details.tabId) {
      console.warn('HistoryStateUpdated event missing tabId');
    } else {
      injectContentScriptIfNeeded(details.tabId, () => {
        chrome.tabs.sendMessage(details.tabId, { action: 'handleFeatureLoaded', url: details.url }, () => {
          if (chrome.runtime.lastError) console.warn('sendMessage warn:', chrome.runtime.lastError.message);
        });
      });
    }
  }
});
