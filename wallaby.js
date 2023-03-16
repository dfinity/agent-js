export default function (wallaby) {
  return {
    env: {
      params: {
        runner: '--experimental-vm-modules',
      },
    },
    compilers: {
      '**/*.ts?(x)': wallaby.compilers.typeScript({
        module: 'commonjs',
        jsx: 'React',
      }),
    },
  };
}
