import type { StarlightPlugin } from "@astrojs/starlight/types";

export function dfinityStarlightTheme(): StarlightPlugin {
  return {
    name: "@dfinity/starlight/theme",
    hooks: {
      "config:setup": (ctx) => {
        ctx.updateConfig({
          logo: {
            src: "@dfinity/starlight/assets/icp.svg",
            alt: "Internet Computer Logo",
          },
          customCss: [
            ...(ctx.config.customCss || []),
            "@dfinity/starlight/assets/theme.css",
          ],
        });
      },
    },
  };
}
