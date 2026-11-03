import { render } from "@testing-library/react";
import type { ReactNode } from "react";

import { I18nProvider } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/locale";

/** Renders inside the i18n provider with the given locale stored, as the app does. */
export function renderWithLocale(ui: ReactNode, locale: Locale = "pt-BR") {
  window.localStorage.setItem("emporio.locale", locale);
  return render(<I18nProvider initialLocale={locale}>{ui}</I18nProvider>);
}
