export interface Contact {
    id?: string;
    phone?: string;
    name?: string;
    [key: string]: any;
}

export interface ContactSyncData {
    wid: string;
    contacts: Contact[];
    lastSyncTime: number;
}

export type ContactStore = Record<string, ContactSyncData>;

export const ContactStoreDefaults = (): ContactStore => ({});

export type ElectronContactStoreIpcApi = {
    getStore: () => Promise<ContactStore>;
    getContacts: (wid?: string) => Promise<ContactSyncData | ContactStore | null>;
    clearContacts: (wid?: string) => Promise<{ ok: boolean; message: string }>;
};
