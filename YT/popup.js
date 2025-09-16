function runScriptOnTab(func, args = []) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0];
    if (!tab || !tab.url.includes("youtube.com")) {
      alert("This only works on YouTube tabs.");
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: func,
      args: args
    }, (res) => {
      if (chrome.runtime.lastError) {
        console.error("Script error:", chrome.runtime.lastError.message);
        alert("Failed to run script in YouTube tab.");
      }
    });
  });
}

// ✅ Playback Speed (fixed to persist)
document.getElementById("speedSlider").addEventListener("input", function () {
  const val = parseFloat(this.value);
  document.getElementById("speedVal").textContent = val + "x";

  // Send message to content script
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "SET_SPEED",
      speed: val
    });
  });
});

// ✅ Toggle Shorts
document.getElementById("toggleShorts").addEventListener("click", function () {
  runScriptOnTab(() => {
    const selectors = [
      'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
      'ytd-reel-shelf-renderer',
      'ytd-rich-grid-media:has(a[href*="shorts"])',
      'a[href*="/shorts"]',
      '#endpoint[href^="/shorts"]'
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = el.style.display === 'none' ? '' : 'none';
      });
    });

    const guideItems = document.querySelectorAll('ytd-guide-entry-renderer');
    guideItems.forEach(entry => {
      const link = entry.querySelector('a#endpoint');
      if (link && link.href.includes("/shorts")) {
        entry.remove();
      }
    });
  });
});

// ✅ Toggle Recommendations
document.getElementById("toggleRecommendations").addEventListener("click", function () {
  runScriptOnTab(() => {
    const selectors = [
      'ytd-watch-next-secondary-results-renderer',
      'ytd-compact-video-renderer',
      '#related',
      'ytd-rich-grid-renderer',
      'ytd-rich-item-renderer',
      'ytd-two-column-browse-results-renderer'
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = el.style.display === 'none' ? '' : 'none';
      });
    });

    const browse = document.querySelector('ytd-browse');
    if (browse) browse.style.display = browse.style.display === 'none' ? '' : 'none';
  });
});

// ✅ Toggle Comments
document.getElementById("toggleComments").addEventListener("click", function () {
  runScriptOnTab(() => {
    const commentSection = document.querySelector('#comments');
    if (commentSection) {
      commentSection.style.display = commentSection.style.display === 'none' ? '' : 'none';
    }

    const guideItems = document.querySelectorAll('ytd-guide-entry-renderer');
    guideItems.forEach(entry => {
      const link = entry.querySelector('a#endpoint');
      if (link && link.href.includes("comments")) {
        entry.remove();
      }
    });
  });
});
