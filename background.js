function captureSnapShot(id) {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error('Error capturing snapshot:', chrome.runtime.lastError);
      return;
    }
    console.log('Snapshot taken!');
    // Save to storage
    chrome.storage.local.set({ [id]: dataUrl }, () => {
      console.log('Snapshot saved to storage.');
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'tagFeatureClicked') {
    console.log('Feature tagged!', message.element);

    console.log('Adding one-time webRequest listener for feature apply');
    // create a one-time listener that removes itself after the first match
    const featureListener = (details) => {
      try {
        const url = new URL(details.url);
        const pathParts = url.pathname.split('/');
        if (pathParts.includes('feature')) {
          const extractedValue = pathParts[pathParts.indexOf('feature') + 1];
          console.log('Feature Path Value:', extractedValue);
          captureSnapShot(extractedValue);
        }
      } finally {
        try { chrome.webRequest.onBeforeRequest.removeListener(featureListener); } catch(e) {}
      }
    };
    chrome.webRequest.onBeforeRequest.addListener(
      featureListener,
      { urls: ["https://app.pendo.io/api/s/*/page/*/apply", "https://app.pendo.io/api/s/*/feature/*/apply"] }
    );

  } else if (message.action === 'tagPageClicked') {
    console.log('Page tagged', message.element);
    console.log('Adding one-time webRequest listener for page apply');
    const pageListener = (details) => {
      try {
        const url = new URL(details.url);
        const pathParts = url.pathname.split('/');
        if (pathParts.includes('page')) {
          const extractedValue = pathParts[pathParts.indexOf('page') + 1];
          console.log('Feature page Value:', extractedValue);
          captureSnapShot(extractedValue);
        }
      } finally {
        try { chrome.webRequest.onBeforeRequest.removeListener(pageListener); } catch(e) {}
      }
    };
    chrome.webRequest.onBeforeRequest.addListener(
      pageListener,
      { urls: ["https://app.pendo.io/api/s/*/page/*/apply", "https://app.pendo.io/api/s/*/feature/*/apply"] }
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
      // Ensure content script is injected before messaging
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
  //console.log('Navigation completed:', details.url);
  const url = new URL(details.url);
  const pagesPattern = /^https:\/\/app\.pendo\.io\/s\/[^\/]+\/pages\/[^\/]+/;
  const featuresPattern = /^https:\/\/app\.pendo\.io\/s\/[^\/]+\/features\/[^\/]+/;

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
}, { url: [{ hostEquals: 'app.pendo.io' }] });

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log('History state updated:', details.url);
  const url = new URL(details.url);
  const pagesPattern = /^https:\/\/app\.pendo\.io\/s\/[^\/]+\/pages\/[^\/]+/;
  const featuresPattern = /^https:\/\/app\.pendo\.io\/s\/[^\/]+\/features\/[^\/]+/;
  
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
