import './style.css';
import { modules } from './modules';

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

  <section class="grid min-h-0 grid-rows-2 bg-[#3b4261] md:grid-cols-2 md:grid-rows-1">
    <section class="grid min-h-0 grid-rows-[auto_1fr] bg-[#16161e] md:border-r md:border-[#3b4261]">
      <div class="border-b border-[#292e42] px-4 py-3 text-xs font-black uppercase text-[#7aa2f7]">
        <span id="input-label"></span>
      </div>
      <div class="grid min-h-0 grid-cols-[auto_1fr]">
        <pre class="line-numbers m-0 overflow-hidden border-r border-[#292e42] px-3 py-4 text-right text-sm leading-7 text-[#565f89] select-none" id="input-lines" aria-hidden="true">1</pre>
        <textarea id="input" class="min-w-0 resize-none overflow-auto bg-transparent p-4 text-sm leading-7 text-[#c0caf5] outline-none placeholder:text-[#565f89]" spellcheck="false" autocomplete="off" wrap="off"></textarea>
      </div>
    </section>

    <section class="grid min-h-0 grid-rows-[auto_1fr] bg-[#16161e]">
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
const input = app.querySelector<HTMLTextAreaElement>('#input')!;
const output = app.querySelector<HTMLTextAreaElement>('#output')!;
const inputLabel = app.querySelector<HTMLElement>('#input-label')!;
const outputLabel = app.querySelector<HTMLElement>('#output-label')!;
const copy = app.querySelector<HTMLButtonElement>('#copy')!;
const inputLines = app.querySelector<HTMLElement>('#input-lines')!;
const outputLines = app.querySelector<HTMLElement>('#output-lines')!;

const selectedToolKey = 'lab:selected-tool';
let active =
  modules.find((tool) => tool.id === localStorage.getItem(selectedToolKey)) ??
  modules[0];

const lineNumbers = (value: string) =>
  Array.from({ length: value.split('\n').length }, (_, index) =>
    String(index + 1),
  ).join('\n');

const refreshLines = () => {
  inputLines.textContent = lineNumbers(input.value);
  outputLines.textContent = lineNumbers(output.value);
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
  inputLabel.textContent = active.inputLabel;
  outputLabel.textContent = active.outputLabel;

  try {
    output.value = active.transform(input.value);
  } catch (error) {
    output.value = error instanceof Error ? error.message : 'Invalid input';
  }

  refreshLines();
};

const selectTool = (id: string) => {
  active = modules.find((tool) => tool.id === id) ?? modules[0];
  localStorage.setItem(selectedToolKey, active.id);
  input.placeholder = active.placeholder;
  input.value = active.sample;
  renderTools();
  run();
};

toolList.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    '[data-tool]',
  );
  if (button) selectTool(button.dataset.tool!);
});

input.addEventListener('input', run);
input.addEventListener('scroll', () => {
  inputLines.scrollTop = input.scrollTop;
});
output.addEventListener('scroll', () => {
  outputLines.scrollTop = output.scrollTop;
});
copy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(output.value);
  copy.textContent = 'Copied';
  window.setTimeout(() => {
    copy.textContent = 'Copy output';
  }, 1000);
});

selectTool(active.id);
