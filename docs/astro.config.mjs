// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import starlight from '@astrojs/starlight';
import { additionalFilesPlugin } from '@dfinity/starlight/additional-files';
import { markdownUrlsPlugin } from '@dfinity/starlight/markdown-urls';
import { dfinityStarlightTheme } from '@dfinity/starlight/theme';
import { libsPlugin } from '@dfinity/starlight/libs';

// https://astro.build/config
export default defineConfig({
  site: 'https://js.icp.build/',
  base: '/core/',
  image: {
    service: passthroughImageService(),
  },
  integrations: [
    starlight({
      title: 'ICP JS SDK Core',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dfinity/agent-js' }],
      plugins: [
        dfinityStarlightTheme(),
        markdownUrlsPlugin(),
        libsPlugin({
          clean: true,
          baseDir: '../packages',
          typeDoc: {
            exclude: ['../packages/core', '../packages/migrate'],
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
