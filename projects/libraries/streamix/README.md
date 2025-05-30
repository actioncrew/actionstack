<h1 style="display: none;">ActionStack</h1>

<p align="center">
  <img src="https://github.com/actioncrew/actionstack/blob/master/LOGO.png?raw=true" alt="ActionStack Logo" width="800">
</p>

A powerful and flexible state management library designed to provide a scalable and maintainable approach for managing application state in modern JavaScript and TypeScript applications. It seamlessly integrates with your project, offering advanced features such as handling asynchronous actions, reducers, and side effects like epics and sagas.

[redux-docs /](https://redux.js.org/)
[observable-docs /](https://redux-observable.js.org/)
[saga-docs /](https://redux-saga.js.org/)
[actionstack-docs /](https://actionstack.vercel.app/documentation/)

[![build status](https://github.com/actioncrew/actionstack/workflows/build/badge.svg)](https://github.com/actioncrew/actionstack/workflows/build/badge.svg)
[![npm version](https://img.shields.io/npm/v/@actioncrew/actionstack.svg?style=flat-square)](https://www.npmjs.com/package/@actioncrew/actionstack)
[![npm downloads](https://img.shields.io/npm/dm/@actioncrew/actionstack.svg?style=flat-square)](https://www.npmjs.com/package/@actioncrew/actionstack)
[![min+zipped](https://img.shields.io/bundlephobia/minzip/%40actioncrew%2Factionstack)](https://img.shields.io/bundlephobia/minzip/%40actioncrew%2Factionstack)
  
## Key Features
- Reactive State Management: ActionStack uses [Streamix](https://www.npmjs.com/package/@actioncrew/streamix) library to create a reactive state management system. This allows your components and views to stay in sync with the latest state changes automatically.
- Immutable State Updates: State updates are immutable, ensuring predictable state transitions and easier debugging.
- TypeScript Support: ActionStack offers full TypeScript support, enhancing developer experience with type safety for state, actions, and reducers.
- Framework-Agnostic: ActionStack is framework-agnostic, meaning it can be used with any JavaScript or TypeScript project, not just Angular.
- Dynamic Module Support: Easily manage complex, large-scale applications by supporting multiple store modules that can attach or detach dynamically, optimizing memory usage.

## What Sets ActionStack Apart
ActionStack excels in managing asynchronous state. Unlike traditional state management libraries, ActionStack has robust support for handling side effects and asynchronous operations:

- Asynchronous Actions: You can dispatch asynchronous actions that trigger complex workflows such as API calls or delayed updates.
- Asynchronous Reducers: Reducers can handle async processes, ensuring smooth state transitions even when asynchronous actions are involved.
- Asynchronous Meta-Reducers and Selectors: Meta-reducers and selectors can operate asynchronously, allowing state to be fetched or transformed without blocking the main flow.

ActionStack is built for flexibility, letting you structure your state tree however you want while handling complex state management scenarios with ease. It provides built-in support for side effects, allowing you to extend the store's functionality through epics or sagas. These mechanisms handle asynchronous tasks and interactions in response to dispatched actions.

## Usage

### Creating a Store
To create a store, use the createStore function, which initializes the store with the provided main module and optional settings or enhancers.

```typescript
    import { createStore } from '@actioncrew/actionstack';
    import { someMainModule } from './modules';

    // Optional: Define store settings to customize behavior
    const storeSettings = {
      dispatchSystemActions: false,
      enableMetaReducers: false,
      awaitStatePropagation: true,
      enableAsyncReducers: false,
      exclusiveActionProcessing: false
    };

    // Create the store instance
    const store = createStore({
      reducer: rootReducer,
      dependencies: {}
    }, storeSettings, applyMiddleware(logger, epics));
```

### Defining Reducers
Reducers are pure functions responsible for updating the state based on dispatched actions. They take the current state and an action as arguments, and return a new state. You are free to define reducers in any structure that fits your application needs—there is no predefined function for creating reducers.

A basic reducer structure looks like this:

```typescript
    const myReducer = (state = initialState, action) => {
      switch (action.type) {
        case 'ACTION_TYPE':
          // Reducer logic
          return { ...state, /* new state */ };
        default:
          return state;
      }
    };
```

> Note: The state parameter in all reducers must have a default value, typically initialized with the reducer's initialState. This ensures that reducers have a valid state to operate on and prevents potential errors.

### Loading and Unloading Modules
Modules can be loaded or unloaded dynamically. The loadModule and unloadModule methods manage this process, ensuring that the store’s dependencies are correctly updated.

```typescript
    const featureModule = {
      slice: 'superModule',
      reducer: superReducer,
      dependencies: { heroService: new HeroService() }
    };

    // Load a feature module
    store.loadModule(featureModule);

    // Unload a feature module (with optional state clearing)
    store.unloadModule(featureModule, true);
```

### Reading State Safely
To read a slice of the state in a safe manner (e.g., avoiding race conditions), use readSafe. This method ensures the state is accessed while locking the pipeline.

```typescript
    store.get('*', (state) => {
      console.log('State object:', state);
    });
```

### Dispatching Actions
You can dispatch actions to add or clear messages in the store. Here's how to do it:

```typescript
    import { Action, action, featureSelector, selector } from '@actioncrew/actionstack';

    export const addMessage = action("ADD_MESSAGE", (message: string) => ({ message }));
    export const clearMessages = action('CLEAR_MESSAGES');
    
    ...

    // Dispatching an action to add a message
    store.dispatch(addMessage("Hello, world!"));

    // Dispatching an action to add another message
    store.dispatch(addMessage("This is a second message!"));

    // Dispatching an action to clear all messages
    store.dispatch(clearMessages());
```

### Subscribing to State Changes
You can also subscribe to changes in the state, so that when messages are added or cleared, you can react to those changes:

```typescript
    import { Action, action, featureSelector, selector } from '@actioncrew/actionstack';
    
    export const feature = featureSelector(slice);
    export const selectHeroes = selector(feature, state => state.heroes);
    
    ...
    
    // Subscribe to state changes
    this.subscription = store.select(selectHeroes()).subscribe(value => {
      this.heroes = value;
    });
```

## Tooling
ActionStack includes several tools to aid development and debugging: logger, perfmon and storeFreeze. In addition, it is compatible with any middleware available for Redux, but with caution. Middleware can add powerful functionalities to your application, but improper usage may lead to unintended side effects or performance issues.

> Note: Redux Thunk-like functionality is already integrated into ActionStack, so there's no need to add it separately for handling asynchronous actions.

# Conclusion
ActionStack makes state management in your applications easier, more predictable, and scalable. With support for both epics and sagas, it excels in handling asynchronous operations while offering the flexibility and power of [Streamix](https://www.npmjs.com/package/@actioncrew/streamix) and generator functions. Whether you're working on a small project or a large-scale application, ActionStack can help you manage state efficiently and reliably.

If you're interested, join our discussions on [GitHub](https://github.com/actioncrew/actionstack/discussions)!
 
Have fun and happy coding!
