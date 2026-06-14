import { base64Modules } from './base64'
import { envModules } from './env'
import { jsonModules } from './json'
import type { LabModule } from './types'

export const modules: LabModule[] = [...base64Modules, ...envModules, ...jsonModules]
