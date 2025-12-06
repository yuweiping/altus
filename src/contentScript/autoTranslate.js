import { translateTo } from './translateButton.js'

let initialized = false
let enabled = true
let observerRef = null

// WhatsApp 消息 span 选择器
const SPAN_SELECTOR = 'span._ao3e.selectable-text.copyable-text'
// 消息气泡容器（你指定的父块）
const MESSAGE_CONTAINER_SELECTOR = 'div._akbu.x6ikm8r.x10wlt62'

// 状态管理：WeakMap<container, 'loading' | 'done'>
const containerState = new WeakMap()

// ======================
// 工具函数
// ======================

function injectStyles() {
  if (document.getElementById('auto-translate-styles')) return
  const style = document.createElement('style')
  style.id = 'auto-translate-styles'
  style.textContent = `
    [data-auto-translation-loading] {
      margin: 8px 0;
      padding: 6px 8px;
      background: #FEF9C3;
      border-radius: 6px;
      line-height: 1.5;
      color: #6B7280;
      font-size: 12px;
    }
    [data-auto-translation] {
      margin: 18px 0 12px 0;
      padding: 6px 8px;
      background: #FFF3B0;
      border-radius: 6px;
      line-height: 1.5;
      color: #1f2937;
      font-size: 14px;
      white-space: pre-wrap;
    }
  `
  document.head.appendChild(style)
}

function createLoadingDiv() {
  const div = document.createElement('div')
  div.setAttribute('data-auto-translation-loading', 'true')
  div.textContent = '⏳ 翻译中...'
  return div
}

function createTranslationDiv(text) {
  const div = document.createElement('div')
  div.setAttribute('data-auto-translation', 'true')
  div.textContent = text
  return div
}

function extractText(span) {
  return (span.textContent || '').trim()
}

// 判断是否包含中文（只要有一个汉字就不翻译）
function hasChinese(str) {
  return /[\u4e00-\u9fff]/.test(str)
}

// 判断是否只有数字、符号、空格（无实际文字）
function isOnlySymbolsOrDigits(str) {
  return /^[\s\d\W]*$/.test(str) // \W = 非单词字符（不含字母）
}

// 获取消息气泡容器
function getContainer(span) {
  return span.closest(MESSAGE_CONTAINER_SELECTOR)
}

// ======================
// 状态判断
// ======================

function getState(container) {
  return container ? containerState.get(container) : null
}

function markAsLoading(container) {
  if (container) containerState.set(container, 'loading')
}

function markAsDone(container) {
  if (container) containerState.set(container, 'done')
}

function clearState(container) {
  if (container) containerState.delete(container)
}

function isTranslated(container) {
  return getState(container) === 'done'
}

function isLoading(container) {
  return getState(container) === 'loading'
}

// ======================
// 核心逻辑
// ======================

function needsTranslation(span) {
  if (!enabled) return false
  if (span.closest('[contenteditable="true"]')) return false

  const text = extractText(span)
  if (!text) return false
  if (hasChinese(text)) return false // 含中文 → 不翻译
  if (isOnlySymbolsOrDigits(text)) return false // 纯符号/数字 → 不翻译

  const container = getContainer(span)
  if (!container) return false
  if (isTranslated(container) || isLoading(container)) return false

  return true
}

async function translateSpan(span) {
  const container = getContainer(span)
  if (!container) return

  const text = extractText(span)
  if (!text) {
    clearState(container)
    return
  }

  let translated = ''
  try {
    translated = (await translateTo(text, 'zh-CN'))?.trim()
  } catch (err) {
    // 翻译失败：清理 loading
    const loadingEl = container.querySelector('[data-auto-translation-loading]')
    if (loadingEl) loadingEl.remove()
    clearState(container)
    console.warn('[AutoTranslate] 翻译失败', { text: text.slice(0, 60) })
    return
  }

  // 移除 loading
  const loadingEl = container.querySelector('[data-auto-translation-loading]')
  if (loadingEl) loadingEl.remove()

  // 跳过无效结果
  if (!translated || translated === text) {
    clearState(container)
    return
  }

  // 插入翻译结果到容器末尾
  const tDiv = createTranslationDiv(translated)
  container.appendChild(tDiv)
  markAsDone(container)

  console.log('[AutoTranslate] 翻译成功', { originalLen: text.length, translatedLen: translated.length })
}

function ensureLoading(span) {
  const container = getContainer(span)
  if (!container || isTranslated(container) || isLoading(container)) return

  // 避免重复插入 loading
  if (container.querySelector('[data-auto-translation-loading]')) return

  const loading = createLoadingDiv()
  container.appendChild(loading)
  markAsLoading(container)

  console.log('[AutoTranslate] 插入 loading', { text: (span.textContent || '').slice(0, 80) })
}

// ======================
// 批量处理 & 监听
// ======================

async function processAll() {
  const spans = Array.from(document.querySelectorAll(SPAN_SELECTOR))
  const targets = spans.filter(needsTranslation)

  if (targets.length === 0) return

  // 限制并发（防 API 限流）
  const limit = 3
  for (let i = 0; i < targets.length; i += limit) {
    const batch = targets.slice(i, i + limit)
    batch.forEach(s => ensureLoading(s))
    await Promise.allSettled(batch.map(s => translateSpan(s)))
  }

  console.log('[AutoTranslate] 批量翻译完成，共', targets.length, '条')
}

function startObserving() {
  if (observerRef) return
  injectStyles()

  observerRef = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue

        let spans = []
        if (node.matches && node.matches(SPAN_SELECTOR)) {
          spans = [node]
        } else if (node.querySelectorAll) {
          spans = node.querySelectorAll(SPAN_SELECTOR)
        }

        for (const span of spans) {
          if (needsTranslation(span)) {
            ensureLoading(span)
            translateSpan(span)
          }
        }
      }
    }
  })

  observerRef.observe(document.body, { childList: true, subtree: true })
  processAll()
}

function stopObserving() {
  if (observerRef) {
    observerRef.disconnect()
    observerRef = null
  }
}

// ======================
// 初始化 & 配置监听
// ======================

async function shouldEnableAutoTranslate() {
  try {
    const get = window.__ALTUS_GET_AUTO_TRANSLATE_ENABLED
    if (typeof get === 'function') {
      const val = await get()
      return Boolean(val)
    }
  } catch {}
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['autoTranslateEnabled'], (res) => {
          resolve(Boolean(res?.autoTranslateEnabled ?? true))
        })
      })
    }
  } catch {}
  return localStorage.getItem('autoTranslateEnabled') !== 'false'
}

export function initAutoTranslate() {
  if (initialized) return
  initialized = true

  shouldEnableAutoTranslate().then((val) => {
    enabled = val
    if (enabled) startObserving()
  })

  // 监听配置变化
  try {
    const onChange = window.__ALTUS_ON_AUTO_TRANSLATE_CHANGE
    if (typeof onChange === 'function') {
      onChange((val) => {
        enabled = Boolean(val)
        if (enabled) startObserving()
        else stopObserving()
      })
    } else if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.autoTranslateEnabled) {
          enabled = Boolean(changes.autoTranslateEnabled.newValue)
          if (enabled) startObserving()
          else stopObserving()
        }
      })
    }
  } catch {}
}
