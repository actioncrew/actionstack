# 🧭 Mastering Starter Middleware in @actioncrew/actionstack

Starter middleware in **@actioncrew/actionstack** is the backbone of your store’s middleware pipeline, orchestrating action processing with a focus on asynchronous workflows and concurrency control.

## 🧩 What It Does

- **Concurrency Control**: Supports exclusive (serial) or concurrent (parallel) action processing to manage side effects and prevent race conditions.
- **Thunk Orchestration**: Executes asynchronous thunks with access to `getState` and injected dependencies for complex workflows like API calls.
- **Trigger-Based Side Effects**: After processing an action, it checks all registered thunks for matching triggers and executes them if applicable.

## 🏗️ Internal Architecture
Here’s how the starter middleware operates under the hood:

### 🔒 Lock-Based Execution
Every async action is managed by a `SimpleLock` to ensure safety and predictability. In **exclusive** mode, a single lock serializes all actions, while in **concurrent** mode, each async thunk gets its own lock, allowing parallel execution without conflicts.

### 🔁 Recursive Dispatch
Thunks can dispatch other actions — even other thunks. The middleware recursively handles these calls, ensuring each is processed with its own lock and passed through the full middleware pipeline.

### 🎯 Trigger Matching
After a synchronous action is processed, the middleware checks all registered thunks for matching triggers. If a thunk’s triggers array matches the action (by type or predicate), it’s executed immediately.

### 🔒 State Isolation
By using a robust locking mechanism, the middleware guarantees state is isolated during each operation, preventing race conditions and ensuring predictable outcomes.

| Setting                      | Value   | Behavior                                   | Best For                                      |
|------------------------------|---------|--------------------------------------------|-----------------------------------------------|
| **exclusiveActionProcessing** | `false` | Concurrent - actions run in parallel       | Independent operations, UI updates, fetching   |
| **exclusiveActionProcessing** | `true`  | Exclusive - one action at a time           | Sequential workflows, critical updates         |

## 🤝 Thunks vs Callable Thunks

In **@actioncrew/actionstack**, the starter middleware orchestrates asynchronous logic through two distinct types of thunks.

**Thunks** are functions that you directly invoke as a method (e.g., userModule.actions.loginUser()). The middleware intercepts this call and executes the thunk's logic, providing it with getState and dependencies. This is the standard way to handle user-initiated async workflows.

**Callable Thunks**, in contrast, are automatically triggered by the middleware after a regular, synchronous action is processed. They are registered to react to specific action types. When a dispatched action's type matches a thunk's defined trigger, the middleware dispatches the callable thunk, enabling a reactive, event-driven workflow.

### ⚙️ Practical Example

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
      (credentials) => async (getState, dependencies) => {
        userModule.actions.setLoading(true);
        try {
          const user = await dependencies.userAPI.authenticate(credentials);
          userModule.actions.setUser(user);
        } catch (error) {
          userModule.actions.setError(error.message);
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
userModule.data$.getUser().subscribe({
  next: (state) => console.log('User state:', state)
});

// Call thunk method
try {
  await userModule.actions.loginUser({ username: 'jane', password: 'secret123' });
  console.log('Logged in successfully');
} catch (error) {
  console.error('Login failed:', error);
}
```

### Thunk Composition

Thunks can easily orchestrate complex workflows by calling other thunks or actions. This allows you to chain multiple operations, such as calling a `login` thunk and then a `fetchUserProfile` thunk, ensuring your logic is modular and reusable.

### 🧠 Why It Matters

The combination of direct thunks and trigger-based callable thunks enables a clean architecture that can support growing complexity while maintaining clarity and organization. By encapsulating logic and side effects within modules, you can build a more scalable and resilient application.

## 🧵 Final Thoughts

The **starter** middleware is your app’s ultimate hype crew, turning chaotic async actions into a smooth, predictable dance party. With thunks, locks, and triggers, it ensures your state management is as seamless as a perfectly timed playlist. So crank up the code, let the actions flow, and keep building epic apps with **@actioncrew/actionstack**!

*Keep the state groovin’ and the async movin’—your app’s got this! 🌟🚀*
