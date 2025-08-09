module.exports = {
  entries: [
    {
      filePath: './dist/streamix/index.d.ts',
      outFile: './dist/streamix/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
    },
    {
      filePath: './dist/streamix/tools/index.d.ts',
      outFile: './dist/streamix/tools/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actioncrew/streamix', '@actioncrew/actionstack'],
        inlinedLibraries: [],
      }
    }
  ],
  compilationOptions: {
    preferredConfigPath: './tsconfig.json'
  }
};
