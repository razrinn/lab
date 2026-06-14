import { decodeBase64, encodeBase64 } from './modules/base64.ts'
import { envToJson, jsonToEnv } from './modules/env.ts'

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message)
}

assert(decodeBase64(encodeBase64('hello こんにちは')) === 'hello こんにちは', 'base64 unicode round trip')
assert(envToJson('FOO=bar\nexport BAZ="qux"') === '{\n  "FOO": "bar",\n  "BAZ": "qux"\n}', 'env to json')
assert(jsonToEnv('{"FOO":"bar","COUNT":3}') === 'FOO=bar\nCOUNT=3', 'json to env')

console.log('module checks passed')
