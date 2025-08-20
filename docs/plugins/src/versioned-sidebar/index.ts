import type { StarlightPlugin } from '@astrojs/starlight/types';

/**
 * Options for the VersionsPlugin.
 */
interface VersionedSidebarPluginOptions {
  /**
   * The path at which the `versions.json` file is served in production.
   */
  versionsJsonPath: string;
}

/**
 * You can set the `DOCS_VERSIONS_DROPDOWN_TITLE_VERSION` environment variable to show a version above the versions dropdown.
 *
 * @example
 * ```bash
 * DOCS_VERSIONS_DROPDOWN_TITLE_VERSION=v3.2.1 pnpm build
 * ```
 *
 * This will result in:
 * ```html
 * <div>
 *   <label for="sidebar-version-select">Version (v3.2.1)</label>
 *   <select id="sidebar-version-select" aria-label="Select documentation version">
 *     <!-- options from {opts.versionsJsonPath} file -->
 *   </select>
 * </div>
 * ```
 */
export function versionedSidebarPlugin(opts: VersionedSidebarPluginOptions): StarlightPlugin {
  return {
    name: 'versions-starlight-plugin',
    hooks: {
      'config:setup': ctx => {
        ctx.updateConfig({
          head: [
            ...(ctx.config.head ?? []),
            {
              tag: 'meta',
              attrs: {
                name: 'versions-json-path',
                content: opts.versionsJsonPath,
              },
            },
          ],
          components: {
            ...ctx.config.components,
            Sidebar: '@dfinity/starlight/versioned-sidebar/components/VersionedSidebar.astro',
          },
        });
      },
    },
  };
}
