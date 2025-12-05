import { Dialog } from "@kobalte/core"
import {
  Accessor,
  Component,
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
} from "solid-js"
import {
  addTab,
  getActiveWebviewElement,
  moveTabToIndex,
  removeTab,
  restoreTab,
  setTabActive,
  tabStore,
} from "../stores/tabs/solid"
import { Tab, getDefaultTab } from "../stores/tabs/common"
import TabEditDialog from "./TabEditDialog"
import { twJoin } from "tailwind-merge"
import { getSettingValue } from "../stores/settings/solid"
import NewChatDialog from "./NewChatDialog"
import { createStore } from "solid-js/store"
import { I18NContext } from "../i18n/solid"

interface TabComponentProps {
  tab: Tab
  index: Accessor<number>
  setTabToEdit: (tab: Tab | null) => void
  removeTab: (tab: Tab) => void
  isVertical: boolean
  avatarUrl?: string
  onOpenContextMenu: (x: number, y: number, tab: Tab) => void
}

const [draggedTab, setDraggedTab] = createSignal<{
  id: string
  index: number
}>()

const TabComponent: Component<TabComponentProps> = (props) => {
  const [messageCount, setMessageCount] = createSignal(0)

  const cleanupListener = window.electronIPCHandlers.onMessageCount(
    ({ messageCount, tabId }) => {
      if (tabId === props.tab.id) {
        setMessageCount(messageCount)
      }
    }
  )
  onCleanup(cleanupListener)

  const [willDrop, setWillDrop] = createSignal<"before" | "after" | false>(
    false
  )
  createEffect(() => {
    if (!draggedTab()) {
      setWillDrop(false)
    }
  })
  const [isDragging, setIsDragging] = createSignal(false)
  const isSelected = () => props.tab.id === tabStore.selectedTabId

  let tab: HTMLDivElement | undefined

  return (
    <div
      role="tab"
      ref={tab}
      id={props.tab.id}
      aria-controls={`tabpanel-${props.tab.id}`}
      aria-selected={isSelected() ? "true" : "false"}
      class="group relative flex flex-shrink-0 items-center justify-center gap-0 bg-white px-2 py-1.5 text-white text-sm leading-4 ui-selected:bg-white hover:bg-white/10 select-none"

      style={{}}
      onClick={() => setTabActive(props.tab.id)}
      data-selected={isSelected() ? "" : undefined}
      draggable={true}
      onContextMenu={(e) => {
        e.preventDefault()
        console.log(
          "TabsList: contextmenu on tab",
          props.tab.id,
          e.clientX,
          e.clientY
        )
        props.onOpenContextMenu(e.clientX, e.clientY, props.tab)
      }}
      onDragStart={(event) => {
        if (!event.dataTransfer) return
        setDraggedTab({
          id: props.tab.id,
          index: props.index(),
        })
        event.dataTransfer.dropEffect = "move"
        setIsDragging(true)
      }}
      onDragEnd={() => {
        setIsDragging(false)
        setDraggedTab(undefined)
        setTabActive(props.tab.id)
      }}
      onDragEnter={() => {
        const _draggedTab = draggedTab()
        if (!_draggedTab) return
        const currentIndex = props.index()
        const draggedTabIndex = _draggedTab.index
        if (currentIndex > draggedTabIndex) setWillDrop("after")
        else if (currentIndex < draggedTabIndex) setWillDrop("before")
        else setWillDrop(false)
      }}
      onDragLeave={(event) => {
        if (draggedTab()?.id === props.tab.id) return
        if (
          event.relatedTarget instanceof Node &&
          tab?.contains(event.relatedTarget)
        )
          return
        setWillDrop(false)
      }}
    >
      {!!messageCount() && (
        <div class="absolute right-1 top-1 flex items-center justify-center leading-none w-5 h-5 bg-red-600 text-white rounded-full text-[length:0.65rem]">
          {messageCount() > 99 ? "99+" : messageCount()}
        </div>
      )}
      <Show
        when={!!props.avatarUrl}
        fallback={
          <div
            class="w-10 h-10 rounded-full  flex items-center justify-center"
            classList={{
              "outline outline-[1.5px] outline-[#12B76A]": isSelected(),
            }}
            style={{ background: props.tab.config.color || "#ffffff" }}
          >
            <img
              src={"assets/icons/avatar-placeholder.png"}
              class="w-10 h-10"
              onError={(e) => (e.currentTarget.src = "assets/icons/icon.png")}
            />
          </div>
        }
      >
        <img
          src={props.avatarUrl!}
          class="w-10 h-10 rounded-full  object-cover"
          style={{
            "box-shadow": isSelected() ? "0 0 0 2px #12B76A" : undefined,
          }}
          onError={(e) => (e.currentTarget.src = "assets/icons/icon.png")}
        />
      </Show>
    </div>
  )
}

