import "./style.css";
import { modules } from "./modules";
import { diffPanels } from "./modules/diff";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
<main class="grid h-dvh grid-rows-[minmax(0,16rem)_1fr] overflow-hidden bg-[#1a1b26] text-[#c0caf5] md:grid-cols-[13rem_1fr] md:grid-rows-1">
  <aside class="flex min-h-0 flex-col border-b border-[#3b4261] bg-[#16161e] p-3 md:border-r md:border-b-0">
    <div class="mb-3">
      <h1 class="font-black text-[#d5defe] md:mb-1">lab.rzrn.dev</h1>
    </div>
    <nav class="tool-list grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-y-auto md:grid-cols-1" aria-label="Tools"></nav>
    <details class="mt-3 rounded-md border border-[#3b4261] text-sm text-[#9aa5ce]">
      <summary class="cursor-pointer px-3 py-2 font-black text-[#c0caf5]">Settings</summary>
      <label class="flex gap-2 border-t border-[#3b4261] px-3 py-2">
        <input id="wrap-lines" class="mt-1" type="checkbox" />
        <span>Wrap long lines</span>
      </label>
      <div id="module-settings"></div>
    </details>
    <button id="copy" class="mt-3 rounded-md border border-[#7aa2f7]/60 px-3 py-2 text-left text-sm font-black text-[#7dcfff] hover:bg-[#7aa2f7]/10" type="button">
      Copy output
    </button>
  </aside>

  <section class="grid min-h-0 grid-rows-2 bg-[#3b4261] md:grid-cols-2 md:grid-rows-1" id="workspace">
    <section class="grid min-h-0 bg-[#16161e] md:border-r md:border-[#3b4261]" id="input-panel"></section>

    <section class="grid min-h-0 grid-rows-[auto_1fr] bg-[#16161e]" id="output-section">
      <div class="border-b border-[#292e42] px-4 py-3 text-xs font-black uppercase text-[#7aa2f7]">
        <span id="output-label"></span>
      </div>
      <div class="grid min-h-0 grid-cols-[auto_1fr]">
        <pre class="line-numbers m-0 overflow-hidden border-r border-[#292e42] px-3 py-4 text-right text-sm leading-7 text-[#565f89] select-none" id="output-lines" aria-hidden="true">1</pre>
        <textarea id="output" class="min-w-0 resize-none overflow-auto bg-transparent p-4 text-sm leading-7 text-[#c0caf5] outline-none" spellcheck="false" readonly wrap="off"></textarea>
      </div>
    </section>
  </section>
