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
    inputLabel: 'Text',
    outputLabel: 'Base64',
    placeholder: 'hello lab',
    sample: 'hello lab',
    transform: encodeBase64,
  },
  {
    id: 'base64-decode',
    name: 'Base64 Decode',
    inputLabel: 'Base64',
    outputLabel: 'Text',
    placeholder: 'aGVsbG8gbGFi',
    sample: 'aGVsbG8gbGFi',
    transform: decodeBase64,
  },
]
