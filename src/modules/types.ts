export type LabModule = {
  id: string
  name: string
  inputLabel: string
  outputLabel: string
  placeholder: string
  sample: string
  transform: (value: string) => string
}
