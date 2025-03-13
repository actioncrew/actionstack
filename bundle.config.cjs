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
      filePath: './dist/streamix/epics/index.d.ts',
      outFile: './dist/streamix/epics/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actioncrew/streamix', '@actioncrew/actionstack'],
        inlinedLibraries: [],
      }
    },
    {
      filePath: './dist/streamix/sagas/index.d.ts',
      outFile: './dist/streamix/sagas/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actioncrew/streamix', '@actioncrew/actionstack', 'redux-saga'],
        inlinedLibraries: [],
      }
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
