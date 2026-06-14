import './style.css'
import { modules } from './modules'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
<main class="lab-shell">
  <header class="topbar">
    <div class="brand">
      <span>lab</span>
      <strong id="active-tool"></strong>
    </div>
    <nav class="tool-list" aria-label="Tools"></nav>
    <div class="actions">
      <span id="status"></span>
      <button id="copy" type="button">Copy</button>
    </div>
  </header>

  <section class="workspace">
    <section class="editor-panel">
      <div class="panel-head"><span id="input-label"></span></div>
      <div class="editor">
        <pre class="line-numbers" id="input-lines" aria-hidden="true">1</pre>
        <textarea id="input" spellcheck="false" autocomplete="off" wrap="off"></textarea>
      </div>
    </section>

    <section class="editor-panel">
      <div class="panel-head"><span id="output-label"></span></div>
      <div class="editor">
        <pre class="line-numbers" id="output-lines" aria-hidden="true">1</pre>
        <textarea id="output" spellcheck="false" readonly wrap="off"></textarea>
      </div>
    </section>
  </section>
</main>
`

const toolList = app.querySelector<HTMLElement>('.tool-list')!
const input = app.querySelector<HTMLTextAreaElement>('#input')!
const output = app.querySelector<HTMLTextAreaElement>('#output')!
const inputLabel = app.querySelector<HTMLElement>('#input-label')!
const outputLabel = app.querySelector<HTMLElement>('#output-label')!
const activeTool = app.querySelector<HTMLElement>('#active-tool')!
const status = app.querySelector<HTMLElement>('#status')!
const copy = app.querySelector<HTMLButtonElement>('#copy')!
const inputLines = app.querySelector<HTMLElement>('#input-lines')!
const outputLines = app.querySelector<HTMLElement>('#output-lines')!

let active = modules[0]

const lineNumbers = (value: string) =>
  Array.from({ length: value.split('\n').length }, (_, index) => String(index + 1)).join('\n')

const refreshLines = () => {
  inputLines.textContent = lineNumbers(input.value)
  outputLines.textContent = lineNumbers(output.value)
}

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
  activeTool.textContent = active.name
  inputLabel.textContent = active.inputLabel
  outputLabel.textContent = active.outputLabel

  try {
    output.value = active.transform(input.value)
    status.textContent = 'ready'
    status.className = 'ok'
  } catch (error) {
    output.value = ''
    status.textContent = error instanceof Error ? error.message : 'Invalid input'
    status.className = 'bad'
  }

  refreshLines()
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
input.addEventListener('scroll', () => {
  inputLines.scrollTop = input.scrollTop
})
output.addEventListener('scroll', () => {
  outputLines.scrollTop = output.scrollTop
})
copy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(output.value)
  status.textContent = 'copied'
  status.className = 'ok'
})

selectTool(active.id)
