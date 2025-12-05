if (window.__WPP_EXPORT_LOADED__) {
} else {
  window.__WPP_EXPORT_LOADED__ = true

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type: type || 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    document.body.appendChild(a)
    a.click()
    console.log('[WPP] 触发下载', name)
    setTimeout(() => {
      URL.revokeObjectURL(a.href)
      a.remove()
    }, 1000)
  }

  async function handleExportContact() {
    try {
      console.log('[WPP] 开始导出当前联系人')
      const contacts = await window.WPP.contact.list()
      console.log('[WPP] 联系人条数', contacts?.length)
      downloadFile('whatsapp-contact.json', JSON.stringify(contacts), 'application/json')
    } catch (e) {
      console.warn('[WPP] 导出联系人失败', e?.message || e)
    }
  }
  async function handleSetInputText(text) {
    try {
      console.log('[WPP] 设置输入框文本', text)
      if (window.WPP?.chat?.setInputText) {
        await window.WPP.chat.setInputText(String(text ?? ''))
      } else {
        console.warn('[WPP] chat.setInputText 不可用')
      }
    } catch (e) {
      console.warn('[WPP] 设置输入失败', e?.message || e)
    }
  }
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const data = event.data
    if (!data || data.direction !== 'toWPP') return
    console.log('[WPP] 收到指令', data)
    if (data.action === 'EXPORT_CONTACT') handleExportContact()
    if (data.action === 'SET_INPUT_TEXT') handleSetInputText(data.text)
  })
}
