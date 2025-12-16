import RestoreIcon from "../icons/RestoreIcon";
import MinimizeIcon from "../icons/MinimizeIcon";
import CloseIcon from "../icons/CloseIcon";
import { Component, Resource, createSignal, createEffect, onCleanup } from "solid-js";
import { CloneableMenu } from "../main";
import MaximizeIcon from "../icons/MaximizeIcon";
import AutoTranslateIcon from "../icons/AutoTranslateIcon";
import CloudIcon from "../icons/CloudIcon";
import { getSettingValue, setSettingValue } from "../stores/settings/solid";


const CustomTitlebar: Component<{
  menu: Resource<CloneableMenu>;
}> = (props) => {
  const [maximized, setMaximized] = createSignal(false);
  const [blurred, setBlurred] = createSignal(false);
  const [wsConnected, setWsConnected] = createSignal(false);
  const [autoTranslate, setAutoTranslate] = createSignal(getSettingValue("autoTranslateEnabled"));

  window.windowActions.isMaximized().then(setMaximized).catch(console.error);
  window.windowActions.isBlurred().then(setBlurred).catch(console.error);

  window.windowActions.onBlurred(() => setBlurred(true));
  window.windowActions.onFocused(() => setBlurred(false));

  createEffect(() => {
    const i = setInterval(() => {
      window.wsGetStatus().then((v) => setWsConnected(Boolean(v))).catch(() => {});
    }, 500);
    onCleanup(() => clearInterval(i));
  });

  const toggleAutoTranslate = async () => {
    const next = !autoTranslate();
    setAutoTranslate(next);
    setSettingValue("autoTranslateEnabled", next);
  };

  const toggleMaximize = async () => {
    if (maximized()) {
      await window.windowActions.restore();
    } else {
      await window.windowActions.maximize();
    }
    const isMaximized = await window.windowActions.isMaximized();
    setMaximized(isMaximized);
  };

  return (
    <div
      data-custom-titlebar
      classList={{
        "flex h-8 relative w-full bg-[#f9f9f9] text-['#636460'] text-[13px] [-webkit-app-region:drag] select-none isolate z-[100] pointer-events-auto":
          true,
        "opacity-75": blurred(),
      }}
    >
      <div class="p-1.5 mx-0.5">
        <img src="./assets/icons/icon.png?url" class="w-full h-full" />
      </div>
      <div class="text-[13px] p-1.5 font-bold text-[#636460]">Whatsapp</div>
      <div class="grid grid-cols-[repeat(5,46px)] h-full [-webkit-app-region:no-drag] ml-auto">
        <button
          onClick={toggleAutoTranslate}
          class="flex items-center justify-center hover:bg-white/10 focus:bg-white/20 outline-none"
          aria-label="Toggle Auto Translate"
          title={autoTranslate() ? "自动翻译已开启" : "自动翻译已关闭"}
        >
          <AutoTranslateIcon enabled={autoTranslate()} class="h-5 w-5" classList={{ 'text-gray-400': !autoTranslate() }} />
        </button>
        <button
          onClick={() => window.wsReconnect().catch(() => {})}
          class="flex items-center justify-center hover:bg-white/10 focus:bg-white/20 outline-none"
          aria-label="WebSocket状态"
          title={wsConnected() ? "WS已连接" : "WS未连接，点击重连"}
        >
          <CloudIcon class="h-5 w-5" classList={{ 'text-green-600': wsConnected(), 'text-gray-400': !wsConnected() }} />
        </button>
        <button
          onClick={window.windowActions.minimize}
          class="flex items-center justify-center hover:bg-white/10 focus:bg-white/20 outline-none"
        >
          <MinimizeIcon class="h-4 w-4" />
        </button>
        <button
          onClick={toggleMaximize}
          class="flex items-center justify-center hover:bg-white/10 focus:bg-white/20 outline-none"
        >
          {maximized() ? (
            <RestoreIcon class="h-4 w-4" />
          ) : (
            <MaximizeIcon class="h-4 w-4" />
          )}
        </button>
        <button
          onClick={window.windowActions.close}
          class="flex items-center justify-center hover:bg-red-600/70 focus:bg-red-600 outline-none"
        >
          <CloseIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CustomTitlebar;
