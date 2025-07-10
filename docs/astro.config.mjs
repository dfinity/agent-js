// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { libsPlugin } from './src/libs-plugin';

// https://astro.build/config
export default defineConfig({
  site: 'https://dfinity.github.io/agent-js/',
  integrations: [
    starlight({
      title: 'ICP JS SDK Docs',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dfinity/agent-js' }],
      plugins: [libsPlugin({ baseDir: '../packages', clean: false })],
      sidebar: [
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
      ],
    }),
  ],
});
