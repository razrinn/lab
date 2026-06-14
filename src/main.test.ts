/* @vitest-environment happy-dom */

import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

let writeText: ReturnType<typeof vi.fn>;

const mount = async () => {
  vi.resetModules();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
  sessionStorage.clear();
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  await import("./main.ts");
};

const reload = async () => {
  vi.resetModules();
  document.body.innerHTML = '<div id="app"></div>';
  await import("./main.ts");
};

const input = () => document.querySelector<HTMLTextAreaElement>("#input-panel textarea")!;
const output = () => document.querySelector<HTMLTextAreaElement>("#output")!;
const clickTool = (id: string) => {
  document.querySelector<HTMLButtonElement>(`[data-tool="${id}"]`)!.click();
};
const change = (
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
) => {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("app integration", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("renders the default tool and updates output from input", async () => {
    await mount();

    expect(
      document.querySelector<HTMLButtonElement>('[data-tool="base64"]')!.textContent,
    ).toContain("Base64");
    expect(output().value).toBe("aGVsbG8gbGFi");

    change(input(), "new value");

    expect(output().value).toBe("bmV3IHZhbHVl");
  });

  it("runs reversible transforms from the output panel", async () => {
    await mount();

    change(output(), "aGVsbG8=");

    expect(input().value).toBe("hello");
  });

  it("restores input fields from session storage", async () => {
    await mount();

    change(input(), "same tab");
    await reload();

    expect(input().value).toBe("same tab");
    expect(output().value).toBe("c2FtZSB0YWI=");
  });

  it("copies output", async () => {
    await mount();

    document.querySelector<HTMLButtonElement>("#copy")!.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith("aGVsbG8gbGFi");
  });

  it("persists wrap lines", async () => {
    await mount();

    const wrap = document.querySelector<HTMLInputElement>("#wrap-lines")!;
    wrap.checked = true;
    wrap.dispatchEvent(new Event("change", { bubbles: true }));

    expect(localStorage.getItem("lab:wrap-lines")).toBe("true");
    expect(input().wrap).toBe("soft");
  });

  it("drives JSON to TS settings and saves them", async () => {
    await mount();
    clickTool("json-ts");

    change(input(), '{"user":{"id":1}}');
    change(document.querySelector<HTMLInputElement>('[name="rootName"]')!, "Api Response");
    change(document.querySelector<HTMLSelectElement>('[name="declaration"]')!, "interface");
    change(document.querySelector<HTMLSelectElement>('[name="structure"]')!, "composed");

    expect(localStorage.getItem("lab:selected-tool")).toBe("json-ts");
    expect(localStorage.getItem("lab:json-ts:rootName")).toBe("Api Response");
    expect(output().value).toBe(`interface ApiResponse {
  user: User;
}

interface User {
  id: number;
}`);
  });

  it("restores selected tool and module settings", async () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("lab:selected-tool", "json-ts");
    localStorage.setItem("lab:json-ts:rootName", "Saved Root");
    localStorage.setItem("lab:json-ts:arrayStyle", "generic");

    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await import("./main.ts");

    expect(document.querySelector<HTMLInputElement>('[name="rootName"]')!.value).toBe("Saved Root");
    expect(document.querySelector<HTMLSelectElement>('[name="arrayStyle"]')!.value).toBe("generic");
    expect(output().value).toContain("type SavedRoot =");
    expect(output().value).toContain("tags: Array<string>;");
  });

  it("runs the text diff workflow", async () => {
    await mount();
    clickTool("text-diff");

    const editors = Array.from(document.querySelectorAll<HTMLElement>(".diff-editor"));
    editors[0].textContent = "same\nold";
    editors[0].dispatchEvent(new Event("input", { bubbles: true }));
    editors[1].textContent = "same\nnew";
    editors[1].dispatchEvent(new Event("input", { bubbles: true }));

    document.querySelector<HTMLButtonElement>("#copy")!.click();

    expect(document.querySelector<HTMLElement>("#output-section")!.hidden).toBe(true);
    expect(editors[0].dataset.locked).toBe("true");
    expect(editors[0].innerHTML).toContain("diff-line-removed");
    expect(editors[1].innerHTML).toContain("diff-line-added");
  });
});
