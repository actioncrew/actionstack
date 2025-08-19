module.exports = {
  entries: [
    {
      filePath: './dist/actionstack/index.d.ts',
      outFile: './dist/actionstack/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
    },
    {
      filePath: './dist/actionstack/tools/index.d.ts',
      outFile: './dist/actionstack/tools/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actioncrew/actionstack', '@actioncrew/actionstack'],
        inlinedLibraries: [],
      }
    }
  ],
  compilationOptions: {
    preferredConfigPath: './tsconfig.json'
  }
};