const TabsList: Component = () => {
  const { t } = useContext(I18NContext)
  const [tabToEdit, setTabToEdit] = createSignal<Tab | null>(null)
  const canShowTabEditDialog = () => tabToEdit() !== null

  const [canShowNewChatDialog, setShowNewChatDialog] = createSignal(false)

  const addNewTab = () => {
    addTab(getDefaultTab())
  }

  const removeTabWithPrompt = async (tab: Tab) => {
    const requiresPrompt = getSettingValue("tabClosePrompt")
    if (!requiresPrompt) {
      removeTab(tab)
      return
    }
    const result = await window.showMessageBox({
      type: "question",
      buttons: ["OK", "Cancel"],
      title: "Close Tab",
      message: "Are you sure you want to close the tab?",
    })
    if (result.response === 0) {
      removeTab(tab)
    }
  }

  const handlers = new Set<() => void>()
  const [avatars, setAvatars] = createStore<Record<string, string>>({})
  const [contextMenu, setContextMenu] = createSignal<{
    x: number
    y: number
    tab: Tab
  } | null>(null)
  onCleanup(() => {
    for (const cleanup of handlers) {
      cleanup()
    }
  })

  handlers.add(
    window.electronIPCHandlers.onNextTab(() => {
      const activeTabIndex = tabStore.tabs.findIndex(
        (tab) => tab.id === tabStore.selectedTabId
      )
      if (activeTabIndex === -1) return
      const nextIndex = activeTabIndex + 1
      if (nextIndex >= tabStore.tabs.length) {
        setTabActive(tabStore.tabs[0].id)
        return
      }
      setTabActive(tabStore.tabs[nextIndex].id)
    })
  )

  handlers.add(
    window.electronIPCHandlers.onPreviousTab(() => {
      const activeTabIndex = tabStore.tabs.findIndex(
        (tab) => tab.id === tabStore.selectedTabId
      )
      if (activeTabIndex === -1) return
      const previousIndex = activeTabIndex - 1
      if (previousIndex < 0) {
        setTabActive(tabStore.tabs[tabStore.tabs.length - 1].id)
        return
      }
      setTabActive(tabStore.tabs[previousIndex].id)
    })
  )

  handlers.add(
    window.electronIPCHandlers.onFirstTab(() => {
      const firstTab = tabStore.tabs[0]
      if (!firstTab) return
      setTabActive(firstTab.id)
    })
  )

  handlers.add(
    window.electronIPCHandlers.onLastTab(() => {
      const lastTab = tabStore.tabs[tabStore.tabs.length - 1]
      if (!lastTab) return
      setTabActive(lastTab.id)
    })
  )

  handlers.add(
    window.electronIPCHandlers.onOpenWhatsappLink((url) => {
      const activeWebview = getActiveWebviewElement()
      if (!activeWebview) return
      activeWebview.src = url
    })
  )

  handlers.add(
    window.electronIPCHandlers.onProfileAvatar(({ tabId, url }) => {
      setAvatars(tabId, url)
    })
  )

  handlers.add(
    window.electronIPCHandlers.onOpenTabDevTools(() => {
      const activeWebview = getActiveWebviewElement()
      if (!activeWebview) return
      activeWebview.openDevTools()
    })
  )

  handlers.add(
    window.electronIPCHandlers.onEditActiveTab(() => {
      const activeTab = tabStore.tabs.find(
        (tab) => tab.id === tabStore.selectedTabId
      )
      if (!activeTab) return
      setTabToEdit(activeTab)
    })
  )

  handlers.add(
    window.electronIPCHandlers.onCloseActiveTab(() => {
      const activeTab = tabStore.tabs.find(
        (tab) => tab.id === tabStore.selectedTabId
      )
      if (!activeTab) return
      removeTabWithPrompt(activeTab)
    })
  )

  handlers.add(
    window.electronIPCHandlers.onAddNewTab(() => {
      addNewTab()
    })
  )

  handlers.add(
    window.electronIPCHandlers.onRestoreTab(() => {
      restoreTab()
    })
  )

  handlers.add(
    window.electronIPCHandlers.onNewChat(() => {
      setShowNewChatDialog(true)
    })
  )

  return (
    <>
      <div
        class={twJoin(
          getSettingValue("tabBarPosition") === "left"
            ? "bg-white w-16 h-full flex flex-col flex-shrink-0"
            : "bg-white  w-full flex",
          getSettingValue("tabBar") ? "" : "hidden"
        )}
      >
        <div
          role="tablist"
          class={twJoin(
            "tabs-list",
            getSettingValue("tabBarPosition") === "left"
              ? "flex flex-col overflow-y-auto pt-4"
              : "flex overflow-x-auto pl-4"
          )}
          onDragEnter={(event) => {
            if (!event.dataTransfer) return
            const isDraggingTab = !!draggedTab
            if (isDraggingTab) event.preventDefault()
          }}
          onDragOver={(event) => {
            if (!event.dataTransfer) return
            const isDraggingTab = !!draggedTab
            if (isDraggingTab) event.preventDefault()
          }}
          onDrop={(event) => {
            const droppedOnTab = event.target.closest("[role='tab']")
            if (!droppedOnTab) return
            const _draggedTab = draggedTab()
            if (!_draggedTab) return
            const draggedTabID = _draggedTab.id
            const droppedOnTabID = droppedOnTab.id
            if (draggedTabID === droppedOnTabID) {
              return
            }
            const tabs = tabStore.tabs
            const draggedTabIndex = tabs.findIndex((t) => t.id === draggedTabID)
            const droppedOnTabIndex = tabs.findIndex(
              (t) => t.id === droppedOnTabID
            )
            moveTabToIndex(draggedTabIndex, droppedOnTabIndex)
            event.preventDefault()
          }}
        >
          <For each={tabStore.tabs}>
            {(tab, index) => (
              <TabComponent
                tab={tab}
                index={index}
                setTabToEdit={setTabToEdit}
                removeTab={removeTabWithPrompt}
                isVertical={getSettingValue("tabBarPosition") === "left"}
                avatarUrl={avatars[tab.id]}
                onOpenContextMenu={(x, y, t) => {
                  console.log("TabsList: setContextMenu", { x, y, tabId: t.id })
                  setContextMenu({ x, y, tab: t })
                }}
              />
            )}
          </For>
        </div>
        <button
          class={twJoin(
            "group flex items-center justify-center bg-white px-2 py-1.5 text-white text-sm leading-4 hover:bg-white/10 select-none",
            getSettingValue("tabBarPosition") === "left" ? "w-full" : ""
          )}
          onClick={addNewTab}
        >
          <div class="sr-only">Add new tab</div>
          <div class="w-10 h-10 rounded-full border border-[#E9E3DE] bg-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="w-7 h-7 text-[#12B76A]">
              <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
            </svg>
          </div>
        </button>
      </div>
      <Show when={contextMenu()}>
        {(menu) => (
          <>
            <div
              class="fixed inset-0 z-50"
              onClick={() => {
                console.log("TabsList: close context menu")
                setContextMenu(null)
              }}
            />
            <div
              class="fixed z-50 text-sm py-1 bg-white border rounded border-zinc-600 shadow"
              style={{ left: `${menu().x}px`, top: `${menu().y}px` }}
            >
              <button
                class="block w-full text-left px-3 py-1 hover:bg-zinc-700"
                onClick={() => {
                  removeTabWithPrompt(menu().tab)
                  setContextMenu(null)
                }}
              >
                {t("Close Active Tab")}
              </button>
            </div>
          </>
        )}
      </Show>
      <Dialog.Root
        open={canShowTabEditDialog()}
        onOpenChange={(open) => {
          if (!open) {
            setTabToEdit(null)
          }
        }}
      >
        <Show when={tabToEdit()}>
          {(tabToEdit) => (
            <TabEditDialog tabToEdit={tabToEdit} setTabToEdit={setTabToEdit} />
          )}
        </Show>
      </Dialog.Root>
      <Dialog.Root
        open={canShowNewChatDialog()}
        onOpenChange={setShowNewChatDialog}
      >
        <Show when={canShowNewChatDialog()}>
          <NewChatDialog
            close={() => {
              setShowNewChatDialog(false)
            }}
          />
        </Show>
      </Dialog.Root>
    </>
  )
}

export default TabsList
