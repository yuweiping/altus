export const languages = ["en", "es", "hi", "it", "pt-br", "de", "tr", "zh-cn"] as const;
export type Language = (typeof languages)[number];
export const fallbackLanguage = "zh-cn";
