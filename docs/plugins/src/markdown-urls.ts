import { type AstroIntegrationLogger, type RemarkPlugins } from "astro";
import { visit } from "unist-util-visit";
import path from "node:path";
import { type StarlightPlugin } from "@astrojs/starlight/types";
import { DOCS_DIR } from "./utils/constants.ts";
import { readdirSync } from "node:fs";

type RemarkPlugin = RemarkPlugins[number];

const markdownUrlsRemarkPlugin: RemarkPlugin = (
  [logger, docsDir, site, baseUrl, crossPackageUrlRegex]: [
    AstroIntegrationLogger,
    string,
    string,
    string,
    RegExp,
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

    // if the url is a cross-package link, go back one level and add the api directory
    const normalizedUrl = url.replace(crossPackageUrlRegex, '../../$1/api');
    const absoluteLinkedFilePath = path.resolve(currentFileDir, normalizedUrl);

    // normalize all other relative URLs to the docs directory
    const relativeToDocs = path.relative(docsDir, absoluteLinkedFilePath);
    const nodeUrl = `${baseUrl}${
      relativeToDocs.replace(/(index)?\.mdx?(#.*)?$/, "$2").toLowerCase()
    }`;
    logger.debug(`Normalizing URL: ${url} -> ${nodeUrl}`);

    node.url = nodeUrl;
  });
};

interface MarkdownUrlsPluginOptions { 
  packagesDir: string;
}

export function markdownUrlsPlugin({ packagesDir }: MarkdownUrlsPluginOptions): StarlightPlugin {
  return {
    name: "@dfinity/starlight/markdown-urls",
    hooks: {
      "config:setup": (ctx) => {
        const site = ctx.astroConfig.site;

        // get all the packages in the packagesDir
        const packages = readdirSync(packagesDir);
        const crossPackageUrlRegex = new RegExp(`\\.\\.\\/(${packages.join('|')})`);

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
                      crossPackageUrlRegex,
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
