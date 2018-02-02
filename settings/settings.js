const MethodsTitleEl = document.getElementById('settings_methods_title')
const MethodsDecompLabelEl = document.getElementById(
  'settings_methods_decomp_label'
)
const MethodsSignLabelEl = document.getElementById(
  'settings_methods_sign_label'
)
const MethodsMimeLabelEl = document.getElementById(
  'settings_methods_mime_label'
)
const MethodsDecompressInputEl = document.getElementById('decompress')
const MethodsSignatureInputEl = document.getElementById('signature')
const MethodsMimeInputEl = document.getElementById('mime')

MethodsTitleEl.innerText = browser.i18n.getMessage('SettingsMethodsTitle')
MethodsDecompLabelEl.innerText = browser.i18n.getMessage(
  'SettingsMethodsDecomp'
)
MethodsSignLabelEl.innerText = browser.i18n.getMessage('SettingsMethodsSign')
MethodsMimeLabelEl.innerText = browser.i18n.getMessage('SettingsMethodsMime')

function MethodChangeHandler(methods) {
  browser.storage.local.set({ methods })
}

MethodsDecompressInputEl.addEventListener('change', e =>
  MethodChangeHandler({
    mime: true,
    signature: true,
    decompress: e.target.checked,
  })
)
MethodsSignatureInputEl.addEventListener('change', e =>
  MethodChangeHandler({
    mime: true,
    signature: e.target.checked,
    decompress: false,
  })
)
MethodsMimeInputEl.addEventListener('change', e =>
  MethodChangeHandler({
    mime: e.target.checked,
    signature: false,
    decompress: false,
  })
)

browser.storage.local.get('methods').then(stored => {
  if (!stored.methods) return
  if (stored.methods.decompress) MethodsDecompressInputEl.checked = true
  else if (stored.methods.signature) MethodsSignatureInputEl.checked = true
  else MethodsMimeInputEl.checked = true
})
