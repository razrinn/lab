import './style.css'
import { modules } from './modules'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
<main class="min-h-screen overflow-hidden bg-[#1a1b26] text-[#c0caf5]">
  <div class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
    <header class="flex flex-wrap items-end justify-between gap-4 border-b border-[#3b4261] pb-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.28em] text-[#7aa2f7]">local only</p>
        <h1 class="mt-1 text-4xl font-black text-[#d5defe] sm:text-6xl">lab</h1>
      </div>
      <p class="max-w-md text-sm leading-6 text-[#9aa5ce]">Fast frontend tools. No server roundtrip. No ceremony.</p>
    </header>

    <section class="grid flex-1 gap-4 lg:grid-cols-[240px_1fr]">
      <nav class="tool-list grid content-start gap-2 rounded-lg border border-[#3b4261] bg-[#16161e]/90 p-2" aria-label="Tools"></nav>

      <section class="grid gap-4 lg:grid-cols-2">
        <label class="panel">
          <span class="label" id="input-label"></span>
          <textarea id="input" spellcheck="false"></textarea>
        </label>

        <label class="panel">
          <span class="label" id="output-label"></span>
          <textarea id="output" spellcheck="false" readonly></textarea>
        </label>
      </section>
    </section>

    <footer class="flex flex-wrap justify-between gap-3 border-t border-[#3b4261] pt-4 text-xs text-[#565f89]">
      <span id="status"></span>
      <button id="copy" class="rounded-md border border-[#7aa2f7]/40 px-3 py-2 font-bold text-[#7dcfff] hover:bg-[#7aa2f7]/10" type="button">Copy output</button>
    </footer>
  </div>
</main>
`

const toolList = app.querySelector<HTMLElement>('.tool-list')!
const input = app.querySelector<HTMLTextAreaElement>('#input')!
const output = app.querySelector<HTMLTextAreaElement>('#output')!
const inputLabel = app.querySelector<HTMLElement>('#input-label')!
const outputLabel = app.querySelector<HTMLElement>('#output-label')!
const status = app.querySelector<HTMLElement>('#status')!
const copy = app.querySelector<HTMLButtonElement>('#copy')!

let active = modules[0]

const renderTools = () => {
  toolList.innerHTML = modules
    .map(
      (tool) => `
        <button class="tool ${tool.id === active.id ? 'active' : ''}" type="button" data-tool="${tool.id}">
          ${tool.name}
        </button>
      `,
    )
    .join('')
}

const run = () => {
  inputLabel.textContent = active.inputLabel
  outputLabel.textContent = active.outputLabel

  try {
    output.value = active.transform(input.value)
    status.textContent = 'ready'
    status.className = 'text-[#9ece6a]'
  } catch (error) {
    output.value = ''
    status.textContent = error instanceof Error ? error.message : 'Invalid input'
    status.className = 'text-[#f7768e]'
  }
}

const selectTool = (id: string) => {
  active = modules.find((tool) => tool.id === id) ?? modules[0]
  input.placeholder = active.placeholder
  input.value = active.sample
  renderTools()
  run()
}

toolList.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tool]')
  if (button) selectTool(button.dataset.tool!)
})

input.addEventListener('input', run)
copy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(output.value)
  status.textContent = 'copied'
})

selectTool(active.id)
