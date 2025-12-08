import { Configuration } from "app-builder-lib";

export const CommonConfig: Partial<Configuration> = {
  appId: "harwara.aman.whatsapp",
  productName: "Whatsapp",
  protocols: [
    {
      name: "whatsapp",
      role: "Viewer",
      schemes: ["whatsapp"],
    },
  ],
};
