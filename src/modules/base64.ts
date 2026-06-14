import type { LabModule } from './types'

const bytesToBinary = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

export const encodeBase64 = (value: string) =>
  btoa(bytesToBinary(new TextEncoder().encode(value)))

export const decodeBase64 = (value: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(value.trim()), (char) => char.charCodeAt(0)))

export const base64Modules: LabModule[] = [
  {
    id: 'base64-encode',
    name: 'Base64 Encode',
    outputLabel: 'Base64',
    inputs: [{ label: 'Text', placeholder: 'hello lab', sample: 'hello lab' }],
    transform: ([value]) => encodeBase64(value),
  },
  {
    id: 'base64-decode',
    name: 'Base64 Decode',
    outputLabel: 'Text',
    inputs: [{ label: 'Base64', placeholder: 'aGVsbG8gbGFi', sample: 'aGVsbG8gbGFi' }],
    transform: ([value]) => decodeBase64(value),
  },
]
