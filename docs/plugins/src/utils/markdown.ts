import yaml from "yaml";
import fs from "node:fs/promises";
import { writeFile } from "./fs.ts";
import { type Frontmatter } from "./types.ts";

interface ProcessMarkdownOpts {
  inputPath: string;
  outputPath: string;
  frontmatter: Frontmatter;
}

export async function processMarkdown({
  inputPath,
  outputPath,
  frontmatter,
}: ProcessMarkdownOpts): Promise<void> {
  const input = await fs.readFile(inputPath, "utf-8");

  const output = addFrontmatter(input, frontmatter)
    .replace(/^\s*#\s*.*$/m, "")
    .replaceAll("README.md", "index.md");

  await writeFile(outputPath, output);
}

function addFrontmatter(content: string, frontmatter: Frontmatter): string {
  const frontmatterStr = yaml.stringify(frontmatter);

  if (frontmatterStr.length === 0) {
    return content;
  }

  return `---\n${frontmatterStr}---\n\n${content}`;
}
