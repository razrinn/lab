import { describe, expect, it } from "vite-plus/test";
import { decodeBase64, encodeBase64 } from "./modules/base64.ts";
import { diffPanels, diffText } from "./modules/diff.ts";
import { envToJson, jsonToEnv } from "./modules/env.ts";
import { modules } from "./modules/index.ts";
import { jsonToTypescript } from "./modules/json-to-ts.ts";
import { minifyJson, parseEscapedJson, prettyJson } from "./modules/json.ts";

describe("base64 transforms", () => {
  it("encodes plain text", () => {
    expect(encodeBase64("hello lab")).toBe("aGVsbG8gbGFi");
  });

  it("round-trips empty text", () => {
    expect(decodeBase64(encodeBase64(""))).toBe("");
  });

  it("round-trips unicode text", () => {
    const value = "hello こんにちは 👋";

    expect(decodeBase64(encodeBase64(value))).toBe(value);
  });

  it("round-trips multiline text", () => {
    const value = "first\nsecond\tTabbed";

    expect(decodeBase64(encodeBase64(value))).toBe(value);
  });

  it("decodes values with surrounding whitespace", () => {
    expect(decodeBase64("\n aGVsbG8gbGFi \t")).toBe("hello lab");
  });

  it("throws for invalid base64", () => {
    expect(() => decodeBase64("not base64!!!")).toThrow();
  });
});

