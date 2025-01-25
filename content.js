console.log('Content script loaded!');

function waitForElement(selector, callback) {
  console.log('Waiting for element:', selector);
  const element = document.querySelector(selector);
  if (element) {
    console.log('Element found!');
    callback(element);
  } else {
    setTimeout(() => waitForElement(selector, callback), 100);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const url = new URL(message.url);
  const pathParts = url.pathname.split('/');
  if (message.action === 'handlePageLoaded') {
    console.log('Starting load tag screenshot!');
    console.log(message.url);

    waitForElement('.pendo-page-header__bottom-wrapper', (filterBar) => {
     
        const extractedValue = pathParts[pathParts.indexOf('pages') + 1];
        const img = new Image();
        chrome.storage.local.get([extractedValue], (result) => {
          if (result[extractedValue]) {
            console.log('Snapshot retrieved!');
            img.src = result[extractedValue];
            img.style.maxWidth = '900px';
            img.style.height = '500px';
            filterBar.insertAdjacentElement('afterend', img);
            console.log('Snapshot inserted!');
          } else {
            console.log('No snapshot found.');
          }
        });

      
    });
  } else if (message.action === 'handleFeatureLoaded') {
    console.log('Starting load tag screenshot!');
    console.log(message.url);
    const extractedValue = pathParts[pathParts.indexOf('features') + 1];
    console.log(extractedValue);
    waitForElement('.pendo-page-header__bottom-wrapper', (filterBar) => {
    const img = new Image();
    chrome.storage.local.get([extractedValue], (result) => {
      if (result[extractedValue]) {
        console.log('Snapshot retrieved!');
        img.src = result[extractedValue];
        img.style.maxWidth = '900px';
        img.style.height = '500px';
        filterBar.insertAdjacentElement('afterend', img);
        console.log('Snapshot inserted!');
      } else {
        console.log('No snapshot found.');
      }
    });
  });
  }
});