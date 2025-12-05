// src/content/timeDisplay.js

import { COUNTRY_MAP } from './countryMap.js'
import { formatTimeInTimezone } from './utils.js'
let currentInfo = null
let timeDiv = null
let updateInterval = null
const STYLE_ID = 'altus-wact-style'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .whatsapp-country-time{margin-left:1rem;display:flex;font-size:.875rem;align-items:center;column-gap:.5rem}
    .whatsapp-country-time svg{flex:none}
  `
  document.head.appendChild(style)
}

function clearUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

/**
 * 渲染包含时间信息的新 div
 * @param {HTMLElement} phoneSpan - 包含电话号码的 span 元素
 * @param {Object} info - 包含国家信息和时区的对象
 */
function renderTimeDiv(phoneSpan, info) {
  const parent = phoneSpan.parentElement
  if (!parent) return

  // 移除旧元素
  const old = parent.querySelector('.whatsapp-country-time')
  if (old) old.remove()

  // 创建新的 div，并设置样式类
  injectStyles()
  const div = document.createElement('div')
  div.className = 'whatsapp-country-time'

  // 创建 SVG 图标（Lucide map-pin）
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
         stroke="#12B76A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
         class="lucide lucide-map-pin" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  `

  /**
   * 更新时间显示
   */
  const updateTime = () => {
    const timeStr = formatTimeInTimezone(info.timezone)
    div.innerHTML = `${svgIcon}<span style="color:#12B76A">${info.name} • ${timeStr}</span>`
  }

  // 初始渲染时间
  updateTime()
  // 每分钟更新一次时间
  updateInterval = setInterval(updateTime, 60_000)

  // 插入到 DOM 中
  parent.appendChild(div)
  timeDiv = div
  currentInfo = info
}

/**
 * 初始化时间显示模块
 * @param {HTMLElement} phoneSpan - 包含电话号码的 span 元素
 */
export function initTimeDisplay(phoneSpan) {
  const phoneText = phoneSpan.textContent?.trim()
  if (!phoneText || !phoneText.startsWith('+')) return

  const info = COUNTRY_MAP[phoneText.match(/^\+(\d+)/)?.[1]]
  if (!info) return

  // 如果是同一个号码，无需重复渲染（可选优化）
  if (currentInfo?.phone === phoneText) return

  clearUpdate()
  renderTimeDiv(phoneSpan, { ...info, phone: phoneText })
}

// 响应页面切回前台（通过事件）
document.addEventListener('whatsapp-foreground', () => {
  if (timeDiv && currentInfo) {
    const timeStr = formatTimeInTimezone(currentInfo.timezone)
    timeDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#12B76A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg><span style="color:#12B76A">${currentInfo.name} • ${timeStr}</span>`
  }
})
