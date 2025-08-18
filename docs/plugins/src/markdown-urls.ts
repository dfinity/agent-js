import { type AstroIntegrationLogger, type RemarkPlugins } from "astro";
import { visit } from "unist-util-visit";
import path from "node:path";
import { type StarlightPlugin } from "@astrojs/starlight/types";
import { DOCS_DIR } from "./utils/constants.ts";

type RemarkPlugin = RemarkPlugins[number];

const markdownUrlsRemarkPlugin: RemarkPlugin = (
  [logger, docsDir, site, baseUrl]: [
    AstroIntegrationLogger,
    string,
    string,
    string,
  ],
) =>
(tree, file) => {
  const currentFileDir = path.dirname(file.path);

  visit(tree, "link", (node) => {
    const url = node.url;

    // take full URLs to the current site and make them relative
    if (url.startsWith(site)) {
      node.url = new URL(url).pathname;
      return;
    }

    // skip any other full URLs
    if (
      url.startsWith("https://") ||
      url.startsWith("/") ||
      url.startsWith("http://") ||
      url.startsWith("mailto:") ||
      url.startsWith("#")
    ) {
      logger.debug(`Skipping URL: ${url}`);
      return;
    }

    // normalize all other relative URLs to the docs directory
    const absoluteLinkedFilePath = path.resolve(currentFileDir, url);
    const relativeToDocs = path.relative(docsDir, absoluteLinkedFilePath);
    const normalizedUrl = `${baseUrl}${
      relativeToDocs.replace(/(index)?\.mdx?(#.*)?$/, "$2").toLowerCase()
    }`;
    logger.debug(`Normalizing URL: ${url} -> ${normalizedUrl}`);

    node.url = normalizedUrl;
  });
};

export function markdownUrlsPlugin(): StarlightPlugin {
  return {
    name: "@dfinity/starlight/markdown-urls",
    hooks: {
      "config:setup": (ctx) => {
        const site = ctx.astroConfig.site;

        ctx.addIntegration({
          name: "libs-astro-plugin",
          hooks: {
            "astro:config:setup": ({ updateConfig, config, logger }) => {
              updateConfig({
                markdown: {
                  remarkPlugins: [
                    ...config.markdown.remarkPlugins,
                    [markdownUrlsRemarkPlugin, [
                      logger,
                      DOCS_DIR,
                      site,
                      ctx.astroConfig.base,
                    ]],
                  ],
                },
              });
            },
          },
        });
      },
    },
  };
}
