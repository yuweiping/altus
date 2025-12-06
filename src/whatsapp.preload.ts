import { ipcRenderer } from "electron";
import { Theme } from "./stores/themes/common";
import { formatSelectedText } from "./utils/webview/formatSelectedText";
import { getLuminance } from "color2k";
import { initTimeDisplay } from "./contentScript/timeDisplay.js";
import { initTranslateButton } from "./contentScript/translateButton.js";
import { initAutoTranslate } from "./contentScript/autoTranslate.js";

let titleElement: HTMLTitleElement;

window.onload = () => {
  titleElement = document.querySelector("title") as HTMLTitleElement;

  // Reset initial theme
  document.body.querySelectorAll("script").forEach((script) => {
    if (script.innerHTML.includes("systemThemeDark")) {
      script.remove();
    }
  });
  document.body.className = "web";

  document.body.addEventListener("keydown", (event) => {
    if (!event.ctrlKey) return;

    switch (event.key) {
      case "=":
      case "+":
        ipcRenderer.send("zoom", "in");
        break;
      case "-":
        ipcRenderer.send("zoom", "out");
        break;
      case "0":
        ipcRenderer.send("zoom", "reset");
        break;
      case "b":
        formatSelectedText("*");
        break;
      case "i":
        formatSelectedText("_");
        break;
      case "s":
        formatSelectedText("~");
        break;
      case "m":
        formatSelectedText("```");
        break;
      default:
        break;
    }
  });

  document.body.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLAnchorElement)) return;
    console.log(event.target);
    if (
      event.target.tagName === "A" &&
      event.target.getAttribute("target") === "_blank"
    ) {
      const url = new URL(event.target.href);
      if (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com") {
        // WhatsApp automatically opens the correct chat for "click to chat" links.
        return;
      }
      ipcRenderer.send("open-link", event.target.href);
    }
  });

  registerTitleElementObserver();
  tryRegisterProfileAvatarObserver();
  setupCountryTimeIntegration();
  // Provide provider getter for translateButton
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__ALTUS_GET_TRANSLATE_PROVIDER = async () => {
    try {
      const settings = await ipcRenderer.invoke("settings-store-get");
      return settings.translateProvider?.value ?? "microsoft";
    } catch {
      return "microsoft";
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__ALTUS_GET_AUTO_TRANSLATE_ENABLED = async () => {
    try {
      const settings = await ipcRenderer.invoke("settings-store-get");
      return Boolean(settings.autoTranslateEnabled?.value ?? true);
    } catch {
      return true;
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__ALTUS_ON_AUTO_TRANSLATE_CHANGE = (callback: (enabled: boolean) => void) => {
    ipcRenderer.on("settings-changed", (_e, { key, value }) => {
      if (key === "autoTranslateEnabled") callback(Boolean(value));
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__ALTUS_TRANSLATE = async (text: string, target: string = 'en') => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = await (window as any).__ALTUS_GET_TRANSLATE_PROVIDER();
      return await ipcRenderer.invoke("translate-text", { provider, text, target });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message };
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__ALTUS_TOAST = (message: string) => {
    const styleId = "altus-toast-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        #altus-toast{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:99999;pointer-events:none;opacity:1;transition:opacity .2s ease}
        #altus-toast{background:color-mix(in srgb,var(--bg, #0f1115), var(--ac, #12B76A) 20%);color:var(--fg, #ffffff);border:1px solid var(--ac, #12B76A);padding:8px 12px;border-radius:6px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.25)}
      `;
      document.head.appendChild(style);
    }
    const id = "altus-toast";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = "1";
    setTimeout(() => {
      if (!el) return;
      el.style.opacity = "0";
    }, 2500);
  };

};

function getMessageCountFromTitle(title: string) {
  const title_regex = /([0-9]+)/;
  const exec = title_regex.exec(title);
  if (!exec) return 0;

  return parseInt(exec[0], 10);
}

function registerTitleElementObserver() {
  new MutationObserver(function () {
    const title = titleElement.textContent;
    if (!title) return;

    try {
      const messageCount = getMessageCountFromTitle(title);
      const tabId = document.body.dataset.tabId;

      ipcRenderer.send("message-count", {
        messageCount,
        tabId,
      });
    } catch (error) {
      console.error(error);
    }
  }).observe(titleElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}

function findProfileAvatarUrl(): string | undefined {
  const selectors = [
    '[data-testid="my-avatar"] img',
    '[data-testid="user-avatar"] img',
    '[data-testid*="avatar"] img',
    '#side header img',
    'header img',
    'img[alt*="profile" i]',
    'img[alt*="avatar" i]'
  ];
  for (const sel of selectors) {
    const img = document.querySelector(sel) as HTMLImageElement | null;
    if (img && img.src) return img.src;
  }
  return undefined;
}

function tryRegisterProfileAvatarObserver() {
  const sendIfFound = () => {
    const url = findProfileAvatarUrl();
    const tabId = document.body.dataset.tabId;
    if (url && tabId) {
      ipcRenderer.send('profile-avatar', { tabId, url });
      return true;
    }
    return false;
  };

  if (sendIfFound()) return;
  const interval = setInterval(() => {
    if (sendIfFound()) clearInterval(interval);
  }, 3000);

  const observer = new MutationObserver(() => {
    if (sendIfFound()) observer.disconnect();
  });
  observer.observe(document.body, { subtree: true, childList: true });
}

const SELECTORS = {
  PHONE_SPAN:
    'span[dir="auto"].x1iyjqo2.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft.x1rg5ohu._ao3e',
  STATUS_LINE:
    ".x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli.xtnn1bt.x9v5kkp.xmw7ebm.xrdum7p",
};

let currentPhoneSpan: HTMLElement | null = null;
let hasInitializedForCurrentChat = false;

function onChatDetected(phoneSpan: HTMLElement) {
  if (phoneSpan === currentPhoneSpan) return;
  currentPhoneSpan = phoneSpan;
  hasInitializedForCurrentChat = false;
  setTimeout(() => {
    if (hasInitializedForCurrentChat) return;
    if (
      document.querySelector(
        '[contenteditable="true"][data-lexical-editor="true"]'
      )
    ) {
      initTimeDisplay(phoneSpan);
      initTranslateButton();
      initAutoTranslate();
      hasInitializedForCurrentChat = true;
    }
  }, 300);
}

function handleStatusLine(statusElement: Element) {
  let container: Element | null = statusElement;
  for (let i = 0; i < 6 && container; i++) {
    const phoneSpan = container.querySelector(
      SELECTORS.PHONE_SPAN
    ) as HTMLElement | null;
    if (phoneSpan) {
      onChatDetected(phoneSpan);
      return;
    }
    container = container.parentElement;
  }
}

function setupCountryTimeIntegration() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if ((node as Element).matches?.(SELECTORS.STATUS_LINE)) {
          handleStatusLine(node as Element);
          return;
        }
        const statusInNode = (node as Element).querySelector?.(
          SELECTORS.STATUS_LINE
        );
        if (statusInNode) {
          handleStatusLine(statusInNode);
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => {
    const statusLine = document.querySelector(SELECTORS.STATUS_LINE);
    if (statusLine) handleStatusLine(statusLine);
  }, 1500);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      const event = new CustomEvent("whatsapp-foreground");
      document.dispatchEvent(event);
    }
  });
}

function setThemeCSS(css: string) {
  const existingStyle = document.getElementById("altus-style");
  if (existingStyle) {
    existingStyle.innerHTML = css;
  } else {
    const styleElement = document.createElement("style");
    styleElement.id = "altus-style";
    styleElement.innerHTML = css;
    document.head.appendChild(styleElement);
  }
}

function setThemeColors(colors: NonNullable<Theme["colors"]>) {
  document.body.classList.add("custom");

  const bgLuminance = getLuminance(colors.bg);
  console.log(bgLuminance);

  let colorMixColor = "white";
  let colorMixColorOpposite = "black";
  if (bgLuminance < 0.25) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
    colorMixColor = "black";
    colorMixColorOpposite = "white";
  }

  setThemeCSS(`
.custom {
  --bg: ${colors.bg};
  --fg: ${colors.fg};
  --ac: ${colors.ac};
  --border: color-mix(in srgb, var(--bg), ${colorMixColor} 15%);
  --app-background: var(--bg);
  --navbar-background: var(--bg);
  --navbar-border: var(--border);
  --conversation-header-border: var(--border);
  --border-list: var(--border);
  --intro-background: var(--bg);
  --startup-background: var(--bg);
  --status-background: var(--bg);
  --conversation-panel-background: var(--bg);
  --background-default: color-mix(in srgb, var(--bg), ${colorMixColor} 2.5%);
  --background-default-active: color-mix(in srgb, var(--bg), ${colorMixColor} 7%);
  --background-default-hover: color-mix(in srgb, var(--bg), ${colorMixColor} 6%);
  --background-lighter: color-mix(in srgb, var(--bg), white 5%);
  --background-lighter-active: color-mix(in srgb, var(--bg), white 10%);
  --background-lighter-hover: color-mix(in srgb, var(--bg), white 10%);
  --incoming-background: color-mix(in srgb, var(--bg), ${colorMixColor} 9%);
  --incoming-background-deeper: color-mix(in srgb, var(--bg), ${colorMixColor} 3.5%);
  --outgoing-background: color-mix(in srgb, var(--bg), ${colorMixColor} 12.5%);
  --outgoing-background-deeper: color-mix(in srgb, var(--bg), ${colorMixColor} 6.5%);
  --system-message-background: color-mix(in srgb, var(--bg), ${colorMixColor} 10%);
  --notification-e2e-background: color-mix(in srgb, var(--bg), ${colorMixColor} 10%);
  --notification-non-e2e-background: color-mix(in srgb, var(--bg), ${colorMixColor} 10%);
  --dropdown-background: color-mix(in srgb, var(--bg), ${colorMixColor} 10%);
  --dropdown-background-hover: color-mix(in srgb, var(--bg), ${colorMixColor} 2.5%);
  --panel-header-background: color-mix(in srgb, var(--bg), ${colorMixColor} 5%);
  --panel-background-colored: color-mix(in srgb, var(--bg), ${colorMixColor} 5%);
  --filters-container-background: color-mix(in srgb, var(--bg), ${colorMixColor} 5%);
  --filters-item-background: color-mix(in srgb, var(--bg), ${colorMixColor} 10%);
  --filters-item-active-background: color-mix(in srgb, var(--bg), ${colorMixColor} 20%);
  --search-input-container-background: color-mix(in srgb, var(--bg), ${colorMixColor} 5%);
  --search-input-container-background-active: color-mix(in srgb, var(--bg), ${colorMixColor} 5%);
  --search-input-background: color-mix(in srgb, var(--bg), ${colorMixColor} 2.5%);
  --compose-input-background: var(--bg);
  --compose-input-border: color-mix(in srgb, var(--bg), ${colorMixColor} 15%);
  --rich-text-panel-background: color-mix(in srgb, var(--bg), ${colorMixColor} 7%);
  --drawer-background: var(--bg);
  --drawer-section-background: var(--bg);
  --avatar-placeholder-background: color-mix(in srgb, var(--bg), ${colorMixColor} 20%);
  --butterbar-update-background: color-mix(in srgb, var(--bg), ${colorMixColor} 8%);
  --butterbar-update-icon: var(--ac);
  --drawer-background-deep: color-mix(in srgb, var(--bg), ${colorMixColor} 10%);
  --modal-background: color-mix(in srgb, var(--bg), ${colorMixColor} 1%);
  --modal-backdrop: color-mix(in srgb, var(--bg), transparent 10%);
  --icon-ack: var(--ac);
  --checkbox-background: var(--ac);
  --app-background-stripe: var(--ac);
  --primary: var(--fg);
  --primary-strong: color-mix(in srgb, var(--primary), ${colorMixColor} 20%);
  --message-primary: var(--primary-strong);
  --secondary: color-mix(in srgb, var(--fg), ${colorMixColorOpposite} 20%);
  --secondary-stronger: color-mix(in srgb, var(--secondary), ${colorMixColor} 30%);
  --chat-meta: var(--secondary);
  --panel-header-icon: var(--ac);
  --archived-chat-marker: var(--secondary);
  --text-secondary-emphasized: var(--secondary);
  --filters-item-color: var(--secondary);
  --icon: var(--secondary);
  --icon-strong: var(--secondary);
  --filters-item-active-color: var(--secondary);
  --archived-chat-marker-background: color-mix(in srgb, var(--bg), ${colorMixColor} 10%);
  --archived-chat-marker-border: var(--archived-chat-marker-background);
  --round-icon-background: var(--ac);
  --teal: var(--ac);
}

@media (min-width: 1441px) {
  #app > div > [tabindex], [data-animate-status-v3-modal-background] > div:first-child {
    border: 1px solid color-mix(in srgb, var(--bg), ${colorMixColor} 15%);
    border-radius: 4px;
  }
}
  `);
}

ipcRenderer.on("set-theme", (event, theme: Theme) => {
  document.body.classList.remove("custom");

  if (theme.id === "dark") {
    document.body.classList.add("dark");
  } else if (theme.id === "default") {
    document.body.classList.remove("dark");
  }

  if (theme.css) {
    setThemeCSS(theme.css);
  }

  if (theme.colors) {
    setThemeColors(theme.colors);
  }
});

ipcRenderer.on("format-text", (e, wrapper) => {
  formatSelectedText(wrapper);
});

ipcRenderer.on("set-id", (e, id) => {
  if (!document.body.dataset.tabId) {
    // send back initial message count
    ipcRenderer.send("message-count", {
      messageCount: getMessageCountFromTitle(
        titleElement.textContent as string
      ),
      tabId: id,
    });
  }

  document.body.dataset.tabId = id;
});
