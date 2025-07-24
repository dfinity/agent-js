// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { libsPlugin } from './src/libs-plugin';

// https://astro.build/config
export default defineConfig({
  site: 'https://agent-js.icp.xyz/',
  integrations: [
    starlight({
      title: 'ICP JS SDK Docs',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dfinity/agent-js' }],
      plugins: [
        libsPlugin({
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
