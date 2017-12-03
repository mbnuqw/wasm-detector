const Port = window.browser.runtime.connect({ name: 'wa-list-port' })
const ListEl = document.getElementById('wa_list')

Port.onMessage.addListener(waTab => {
  waTab.wasm.map(wa => {
    let wsUrlEl = document.createElement('div')
    wsUrlEl.classList.add('wa-url')
    wsUrlEl.setAttribute('title', wa)
    wsUrlEl.innerText = wa
    ListEl.appendChild(wsUrlEl)
  })
})