</main>
`;

const toolList = app.querySelector<HTMLElement>(".tool-list")!;
const workspace = app.querySelector<HTMLElement>("#workspace")!;
const inputPanel = app.querySelector<HTMLElement>("#input-panel")!;
const outputSection = app.querySelector<HTMLElement>("#output-section")!;
const output = app.querySelector<HTMLTextAreaElement>("#output")!;
const outputLabel = app.querySelector<HTMLElement>("#output-label")!;
const action = app.querySelector<HTMLButtonElement>("#copy")!;
const outputLines = app.querySelector<HTMLElement>("#output-lines")!;
const wrapLines = app.querySelector<HTMLInputElement>("#wrap-lines")!;
const moduleSettings = app.querySelector<HTMLElement>("#module-settings")!;

const selectedToolKey = "lab:selected-tool";
const wrapLinesKey = "lab:wrap-lines";
const settingKey = (toolId: string, settingId: string) => `lab:${toolId}:${settingId}`;
const inputKey = (toolId: string, index: number) => `lab:${toolId}:input:${index}`;
let active =
  modules.find((tool) => tool.id === localStorage.getItem(selectedToolKey)) ?? modules[0];
let shouldWrapLines = localStorage.getItem(wrapLinesKey) === "true";
let inputTextareas: HTMLTextAreaElement[] = [];
let inputLineNumbers: HTMLElement[] = [];
let diffEditors: HTMLElement[] = [];
let diffLineNumbers: HTMLElement[] = [];
let diffScrolls: HTMLElement[] = [];
let syncingDiffScroll = false;

const currentSettings = () =>
  Object.fromEntries(
    Array.from(moduleSettings.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[name]")).map(
      (input) => [
        input.name,
        input instanceof HTMLInputElement && input.type === "checkbox"
          ? input.checked
          : input.value,
      ],
    ),
  );

const lineNumbers = (value: string) =>
  Array.from({ length: value.split("\n").length }, (_, index) => String(index + 1)).join("\n");

const diffLineNumbersFor = (editor: HTMLElement) => {
  const text = diffEditorText(editor);
  if (!shouldWrapLines) return lineNumbers(text);

  const style = getComputedStyle(editor);
  const width = editor.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const measure = document.createElement("span");
  measure.style.font = style.font;
  measure.style.position = "absolute";
  measure.style.visibility = "hidden";
  measure.textContent = "0";
  document.body.append(measure);
  const charsPerLine = Math.max(1, Math.floor(width / measure.getBoundingClientRect().width));
  measure.remove();

  return text
    .split("\n")
    .flatMap((line, index) => [
      String(index + 1),
      ...Array(Math.max(1, Math.ceil(Array.from(line).length / charsPerLine)) - 1).fill(""),
    ])
    .join("\n");
};

const caretAnchor = "\u200b";
const diffEditorDomText = (editor: HTMLElement) =>
  (editor.textContent ?? "").replaceAll(caretAnchor, "");
const diffEditorText = (editor: HTMLElement) => editor.dataset.text ?? diffEditorDomText(editor);
const saveDiffEditorText = (editor: HTMLElement) => {
  editor.dataset.text = diffEditorDomText(editor);
};

const unlockDiffEditor = (editor: HTMLElement) => {
  if (!editor.dataset.locked) return;

  editor.textContent = diffEditorText(editor);
  editor.contentEditable = "true";
  delete editor.dataset.locked;
  editor.focus();
};

const unlockDiffEditors = (focused: HTMLElement) => {
  diffEditors.forEach(unlockDiffEditor);
  focused.focus();
};

const syncDiffScroll = (source: HTMLElement) => {
  if (syncingDiffScroll || diffEditors.some((editor) => !editor.dataset.locked)) return;

  syncingDiffScroll = true;
  diffScrolls.forEach((scroll) => {
    if (scroll === source) return;

    scroll.scrollTop = source.scrollTop;
    scroll.scrollLeft = source.scrollLeft;
  });
  syncingDiffScroll = false;
};

const refreshLines = () => {
  inputTextareas.forEach((input, index) => {
    inputLineNumbers[index].textContent = lineNumbers(input.value);
  });
  outputLines.textContent = lineNumbers(output.value);
};

const refreshDiffLines = () => {
  diffEditors.forEach((editor, index) => {
    diffLineNumbers[index].textContent = diffLineNumbersFor(editor);
  });
};

const insertTextAtCursor = (text: string) => {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

const setWrap = () => {
  const editors = [...inputTextareas, output, ...diffEditors];
  editors.forEach((editor) => {
    editor.style.whiteSpace = shouldWrapLines ? "pre-wrap" : "pre";
    editor.style.overflowWrap = shouldWrapLines ? "break-word" : "normal";
    if (editor instanceof HTMLTextAreaElement) {
      editor.wrap = shouldWrapLines ? "soft" : "off";
    }
  });
};

const renderInputs = () => {
  const multi = active.inputs.length > 1;

  workspace.className = "grid min-h-0 grid-rows-2 bg-[#3b4261] md:grid-cols-2 md:grid-rows-1";
  inputPanel.className = `grid min-h-0 bg-[#16161e] md:border-r md:border-[#3b4261] ${multi ? "grid-rows-2 md:grid-cols-2 md:grid-rows-1" : ""}`;
  outputSection.hidden = false;
  action.textContent = "Copy output";
  inputPanel.innerHTML = active.inputs
    .map(
      (input, index) => `
        <section class="grid min-h-0 grid-rows-[auto_1fr] ${index < active.inputs.length - 1 ? "border-b border-[#3b4261] md:border-r md:border-b-0" : ""}">
          <div class="border-b border-[#292e42] px-4 py-3 text-xs font-black uppercase text-[#7aa2f7]">
            ${input.label}
          </div>
          <div class="grid min-h-0 grid-cols-[auto_1fr]">
            <pre class="line-numbers m-0 overflow-hidden border-r border-[#292e42] px-3 py-4 text-right text-sm leading-7 text-[#565f89] select-none" aria-hidden="true">1</pre>
            <textarea class="min-w-0 resize-none overflow-auto bg-transparent p-4 text-sm leading-7 text-[#c0caf5] outline-none placeholder:text-[#565f89]" spellcheck="false" autocomplete="off" wrap="off"></textarea>
          </div>
        </section>
      `,
    )
    .join("");

  inputTextareas = Array.from(inputPanel.querySelectorAll("textarea"));
  inputLineNumbers = Array.from(inputPanel.querySelectorAll(".line-numbers"));

  inputTextareas.forEach((input, index) => {
    input.placeholder = active.inputs[index].placeholder;
    input.value = sessionStorage.getItem(inputKey(active.id, index)) ?? active.inputs[index].sample;
    input.addEventListener("input", () => {
      sessionStorage.setItem(inputKey(active.id, index), input.value);
      run();
    });
    input.addEventListener("scroll", () => {
      inputLineNumbers[index].scrollTop = input.scrollTop;
    });
  });

  output.readOnly = !active.reverseTransform;
  output.placeholder = active.reverseTransform
    ? active.transform([active.inputs[0].placeholder])
    : "";
  setWrap();
};

