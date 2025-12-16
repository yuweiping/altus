import Store from "electron-store";
import { ContactStore, ContactStoreDefaults } from "./common";

export const electronContactStore = new Store<ContactStore>({
    name: "contacts",
    defaults: ContactStoreDefaults(),
});