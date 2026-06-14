import type { LabModule } from './types'

export const prettyJson = (value: string) => JSON.stringify(JSON.parse(value), null, 2)

export const minifyJson = (value: string) => JSON.stringify(JSON.parse(value))

export const jsonModules: LabModule[] = [
  {
    id: 'json',
    name: 'JSON',
    outputLabel: 'Minified JSON',
    inputs: [
      {
        label: 'Pretty JSON',
        placeholder: '{\n  "hello": "lab",\n  "count": 2\n}',
        sample: '{\n  "hello": "lab",\n  "count": 2\n}',
      },
    ],
    transform: ([value]) => minifyJson(value),
    reverseTransform: prettyJson,
  },
]
