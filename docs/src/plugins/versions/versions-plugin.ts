import type { StarlightPlugin } from '@astrojs/starlight/types';

/**
 * Options for the VersionsPlugin.
 */
interface VersionsPluginOptions {
  /**
   * The path at which the `versions.json` file is served in production.
   */
  versionsJsonPath: string;
}

export function versionsPlugin(opts: VersionsPluginOptions): StarlightPlugin {
  return {
    name: 'versions-starlight-plugin',
    hooks: {
      'config:setup': ctx => {
        ctx.updateConfig({
          head: [
            {
              tag: 'meta',
              attrs: {
                name: 'versions-json-path',
                content: opts.versionsJsonPath,
              },
            },
          ],
          components: {
            Sidebar: './src/plugins/versions/components/VersionedSidebar.astro',
          },
        });
      },
    },
  };
}