const renderDiffInputs = () => {
  workspace.className = "grid min-h-0 bg-[#3b4261]";
  outputSection.hidden = true;
  action.textContent = "Find diff";
  inputTextareas = [];
  inputLineNumbers = [];
  inputPanel.className = "grid min-h-0 grid-rows-2 bg-[#16161e] md:grid-cols-2 md:grid-rows-1";
  inputPanel.innerHTML = active.inputs
    .map(
      (input, index) => `
        <section class="grid min-h-0 grid-rows-[auto_1fr] ${index === 0 ? "border-b border-[#3b4261] md:border-r md:border-b-0" : ""}">
          <div class="border-b border-[#292e42] px-4 py-3 text-xs font-black uppercase text-[#7aa2f7]">
            ${input.label}
          </div>
          <div class="diff-scroll grid min-h-0 grid-cols-[auto_minmax(0,1fr)] overflow-auto">
            <pre class="line-numbers sticky left-0 z-10 m-0 border-r border-[#292e42] bg-[#16161e] px-3 py-4 text-right text-sm leading-7 text-[#565f89] select-none" aria-hidden="true">1</pre>
            <pre class="diff-editor m-0 min-w-0 bg-transparent p-4 text-sm leading-7 text-[#c0caf5] outline-none" contenteditable="true" spellcheck="false"></pre>
          </div>
        </section>
      `,
    )
    .join("");

  diffEditors = Array.from(inputPanel.querySelectorAll(".diff-editor"));
  diffLineNumbers = Array.from(inputPanel.querySelectorAll(".line-numbers"));
  diffScrolls = Array.from(inputPanel.querySelectorAll(".diff-scroll"));
  diffEditors.forEach((editor, index) => {
    editor.textContent =
      sessionStorage.getItem(inputKey(active.id, index)) ?? active.inputs[index].sample;
    saveDiffEditorText(editor);
    editor.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      insertTextAtCursor(`\n${caretAnchor}`);
      saveDiffEditorText(editor);
      sessionStorage.setItem(inputKey(active.id, index), diffEditorText(editor));
      refreshDiffLines();
    });
    editor.addEventListener("input", () => {
      saveDiffEditorText(editor);
      sessionStorage.setItem(inputKey(active.id, index), diffEditorText(editor));
      refreshDiffLines();
    });
    editor.addEventListener("click", () => {
      unlockDiffEditors(editor);
      refreshDiffLines();
    });
  });
  diffScrolls.forEach((scroll) => {
    scroll.addEventListener("scroll", () => syncDiffScroll(scroll));
  });
  setWrap();
  refreshDiffLines();
};

