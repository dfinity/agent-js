// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { additionalFilesPlugin } from '@dfinity/starlight/additional-files';
import { markdownUrlsPlugin } from '@dfinity/starlight/markdown-urls';
import { dfinityStarlightTheme } from '@dfinity/starlight/theme';
import { libsPlugin } from '@dfinity/starlight/libs';
import { versionedSidebarPlugin } from '@dfinity/starlight/versioned-sidebar';

const BASE_DOCS_PATH = '/agent';
const docsVersion = process.env.DOCS_VERSION ?? 'local';

// https://astro.build/config
export default defineConfig({
  site: 'https://js.icp.build/',
  base: `${BASE_DOCS_PATH}/${docsVersion}/`,
  integrations: [
    starlight({
      title: 'ICP JS SDK Agent',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dfinity/agent-js' }],
      plugins: [
        dfinityStarlightTheme(),
        markdownUrlsPlugin(),
        libsPlugin({
          clean: true,
          baseDir: '../packages',
          typeDoc: {
            exclude: ['../packages/core'],
          },
          frontmatter: { editUrl: false, next: true, prev: true },
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
          label: 'Release Notes',
          autogenerate: { directory: 'release-notes', collapsed: true },
        },
      ],
    }),
  ],
});
