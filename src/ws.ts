import type { RawData } from "ws";
import { electronContactStore } from "./stores/contacts/electron";
const WS = require("ws");

let ws: any | null = null;
let wsConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000;
const wsUrl = "ws://localhost:82/ws";

function mergeContacts(existing: string[], newContacts: string[]): string[] {
  const contactSet = new Set<string>();
  existing.forEach((phone) => {
    if (phone && phone.trim() !== "") {
      contactSet.add(phone.trim());
    }
  });
  newContacts.forEach((phone) => {
    if (phone && phone.trim() !== "") {
      const trimmedPhone = phone.trim();
      if (!contactSet.has(trimmedPhone)) {
        contactSet.add(trimmedPhone);
      }
    }
  });
  return Array.from(contactSet);
}

function handleSyncContactsResponse(wid: string, newContacts: any) {
  try {
    let processedContacts: string[];
    if (Array.isArray(newContacts)) {
      if (newContacts.length > 0 && typeof newContacts[0] === "string") {
        processedContacts = newContacts;
      } else if (typeof newContacts[0] === "object") {
        processedContacts = newContacts
          .map((contact) => contact.phone || contact.id || contact.name || "")
          .filter((phone: string) => phone !== "");
      } else {
        return;
      }
    } else {
      return;
    }
    const existingContacts = electronContactStore.get(wid) || [];
    const mergedContacts = mergeContacts(existingContacts, processedContacts);
    electronContactStore.set(wid, mergedContacts);
  } catch {}
}

export function getIncrementalContacts(
  wid: string,
  currentContacts: string[]
): string[] {
  try {
    const existingContacts = electronContactStore.get(wid) || [];
    const incrementalContacts = currentContacts.filter((currentPhone) => {
      return !existingContacts.includes(currentPhone);
    });
    return incrementalContacts;
  } catch {
    return [];
  }
}

function handleReconnect() {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    setTimeout(createWebSocket, reconnectDelay);
  }
}

export function createWebSocket() {
  if (ws && (ws.readyState === WS.OPEN || ws.readyState === WS.CONNECTING)) {
    return;
  }
  try {
    ws = new WS(wsUrl, [], { handshakeTimeout: 5000 });
    wsConnected = false;
    ws.on("open", () => {
      wsConnected = true;
      reconnectAttempts = 0;
    });
    ws.on("close", () => {
      wsConnected = false;
      handleReconnect();
    });
    ws.on("error", () => {
      wsConnected = false;
    });
    ws.on("message", (data: RawData) => {
      try {
        let messageStr: string;
        if (data instanceof Buffer) {
          messageStr = data.toString("utf8");
        } else if (typeof data === "string") {
          messageStr = data;
        } else {
          messageStr = String(data);
        }
        const message = JSON.parse(messageStr);
        if (message.type === "sync-contacts" && message.wid && message.contacts) {
          handleSyncContactsResponse(message.wid, message.contacts);
        }
      } catch {}
    });
  } catch {
    handleReconnect();
  }
}

export function isConnected(): boolean {
  return wsConnected;
}

export async function ensureConnected(timeout = 2000): Promise<boolean> {
  if (!wsConnected) {
    createWebSocket();
    await new Promise((resolve) => {
      const timeoutId = setTimeout(resolve, timeout);
      const checkInterval = setInterval(() => {
        if (wsConnected) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve(true);
        }
      }, 100);
    });
  }
  return wsConnected;
}

export function send(data: unknown): boolean {
  if (ws && ws.readyState === WS.OPEN) {
    const text = JSON.stringify(data);
    ws.send(text);
    return true;
  }
  return false;
}

