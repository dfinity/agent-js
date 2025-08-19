// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { libsPlugin } from './src/plugins/libs';
import { dfinityStarlightTheme } from './src/plugins/theme';

// https://astro.build/config
export default defineConfig({
  site: 'https://js.icp.build/',
  base: '/core/',
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
            exclude: ['../packages/core', '../packages/migrate'],
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
