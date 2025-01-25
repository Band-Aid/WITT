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

    console.log('Monitoring network requests...');
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        const url = new URL(details.url);

        // Extract the value after "page" or "feature"
        const pathParts = url.pathname.split('/');
        let extractedValue = null;

        if (pathParts.includes('feature')) {
          extractedValue = pathParts[pathParts.indexOf('feature') + 1]; 
          console.log('Feature Path Value:', extractedValue);
          captureSnapShot(extractedValue);
        }
      },
      {
        urls: [
          "https://app.pendo.io/api/s/*/page/*/apply",
          "https://app.pendo.io/api/s/*/feature/*/apply"
        ]
      }
    );

  } else if (message.action === 'tagPageClicked') {
    console.log('Page tagged', message.element);
    console.log('Monitoring network requests...');
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        const url = new URL(details.url);

        // Extract the value after "page" or "feature"
        const pathParts = url.pathname.split('/');
        let extractedValue = null;

        if (pathParts.includes('page')) {
          extractedValue = pathParts[pathParts.indexOf('page') + 1]; 
          console.log('Feature page Value:', extractedValue);
          captureSnapShot(extractedValue);
        }
      },
      {
        urls: [
          "https://app.pendo.io/api/s/*/page/*/apply",
          "https://app.pendo.io/api/s/*/feature/*/apply"
        ]
      }
    );
  } else if (message.action === 'pageFeatureLoaded') {
    console.log('Page/Feature loaded!');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        if (activeTab.id) {
          chrome.tabs.sendMessage(activeTab.id, {
            action: 'handlePageFeatureLoaded',
            url: message.url
          });
        } else {
          console.error('Active tab does not have an id.');
        }
      } else {
        console.error('No active tab found.');
      }
    });
  }
});

chrome.webNavigation.onCompleted.addListener((details) => {
  console.log('Navigation completed:', details.url);
  const url = new URL(details.url);
  const pagesPattern = /^https:\/\/app\.pendo\.io\/s\/[^\/]+\/pages\/[^\/]+/;
  const featuresPattern = /^https:\/\/app\.pendo\.io\/s\/[^\/]+\/features\/[^\/]+/;

  if (pagesPattern.test(url.href)) {
    console.log('Page loaded:', details.url);
    chrome.tabs.sendMessage(details.tabId, {
      action: 'handlePageLoaded',
      url: details.url
    });
  } else if (featuresPattern.test(url.href)) {
    console.log('Feature loaded:', details.url);
    chrome.tabs.sendMessage(details.tabId, {
      action: 'handleFeatureLoaded',
      url: details.url
    });
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log('History state updated:', details.url);
  const url = new URL(details.url);
  const pagesPattern = /^https:\/\/app\.pendo\.io\/s\/[^\/]+\/pages\/[^\/]+/;
  const featuresPattern = /^https:\/\/app\.pendo\.io\/s\/[^\/]+\/features\/[^\/]+/;
  
  if (pagesPattern.test(url.href)) {
    console.log('Page loaded:', details.url);
    try {
      chrome.tabs.sendMessage(details.tabId, {
        action: 'handlePageLoaded',
        url: details.url
      });
    } catch (error) {
      console.error('Error sending message to tab:', error);
    }

  } else if (featuresPattern.test(url.href)) {
    console.log('Feature loaded:', details.url);
    try {
      chrome.tabs.sendMessage(details.tabId, {
        action: 'handleFeatureLoaded',
        url: details.url
      });
    } catch (error) { 
      console.error('Error sending message to tab:', error);
    }
  }
});
