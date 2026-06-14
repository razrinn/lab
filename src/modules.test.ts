import { describe, expect, it } from "vite-plus/test";
import { decodeBase64, encodeBase64 } from "./modules/base64.ts";
import { diffPanels, diffText } from "./modules/diff.ts";
import { envToJson, jsonToEnv } from "./modules/env.ts";
import { modules } from "./modules/index.ts";
import { minifyJson, prettyJson } from "./modules/json.ts";

describe("base64 transforms", () => {
  it("round-trips unicode text", () => {
    const value = "hello こんにちは 👋";

    expect(decodeBase64(encodeBase64(value))).toBe(value);
  });

  it("decodes values with surrounding whitespace", () => {
    expect(decodeBase64("\n aGVsbG8gbGFi \t")).toBe("hello lab");
  });
});

describe("diff transforms", () => {
  it("returns a line diff", () => {
    expect(diffText(["same\nold\nlast", "same\nnew\nlast"])).toBe("  same\n- old\n+ new\n  last");
  });

  it("reports equal text", () => {
    expect(diffText(["same", "same"])).toBe("No differences");
  });

  it("renders changed characters on both sides", () => {
    const diff = diffPanels("old value", "new value");

    expect(diff.left).toContain("<mark");
    expect(diff.left).toContain(">o</mark>");
    expect(diff.right).toContain("<mark");
    expect(diff.right).toContain(">n</mark>");
  });

  it("keeps matching lines aligned after a changed line", () => {
    const diff = diffPanels("same\nold\nlast", "same\nnew\nlast");

    expect(diff.left.endsWith("\nlast")).toBe(true);
    expect(diff.right.endsWith("\nlast")).toBe(true);
  });
});

describe("env transforms", () => {
  it("converts env text to pretty JSON", () => {
    expect(
      envToJson(`
        # ignored
        FOO=bar
        export BAZ="qux"
        SINGLE='quoted'
        URL=https://example.com?a=1&b=2
        MISSING_EQUALS
      `),
    ).toBe(
      JSON.stringify(
        {
          FOO: "bar",
          BAZ: "qux",
          SINGLE: "quoted",
          URL: "https://example.com?a=1&b=2",
        },
        null,
        2,
      ),
    );
  });

  it("keeps the last value for duplicate env keys", () => {
    expect(envToJson("FOO=old\nFOO=new")).toBe('{\n  "FOO": "new"\n}');
  });

  it("converts flat JSON values to env text", () => {
    expect(jsonToEnv('{"FOO":"bar","COUNT":3,"ENABLED":true,"EMPTY":null}')).toBe(
      "FOO=bar\nCOUNT=3\nENABLED=true\nEMPTY=null",
    );
  });

  it("throws for invalid JSON", () => {
    expect(() => jsonToEnv("{nope")).toThrow();
  });
});

describe("json transforms", () => {
  it("pretties JSON", () => {
    expect(prettyJson('{"hello":"lab","count":2}')).toBe('{\n  "hello": "lab",\n  "count": 2\n}');
  });

  it("minifies JSON", () => {
    expect(minifyJson('{\n  "hello": "lab",\n  "count": 2\n}')).toBe('{"hello":"lab","count":2}');
  });

  it("throws for invalid JSON", () => {
    expect(() => prettyJson("{nope")).toThrow();
    expect(() => minifyJson("{nope")).toThrow();
  });
});

describe("module registry", () => {
  it("combines paired transforms into reversible tools", () => {
    expect(modules.map((tool) => tool.id)).toEqual(["base64", "text-diff", "env-json", "json"]);
    expect(modules.filter((tool) => tool.reverseTransform).map((tool) => tool.id)).toEqual([
      "base64",
      "env-json",
      "json",
    ]);
  });

  it("has unique ids and working samples", () => {
    expect(new Set(modules.map((tool) => tool.id)).size).toBe(modules.length);

    for (const tool of modules) {
      expect(tool.transform(tool.inputs.map((input) => input.sample))).toEqual(expect.any(String));
      if (tool.reverseTransform)
        expect(
          tool.reverseTransform(tool.transform(tool.inputs.map((input) => input.sample))),
        ).toEqual(expect.any(String));
    }
  });
});
