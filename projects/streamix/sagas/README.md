# Actionstack Sagas

## Overview

Actionstack Sagas is a middleware package that provides a declarative way to handle asynchronous side effects in Actionstack-powered applications. Using generator functions, it enables complex control flows like sequencing, parallel execution, and error handling, making it an excellent tool for managing app logic beyond the core store.

## Installation

To install Actionstack Sagas, use the following command:

    npm install @actioncrew/actionstack

## Features

- Declarative asynchronous logic management
- Handles complex control flows (e.g., sequencing, branching, and parallel execution)
- Built-in support for cancellation and error handling
- Lightweight and integrates seamlessly with the Actionstack store

## Usage

### Setting Up Sagas Middleware

Import and configure the middleware in your store setup:

```typescript
    import { createStore } from '@actioncrew/actionstack';
    import { sagas, run } from '@actioncrew/actionstack/sagas';
    import rootSaga from './sagas';

    export const store = createStore({
      reducer: (state: any = {}) => state,
      dependencies: {},
    }, applyMiddleware(logger, sagas));

    // Run the root saga
    store.dispatch(run(rootSaga));
```

### Writing a Saga

Sagas are generator functions that describe side effects in a declarative way. Use effects like take, call, and put to manage actions and state:

```typescript
    import { take, call, put } from 'redux-saga/effects';
    import { fetchData } from './api';
    import { fetchSuccess, fetchFailure } from './actions';

    function* fetchDataSaga() {
      try {
        const data = yield call(fetchData);
        yield put(fetchSuccess(data));
      } catch (error) {
        yield put(fetchFailure(error));
      }
    }

    export default function* rootSaga() {
      yield take('FETCH_REQUEST', fetchDataSaga);
    }
```

## API Reference

### Middleware

- sagas: Middleware to connect sagas to the store.

### Effects

- take: Wait for a specific action type.
- call: Call a function and wait for its result.
- put: Dispatch an action to the store.
- fork: Start a non-blocking task.
- cancel: Cancel a running task.

For detailed usage of each effect, refer to the official documentation.

## Contribution

For bug reports or feature requests, please open an issue or submit a pull request on [GitHub](https://github.com/actioncrew/actionstack).

