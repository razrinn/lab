import type { LabModule } from './types'

export const prettyJson = (value: string) => JSON.stringify(JSON.parse(value), null, 2)

export const minifyJson = (value: string) => JSON.stringify(JSON.parse(value))

export const jsonModules: LabModule[] = [
  {
    id: 'json-pretty',
    name: 'JSON Pretty',
    outputLabel: 'Pretty JSON',
    inputs: [{ label: 'JSON', placeholder: '{"hello":"lab","count":2}', sample: '{"hello":"lab","count":2}' }],
    transform: ([value]) => prettyJson(value),
  },
  {
    id: 'json-minify',
    name: 'JSON Minify',
    outputLabel: 'Minified JSON',
    inputs: [
      {
        label: 'JSON',
        placeholder: '{\n  "hello": "lab",\n  "count": 2\n}',
        sample: '{\n  "hello": "lab",\n  "count": 2\n}',
      },
    ],
    transform: ([value]) => minifyJson(value),
  },
]
