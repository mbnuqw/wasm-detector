const WATabs = []
const Methods = {
  decompress: true,
  signature: true,
  mime: true,
}
const ContentTypeRGX = /content-type/i
const WasmMimeRGX = /application\/wasm/i

/**
 *  Update pageAction: title, icon, popup
 **/
function UpdatePageAction(tab) {
  if (!tab.wasm.length) {
    window.browser.pageAction.hide(tab.id)
    window.browser.pageAction.setTitle({
      tabId: tab.id,
      title: browser.i18n.getMessage('PageActionTitleN'),
    })
    window.browser.pageAction.setIcon({
      tabId: tab.id,
      path: {
        '19': './assets/icons/wa-16_text_inact.png',
        '38': './assets/icons/wa-32_text_inact.png',
      },
    })
    window.browser.pageAction.setPopup({
      tabId: tab.id,
      popup: '',
    })
  } else {
    window.browser.pageAction.show(tab.id)
    window.browser.pageAction.setTitle({
      tabId: tab.id,
      title: browser.i18n.getMessage('PageActionTitleY'),
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
      popup: './popups/wa-list.html',
    })
  }
}

/**
 *  Check
 *
 * > req: Object - Details of the request.
 * > cb: (req: RequestDetails) => any - Fires when wasm was detected.
 **/
function DetectWasm(req, cb) {
  // Get content type from header
  let contentType = req.responseHeaders.find(h => ContentTypeRGX.test(h.name))
  if (contentType) contentType = contentType.value

  // Check mime types and ignore non-application type
  if (contentType && WasmMimeRGX.test(contentType)) return cb(req)

  // Check signature
  if (!Methods.signature) return
  let filter = browser.webRequest.filterResponseData(req.requestId)
  filter.onstop = e => filter.disconnect()
  filter.ondata = e => {
    // First data-chunk is enough
    filter.write(e.data)
    filter.disconnect()

    // Ignore too small chunks
    if (e.data.byteLength < 1024) return
    const sig = new Uint8ClampedArray(e.data, 0, 4)

    // Wasm signature
    if (
      sig[0] === 0x00 &&
      sig[1] === 0x61 &&
      sig[2] === 0x73 &&
      sig[3] === 0x6d
    ) {
      return cb(req)
    }

    // GZIPed data
    if (!Methods.decompress) return
    if (sig[0] === 0x1f && sig[1] === 0x8b) {
      const gzLen = e.data.byteLength < 32768 ? e.data.byteLength : 32768
      const gziped = new Uint8ClampedArray(e.data, 0, gzLen)

      let unziped
      try {
        unziped = pako.inflate(gziped)
      } catch (e) {
        return
      }

      if (
        unziped[0] === 0x00 &&
        unziped[1] === 0x61 &&
        unziped[2] === 0x73 &&
        unziped[3] === 0x6d
      ) {
        return cb(req)
      }
    }
  }
}

// Get stored settings
browser.storage.local.get('methods').then(stored => {
  if (!stored.methods) return
  Methods.decompress = stored.methods.decompress
  Methods.signature = stored.methods.signature
  Methods.mime = stored.methods.mime
})

// Setup communication with popup
browser.runtime.onConnect.addListener(port => {
  // Send message to popup with active tab info
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    port.postMessage(WATabs.find(t => t.id === tabs[0].id))
  })
})

// Handle requests
browser.webRequest.onHeadersReceived.addListener(
  req => {
    // Reset wasm popup for this tab
    if (!req.documentUrl && req.parentFrameId === -1) {
      let targetTab = WATabs.find(t => t.id === req.tabId)
      if (targetTab) {
        targetTab.wasm = []
        UpdatePageAction(targetTab)
      }
      return
    }

    //  The only possible way (for the moment) to load wasm is to use
    // XmlHttpRequest or fetch.
    if (req.type !== 'xmlhttprequest') return

    // Check only GET requests
    if (req.method !== 'GET') return

    DetectWasm(req, req => {
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
    })
  },
  {
    urls: ['<all_urls>'],
  },
  ['responseHeaders', 'blocking']
)

// Handle tab closing
browser.tabs.onRemoved.addListener(tabId => {
  let targetIndex = WATabs.findIndex(t => t.id === tabId)
  if (targetIndex !== -1) WATabs.splice(targetIndex, 1)
})

// Handle settings change
browser.storage.onChanged.addListener(changes => {
  if (!changes.methods) return
  Methods.decompress = changes.methods.newValue.decompress
  Methods.signature = changes.methods.newValue.signature
  Methods.mime = changes.methods.newValue.mime
})
