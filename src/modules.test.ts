import { describe, expect, it } from 'vitest'
import { decodeBase64, encodeBase64 } from './modules/base64.ts'
import { envToJson, jsonToEnv } from './modules/env.ts'
import { modules } from './modules/index.ts'

describe('base64 transforms', () => {
  it('round-trips unicode text', () => {
    const value = 'hello こんにちは 👋'

    expect(decodeBase64(encodeBase64(value))).toBe(value)
  })

  it('decodes values with surrounding whitespace', () => {
    expect(decodeBase64('\n aGVsbG8gbGFi \t')).toBe('hello lab')
  })
})

describe('env transforms', () => {
  it('converts env text to pretty JSON', () => {
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
          FOO: 'bar',
          BAZ: 'qux',
          SINGLE: 'quoted',
          URL: 'https://example.com?a=1&b=2',
        },
        null,
        2,
      ),
    )
  })

  it('keeps the last value for duplicate env keys', () => {
    expect(envToJson('FOO=old\nFOO=new')).toBe('{\n  "FOO": "new"\n}')
  })

  it('converts flat JSON values to env text', () => {
    expect(jsonToEnv('{"FOO":"bar","COUNT":3,"ENABLED":true,"EMPTY":null}')).toBe(
      'FOO=bar\nCOUNT=3\nENABLED=true\nEMPTY=null',
    )
  })

  it('throws for invalid JSON', () => {
    expect(() => jsonToEnv('{nope')).toThrow()
  })
})

describe('module registry', () => {
  it('has unique ids and working samples', () => {
    expect(new Set(modules.map((tool) => tool.id)).size).toBe(modules.length)

    for (const tool of modules) {
      expect(tool.transform(tool.sample)).toEqual(expect.any(String))
    }
  })
})
