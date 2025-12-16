export type ContactStore = Record<string, string[]>; // 简化为 wid 直接对应联系人数组
export const ContactStoreDefaults = (): ContactStore => ({});
export type ElectronContactStoreIpcApi = {
    getStore: () => Promise<ContactStore>;
    getContacts: (wid?: string) => Promise<string[] | ContactStore | null>;
    clearContacts: (wid?: string) => Promise<{ ok: boolean; message: string }>;
};