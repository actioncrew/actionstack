# ActionStack

A powerful and flexible state management library designed to provide a scalable and maintainable approach for managing application state in modern JavaScript and TypeScript applications. It seamlessly integrates with your project, offering advanced features such as handling asynchronous actions, reducers, and side effects like epics and sagas.

[redux-docs](https://redux.js.org/)
[observable-docs](https://redux-observable.js.org/)
[saga-docs](https://redux-saga.js.org/)
[actionstack-docs](https://actionstack.vercel.app/documentation/)

[![build status](https://github.com/actioncrew/actionstack/workflows/build/badge.svg)](https://github.com/actioncrew/actionstack/workflows/build/badge.svg)  
[![npm version](https://img.shields.io/npm/v/@actionstack/store.svg?style=flat-square)](https://www.npmjs.com/package/@actionstack/store)  
[![npm downloads](https://img.shields.io/npm/dm/@actionstack/store.svg?style=flat-square)](https://www.npmjs.com/package/@actionstack/store)  
[![min+zipped](https://img.shields.io/bundlephobia/minzip/%40actionstack%2Fstore)](https://img.shields.io/bundlephobia/minzip/%40actionstack%2Fstore)
  
## Key Features
- Reactive State Management: ActionStack uses RxJS observables to create a reactive state management system. This allows your components and views to stay in sync with the latest state changes automatically.
- Immutable State Updates: State updates are immutable, ensuring predictable state transitions and easier debugging.
- TypeScript Support: ActionStack offers full TypeScript support, enhancing developer experience with type safety for state, actions, and reducers.
- Framework-Agnostic: ActionStack is framework-agnostic, meaning it can be used with any JavaScript or TypeScript project, not just Angular.
- Dynamic Module Support: Easily manage complex, large-scale applications by supporting multiple store modules that can attach or detach dynamically, optimizing memory usage.
- Built-in Tools: Includes tools like the logger, performance monitor, and state freezer to enhance debugging and improve performance.

## What Sets ActionStack Apart
ActionStack excels in managing asynchronous state. Unlike traditional state management libraries, ActionStack has robust support for handling side effects and asynchronous operations:

- Asynchronous Actions: You can dispatch asynchronous actions that trigger complex workflows such as API calls or delayed updates.
- Asynchronous Reducers: Reducers can handle async processes, ensuring smooth state transitions even when asynchronous actions are involved.
- Asynchronous Meta-Reducers and Selectors: Meta-reducers and selectors can operate asynchronously, allowing state to be fetched or transformed without blocking the main flow.

ActionStack is built for flexibility, letting you structure your state tree however you want while handling complex state management scenarios with ease.

## Extending the Store with Side Effects
ActionStack provides built-in support for side effects, allowing you to extend the store's functionality through epics or sagas. These mechanisms handle asynchronous tasks and interactions in response to dispatched actions.

### Epics
Epics, inspired by Redux-Observable, use RxJS to handle side effects in a reactive way. Epics listen for dispatched actions, apply transformations using RxJS operators, and can dispatch new actions.

### Sagas
Sagas, inspired by Redux-Saga, use generator functions to manage side effects. They provide a powerful way to handle complex workflows, including concurrent tasks and long-running processes.

## Usage

### Creating a Store
To create a store, use the createStore function, which initializes the store with the provided main module and optional settings or enhancers.

    import { createStore } from '@actionstack/store';
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
    const store = export const store = createStore({
      reducer: rootReducer,
      dependencies: {}
    }, storeSettings, applyMiddleware(logger, epics));

### Defining Reducers
Reducers are pure functions responsible for updating the state based on dispatched actions. They take the current state and an action as arguments, and return a new state. You are free to define reducers in any structure that fits your application needs—there is no predefined function for creating reducers.

A basic reducer structure looks like this:

    const myReducer = (state = initialState, action) => {
      switch (action.type) {
        case 'ACTION_TYPE':
          // Reducer logic
          return { ...state, /* new state */ };
        default:
          return state;
      }
    };

> Note: The state parameter in all reducers must have a default value, typically initialized with the reducer's initialState. This ensures that reducers have a valid state to operate on and prevents potential errors.

### Loading and Unloading Modules
Modules can be loaded or unloaded dynamically. The loadModule and unloadModule methods manage this process, ensuring that the store’s dependencies are correctly updated.

    const featureModule = {
      slice: 'superModule',
      reducer: superReducer,
      dependencies: { heroService: new HeroService() }
    };

    // Load a feature module
    store.loadModule(featureModule);

    // Unload a feature module (with optional state clearing)
    store.unloadModule(featureModule, true);

### Reading State Safely
To read a slice of the state in a safe manner (e.g., avoiding race conditions), use readSafe. This method ensures the state is accessed while locking the pipeline.

    store.readSafe('@global', (state) => {
      console.log('Global state:', state);
    });

### Dispatching Actions
You can dispatch actions to add or clear messages in the store. Here's how to do it:

    import { Action, action, featureSelector, selector } from '@actionstack/store';

    export const addMessage = action("ADD_MESSAGE", (message: string) => ({ message }));
    export const clearMessages = action('CLEAR_MESSAGES');
    
    ...

    // Dispatching an action to add a message
    store.dispatch(addMessage("Hello, world!"));

    // Dispatching an action to add another message
    store.dispatch(addMessage("This is a second message!"));

    // Dispatching an action to clear all messages
    store.dispatch(clearMessages());

### Subscribing to State Changes
You can also subscribe to changes in the state, so that when messages are added or cleared, you can react to those changes:

    import { Action, action, featureSelector, selector } from '@actionstack/store';
    
    export const feature = featureSelector(slice);
    export const selectHeroes = selector(feature, state => state.heroes);
    
    ...
    
    // Subscribe to state changes
    this.subscription = store.select(selectHeroes()).subscribe(value => {
      this.heroes = value;
    });

## Tools
ActionStack includes several tools to aid development and debugging:

- Logger: Logs all state changes and actions to the console, making it easier to track how state evolves.
- Performance Monitor: Measures the performance of state changes and actions, helping you identify bottlenecks.
- State Freezer: Prevents accidental mutations of state, ensuring immutability is maintained throughout your application.

# Conclusion
ActionStack makes state management in your applications easier, more predictable, and scalable. With support for both epics and sagas, it excels in handling asynchronous operations while offering the flexibility and power of RxJS and generator functions. Whether you're working on a small project or a large-scale application, ActionStack can help you manage state efficiently and reliably.
