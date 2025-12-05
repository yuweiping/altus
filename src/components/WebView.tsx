import {type Component, createEffect, createMemo, createSignal, onMount, Show} from "solid-js";
import {type Tab} from "../stores/tabs/common";
import {WebviewTag} from "electron";
import {themeStore} from "../stores/themes/solid";
import {unwrap} from "solid-js/store";
import wppconnectWa from '../contentScript/wppconnect-wa.min.js?raw'
import wppWorld from '../contentScript/world.js?raw'

const WebView: Component<{ tab: Tab }> = (props) => {
  let webviewRef: WebviewTag | undefined;
  const [didStopLoading, setDidStopLoading] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);
  const [loadError, setLoadError] = createSignal<{ code: number; description: string } | null>(null);

  const selectedTheme = createMemo(() => {
    return unwrap(
      themeStore.themes.find((theme) => theme.id === props.tab.config.theme)
    );
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    webviewRef.send("set-theme", selectedTheme());
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    webviewRef.setAudioMuted(!props.tab.config.sound);
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    window.initPermissionHandler(`persist:${props.tab.id}`);
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    window.toggleNotifications(
      props.tab.config.notifications,
      `persist:${props.tab.id}`
    );
    window.toggleMediaPermission(
      props.tab.config.media,
      `persist:${props.tab.id}`
    );
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    webviewRef.send("set-id", props.tab.id);
  });

  onMount(() => {
    const webview = webviewRef;

    if (!webview) {
      return;
    }

    webview.addEventListener("did-start-loading", () => {
      setIsLoading(true);
      setLoadError(null);
    });

    webview.addEventListener("dom-ready", () => {
      setIsLoading(false);
    });

    webview.addEventListener("did-stop-loading", () => {
      setDidStopLoading(false);
      setDidStopLoading(true);
      setIsLoading(false);
        // Ensure WPP is available in the main world before UI features use it
        Promise.resolve()
            .then(() => webview.executeJavaScript(wppconnectWa))
            .then(() => webview.executeJavaScript(wppWorld))
            .catch(console.error)
    });

    webview.addEventListener("did-fail-load", (event: any) => {
      setIsLoading(false);
      setLoadError({ code: event.errorCode, description: String(event.errorDescription || "") });
    });

    webview.addEventListener("focus", () => {
      const anyOpenTitlebarMenu = document.querySelector(
        "[data-custom-titlebar-menu] > [data-expanded]"
      );
      if (!anyOpenTitlebarMenu) return;
      anyOpenTitlebarMenu.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        })
      );
    });
  });

  const retry = () => {
    if (!webviewRef) return;
    setLoadError(null);
    setIsLoading(true);
    try {
      webviewRef.reload();
    } catch {}
  };

  return (
    <div class="relative w-full h-full">
      <Show when={isLoading()}>
        <div class="pointer-events-none absolute top-0 left-0 right-0 z-20 h-[2px] overflow-hidden">
          <div class="altus-progress-bar"></div>
        </div>
      </Show>
      <Show when={!!loadError()}>
        <div class="absolute inset-0 z-30 bg-white/70 flex items-center justify-center">
          <div class="bg-white border border-zinc-200 rounded-md shadow px-4 py-3 text-sm text-zinc-900">
            <div class="mb-2">页面加载失败</div>
            <div class="mb-3 text-zinc-500">{loadError()?.description}（错误码 {loadError()?.code}）</div>
            <div class="flex gap-2">
              <button class="px-3 py-1.5 bg-emerald-600 text-white rounded" onClick={retry}>重试</button>
            </div>
          </div>
        </div>
      </Show>
      <webview
        ref={webviewRef}
        class="w-full h-full"
        id={`webview-${props.tab.id}`}
        src="https://web.whatsapp.com"
        partition={`persist:${props.tab.id}`}
        preload={window.whatsappPreloadPath}
        webpreferences={`spellcheck=${props.tab.config.spellChecker}`}
      />
    </div>
  );
};

export default WebView;