describe("diff transforms", () => {
  it("returns a line diff", () => {
    expect(diffText(["same\nold\nlast", "same\nnew\nlast"])).toBe("  same\n- old\n+ new\n  last");
  });

  it("reports equal text", () => {
    expect(diffText(["same", "same"])).toBe("No differences");
  });

  it("reports added and removed lines", () => {
    expect(diffText(["a\nb", "a\nb\nc"])).toBe("  a\n  b\n+ c");
    expect(diffText(["a\nb\nc", "a\nc"])).toBe("  a\n- b\n  c");
  });

  it("handles empty input", () => {
    expect(diffText(["", ""])).toBe("No differences");
    expect(diffText(["", "added"])).toBe("- \n+ added");
  });

  it("renders changed characters on both sides", () => {
    const diff = diffPanels("old value", "new value");

    expect(diff.left).toContain('class="diff-line-removed"');
    expect(diff.left).toContain("<mark");
    expect(diff.left).toContain(">o</mark>");
    expect(diff.right).toContain('class="diff-line-added"');
    expect(diff.right).toContain("<mark");
    expect(diff.right).toContain(">n</mark>");
  });

  it("keeps matching lines aligned after a changed line", () => {
    const diff = diffPanels("same\nold\nlast", "same\nnew\nlast");

    expect(diff.left.endsWith("\nlast")).toBe(true);
    expect(diff.right.endsWith("\nlast")).toBe(true);
  });

  it("escapes html in panels", () => {
    const diff = diffPanels("<script>", "<b>");

    expect(diff.left).toContain("&lt;");
    expect(diff.right).toContain("&lt;");
    expect(diff.left).not.toContain("<script>");
    expect(diff.right).not.toContain("<b>");
  });

  it("renders blank changed lines as visible spans", () => {
    const diff = diffPanels("", "value");

    expect(diff.left).toBe('<span class="diff-line-removed"> </span>');
    expect(diff.right).toContain('class="diff-line-added"');
    expect(diff.right).toContain('class="diff-char-added"');
    expect(diff.right).toContain(">v</mark>");
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

  it("supports equals signs inside values", () => {
    expect(envToJson("TOKEN=a=b=c")).toBe('{\n  "TOKEN": "a=b=c"\n}');
  });

  it("trims keys and values", () => {
    expect(envToJson(" FOO = bar ")).toBe('{\n  "FOO": "bar"\n}');
  });

  it("returns empty JSON for comments and invalid lines", () => {
    expect(envToJson("# comment\nNO_EQUALS\n=missing_key")).toBe("{}");
  });

  it("converts flat JSON values to env text", () => {
    expect(jsonToEnv('{"FOO":"bar","COUNT":3,"ENABLED":true,"EMPTY":null}')).toBe(
      "FOO=bar\nCOUNT=3\nENABLED=true\nEMPTY=null",
    );
  });

  it("keeps JSON entry order when converting to env", () => {
    expect(jsonToEnv('{"A":1,"B":"two","C":false}')).toBe("A=1\nB=two\nC=false");
  });

  it("stringifies nested values with current simple behavior", () => {
    expect(jsonToEnv('{"OBJ":{"a":1},"ARR":[1,2]}')).toBe("OBJ=[object Object]\nARR=1,2");
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

  it("handles arrays and primitive JSON values", () => {
    expect(prettyJson("[1,true,null]")).toBe("[\n  1,\n  true,\n  null\n]");
    expect(minifyJson('"text"')).toBe('"text"');
    expect(minifyJson("true")).toBe("true");
  });

  it("normalizes whitespace", () => {
    expect(prettyJson(' { "a" : [ 1 ] } ')).toBe('{\n  "a": [\n    1\n  ]\n}');
  });

  it("throws for invalid JSON", () => {
    expect(() => prettyJson("{nope")).toThrow();
    expect(() => minifyJson("{nope")).toThrow();
  });

  it("parses escaped JSON", () => {
    expect(parseEscapedJson('{\\"hello\\":\\"lab\\",\\"count\\":2}')).toBe(
      '{\n  "hello": "lab",\n  "count": 2\n}',
    );
  });

  it("parses JSON string literals", () => {
    expect(parseEscapedJson('"{\\"hello\\":\\"lab\\"}"')).toBe('{\n  "hello": "lab"\n}');
  });
});

describe("json to typescript transform", () => {
  it("infers inline types", () => {
    expect(
      jsonToTypescript(
        '{"id":1,"name":"Lab","tags":["tool"],"profile":{"active":true,"email":null}}',
      ),
    ).toBe(
      "type Root = {\n  id: number;\n  name: string;\n  tags: string[];\n  profile: {\n    active: boolean;\n    email: null;\n  };\n};",
    );
  });

  it("can compose interfaces and merge object arrays", () => {
    expect(
      jsonToTypescript('[{"id":1,"name":"A"},{"id":2,"active":true}]', {
        rootName: "Users",
        declaration: "interface",
        structure: "composed",
        optional: false,
      }),
    ).toBe(
      "type Users = User[];\n\ninterface User {\n  id: number;\n  name?: string;\n  active?: boolean;\n}",
    );
  });

  it("supports Array<T> output", () => {
    expect(jsonToTypescript('{"ids":[1,2]}', { arrayStyle: "generic" })).toBe(
      "type Root = {\n  ids: Array<number>;\n};",
    );
  });

  it("can mark every property optional", () => {
    expect(jsonToTypescript('{"id":1,"name":"Lab"}', { optional: true })).toBe(
      "type Root = {\n  id?: number;\n  name?: string;\n};",
    );
  });

  it("infers mixed primitive arrays as unions", () => {
    expect(jsonToTypescript('{"values":[1,"two",true,null]}')).toBe(
      "type Root = {\n  values: (boolean | null | number | string)[];\n};",
    );
  });

  it("uses unknown for empty arrays", () => {
    expect(jsonToTypescript('{"items":[]}')).toBe("type Root = {\n  items: unknown[];\n};");
  });

  it("quotes invalid property names and sanitizes root names", () => {
    expect(jsonToTypescript('{"bad-key":1,"two words":true}', { rootName: "123 api response" }))
      .toBe(`type T123ApiResponse = {
  "bad-key": number;
  "two words": boolean;
};`);
  });

  it("uses interface for object roots only", () => {
    expect(jsonToTypescript('{"id":1}', { declaration: "interface" })).toBe(
      "interface Root {\n  id: number;\n}",
    );
    expect(jsonToTypescript("[1,2]", { declaration: "interface" })).toBe("type Root = number[];");
  });

  it("composes nested child types", () => {
    expect(
      jsonToTypescript('{"user":{"profile":{"email":"a@example.com"}}}', {
        declaration: "interface",
        structure: "composed",
      }),
    ).toBe(`interface Root {
  user: User;
}

interface User {
  profile: Profile;
}

interface Profile {
  email: string;
}`);
  });

  it("throws for invalid JSON", () => {
    expect(() => jsonToTypescript("{nope")).toThrow();
  });
});

describe("module registry", () => {
  it("combines paired transforms into reversible tools", () => {
    expect(modules.map((tool) => tool.id)).toEqual([
      "base64",
      "text-diff",
      "env-json",
      "json",
      "json-parse",
      "json-ts",
    ]);
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
