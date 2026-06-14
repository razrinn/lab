import type { LabModule } from "./types";

type Shape =
  | { kind: "unknown" }
  | { kind: "null" }
  | { kind: "primitive"; name: "string" | "number" | "boolean" }
  | { kind: "array"; item: Shape }
  | { kind: "object"; fields: Record<string, { shape: Shape; optional: boolean }> }
  | { kind: "union"; items: Shape[] };

type JsonToTsSettings = {
  declaration: "type" | "interface";
  structure: "inline" | "composed";
  optional: boolean;
  arrayStyle: "bracket" | "generic";
  rootName: string;
};

const unknownShape: Shape = { kind: "unknown" };

const inferShape = (value: unknown): Shape => {
  if (value === null) return { kind: "null" };
  if (Array.isArray(value)) {
    return { kind: "array", item: value.map(inferShape).reduce(mergeShapes, unknownShape) };
  }

  if (typeof value === "object") {
    return {
      kind: "object",
      fields: Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          { shape: inferShape(child), optional: false },
        ]),
      ),
    };
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return { kind: "primitive", name: valueType };
  }

  return unknownShape;
};

const shapeKey = (shape: Shape): string => {
  if (shape.kind === "primitive") return shape.name;
  if (shape.kind === "array") return `array:${shapeKey(shape.item)}`;
  if (shape.kind === "object") {
    return `object:${Object.entries(shape.fields)
      .map(([key, field]) => `${key}${field.optional ? "?" : ""}:${shapeKey(field.shape)}`)
      .join(",")}`;
  }
  if (shape.kind === "union") return `union:${shape.items.map(shapeKey).join("|")}`;
  return shape.kind;
};

const uniqueShapes = (items: Shape[]) =>
  Array.from(new Map(items.map((item) => [shapeKey(item), item])).values());

const mergeShapes = (left: Shape, right: Shape): Shape => {
  if (left.kind === "unknown") return right;
  if (right.kind === "unknown") return left;
  if (shapeKey(left) === shapeKey(right)) return left;

  if (left.kind === "array" && right.kind === "array") {
    return { kind: "array", item: mergeShapes(left.item, right.item) };
  }

  if (left.kind === "object" && right.kind === "object") {
    const fields: Record<string, { shape: Shape; optional: boolean }> = {};

    for (const key of new Set([...Object.keys(left.fields), ...Object.keys(right.fields)])) {
      const l = left.fields[key];
      const r = right.fields[key];
      if (l && r)
        fields[key] = { shape: mergeShapes(l.shape, r.shape), optional: l.optional || r.optional };
      else fields[key] = { shape: (l ?? r).shape, optional: true };
    }

    return { kind: "object", fields };
  }

  const items = [
    ...(left.kind === "union" ? left.items : [left]),
    ...(right.kind === "union" ? right.items : [right]),
  ];
  return {
    kind: "union",
    items: uniqueShapes(items).sort((a, b) => shapeKey(a).localeCompare(shapeKey(b))),
  };
};

const toPascal = (value: string) => {
  const clean = value.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  return (
    clean
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
      .join("") || "Root"
  );
};

const childName = (key: string) => {
  const name = toPascal(key);
  return name.endsWith("s") ? name.slice(0, -1) : name;
};

const validName = (value: string) => {
  const name = toPascal(value);
  return /^\d/.test(name) ? `T${name}` : name;
};

const validKey = (key: string) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key));

const settingsFrom = (settings: Record<string, string | boolean> = {}): JsonToTsSettings => ({
  declaration: settings.declaration === "interface" ? "interface" : "type",
  structure: settings.structure === "composed" ? "composed" : "inline",
  optional: settings.optional === true,
  arrayStyle: settings.arrayStyle === "generic" ? "generic" : "bracket",
  rootName: validName(String(settings.rootName || "Root")),
});

