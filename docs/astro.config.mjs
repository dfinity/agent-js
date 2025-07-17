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
          typeDoc: { exclude: ['../packages/core'] },
        }),
      ],
      sidebar: [
        {
          label: 'Release Notes',
          autogenerate: { directory: 'release-notes' },
        },
      ],
    }),
  ],
});
