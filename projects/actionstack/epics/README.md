# ActionStack Epics

## Overview

Actionstack Epics is a middleware package that enables handling asynchronous operations and side effects in a reactive manner using RxJS. With support for streams, it is ideal for applications requiring complex event-driven logic.

## Installation

Install Actionstack Epics using:

    npm install @actionstack/epics

## Features

- Reactive side effect management using RxJS
- Concurrent and sequential processing of streams
- Supports dynamic addition and removal of epics
- Integrates seamlessly with the Actionstack store

## Usage

Setting Up Epics Middleware

Configure the epics middleware in your store:

    import { createStore } from '@actionstack/store';
    import { epics, addEpics } from '@actionstack/epics';
    import rootEpic from './epics';

    export const store = createStore({
      reducer: (state: any = {}) => state,
      dependencies: {},
    }, applyMiddleware(logger, epics));

    // Register the root epic
    store.dispatch(addEpics(rootEpic));

Writing an Epic

Epics are functions that transform action streams into other streams:

    import { ofType } from '@actionstack/epics';
    import { map } from 'rxjs/operators';
    import { fetchSuccess } from './actions';

    const fetchEpic = (action$) =>
      action$.pipe(
        ofType('FETCH_REQUEST'),
        map(() => fetchSuccess())
      );

    export default fetchEpic;

## API Reference

### Middleware

- epics: Middleware to handle epics.

### Utilities

- addEpics: Action to dynamically add epics.
- removeEpics: Action to dynamically remove epics.
- ofType: RxJS operator to filter actions by type.

## Contribution

For bug reports or feature requests, please open an issue or submit a pull request on [GitHub](https://github.com/actioncrew/actionstack).

