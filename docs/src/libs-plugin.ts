import fs from 'node:fs/promises';
import path from 'node:path';
import { Application, ProjectReflection, ReflectionKind, type TypeDocOptions } from 'typedoc';

import { type AstroIntegrationLogger, type RemarkPlugins } from 'astro';
import type { StarlightPlugin } from '@astrojs/starlight/types';
import { type PluginOptions as TypeDocMarkdownOptions } from 'typedoc-plugin-markdown';
import { visit } from 'unist-util-visit';

const CONTENT_DIR = path.resolve('src', 'content');
const TMP_DIR = path.resolve(CONTENT_DIR, 'tmp');
const DOCS_DIR = path.resolve(CONTENT_DIR, 'docs');

async function generateApiDocs({
  baseDir,
  typeDoc,
}: LibsLoaderOptions): Promise<ProjectReflection> {
  const defaultTypeDocOptions: LibsLoaderTypeDocOptions = {
    entryPoints: [`${baseDir}/*`],
    entryPointStrategy: 'packages',
    packageOptions: {
      entryPoints: ['src/index.ts'],
      tsconfig: './tsconfig.json',
      readme: 'none',
    },
    plugin: ['typedoc-plugin-markdown', 'typedoc-plugin-frontmatter'],
    tsconfig: './tsconfig.typedoc.json',
    outputs: [{ name: 'markdown', path: TMP_DIR }],
    readme: 'none',
    hidePageTitle: true,
    hideBreadcrumbs: true,
    hidePageHeader: true,
  };

  const app = await Application.bootstrapWithPlugins({
    ...defaultTypeDocOptions,
    ...typeDoc,
  });

  const project = await app.convert();
  if (!project) {
    throw new Error('Failed to convert project with TypeDoc');
  }
  await app.generateOutputs(project);

  return project;
}

/**
 * Options for the LibsLoader plugin.
 */
export interface LibsLoaderOptions {
  /**
   * Base directory where the libraries are located.
   *
   * This should be a path relative to your `astro.config.mjs` file.
   */
  baseDir: string | URL;

  /**
   * Output directory for the generated documentation.
   *
   * This should be a path relative to the `src/content/docs` directory.
   * Defaults to `libs`.
   */
  outDir?: string | URL;

  /**
   * Whether to clean the output directory before generating documentation.
   *
   * Defaults to `true`.
   */
  clean?: boolean;

  /**
   * Options for TypeDoc.
   */
  typeDoc?: LibsLoaderTypeDocOptions;
}

export type LibsLoaderTypeDocOptions = TypeDocMarkdownOptions & TypeDocOptions;

type RemarkPlugin = RemarkPlugins[number];

const prettyUrlsPlugin: RemarkPlugin =
  ([logger, outDir]: [AstroIntegrationLogger, string]) =>
  async (tree, file) => {
    const currentFileDir = path.dirname(file.path);

    visit(tree, 'link', node => {
      const url = node.url;

      if (
        url.startsWith('https://') ||
        url.startsWith('/') ||
        url.startsWith('http://') ||
        url.startsWith('mailto:') ||
        url.startsWith('#')
      ) {
        logger.debug(`Skipping URL: ${url}`);
        return;
      }

      const absoluteLinkedFilePath = path.resolve(currentFileDir, url);
      const relativeToDocs = path.relative(outDir, absoluteLinkedFilePath);
      const normalizedUrl = relativeToDocs.replace(/(index)?\.mdx?$/, '').toLowerCase();
      logger.debug(`Normalizing URL: ${url} -> ${normalizedUrl}`);

      node.url = normalizedUrl;
    });
  };

export function libsPlugin(opts: LibsLoaderOptions): StarlightPlugin {
  return {
    name: 'libs-starlight-plugin',
    hooks: {
      async 'config:setup'(ctx) {
        const site = ctx.astroConfig.site;
        const baseDir = path.resolve(opts.baseDir.toString());
        const outDir = path.resolve(DOCS_DIR, opts.outDir?.toString() ?? 'libs');
        const clean = opts.clean ?? true;

        if (!site) {
          throw new Error('Site URL is not defined in Astro config');
        }

        if (clean) {
          await fs.rm(outDir, { recursive: true, maxRetries: 3, force: true });
          await fs.rm(TMP_DIR, { recursive: true, maxRetries: 3, force: true });
        }

        ctx.addIntegration({
          name: 'libs-astro-plugin',
          hooks: {
            'astro:config:setup': ({ updateConfig, config, logger }) => {
              updateConfig({
                markdown: {
                  remarkPlugins: [
                    ...config.markdown.remarkPlugins,
                    [prettyUrlsPlugin, [logger, outDir]],
                  ],
                },
              });
            },
          },
        });

        const project = await generateApiDocs(opts);

        const sidebarItems = [];
        const modules = project.getChildrenByKind(ReflectionKind.Module);
        for (const { name } of modules) {
          const id = name.startsWith('@') ? name.split('/')[1] : name;
          const outputRootDir = path.resolve(outDir, id);
          const outputApiDir = path.resolve(outputRootDir, 'api');
          const title = titleFromId(id);

          await processMarkdown({
            inputPath: path.resolve(baseDir, id, 'README.md'),
            outputPath: path.resolve(outputRootDir, `index.md`),
            title,
          });

          const apiSrcDir = path.resolve(TMP_DIR, name);
          const files = await fs.readdir(apiSrcDir, {
            withFileTypes: true,
            recursive: true,
          });
          for (const file of files) {
            if (file.isFile() && file.name.endsWith('.md')) {
              const prefix = path.relative(apiSrcDir, file.parentPath);
              const inputFileName = file.name;
              const isReadme = inputFileName.endsWith('README.md');
              const outputFileName = isReadme ? 'index.md' : inputFileName;
              const title = isReadme ? 'Overview' : titleFromId(file.name.replace(/\.mdx?$/, ''));

              await processMarkdown({
                inputPath: path.resolve(apiSrcDir, prefix, inputFileName),
                outputPath: path.resolve(outputApiDir, prefix, outputFileName),
                title,
              });
            }
          }

          sidebarItems.push({
            label: title,
            collapsed: true,
            items: [
              {
                label: 'Overview',
                link: `/libs/${id}`,
              },
              {
                label: 'API Reference',
                collapsed: true,
                autogenerate: {
                  collapsed: true,
                  directory: `libs/${id}/api`,
                },
              },
            ],
          });
        }

        ctx.updateConfig({
          sidebar: [{ label: 'Libraries', items: sidebarItems }, ...(ctx.config.sidebar || [])],
        });
      },
    },
  };
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

function titleFromId(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

interface ProcessMarkdownOpts {
  inputPath: string;
  outputPath: string;
  title: string;
}

async function processMarkdown({
  inputPath,
  outputPath,
  title,
}: ProcessMarkdownOpts): Promise<void> {
  const input = await fs.readFile(inputPath, 'utf-8');

  const output = addFrontmatter(input, {
    title,
    editUrl: false,
    next: true,
    prev: true,
  }).replaceAll('README.md', 'index.md');

  await writeFile(outputPath, output);
}

function addFrontmatter(content: string, frontmatter: Record<string, boolean | string>) {
  const frontmatterStr = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (typeof value === 'boolean' || typeof value === 'number') {
        return `${key}: ${value}`;
      }

      if (typeof value === 'string') {
        return `${key}: "${value}"`;
      }

      throw new Error(`Invalid frontmatter value for key "${key}": ${value}`);
    })
    .join('\n');

  if (frontmatterStr.length === 0) {
    return content;
  }

  return `---\n${frontmatterStr}\n---\n\n${content}`;
}
