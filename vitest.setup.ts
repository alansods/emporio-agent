import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

function clearCookies(): void {
  for (const entry of document.cookie.split("; ")) {
    const name = entry.split("=")[0];
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  clearCookies();
  document.documentElement.removeAttribute("lang");
});
