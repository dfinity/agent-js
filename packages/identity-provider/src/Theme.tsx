import { createMuiTheme } from '@material-ui/core';
import SharpSansBlack from './assets/fonts/SharpSansDispNo1-Black.woff';
import SharpSansBold from './assets/fonts/SharpSansDispNo1-Bold.woff';
import SharpSansMedium from './assets/fonts/SharpSansDispNo1-Medium.woff';

const sharpSans: any = {
  fontDisplay: 'swap',
  fontFamily: 'Sharp Sans',
  fontStyle: 'normal',
  fontWeight: 700,
  letterSpacing: '1px',
  src: `
    local('Sharp Sans'),
    url(${SharpSansBlack}) format('woff')
  `,
};

const fooBar1 = {
  fontDisplay: 'swap',
  fontFamily: 'Sharp Sans',
  fontStyle: 'normal',
  fontWeight: 400,
  letterSpacing: '1px',
  src: `local('Sharp Sans Book'),
    url(${SharpSansMedium}) format('woff')`,
};

const fooBar2 = {
  fontDisplay: 'swap',
  fontFamily: 'Sharp Sans',
  fontStyle: 'normal',
  fontWeight: 600,
  letterSpacing: '1px',
  src: `local('Sharp Sans Bold'),
    url(${SharpSansBold}) format('woff')`,
};

export const theme = createMuiTheme({
  typography: {
    fontFamily: [
      '"Sharp Sans"',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  overrides: {
    MuiCssBaseline: {
      '@global': {
        '@font-face': [sharpSans, fooBar1, fooBar2],
      },
    },
  },
});

export default theme;
