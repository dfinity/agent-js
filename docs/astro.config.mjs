// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import starlight from '@astrojs/starlight';
import { additionalFilesPlugin } from '@dfinity/starlight/additional-files';
import { markdownUrlsPlugin } from '@dfinity/starlight/markdown-urls';
import { dfinityStarlightTheme } from '@dfinity/starlight/theme';
import { libsPlugin } from '@dfinity/starlight/libs';
import { versionedSidebarPlugin } from '@dfinity/starlight/versioned-sidebar';

const BASE_DOCS_PATH = '/core';
const docsVersion = process.env.DOCS_VERSION ?? 'local';
const packagesDir = '../packages';

const UPGRADE_BANNER_CONTENT =
  'Still using <code>@dfinity/agent</code>? Migrate to <a href="/core/latest/upgrading/v4">@icp-sdk/core</a>!';

// https://astro.build/config
export default defineConfig({
  site: 'https://js.icp.build/',
  base: `${BASE_DOCS_PATH}/${docsVersion}/`,
  image: {
    service: passthroughImageService(),
  },
  integrations: [
    starlight({
      title: 'ICP JS SDK Core',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dfinity/agent-js' }],
      plugins: [
        dfinityStarlightTheme(),
        markdownUrlsPlugin({
          packagesDir,
        }),
        libsPlugin({
          clean: true,
          baseDir: packagesDir,
          typeDoc: {
            exclude: [
              `${packagesDir}/core`,
              `${packagesDir}/migrate`,
            ],
          },
          frontmatter: {
            editUrl: false,
            next: true,
            prev: true,
            banner: {
              content: UPGRADE_BANNER_CONTENT,
            },
          },
        }),
        additionalFilesPlugin({
          additionalFiles: [
            {
              path: '../CHANGELOG.md',
              frontmatter: {
                tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 2 },
                pagefind: false,
                editUrl: false,
                next: false,
                prev: false,
                banner: {
                  content: UPGRADE_BANNER_CONTENT,
                },
              },
            },
          ],
        }),
        versionedSidebarPlugin({
          versionsJsonPath: `${BASE_DOCS_PATH}/versions.json`,
        }),
      ],
      sidebar: [
        {
          label: 'Upgrading',
          autogenerate: { directory: 'upgrading', collapsed: true },
        },
      ],
    }),
  ],
});