const renderModuleSettings = () => {
  moduleSettings.innerHTML = (active.settings ?? [])
    .map((setting) => {
      if (setting.type === "checkbox") {
        const checked =
          localStorage.getItem(settingKey(active.id, setting.id)) ?? String(setting.defaultValue);
        return `
          <label class="flex gap-2 border-t border-[#3b4261] px-3 py-2">
            <input class="mt-1" name="${setting.id}" type="checkbox" ${checked === "true" ? "checked" : ""} />
            <span>${setting.label}</span>
          </label>
        `;
      }

      const value = localStorage.getItem(settingKey(active.id, setting.id)) ?? setting.defaultValue;
      const control =
        setting.type === "select"
          ? `<select class="mt-1 w-full rounded border border-[#3b4261] bg-[#16161e] px-2 py-1 text-[#c0caf5]" name="${setting.id}">
              ${setting.options.map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${option.label}</option>`).join("")}
            </select>`
          : `<input class="mt-1 w-full rounded border border-[#3b4261] bg-[#16161e] px-2 py-1 text-[#c0caf5]" name="${setting.id}" type="text" value="${value}" />`;

      return `
        <label class="block border-t border-[#3b4261] px-3 py-2">
          <span>${setting.label}</span>
          ${control}
        </label>
      `;
    })
    .join("");
};

const renderTools = () => {
  toolList.innerHTML = modules
    .map(
      (tool) => `
        <button
          class="rounded-md px-3 py-2 text-left text-sm font-black ${tool.id === active.id ? "bg-[#7aa2f7] text-[#101014]" : "text-[#9aa5ce] hover:bg-[#292e42]"}"
          type="button"
          data-tool="${tool.id}"
        >
          ${tool.name}
        </button>
      `,
    )
    .join("");
};

const run = () => {
  if (active.id === "text-diff") {
    const diff = diffPanels(diffEditorText(diffEditors[0]), diffEditorText(diffEditors[1]));
    diffEditors[0].innerHTML = diff.left;
    diffEditors[1].innerHTML = diff.right;
    diffEditors.forEach((editor) => {
      editor.contentEditable = "false";
      editor.dataset.locked = "true";
    });
    refreshDiffLines();
    return;
  }

  outputLabel.textContent = active.outputLabel;
  output.readOnly = !active.reverseTransform;

  try {
    output.value = active.transform(
      inputTextareas.map((input) => input.value),
      currentSettings(),
    );
  } catch (error) {
    output.value = error instanceof Error ? error.message : "Invalid input";
  }

  refreshLines();
};

const runReverse = () => {
  if (!active.reverseTransform || active.id === "text-diff") return;

  try {
    inputTextareas[0].value = active.reverseTransform(output.value);
  } catch (error) {
    inputTextareas[0].value = error instanceof Error ? error.message : "Invalid input";
  }

  sessionStorage.setItem(inputKey(active.id, 0), inputTextareas[0].value);
  refreshLines();
};

const selectTool = (id: string) => {
  active = modules.find((tool) => tool.id === id) ?? modules[0];
  localStorage.setItem(selectedToolKey, active.id);
  renderModuleSettings();
  if (active.id === "text-diff") {
    renderDiffInputs();
  } else {
    renderInputs();
    run();
  }
  renderTools();
};

toolList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-tool]");
  if (button) selectTool(button.dataset.tool!);
});

output.addEventListener("scroll", () => {
  outputLines.scrollTop = output.scrollTop;
});
output.addEventListener("input", runReverse);
wrapLines.checked = shouldWrapLines;
wrapLines.addEventListener("change", () => {
  shouldWrapLines = wrapLines.checked;
  localStorage.setItem(wrapLinesKey, String(shouldWrapLines));
  setWrap();
  refreshDiffLines();
});
moduleSettings.addEventListener("input", (event) => {
  const input = (event.target as HTMLElement).closest<HTMLInputElement | HTMLSelectElement>(
    "[name]",
  );
  if (!input) return;

  localStorage.setItem(
    settingKey(active.id, input.name),
    input instanceof HTMLInputElement && input.type === "checkbox"
      ? String(input.checked)
      : input.value,
  );
  run();
});
window.addEventListener("resize", refreshDiffLines);
action.addEventListener("click", async () => {
  if (active.id === "text-diff") {
    run();
    return;
  }

  await navigator.clipboard.writeText(output.value);
  action.textContent = "Copied";
  window.setTimeout(() => {
    action.textContent = "Copy output";
  }, 1000);
});

selectTool(active.id);
