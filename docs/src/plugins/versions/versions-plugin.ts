import type { StarlightPlugin } from '@astrojs/starlight/types';

export function versionsPlugin(): StarlightPlugin {
  return {
    name: 'versions-starlight-plugin',
    hooks: {
      'config:setup': ctx => {
        ctx.updateConfig({
          components: {
            Sidebar: './src/plugins/versions/components/VersionedSidebar.astro',
          },
        });
      },
    },
  };
}
