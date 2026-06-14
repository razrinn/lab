import type { LabModule } from './types'

export const envToJson = (value: string) => {
  const result: Record<string, string> = {}

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const cleanLine = line.startsWith('export ') ? line.slice(7).trim() : line
    const equalsAt = cleanLine.indexOf('=')
    if (equalsAt < 1) continue

    const key = cleanLine.slice(0, equalsAt).trim()
    let val = cleanLine.slice(equalsAt + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }

    result[key] = val
  }

  return JSON.stringify(result, null, 2)
}

export const jsonToEnv = (value: string) => {
  const data = JSON.parse(value) as Record<string, unknown>

  return Object.entries(data)
    .map(([key, val]) => `${key}=${String(val)}`)
    .join('\n')
}

export const envModules: LabModule[] = [
  {
    id: 'env-to-json',
    name: 'ENV to JSON',
    outputLabel: 'JSON',
    inputs: [
      {
        label: '.env',
        placeholder: 'API_URL=https://example.com\nTOKEN=secret',
        sample: 'API_URL=https://example.com\nTOKEN=secret',
      },
    ],
    transform: ([value]) => envToJson(value),
  },
  {
    id: 'json-to-env',
    name: 'JSON to ENV',
    outputLabel: '.env',
    inputs: [
      {
        label: 'JSON',
        placeholder: '{\n  "API_URL": "https://example.com",\n  "TOKEN": "secret"\n}',
        sample: '{\n  "API_URL": "https://example.com",\n  "TOKEN": "secret"\n}',
      },
    ],
    transform: ([value]) => jsonToEnv(value),
  },
]
