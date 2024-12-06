import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector"
import englishLang from "./en.json"
import frenchLang from "./fr.json"

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    debug: true,
    resources: {
      en: { translation: englishLang },
      fr: { translation: frenchLang },
    },
  });

export default i18n;
