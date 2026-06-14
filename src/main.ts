import './style.css';
import { modules } from './modules';
import { diffPanels } from './modules/diff';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
<main class="grid h-dvh grid-rows-[minmax(0,16rem)_1fr] overflow-hidden bg-[#1a1b26] text-[#c0caf5] md:grid-cols-[13rem_1fr] md:grid-rows-1">
  <aside class="flex min-h-0 flex-col border-b border-[#3b4261] bg-[#16161e] p-3 md:border-r md:border-b-0">
    <div class="mb-3">
      <h1 class="font-black text-[#d5defe] md:mb-1">lab.rzrn.dev</h1>
    </div>
    <nav class="tool-list grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-y-auto md:grid-cols-1" aria-label="Tools"></nav>
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

const toolList = app.querySelector<HTMLElement>('.tool-list')!;
const workspace = app.querySelector<HTMLElement>('#workspace')!;
const inputPanel = app.querySelector<HTMLElement>('#input-panel')!;
const outputSection = app.querySelector<HTMLElement>('#output-section')!;
const output = app.querySelector<HTMLTextAreaElement>('#output')!;
const outputLabel = app.querySelector<HTMLElement>('#output-label')!;
const action = app.querySelector<HTMLButtonElement>('#copy')!;
const outputLines = app.querySelector<HTMLElement>('#output-lines')!;

const selectedToolKey = 'lab:selected-tool';
let active =
  modules.find((tool) => tool.id === localStorage.getItem(selectedToolKey)) ??
  modules[0];
let inputTextareas: HTMLTextAreaElement[] = [];
let inputLineNumbers: HTMLElement[] = [];
let diffEditors: HTMLElement[] = [];
let diffLineNumbers: HTMLElement[] = [];

const lineNumbers = (value: string) =>
  Array.from({ length: value.split('\n').length }, (_, index) =>
    String(index + 1),
  ).join('\n');

const refreshLines = () => {
  inputTextareas.forEach((input, index) => {
    inputLineNumbers[index].textContent = lineNumbers(input.value);
  });
  outputLines.textContent = lineNumbers(output.value);
};

const refreshDiffLines = () => {
  diffEditors.forEach((editor, index) => {
    diffLineNumbers[index].textContent = lineNumbers(editor.innerText);
  });
};

const renderInputs = () => {
  const multi = active.inputs.length > 1;

  workspace.className = 'grid min-h-0 grid-rows-2 bg-[#3b4261] md:grid-cols-2 md:grid-rows-1';
  inputPanel.className = `grid min-h-0 bg-[#16161e] md:border-r md:border-[#3b4261] ${multi ? 'grid-rows-2 md:grid-cols-2 md:grid-rows-1' : ''}`;
  outputSection.hidden = false;
  action.textContent = 'Copy output';
  inputPanel.innerHTML = active.inputs
    .map(
      (input, index) => `
        <section class="grid min-h-0 grid-rows-[auto_1fr] ${index < active.inputs.length - 1 ? 'border-b border-[#3b4261] md:border-r md:border-b-0' : ''}">
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
    .join('');

  inputTextareas = Array.from(inputPanel.querySelectorAll('textarea'));
  inputLineNumbers = Array.from(inputPanel.querySelectorAll('.line-numbers'));

  inputTextareas.forEach((input, index) => {
    input.placeholder = active.inputs[index].placeholder;
    input.value = active.inputs[index].sample;
    input.addEventListener('input', run);
    input.addEventListener('scroll', () => {
      inputLineNumbers[index].scrollTop = input.scrollTop;
    });
  });
};

const renderDiffInputs = () => {
  workspace.className = 'grid min-h-0 bg-[#3b4261]';
  outputSection.hidden = true;
  action.textContent = 'Find diff';
  inputTextareas = [];
  inputLineNumbers = [];
  inputPanel.className = 'grid min-h-0 grid-rows-2 bg-[#16161e] md:grid-cols-2 md:grid-rows-1';
  inputPanel.innerHTML = active.inputs
    .map(
      (input, index) => `
        <section class="grid min-h-0 grid-rows-[auto_1fr] ${index === 0 ? 'border-b border-[#3b4261] md:border-r md:border-b-0' : ''}">
          <div class="border-b border-[#292e42] px-4 py-3 text-xs font-black uppercase text-[#7aa2f7]">
            ${input.label}
          </div>
          <div class="grid min-h-0 grid-cols-[auto_1fr]">
            <pre class="line-numbers m-0 overflow-hidden border-r border-[#292e42] px-3 py-4 text-right text-sm leading-7 text-[#565f89] select-none" aria-hidden="true">1</pre>
            <pre class="diff-editor m-0 overflow-auto whitespace-pre-wrap break-words bg-transparent p-4 text-sm leading-7 text-[#c0caf5] outline-none" contenteditable="true" spellcheck="false"></pre>
          </div>
        </section>
      `,
    )
    .join('');

  diffEditors = Array.from(inputPanel.querySelectorAll('.diff-editor'));
  diffLineNumbers = Array.from(inputPanel.querySelectorAll('.line-numbers'));
  diffEditors.forEach((editor, index) => {
    editor.textContent = active.inputs[index].sample;
    editor.addEventListener('input', refreshDiffLines);
    editor.addEventListener('scroll', () => {
      diffLineNumbers[index].scrollTop = editor.scrollTop;
    });
  });
  refreshDiffLines();
};

const renderTools = () => {
  toolList.innerHTML = modules
    .map(
      (tool) => `
        <button
          class="rounded-md px-3 py-2 text-left text-sm font-black ${tool.id === active.id ? 'bg-[#7aa2f7] text-[#101014]' : 'text-[#9aa5ce] hover:bg-[#292e42]'}"
          type="button"
          data-tool="${tool.id}"
        >
          ${tool.name}
        </button>
      `,
    )
    .join('');
};

const run = () => {
  if (active.id === 'text-diff') {
    const diff = diffPanels(diffEditors[0].innerText, diffEditors[1].innerText);
    diffEditors[0].innerHTML = diff.left;
    diffEditors[1].innerHTML = diff.right;
    refreshDiffLines();
    return;
  }

  outputLabel.textContent = active.outputLabel;

  try {
    output.value = active.transform(inputTextareas.map((input) => input.value));
  } catch (error) {
    output.value = error instanceof Error ? error.message : 'Invalid input';
  }

  refreshLines();
};

const selectTool = (id: string) => {
  active = modules.find((tool) => tool.id === id) ?? modules[0];
  localStorage.setItem(selectedToolKey, active.id);
  if (active.id === 'text-diff') {
    renderDiffInputs();
  } else {
    renderInputs();
    run();
  }
  renderTools();
};

toolList.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    '[data-tool]',
  );
  if (button) selectTool(button.dataset.tool!);
});

output.addEventListener('scroll', () => {
  outputLines.scrollTop = output.scrollTop;
});
action.addEventListener('click', async () => {
  if (active.id === 'text-diff') {
    run();
    return;
  }

  await navigator.clipboard.writeText(output.value);
  action.textContent = 'Copied';
  window.setTimeout(() => {
    action.textContent = 'Copy output';
  }, 1000);
});

selectTool(active.id);
