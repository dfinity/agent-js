import fs from 'node:fs/promises';
import path from 'node:path';
import { Application, ReflectionKind } from 'typedoc';

import { type AstroIntegrationLogger, type RemarkPlugins } from 'astro';
import type { StarlightPlugin } from '@astrojs/starlight/types';
import { type PluginOptions as TypeDocMarkdownOptions } from 'typedoc-plugin-markdown';
import { visit } from 'unist-util-visit';

const CONTENT_DIR = path.resolve('src', 'content');
const TMP_DIR = path.resolve(CONTENT_DIR, 'tmp');
const DOCS_DIR = path.resolve(CONTENT_DIR, 'docs');

async function createTypeDocApp(baseDir: string): Promise<Application> {
  const markdownOptions: TypeDocMarkdownOptions = {
    hidePageTitle: true,
    hideBreadcrumbs: true,
    hidePageHeader: true,
  };

  return await Application.bootstrapWithPlugins({
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
    ...markdownOptions,
  });
}

export interface LibsLoaderOpts {
  baseDir: string | URL;
  outDir?: string | URL;
  clean?: boolean;
}

type RemarkPlugin = RemarkPlugins[number];

const prettyUrlsPlugin: RemarkPlugin = ([_logger, outputDir]: [AstroIntegrationLogger, string]) => {
  return async (tree, file) => {
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
        return;
      }

      const absoluteLinkedFilePath = path.resolve(currentFileDir, url);
      const relativeToDocs = path.relative(outputDir, absoluteLinkedFilePath);
      const normalizedUrl = relativeToDocs.replace(/(index)?\.mdx?$/, '').toLowerCase();

      node.url = normalizedUrl;
    });
  };
};

export function libsPlugin(opts: LibsLoaderOpts): StarlightPlugin {
  return {
    name: 'libs-starlight-plugin',
    hooks: {
      async 'config:setup'(ctx) {
        const site = ctx.astroConfig.site;
        if (!site) {
          throw new Error('Site URL is not defined in Astro config');
        }

        const baseDir = path.resolve(opts.baseDir.toString());
        const outDir = path.resolve(DOCS_DIR, opts.outDir?.toString() ?? 'libs');

        if (opts.clean) {
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

        const app = await createTypeDocApp(baseDir);
        const project = await app.convert();
        if (!project) {
          throw new Error('Failed to convert project with TypeDoc');
        }
        await app.generateOutputs(project);

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
            if (file.isFile() && file.name.endsWith('.md') && !file.name.endsWith('README.md')) {
              const prefix = path.relative(apiSrcDir, file.parentPath);
              const filePath = path.join(prefix, file.name);

              await processMarkdown({
                inputPath: path.resolve(apiSrcDir, filePath),
                outputPath: path.resolve(outputApiDir, filePath),
                title: titleFromId(file.name.replace(/\.mdx?$/, '')),
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
          sidebar: [...(ctx.config.sidebar || []), { label: 'Libraries', items: sidebarItems }],
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
