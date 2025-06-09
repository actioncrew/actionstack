<h1 style="display: none;">ActionStack V3</h1>

<p align="center">
  <img src="https://github.com/actioncrew/actionstack/blob/master/LOGO.png?raw=true" alt="ActionStack Logo" width="800">
</p>

**ActionStack V3** is a minimal yet powerful state management system designed for reactive applications, built on top of [Streamix](https://www.npmjs.com/package/@actioncrew/streamix). It supports modular state slices, synchronous and asynchronous actions (thunks), selectors, data pipelines, and fine-grained control via middleware and execution stack.

[redux-docs /](https://redux.js.org/)
[observable-docs /](https://redux-observable.js.org/)
[saga-docs /](https://redux-saga.js.org/)

[![build status](https://github.com/actioncrew/actionstack/workflows/build/badge.svg)](https://github.com/actioncrew/actionstack/workflows/build/badge.svg)
[![npm version](https://img.shields.io/npm/v/@actioncrew/actionstack.svg?style=flat-square)](https://www.npmjs.com/package/@actioncrew/actionstack)
[![npm downloads](https://img.shields.io/npm/dm/@actioncrew/actionstack.svg?style=flat-square)](https://www.npmjs.com/package/@actioncrew/actionstack)
[![min+zipped](https://img.shields.io/bundlephobia/minzip/%40actioncrew%2Factionstack)](https://img.shields.io/bundlephobia/minzip/%40actioncrew%2Factionstack)
  
## Key Features
- ✅ Modular slice-based store architecture
- 🔁 Built-in support for both sync and async (thunk) actions
- 🔄 Reactive state streams via Streamix
- 🧩 Feature modules with co-located state, logic, and dependencies
- ⚙️ Middleware, locking, and concurrency strategies
- 🧠 Type-safe selectors and action creators

## Installation

```
  npm i @actioncrew/actionstack
```

## Usage

### Creating a Store
To create a store, use the createStore function, which initializes the store with the provided main module and optional settings or enhancers.

```typescript
    import { createStore } from '@actioncrew/actionstack';

    // Optional: Define store settings to customize behavior
    const storeSettings = {
      dispatchSystemActions: false,
      enableGlobalReducers: false,
      awaitStatePropagation: true,
      exclusiveActionProcessing: false
    };

    // Create the store instance
    const store = createStore({
      reducers: [rootReducer],
    }, storeSettings, applyMiddleware(logger, epics));
```

### Reducers Are Optional — State Changes Use Action Handlers
In **V3**, state changes are managed through action handlers defined directly on action creators. When creating an action with createAction, you can optionally provide a handler function that specifies how the state should update when that action is dispatched. These handlers are automatically collected and associated with their respective feature modules when you register the actions, so there is no need for a separate actionHandlers property. This approach keeps state update logic colocated with actions, making your code more modular and easier to maintain.

```typescript
const increment = createAction('increment', (state: number, payload: number) => state + payload);

const counterModule = createModule({
  slice: 'counter',
  initialState: 0,
  actions: { increment }
});
```

### Loading and Unloading Modules
Modules can be loaded or unloaded dynamically. The loadModule and unloadModule methods manage this process, ensuring that the store’s dependencies are correctly updated.

```typescript
    const featureModule = createModule({
      slice: 'superModule',
      initialState: {},
      dependencies: { heroService: new HeroService() }
    });

    // Load a feature module
    featureModule.init(store);

    // Unload a feature module (with optional state clearing)
    featureModule.destroy(true);
```

### Reading State Safely
To read a slice of the state in a safe manner (e.g., avoiding race conditions), use readSafe. This method ensures the state is accessed while locking the pipeline.

```typescript
    store.getState('*', (state) => {
      console.log('State object:', state);
    });
```

### Dispatching Actions
Actions are directly bound to the store’s dispatch method, allowing you to invoke actions as regular functions without manually calling dispatch. This design keeps state update logic close to actions and enables a clean, intuitive API where calling an action immediately dispatches it to update state.

```typescript
    import { Action, action, featureSelector, selector } from '@actioncrew/actionstack';

    export const addMessage = action("ADD_MESSAGE", (message: string) => ({ message }));
    export const clearMessages = action('CLEAR_MESSAGES');
    
    const featureModule = createModule({
      slice: 'superModule',
      actions: {
        addMessage,
        clearMessage
      },
      dependencies: { heroService: new HeroService() }
    });
    ...

    // Dispatching an action to add a message
    featureModule.actions.addMessage("Hello, world!");

    // Dispatching an action to add another message
    featureModule.actions.addMessage("This is a second message!");

    // Dispatching an action to clear all messages
    featureModule.actions.clearMessages();
```

### Subscribing to State Changes
You can also subscribe to changes in the state, so that when messages are added or cleared, you can react to those changes:

```typescript
    import { Action, action, featureSelector, selector } from '@actioncrew/actionstack';
    
    export const selectHeroes = selector(state => state.heroes);
    
    const featureModule = createModule({
      slice: 'superModule',
      selectors: {
        selectHeroes
      },
      dependencies: { heroService: new HeroService() }
    });

    ...
    
    // Subscribe to state changes
    this.subscription = featureModule.data$.selectHeroes().subscribe(value => {
      this.heroes = value;
    });
```
You can combine multiple data streams from different feature modules or selectors as needed to create complex derived state or orchestrate side effects. Thanks to Streamix-powered reactive streams (data$), Actionstack lets you compose, transform, and react to state changes declaratively, enabling powerful and flexible reactive workflows across your application.

# Conclusion
ActionStack makes state management in your applications easier, more predictable, and scalable. With support for both epics and sagas, it excels in handling asynchronous operations while offering the flexibility and power of [Streamix](https://www.npmjs.com/package/@actioncrew/streamix) and generator functions. Whether you're working on a small project or a large-scale application, ActionStack can help you manage state efficiently and reliably.

If you're interested, join our discussions on [GitHub](https://github.com/actioncrew/actionstack/discussions)!
 
Have fun and happy coding!
