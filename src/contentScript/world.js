// 移到程序根级别的函数声明
function downloadFile(name, content, type) {
    const blob = new Blob([content], {type: type || 'application/json'})
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
        if (!window.WPP?.contact?.list) {
            console.warn('[WPP] contact.list 不可用')
            return
        }
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

// 简化后的 getAllContactIds 函数
function getAllContactIds() {
    try {
        const chatStore = window.WPP?.whatsapp?.ChatStore;
        if (!chatStore?.notSpam) return [];

        const idx = chatStore.notSpam;

        if (typeof idx === 'object') {
            if (typeof idx.keys === 'function') {
                return Array.from(idx.keys()).map(String);
            }
            return Object.keys(idx).map(String);
        }

        return [];
    } catch (e) {
        console.warn('[WPP] 获取联系人失败:', e?.message || e);
        return [];
    }
}

// 格式化函数：如果有@，只取@前面的部分
function formatId(id) {
    return id?.split('@')[0] || id;
}

// 简化后的 startSync 函数
async function startSync() {
    try {
        // 检查必要的依赖
        if (!window.WPP?.conn || !window.__WHATSAPP_SYNC) {
            throw new Error('WPP或同步函数不可用');
        }
        // 获取数据
        const wid = formatId(String(window.WPP.conn.getMyUserId?.() ));
        const contacts = getAllContactIds().map(formatId);
        // 执行同步
        await window.__WHATSAPP_SYNC({
            wid,
            contacts,
            "type": "sync-contacts"
        });
    } catch (e) {
        console.warn('[WPP] 同步失败:', e?.message || e)
    } finally {
    }
}
// 主逻辑 - 保持在if-else块内
if (window.__WPP_EXPORT_LOADED__) {
} else {
    window.__WPP_EXPORT_LOADED__ = true
    window.__WPP_SYNC_LAST_COUNT__ = 0

    // 事件监听器
    window.addEventListener('message', (event) => {
        if (event.source !== window) return
        const data = event.data
        if (!data || data.direction !== 'toWPP') return

        console.log('[WPP] 收到指令', data)
        if (data.action === 'EXPORT_CONTACT') handleExportContact()
        if (data.action === 'SET_INPUT_TEXT') handleSetInputText(data.text)
        if (data.action === 'START_SYNC') startSync()
    })

    try {
        if (window.WPP?.on) {
            console.log('[WPP] 注册事件监听器')
            window.WPP.on('conn.main_ready', () => {
                console.log('[WPP] conn.main_ready 事件触发')
                startSync()
            })
            window.WPP.on('chat.added', (chat) => {
                console.log('[WPP] chat.added 事件触发', chat?.id?.toString?.())
                startSync()
            })
        } else {
            console.warn('[WPP] WPP.on 方法不可用')
        }
    } catch (e) {
        console.warn('[WPP] 监听事件失败', e?.message || e)
    }
}