# ActionStack Tools

ActionStack comes with a set of built-in tools that help developers with debugging, performance monitoring, and ensuring state immutability in your application. These tools are designed to provide deeper insights into the state and actions of your application, making it easier to track changes, optimize performance, and maintain clean, immutable state.

## Tools Overview

### 1. Logger
The Logger tool tracks all state changes and actions in your application. It provides detailed logs to the console, helping you trace the flow of state and debug any issues more efficiently.

#### Features:
- Logs state before and after actions.
- Displays the action name, type, and payload.
- Helps in identifying side effects and unwanted mutations.
- Supports custom log levels (e.g., info, warn, error).

### 2. Performance Monitor
The Performance Monitor measures the time taken for state changes and actions. It helps you pinpoint any performance bottlenecks by logging the time each action or state change takes to execute.

#### Features:
- Logs performance metrics for each state change or action.
- Measures time taken for state updates.
- Provides an overview of slow actions, aiding in optimization.

### 3. State Freezer
The State Freezer ensures that your application’s state remains immutable. It prevents accidental mutations of the state, helping to maintain a predictable, reliable application.

#### Features:
- Prevents direct state mutations.
- Throws warnings or errors if state is mutated directly.
- Ensures state is updated only through actions, preserving immutability.

## Installation
To use ActionStack tools, install the ActionStack package (if not already installed):

    npm install @actioncrew/actionstack

Then, import the necessary tools in your application:

```typescript
    import { createStore } from '@actioncrew/actionstack';
    import { logger, perfmon, storeFreeze } from '@actioncrew/actionstack/tools';
    export const store = createStore({
      reducer: rootReducer,
      dependencies: {}
    }, applyMiddleware(logger, perfmon, storeFreeze));
```

## Conclusion

These tools are essential for development and debugging in ActionStack, making it easier to manage and monitor state, track performance, and enforce best practices like immutability. Use them to make your application more robust, efficient, and maintainable.
