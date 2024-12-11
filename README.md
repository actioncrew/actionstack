# ActionStack

A powerful and flexible state management library designed to provide a scalable and maintainable approach for managing application state in modern JavaScript and TypeScript applications. It seamlessly integrates with your project, offering advanced features such as handling asynchronous actions, reducers, and side effects like epics and sagas.

[redux-docs](https://redux.js.org/)
[observable-docs](https://redux-observable.js.org/)
[saga-docs](https://redux-saga.js.org/)
[actionstack-docs](https://actionstack.vercel.app/documentation/)

  [![build status](https://github.com/actioncrew/actionstack/workflows/build/badge.svg)](https://github.com/actioncrew/actionstack/workflows/build/badge.svg)
  [![npm version](https://img.shields.io/npm/v/@actioncrew%2Factionstack.svg?style=flat-square)](https://www.npmjs.com/package/@actioncrew%2Factionstack)
  [![npm downloads](https://img.shields.io/npm/dm/@actioncrew%2Factionstack.svg?style=flat-square)](https://www.npmjs.com/package/@actioncrew%2Factionstack)
  [![min+zipped](https://img.shields.io/bundlephobia/minzip/%40actioncrew%2Factionstack)](https://img.shields.io/bundlephobia/minzip/%40actioncrew%2Factionstack)
  
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

## Tools
ActionStack includes several tools to aid development and debugging:

- Logger: Logs all state changes and actions to the console, making it easier to track how state evolves.
- Performance Monitor: Measures the performance of state changes and actions, helping you identify bottlenecks.
- State Freezer: Prevents accidental mutations of state, ensuring immutability is maintained throughout your application.

# Conclusion
ActionStack makes state management in your applications easier, more predictable, and scalable. With support for both epics and sagas, it excels in handling asynchronous operations while offering the flexibility and power of RxJS and generator functions. Whether you're working on a small project or a large-scale application, ActionStack can help you manage state efficiently and reliably.
