export type LabModuleInput = {
  label: string;
  placeholder: string;
  sample: string;
};

export type LabModuleSetting =
  | {
      id: string;
      label: string;
      type: "checkbox";
      defaultValue: boolean;
    }
  | {
      id: string;
      label: string;
      type: "select";
      defaultValue: string;
      options: { label: string; value: string }[];
    }
  | {
      id: string;
      label: string;
      type: "text";
      defaultValue: string;
    };

export type LabModule = {
  id: string;
  name: string;
  outputLabel: string;
  inputs: LabModuleInput[];
  settings?: LabModuleSetting[];
  transform: (values: string[], settings?: Record<string, string | boolean>) => string;
  reverseTransform?: (value: string) => string;
};
