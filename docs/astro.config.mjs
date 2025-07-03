// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

const [agentTypeDoc, agentTypeDocGroup] = createStarlightTypeDocPlugin();
const [assetsTypeDoc, assetsTypeDocGroup] = createStarlightTypeDocPlugin();
const [authClientTypeDoc, authClientTypeDocGroup] = createStarlightTypeDocPlugin();
const [candidTypeDoc, candidTypeDocGroup] = createStarlightTypeDocPlugin();
const [coreTypeDoc, coreTypeDocGroup] = createStarlightTypeDocPlugin();
const [identityTypeDoc, identityTypeDocGroup] = createStarlightTypeDocPlugin();
const [identitySecp256k1TypeDoc, identitySecp256k1TypeDocGroup] = createStarlightTypeDocPlugin();
const [principalTypeDoc, principalTypeDocGroup] = createStarlightTypeDocPlugin();
const [useAuthClientTypeDoc, useAuthClientTypeDocGroup] = createStarlightTypeDocPlugin();

/**
 * @param {string} packageName
 * @returns {import("starlight-typedoc").StarlightTypeDocOptions}
 */
function createTypeDocPluginConfig(packageName) {
  return {
    entryPoints: [`../packages/${packageName}/src/index.ts`],
    tsconfig: `../packages/${packageName}/tsconfig.json`,
    output: `api/${packageName}`,
    sidebar: { label: packageName, collapsed: true },
    errorOnEmptyDocumentation: true,
    pagination: true,
    watch: true,
    typeDoc: {
      cleanOutputDir: true,
      readme: `../packages/${packageName}/README.md`,
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'ICP JS SDK Docs',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dfinity/agent-js' }],
      plugins: [
        // agentTypeDoc(createTypeDocPluginConfig('agent')),
        assetsTypeDoc(createTypeDocPluginConfig('assets')),
        authClientTypeDoc(createTypeDocPluginConfig('auth-client')),
        candidTypeDoc(createTypeDocPluginConfig('candid')),
        // coreTypeDoc(createTypeDocPluginConfig('core')),
        identityTypeDoc(createTypeDocPluginConfig('identity')),
        identitySecp256k1TypeDoc(createTypeDocPluginConfig('identity-secp256k1')),
        principalTypeDoc(createTypeDocPluginConfig('principal')),
        useAuthClientTypeDoc(createTypeDocPluginConfig('use-auth-client')),
      ],
      sidebar: [
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'Reference',
          items: [
            {
              label: '@icp-sdk',
              items: [
                // coreTypeDocGroup
              ],
            },
            {
              label: '@dfinity',
              items: [
                // agentTypeDocGroup,
                assetsTypeDocGroup,
                authClientTypeDocGroup,
                candidTypeDocGroup,
                identityTypeDocGroup,
                identitySecp256k1TypeDocGroup,
                principalTypeDocGroup,
                useAuthClientTypeDocGroup,
              ],
            },
          ],
        },
        {
          label: 'Changelog',
          link: '../CHANGELOG.md',
        }
      ],
    }),
  ],
});
