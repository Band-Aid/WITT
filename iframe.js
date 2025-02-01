function waitForElement(selector, callback) {
    const element = document.querySelector(selector);
    if (element) {
        callback(element);
    }
}

function attachListeners() {
    waitForElement('.tagged-page-view [data-cy="done-button"]', (tagPageBtn) => {
        if (!tagPageBtn.classList.contains('listener-attached')) {
            console.log('Tag Page button found!');
            tagPageBtn.addEventListener('click', () => {
                console.log('Tag Page button clicked!');
                chrome.runtime.sendMessage({ action: 'tagPageClicked' });
            });
            tagPageBtn.classList.add('listener-attached');
        }
    });

    waitForElement('.feature-create-view [data-cy="done-button"]', (tagFeatureBtn) => {
        if (!tagFeatureBtn.classList.contains('listener-attached')) {
            console.log('Tag Feature button found!');
            tagFeatureBtn.addEventListener('click', () => {
                console.log('Tag Feature button clicked!');
                chrome.runtime.sendMessage({ action: 'tagFeatureClicked' });
            });
            tagFeatureBtn.classList.add('listener-attached');
        }
    });
}

// Initial attachment of listeners
console.log('iframe.js loaded!');
console.log(window.location.href);

// Create a MutationObserver to monitor changes in the DOM
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length || mutation.removedNodes.length) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.querySelector('[pendo-analytics="components:button:save"]')) {
                   attachListeners();
                }
            });
        }
    });
    
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });