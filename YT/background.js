// Handle notifications for ad detection and completion
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'adFinished') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Ad Completed',
      message: 'The ad has finished playing',
      buttons: [{ title: 'OK' }]
    });
  }
});

let adsSkipped = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'adSkipped') {
    adsSkipped++;
    chrome.storage.local.set({ adsSkipped });
  }
});