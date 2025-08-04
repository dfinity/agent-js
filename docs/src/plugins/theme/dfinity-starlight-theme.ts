import type { StarlightPlugin } from '@astrojs/starlight/types';

export function dfinityStarlightTheme(): StarlightPlugin {
  return {
    name: '@dfinity/starlight-theme',
    hooks: {
      'config:setup': ctx => {
        ctx.updateConfig({
          logo: {
            src: './src/plugins/theme/dfinity.svg',
            alt: 'DFINITY Logo',
          },
          customCss: [
            ...(ctx.config.customCss || []),
            './src/plugins/theme/dfinity-starlight-theme.css',
          ],
          components: {
            ...ctx.config.components,
          },
        });
      },
    },
  };
}
