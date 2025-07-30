import { defineConfig } from '@junobuild/config';

export default defineConfig({
  satellite: {
    ids: {
      production: 'xavwt-jqaaa-aaaal-asjaa-cai',
    },
    predeploy: ['./scripts/predeploy.sh'],
    source: 'dist',
    storage: {
      redirects: [
        {
          source: '/',
          location: '/core/',
          code: 302,
        },
      ],
    },
  },
});
