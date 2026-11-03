import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderReply } from "@/lib/markdown/renderReply";

function renderText(text: string) {
  return render(<div data-testid="reply">{renderReply(text)}</div>).getByTestId("reply");
}

describe("renderReply", () => {
  it("renders a paragraph and a bulleted list with bold names", () => {
    const reply = renderText("Temos:\n\n* **Yamaha C40:** R$ 599,90\n* **Yamaha F310:** R$ 699,90");

    expect(reply.querySelector("p")?.textContent).toBe("Temos:");
    const items = reply.querySelectorAll("ul > li");
    expect(items).toHaveLength(2);
    expect([...items].map((item) => item.querySelector("strong")?.textContent)).toEqual([
      "Yamaha C40:",
      "Yamaha F310:",
    ]);
    expect(reply.textContent).not.toContain("*");
  });

  it("supports dash bullets", () => {
    const reply = renderText("- um\n- dois");

    expect(reply.querySelectorAll("li")).toHaveLength(2);
  });

  it("keeps unmatched markers literal", () => {
    const reply = renderText("5 * 3 e **sem fechamento");

    expect(reply.textContent).toBe("5 * 3 e **sem fechamento");
    expect(reply.querySelector("strong")).toBeNull();
    expect(reply.querySelector("ul")).toBeNull();
  });

  it("does not interpret reply text as HTML", () => {
    const reply = renderText("<b>oi</b>");

    expect(reply.textContent).toBe("<b>oi</b>");
    expect(reply.querySelector("b")).toBeNull();
  });

  it("keeps single line breaks", () => {
    const reply = renderText("linha 1\nlinha 2");

    expect(reply.querySelectorAll("p")).toHaveLength(1);
    expect(reply.querySelectorAll("br")).toHaveLength(1);
  });
});
