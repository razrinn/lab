import type { LabModule } from "./types";

export const prettyJson = (value: string) => JSON.stringify(JSON.parse(value), null, 2);

export const minifyJson = (value: string) => JSON.stringify(JSON.parse(value));

export const parseEscapedJson = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(typeof parsed === "string" ? JSON.parse(parsed) : parsed, null, 2);
  } catch {
    return JSON.stringify(JSON.parse(JSON.parse(`"${value.trim()}"`)), null, 2);
  }
};

export const jsonModules: LabModule[] = [
  {
    id: "json",
    name: "JSON Formatter",
    outputLabel: "Minified JSON",
    inputs: [
      {
        label: "Pretty JSON",
        placeholder: '{\n  "hello": "lab",\n  "count": 2\n}',
        sample: '{\n  "hello": "lab",\n  "count": 2\n}',
      },
    ],
    transform: ([value]) => minifyJson(value),
    reverseTransform: prettyJson,
  },
  {
    id: "json-parse",
    name: "JSON Parse",
    outputLabel: "Parsed JSON",
    inputs: [
      {
        label: "Escaped JSON",
        placeholder: '{\\"hello\\":\\"lab\\",\\"count\\":2}',
        sample: '{\\"hello\\":\\"lab\\",\\"count\\":2}',
      },
    ],
    transform: ([value]) => parseEscapedJson(value),
  },
];
