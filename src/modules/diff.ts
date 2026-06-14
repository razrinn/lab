import type { LabModule } from "./types";

type DiffLine = {
  kind: "same" | "added" | "removed";
  value: string;
};

type DiffPart = {
  kind: "same" | "added" | "removed";
  value: string;
};

export type DiffPanel = {
  left: string;
  right: string;
};

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const diffChars = (left: string, right: string): DiffPanel => {
  const a = Array.from(left);
  const b = Array.from(right);
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const leftParts: DiffPart[] = [];
  const rightParts: DiffPart[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      leftParts.push({ kind: "same", value: a[i] });
      rightParts.push({ kind: "same", value: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      leftParts.push({ kind: "removed", value: a[i++] });
    } else {
      rightParts.push({ kind: "added", value: b[j++] });
    }
  }

  while (i < a.length) leftParts.push({ kind: "removed", value: a[i++] });
  while (j < b.length) rightParts.push({ kind: "added", value: b[j++] });

  return {
    left: renderParts(leftParts),
    right: renderParts(rightParts),
  };
};

const renderParts = (parts: DiffPart[]) =>
  parts
    .map((part) => {
      const value = escapeHtml(part.value);
      if (part.kind === "same") return value;

      return `<mark class="${part.kind === "added" ? "bg-[#1f6f43] text-[#c0f7d0]" : "bg-[#7f1d1d] text-[#ffc0c0]"}">${value}</mark>`;
    })
    .join("");

const renderLine = (kind: "same" | "added" | "removed", value: string) => {
  const escaped = escapeHtml(value) || " ";
  if (kind === "same") return escaped;

  return `<mark class="${kind === "added" ? "bg-[#123b28] text-[#9ece6a]" : "bg-[#4a1f2a] text-[#f7768e]"}">${escaped}</mark>`;
};

const diffLines = (left: string, right: string) => {
  const a = left.split("\n");
  const b = right.split("\n");
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push({ kind: "same", value: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ kind: "removed", value: a[i++] });
    } else {
      lines.push({ kind: "added", value: b[j++] });
    }
  }

  while (i < a.length) lines.push({ kind: "removed", value: a[i++] });
  while (j < b.length) lines.push({ kind: "added", value: b[j++] });

  return lines;
};

export const diffPanels = (left: string, right: string): DiffPanel => {
  const leftLines: string[] = [];
  const rightLines: string[] = [];
  const lines = diffLines(left, right);
  let i = 0;

  while (i < lines.length) {
    if (lines[i].kind === "same") {
      leftLines.push(escapeHtml(lines[i].value));
      rightLines.push(escapeHtml(lines[i].value));
      i++;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];

    while (lines[i]?.kind === "removed") removed.push(lines[i++].value);
    while (lines[i]?.kind === "added") added.push(lines[i++].value);

    const length = Math.max(removed.length, added.length);
    for (let index = 0; index < length; index++) {
      const oldLine = removed[index];
      const newLine = added[index];

      if (oldLine !== undefined && newLine !== undefined) {
        const changed = diffChars(oldLine, newLine);
        leftLines.push(changed.left);
        rightLines.push(changed.right);
      } else {
        leftLines.push(oldLine === undefined ? "" : renderLine("removed", oldLine));
        rightLines.push(newLine === undefined ? "" : renderLine("added", newLine));
      }
    }
  }

  return {
    left: leftLines.join("\n"),
    right: rightLines.join("\n"),
  };
};

export const diffText = ([left, right]: string[]) => {
  const lines = diffLines(left, right);
  const changed = lines.some((line) => line.kind !== "same");
  if (!changed) return "No differences";

  return lines
    .map(
      (line) =>
        `${line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "} ${line.value}`,
    )
    .join("\n");
};

export const diffModules: LabModule[] = [
  {
    id: "text-diff",
    name: "Text Diff",
    outputLabel: "Diff",
    inputs: [
      {
        label: "Original",
        placeholder: "Paste original text",
        sample: "hello lab\nkeep this line\nold value",
      },
      {
        label: "Changed",
        placeholder: "Paste changed text",
        sample: "hello lab\nkeep this line\nnew value",
      },
    ],
    transform: diffText,
  },
];
