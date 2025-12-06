// src/content/translateButton.js

/**
 * 翻译按钮模块（使用 SVG 图标）
 */

const CONFIG = {
  ARIA_LABEL: '翻译',
  TITLE: '翻译成英文',

  // 新：SVG 图标字符串（注意 escape 或使用模板）
  ICON_SVG: `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
         class="lucide lucide-languages" aria-hidden="true">
      <path d="m5 8 6 6"></path>
      <path d="m4 14 6-6 2-3"></path>
      <path d="M2 5h12"></path>
      <path d="M7 2h1"></path>
      <path d="m22 22-5-10-5 10"></path>
      <path d="M14 18h6"></path>
    </svg>
  `.trim(),

  CHAT_INPUT_KEYWORDS: ['发送', 'Send', '要向', '消息', 'chat', 'input'],
  SEARCH_BOX_KEYWORDS: [
    '搜索',
    '开始',
    '新聊天',
    '查找',
    'conversation',
    'Search',
  ],

  REF_BUTTON_LABELS: ['Emoji', '表情', 'Attach', '附件', 'GIF'],

  FALLBACK_STYLE: `xjb2p0i xk390pu x1ypdohk xjbqb8w x972fbf x10w94by x1qhh985 x14e42zd x14ug900 x1c9tyrk xeusxvb x1pahc9y x1ertn4p x100vrsf x1vqgdyp x1y1aw1k xf159sx xwib8y2 xmzvs34 xtnn1bt x9v5kkp xmw7ebm xrdum7p`,
}

let currentButton = null

export function initTranslateButton() {
  if (currentButton && currentButton.parentNode) {
    currentButton.parentNode.removeChild(currentButton)
    currentButton = null
  }

  const editableContainer = getEditableContainer()
  if (!editableContainer) {
    console.warn('[Translate] 未找到聊天输入框')
    return
  }

  const parentContainer = editableContainer.parentElement
  if (!parentContainer || !parentContainer.parentNode) {
    console.warn('[Translate] 未找到父容器')
    return
  }

  const handleClick = async (e) => {
    e.stopPropagation()
    e.preventDefault()

    const originalText = getInputText()
    if (!originalText) {
      return
    }

    const btn = e.currentTarget
    btn.disabled = true

    try {
      const translated = await translateToEnglish(originalText)
      setInputText(translated)
    } catch (err) {
      console.error('[Translate] 错误:', err)
      try {
        const toast = window.__ALTUS_TOAST
        if (typeof toast === 'function') {
          toast(`翻译失败：${err?.message || err}`)
        }
      } catch {}
    } finally {
      btn.disabled = false
    }
  }

  const buttonEl = createTranslateButton(handleClick)
  currentButton = buttonEl

  parentContainer.parentNode.insertBefore(buttonEl, parentContainer.nextSibling)
  console.log('[Translate] 翻译按钮已插入')
}

// --- 工具函数（保持不变）---

function getEditableContainer() {
  const candidates = document.querySelectorAll(
    '[contenteditable="true"][data-lexical-editor="true"]'
  )
  for (const el of candidates) {
    const label = el.getAttribute('aria-label')
    if (!label) continue

    const isChatInput = CONFIG.CHAT_INPUT_KEYWORDS.some((kw) =>
      label.includes(kw)
    )
    const isSearchBox = CONFIG.SEARCH_BOX_KEYWORDS.some((kw) =>
      label.includes(kw)
    )

    if (isChatInput && !isSearchBox) {
      return el
    }
  }
  return null
}

function getInputText() {
  const spans = document.querySelectorAll('span[data-lexical-text="true"]')
  let text = ''
  spans.forEach((span) => (text += span.textContent || ''))
  return text.trim()
}

function setInputText(text) {
  try {
    window.postMessage(
      { direction: 'toWPP', action: 'SET_INPUT_TEXT', text },
      '*'
    )
    console.log('[Translate] 请求设置输入框文本')
  } catch (e) {
    console.warn('[Translate] 设置输入失败', e?.message || e)
  }
}

export async function translateTo(text, target = 'en') {
  if (!text.trim()) return text
  const fn = window.__ALTUS_TRANSLATE
  if (typeof fn === 'function') {
    const res = await fn(text, target)
    if (res && res.ok) return res.text
    const msg = res && res.error ? res.error : 'Unknown error'
    throw new Error(msg)
  }
  throw new Error('Translate bridge unavailable')
}
export async function translateToEnglish(text) {
  return translateTo(text, 'en')
}
// getTranslateProvider 已由预加载桥接替代，不再需要本地实现

// 网络翻译逻辑由预加载桥接到主进程处理，避免 CSP 限制

// --- 关键修改：createTranslateButton 使用 SVG ---

function createTranslateButton(onClick) {
  let referenceBtn = null
  for (const label of CONFIG.REF_BUTTON_LABELS) {
    referenceBtn = document.querySelector(`button[aria-label="${label}"]`)
    if (referenceBtn) break
  }

  let buttonElement

  if (referenceBtn) {
    buttonElement = referenceBtn.cloneNode(true)
    buttonElement.setAttribute('aria-label', CONFIG.ARIA_LABEL)
    buttonElement.title = CONFIG.TITLE

    // 插入新的 SVG 图标
    buttonElement.innerHTML = CONFIG.ICON_SVG

    // 确保无多余 margin/padding 干扰布局
    buttonElement.style.margin = '0'
    buttonElement.style.padding = '0'
    buttonElement.style.minWidth = '32px'
    buttonElement.style.minHeight = '32px'
  } else {
    // 回退：创建新按钮 + 内联 SVG
    buttonElement = document.createElement('button')
    buttonElement.setAttribute('aria-label', CONFIG.ARIA_LABEL)
    buttonElement.title = CONFIG.TITLE
    buttonElement.innerHTML = CONFIG.ICON_SVG
    buttonElement.className = CONFIG.FALLBACK_STYLE
  }

  buttonElement.addEventListener('click', onClick, true)
  return buttonElement
}