export const jsonToTypescript = (
  value: string,
  rawSettings: Record<string, string | boolean> = {},
) => {
  const settings = settingsFrom(rawSettings);
  const declarations = new Map<string, Shape>();
  const reserve = (name: string, shape: Shape) => {
    let next = validName(name);
    let index = 2;
    while (declarations.has(next) && shapeKey(declarations.get(next)!) !== shapeKey(shape)) {
      next = `${validName(name)}${index}`;
      index += 1;
    }
    declarations.set(next, shape);
    return next;
  };

  const renderShape = (shape: Shape, name: string, depth: number): string => {
    if (shape.kind === "unknown") return "unknown";
    if (shape.kind === "null") return "null";
    if (shape.kind === "primitive") return shape.name;
    if (shape.kind === "union")
      return shape.items.map((item) => renderShape(item, name, depth)).join(" | ");
    if (shape.kind === "array") {
      const itemName = name.endsWith("s") ? name.slice(0, -1) : `${name}Item`;
      const item =
        settings.structure === "composed" && shape.item.kind === "object"
          ? reserve(itemName, shape.item)
          : renderShape(shape.item, itemName, depth);
      return settings.arrayStyle === "generic"
        ? `Array<${item}>`
        : `${item.includes(" | ") ? `(${item})` : item}[]`;
    }

    if (settings.structure === "composed" && depth > 0) return reserve(name, shape);

    const pad = "  ".repeat(depth);
    const innerPad = "  ".repeat(depth + 1);
    const fields = Object.entries(shape.fields).map(([key, field]) => {
      const optional = settings.optional || field.optional ? "?" : "";
      return `${innerPad}${validKey(key)}${optional}: ${renderShape(field.shape, childName(key), depth + 1)};`;
    });
    return fields.length ? `{\n${fields.join("\n")}\n${pad}}` : "{}";
  };

  const rootShape = inferShape(JSON.parse(value));
  const rootBody = renderShape(rootShape, settings.rootName, 0);
  const root =
    settings.declaration === "interface" && rootShape.kind === "object"
      ? `interface ${settings.rootName} ${rootBody}`
      : `type ${settings.rootName} = ${rootBody};`;

  const children: string[] = [];
  for (let index = 0; index < Array.from(declarations).length; index += 1) {
    const [name, shape] = Array.from(declarations)[index];
    const body = renderShape(shape, name, 0);
    children.push(
      settings.declaration === "interface"
        ? `interface ${name} ${body}`
        : `type ${name} = ${body};`,
    );
  }

  return [root, ...children].join("\n\n");
};

export const jsonToTsModules: LabModule[] = [
  {
    id: "json-ts",
    name: "JSON to TS",
    outputLabel: "TypeScript",
    inputs: [
      {
        label: "JSON",
        placeholder: '{\n  "id": 1,\n  "name": "Lab",\n  "tags": ["tool"]\n}',
        sample:
          '{\n  "id": 1,\n  "name": "Lab",\n  "tags": ["tool"],\n  "profile": {\n    "active": true,\n    "email": null\n  }\n}',
      },
    ],
    settings: [
      { id: "rootName", label: "Root name", type: "text", defaultValue: "Root" },
      {
        id: "declaration",
        label: "Declaration",
        type: "select",
        defaultValue: "type",
        options: [
          { label: "type", value: "type" },
          { label: "interface", value: "interface" },
        ],
      },
      {
        id: "structure",
        label: "Structure",
        type: "select",
        defaultValue: "inline",
        options: [
          { label: "inline", value: "inline" },
          { label: "composed", value: "composed" },
        ],
      },
      {
        id: "arrayStyle",
        label: "Arrays",
        type: "select",
        defaultValue: "bracket",
        options: [
          { label: "T[]", value: "bracket" },
          { label: "Array<T>", value: "generic" },
        ],
      },
      { id: "optional", label: "Optional properties", type: "checkbox", defaultValue: false },
    ],
    transform: ([value], settings) => jsonToTypescript(value, settings),
  },
];
