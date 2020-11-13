import { createMuiTheme } from '@material-ui/core';
import SharpSansBlack from './assets/fonts/SharpSansDispNo1-Black.woff';
import SharpSansBold from './assets/fonts/SharpSansDispNo1-Bold.woff';
import SharpSansMedium from './assets/fonts/SharpSansDispNo1-Medium.woff';

const fontBaseStyles: any = {
  fontDisplay: 'swap',
  fontFamily: 'Sharp Sans',
  fontStyle: 'normal',
  letterSpacing: '1px',
};
const sharpSansBlack = {
  ...fontBaseStyles,
  fontWeight: 700,
  src: `
    local('Sharp Sans'),
    url(${SharpSansBlack}) format('woff')
  `,
};

const sharpSansMedium = {
  ...fontBaseStyles,
  fontWeight: 400,
  src: `local('Sharp Sans Medium'),
    url(${SharpSansMedium}) format('woff')`,
};

const sharpSansBold = {
  ...fontBaseStyles,
  fontWeight: 600,
  src: `local('Sharp Sans Bold'),
    url(${SharpSansBold}) format('woff')`,
};

const primaryButton = {
  background: 'linear-gradient(45deg, #ED1E79 30%, #522785 90%)',
  fontWeight: 600,
  boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
  color: 'white',
  letterSpacing: '2px',
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
    MuiButton: {
      textPrimary: { ...primaryButton },
      outlinedPrimary: primaryButton,
      containedPrimary: primaryButton,
    },
    MuiCssBaseline: {
      '@global': {
        '@font-face': [sharpSansBlack, sharpSansMedium, sharpSansBold],
      },
    },
  },
});

export default theme;
