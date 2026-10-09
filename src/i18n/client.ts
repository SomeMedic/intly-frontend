"use client";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    lng: "ru",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    resources: {
      ru: {
        common: {
          loading: "Загрузка",
          retry: "Повторить"
        }
      },
      en: {
        common: {
          loading: "Loading",
          retry: "Retry"
        }
      }
    }
  });
}

export default i18next;
