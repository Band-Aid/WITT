// document.addEventListener("DOMContentLoaded", function() {
//     const captureButton = document.getElementById("capture");
//     const screenshotContainer = document.getElementById("screenshotContainer");

//     captureButton.addEventListener("click", function() {
//       chrome.tabs.captureVisibleTab(function(screenshotDataUrl) {
//         const screenshotImage = new Image();
//         screenshotImage.src = screenshotDataUrl;
//         screenshotContainer.appendChild(screenshotImage);
//       });
//     });
//   });





document.addEventListener("DOMContentLoaded", function () {
    // const captureButton = document.getElementById("capture");
    // captureButton.addEventListener("click", function () {
    //     const screenshotContainer = document.getElementById("screenshotContainer");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const url = new URL(activeTab.url);
            const pathParts = url.pathname.split('/');

            if (url.hostname === 'app.pendo.io' && pathParts.includes('pages')) {
                const extractedValue = pathParts[pathParts.indexOf('pages') + 1];
                const img = new Image();
                chrome.storage.local.get([extractedValue], (result) => {
                    if (result[extractedValue]) {
                        console.log('Snapshot retrieved!');
                        img.src = result[extractedValue];
                        img.style.maxWidth = '900px';
                        img.style.height = '500px';
                        screenshotContainer.appendChild(img);
                    } else {
                        console.log('No snapshot found.');
                    }
                   
                });
                
            }
            else if(url.hostname === 'app.pendo.io' && pathParts.includes('features')){
                const extractedValue = pathParts[pathParts.indexOf('features') + 1];
                const img = new Image();
                chrome.storage.local.get([extractedValue], (result) => {
                    if (result[extractedValue]) {
                        console.log('Snapshot retrieved!');
                        img.src = result[extractedValue];
                        img.style.maxWidth = '900px';
                        img.style.height = '500px';
                        screenshotContainer.appendChild(img);
                    } else {
                        console.log('No snapshot found.');
                    }
                   
                });
            }
        });
    });
// });