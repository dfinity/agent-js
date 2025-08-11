// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { libsPlugin } from './src/plugins/libs';
import { dfinityStarlightTheme } from './src/plugins/theme';
import { versionsPlugin } from './src/plugins/versions';

const BASE_DOCS_PATH = '/core';
const docsVersion = process.env.DOCS_VERSION ?? 'local';

// https://astro.build/config
export default defineConfig({
  site: 'https://js.icp.build/',
  base: `${BASE_DOCS_PATH}/${docsVersion}/`,
  integrations: [
    starlight({
      title: 'ICP JS SDK Core',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dfinity/agent-js' }],
      plugins: [
        dfinityStarlightTheme(),
        libsPlugin({
          clean: true,
          baseDir: '../packages',
          typeDoc: {
            exclude: ['../packages/core'],
          },
          frontmatter: { editUrl: false, next: true, prev: true },
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
        versionsPlugin({
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
