# 🧭 Mastering Starter Middleware in @actioncrew/actionstack

Starter middleware in **@actioncrew/actionstack** is the backbone of your store’s middleware pipeline, orchestrating action processing with a focus on asynchronous workflows and concurrency control.

## 🧩 What It Does

- **Concurrency Control**: Supports exclusive (serial) or concurrent (parallel) action processing to manage side effects and prevent race conditions.
- **Thunk Orchestration**: Executes asynchronous thunks with access to `dispatch`, `getState`, and injected dependencies for complex workflows like API calls.

## 🏗️ Architecture

The starter middleware is automatically included as the first middleware in every @actioncrew/actionstack store. It processes actions through:

- **Module Registration**: Actions and thunks are registered when modules are loaded via `populate()`.
- **Dependency Injection**: Module dependencies are merged and accessible to thunks.
- **Concurrency Management**: Configurable via `exclusiveActionProcessing` for serial or parallel processing.
- **State Isolation**: Ensures proper locking to avoid race conditions.

| Setting                      | Value   | Behavior                                   | Best For                                      |
|------------------------------|---------|--------------------------------------------|-----------------------------------------------|
| **exclusiveActionProcessing** | `false` | Concurrent - actions run in parallel       | Independent operations, UI updates, fetching   |
| **exclusiveActionProcessing** | `true`  | Exclusive - one action at a time           | Sequential workflows, critical updates         |

## ⚙️ Using Thunks

Thunks are the primary way to handle complex async logic. They support dependency injection, state access, nested dispatching, and error handling. Here’s a concise example:

```javascript
import { createStore, applyMiddleware, createModule, action, thunk } from '@actioncrew/actionstack';

// Define a user module
const userModule = createModule({
  slice: 'user',
  initialState: { data: null, loading: false, error: null },
  dependencies: {
    userAPI: {
      authenticate: async (credentials) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { id: 1, name: 'Jane Doe', token: 'abc123' };
      }
    }
  },
  selectors: {
    getUser: () => (state) => state.data,
    isLoading: () => (state) => state.loading
  },
  actions: {
    setLoading: action('setLoading', (state, loading) => ({ ...state, loading })),
    setUser: action('setUser', (state, user) => ({ ...state, loading: false, data: user, error: null })),
    setError: action('setError', (state, error) => ({ ...state, loading: false, error })),
    loginUser: thunk(
      'loginUser',
      (credentials) => async (dispatch, getState, dependencies) => {
        dispatch(userModule.actions.setLoading(true));
        try {
          const user = await dependencies.userAPI.authenticate(credentials);
          dispatch(userModule.actions.setUser(user));
          return user;
        } catch (error) {
          dispatch(userModule.actions.setError(error.message));
          throw error;
        }
      }
    )
  }
});

// Create store
const store = createStore({ exclusiveActionProcessing: false });

// Load module
await store.populate(userModule);

// Subscribe to state changes
userModule.data$.subscribe({
  next: (state) => console.log('User state:', state)
});

// Dispatch thunk
try {
  const user = await store.dispatch(userModule.actions.loginUser({ username: 'jane', password: 'secret123' }));
  console.log('Logged in:', user);
} catch (error) {
  console.error('Login failed:', error);
}
```

### Key Thunk Features

- **Dependency Injection**: Access module dependencies (e.g., `userAPI`) in thunks.
- **State Access**: Use `getState()` to read the current state.
- **Nested Dispatching**: Dispatch other actions or thunks with proper concurrency control.
- **Error Handling**: Catch and handle errors gracefully, as shown in the `loginUser` thunk.

### Thunk Composition

Thunks can be composed to chain operations. For example, a thunk could call `loginUser` and then dispatch another thunk to fetch additional data, ensuring modular and reusable logic.

## 🧠 Why It Matters

Starter middleware enables proactive state management with:

- ✅ **Predictable Concurrency**: Choose serial or parallel processing based on your needs.
- ✅ **Clean Architecture**: Encapsulate logic in thunks and modules for maintainability.
- ✅ **Dependency Management**: Inject external services cleanly.
- ✅ **Error Resilience**: Built-in error handling for robust async operations.
- ✅ **Scalable Design**: Module-based architecture supports growing complexity.

## 🧵 Final Thoughts

Starter middleware in **@actioncrew/actionstack** provides a powerful foundation for state management. By leveraging thunks, dependency injection, and concurrency control, you can build scalable, maintainable applications with predictable async workflows.
