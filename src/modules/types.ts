export type LabModuleInput = {
  label: string
  placeholder: string
  sample: string
}

export type LabModule = {
  id: string
  name: string
  outputLabel: string
  inputs: LabModuleInput[]
  transform: (values: string[]) => string
  reverseTransform?: (value: string) => string
}
