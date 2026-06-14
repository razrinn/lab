import type { LabModule } from "./types";

const bytesToBinary = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

export const encodeBase64 = (value: string) => btoa(bytesToBinary(new TextEncoder().encode(value)));

export const decodeBase64 = (value: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(value.trim()), (char) => char.charCodeAt(0)));

export const base64Modules: LabModule[] = [
  {
    id: "base64",
    name: "Base64",
    outputLabel: "Base64",
    inputs: [{ label: "Text", placeholder: "hello lab", sample: "hello lab" }],
    transform: ([value]) => encodeBase64(value),
    reverseTransform: decodeBase64,
  },
];
