const WasmExtRGX = /\.wasm$/i
const WATabs = []

/**
*  Update pageAction: title, icon, popup
**/
function UpdatePageAction(tab) {
  window.browser.pageAction.show(tab.id)
  window.browser.pageAction.setTitle({
    tabId: tab.id,
    title: 'WebAssembly detected',
  })
  window.browser.pageAction.setIcon({
    tabId: tab.id,
    path: {
      '19': './assets/icons/wa-16_text.png',
      '38': './assets/icons/wa-32_text.png',
    },
  })
  window.browser.pageAction.setPopup({
    tabId: tab.id,
    popup: './assets/wa-list.html',
  })
}

// Setup communication with popup
window.browser.runtime.onConnect.addListener(port => {
  // Send message to popup with active tab info
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    port.postMessage(WATabs.find(t => t.id === tabs[0].id))
  })
})

// Handle requests
window.browser.webRequest.onBeforeRequest.addListener(
  req => {
    if (WasmExtRGX.test(req.url)) {
      let targetTab = WATabs.find(t => t.id === req.tabId)

      if (targetTab) {
        // Add new ws url
        if (targetTab.wasm.indexOf(req.url) === -1) targetTab.wasm.push(req.url)
      } else {
        // Create
        targetTab = {
          id: req.tabId,
          originUrl: req.originUrl,
          wasm: [req.url],
        }
        WATabs.push(targetTab)
      }

      UpdatePageAction(targetTab)
    }
  },
  {
    urls: ['<all_urls>'],
  }
)

// Handle tab closing
window.browser.tabs.onRemoved.addListener(tabId => {
  let targetIndex = WATabs.findIndex(t => t.id === tabId)
  if (targetIndex !== -1) WATabs.splice(targetIndex, 1)
})

// Handle tab updates
window.browser.tabs.onUpdated.addListener((id, info) => {
  if (info.status !== 'complete') return

  let targetTab = WATabs.find(t => t.id === id)
  if (!targetTab) return

  if (info.url) UpdatePageAction(targetTab)
})
