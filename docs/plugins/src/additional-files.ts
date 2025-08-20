import { type StarlightPlugin } from "@astrojs/starlight/types";
import path from "node:path";
import { idFromFilename, titleFromIdCapitalized } from "./utils/string.ts";
import { type Frontmatter } from "./utils/types.ts";
import { processMarkdown } from "./utils/markdown.ts";
import { DOCS_DIR } from "./utils/constants.ts";

/**
 * Options for the AdditionalFiles plugin.
 */
export interface AdditionalFilesOptions {
  /**
   * Additional files to include in the documentation.
   */
  additionalFiles?: { path: string; frontmatter?: Frontmatter }[];
}

export function additionalFilesPlugin(
  opts: AdditionalFilesOptions,
): StarlightPlugin {
  return {
    name: "@dfinity/starlight/additional-files",
    hooks: {
      async "config:setup"(ctx) {
        const sidebarItems = [];
        for (const file of opts.additionalFiles || []) {
          const fileName = path.basename(file.path).toLowerCase();
          const id = idFromFilename(fileName);
          const title = titleFromIdCapitalized(id);

          await processMarkdown({
            inputPath: path.resolve(file.path),
            outputPath: path.resolve(DOCS_DIR, fileName),
            frontmatter: {
              title,
              ...(file.frontmatter || {}),
            },
          });

          sidebarItems.push({
            label: title,
            link: `/${id}`,
          });
        }

        ctx.updateConfig({
          sidebar: [
            ...(ctx.config.sidebar || []),
            ...sidebarItems,
          ],
        });
      },
    },
  };
}
