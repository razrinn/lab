import type { LabModule } from './types'

export const prettyJson = (value: string) => JSON.stringify(JSON.parse(value), null, 2)

export const minifyJson = (value: string) => JSON.stringify(JSON.parse(value))

export const jsonModules: LabModule[] = [
  {
    id: 'json-pretty',
    name: 'JSON Pretty',
    inputLabel: 'JSON',
    outputLabel: 'Pretty JSON',
    placeholder: '{"hello":"lab","count":2}',
    sample: '{"hello":"lab","count":2}',
    transform: prettyJson,
  },
  {
    id: 'json-minify',
    name: 'JSON Minify',
    inputLabel: 'JSON',
    outputLabel: 'Minified JSON',
    placeholder: '{\n  "hello": "lab",\n  "count": 2\n}',
    sample: '{\n  "hello": "lab",\n  "count": 2\n}',
    transform: minifyJson,
  },
]
