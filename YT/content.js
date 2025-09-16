console.log("YT Focus content script loaded");

let shortsHidden = false;
let recommendationsHidden = false;
let userPreferredPlaybackRate = null;

function hideShorts() {
  const selectors = [
    'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
    'ytd-reel-shelf-renderer',
    'a[href*="shorts"]',
    '#endpoint[href^="/shorts"]'
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.style.display = shortsHidden ? "" : "none");
  });
}

function hideRecommendations() {
  const selectors = [
    'ytd-watch-next-secondary-results-renderer',
    'ytd-compact-video-renderer',
    '#related',
    '#contents.ytd-rich-grid-renderer > ytd-rich-item-renderer'
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.style.display = recommendationsHidden ? "" : "none");
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SET_SPEED") {
    const video = document.querySelector("video");
    if (video) {
      userPreferredPlaybackRate = request.speed;
      video.playbackRate = request.speed;
    }
  }

  if (request.type === "TOGGLE_SHORTS") {
    shortsHidden = !shortsHidden;
    hideShorts();
  }

  if (request.type === "TOGGLE_RECOMMENDATIONS") {
    recommendationsHidden = !recommendationsHidden;
    hideRecommendations();
  }
});

//#######################################################################

const videoStates = new WeakMap();
const MAX_PLAYBACK_RATE = 16;
let skipCheckInterval;
let lastSkipAttempt = 0;

function monitorVideoAds() {
  clearInterval(skipCheckInterval);
  const videos = document.querySelectorAll('video');
  
  if (videos.length === 0) {
    setTimeout(monitorVideoAds, 1000);
    return;
  }
  
  videos.forEach(video => {
    if (video.hasAdDetection) return;
    video.hasAdDetection = true;
    
    videoStates.set(video, {
      playbackRate: video.playbackRate,
      muted: video.muted
    });
    
    video.addEventListener('play', () => handleVideoPlay(video));
    video.addEventListener('timeupdate', () => handleVideoPlay(video));
    video.addEventListener('ended', () => handleAdEnd(video));
  });

  skipCheckInterval = setInterval(() => {
    if (isAdPlaying()) {
      checkForSkipButtons();
    }
  }, 200);
}

function isAdPlaying(videoElement = null) {
  const video = videoElement || document.querySelector('video');
  if (!video) return false;

  if (window.location.hostname.includes('youtube.com')) {
    const adIndicators = [
      '.ad-showing', 
      '.ad-interrupting',
      '.ytp-ad-module',
      '.ytp-ad-player-overlay',
      '.video-ads',
      '.ytp-ad-preview-text',
      '.ytp-ad-preview-text-modern'
    ];
    
    return adIndicators.some(selector => {
      const element = document.querySelector(selector);
      return element && 
             element.offsetParent !== null && 
             getComputedStyle(element).display !== 'none';
    }) || video.classList.contains('ad-showing');
  }
  
  return false;
}

function handleVideoPlay(video) {
  if (isAdPlaying(video)) {
    speedUpAd(video);
    checkForSkipButtons();
  } else {
    restoreNormalPlayback(video);
  }
}

function speedUpAd(video) {
  try {
    if (video.playbackRate < MAX_PLAYBACK_RATE) {
      video.playbackRate = MAX_PLAYBACK_RATE;
      video.muted = true;
      video.adSpedUp = true;
    }
  } catch (e) {
    console.log('Error setting playback rate:', e.message);
    let safeRate = MAX_PLAYBACK_RATE;
    while (safeRate > 1) {
      try {
        video.playbackRate = safeRate;
        video.muted = true;
        video.adSpedUp = true;
        break;
      } catch (e) {
        safeRate -= 1;
      }
    }
  }
}

function checkForSkipButtons() {
  const now = Date.now();
  if (now - lastSkipAttempt < 500) return;
  lastSkipAttempt = now;

  const skipSelectors = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.videoAdUiSkipButton',
    '.ytp-ad-skip-button-container',
    '.ytp-ad-skip-button-slot',
    '.skip-button',
    '.ytp-ad-skip-ad',
    '.ytp-skip-ad',
    'button[aria-label^="Skip ad"]',
    'button[aria-label^="Skip Ads"]',
    'button[title^="Skip ad"]',
    'button[title^="Skip Ads"]'
  ];

  for (const selector of skipSelectors) {
    try {
      const buttons = document.querySelectorAll(selector);
      for (const button of buttons) {
        if (isElementClickable(button)) {
          const rect = button.getBoundingClientRect();
          const mouseEventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            screenX: rect.left + rect.width / 2,
            screenY: rect.top + rect.height / 2
          };
          
          button.dispatchEvent(new MouseEvent('mouseover', mouseEventInit));
          button.dispatchEvent(new MouseEvent('mousedown', mouseEventInit));
          button.dispatchEvent(new MouseEvent('mouseup', mouseEventInit));
          button.dispatchEvent(new MouseEvent('click', mouseEventInit));
          button.click();
          return;
        }
      }
    } catch (e) {
      console.log('Error with skip button selector', selector, e);
    }
  }
}

function isElementClickable(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || element.offsetParent === null) return false;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  if (element.tagName !== 'BUTTON' && element.getAttribute('role') !== 'button') return false;

  const skipTexts = ['skip', 'skip ad', 'skip ads'];
  const text = (element.textContent || '').toLowerCase();
  if (!skipTexts.some(skipText => text.includes(skipText))) return false;

  return true;
}

function restoreNormalPlayback(video) {
  if (userPreferredPlaybackRate !== null) {
    video.playbackRate = userPreferredPlaybackRate;
    video.muted = false;
    video.adSpedUp = false;
  } else if (videoStates.has(video)) {
    const { playbackRate, muted } = videoStates.get(video);
    video.playbackRate = playbackRate;
    video.muted = muted;
    video.adSpedUp = false;
  }
}

function handleAdEnd(video) {
  if (video.adSpedUp) {
    restoreNormalPlayback(video);
    try {
      alert('Ad finished! Playback restored to normal speed.');
    } catch (e) {
      chrome.runtime.sendMessage({ type: 'adFinished' });
    }
  }
}

if (document.readyState === 'complete') {
  monitorVideoAds();
} else {
  window.addEventListener('load', () => {
    monitorVideoAds();
    new MutationObserver(monitorVideoAds).observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}
