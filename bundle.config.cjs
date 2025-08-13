module.exports = {
  entries: [
    {
      filePath: './dist/actionstack/store/index.d.ts',
      outFile: './dist/actionstack/store/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['rxjs'],
        inlinedLibraries: [],
      }
    },
    {
      filePath: './dist/actionstack/angular/index.d.ts',
      outFile: './dist/actionstack/angular/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actionstack/store', 'rxjs', '@angular/core', '@angular/common'],
        inlinedLibraries: [],
      }
    },
    {
      filePath: './dist/actionstack/angular/epics/index.d.ts',
      outFile: './dist/actionstack/angular/epics/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actionstack/store', 'rxjs', '@angular/core', '@angular/common'],
        inlinedLibraries: [],
      }
    },
    {
      filePath: './dist/actionstack/angular/sagas/index.d.ts',
      outFile: './dist/actionstack/angular/sagas/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actionstack/store', 'rxjs', 'redux-saga', '@angular/core', '@angular/common'],
        inlinedLibraries: [],
      }
    },
    {
      filePath: './dist/actionstack/epics/index.d.ts',
      outFile: './dist/actionstack/epics/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actionstack/store', 'rxjs'],
        inlinedLibraries: [],
      }
    },
    {
      filePath: './dist/actionstack/sagas/index.d.ts',
      outFile: './dist/actionstack/sagas/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actionstack/store', 'rxjs', 'redux-saga'],
        inlinedLibraries: [],
      }
    },
    {
      filePath: './dist/actionstack/tools/index.d.ts',
      outFile: './dist/actionstack/tools/@actioncrew/index.d.ts',
      output: {
        inlineDeclareGlobals: false,
        noBanner: true,
      },
      libraries: {
        importedLibraries: ['@actionstack/store', 'rxjs'],
        inlinedLibraries: [],
      }
    }
  ],
  compilationOptions: {
    preferredConfigPath: './tsconfig.json'
  }
};
