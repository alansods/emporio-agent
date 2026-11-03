import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom does not implement scrolling.
Element.prototype.scrollIntoView = () => undefined;

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

// jsdom does not implement modal dialogs; mimic the open state and the close event.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  if (!this.hasAttribute("open")) return;
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};
