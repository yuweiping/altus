// src/content/utils.js

export function formatTimeInTimezone(timezone) {
  try {
    const now = new Date()

    // 获取星期几（中文）
    const weekday = now
      .toLocaleDateString('zh-CN', {
        timeZone: timezone,
        weekday: 'short', // "周三"、"周四" 等
      })
      .replace('星期', '') // WhatsApp 风格通常只写“周三”，不写“星期三”

    // 获取时间（24小时制，到分钟）
    const time = now.toLocaleTimeString('zh-CN', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    return `${weekday} ${time}`
  } catch (e) {
    console.warn('[WhatsApp Time] Invalid timezone:', timezone)
    return '未知时间'
  }
}
