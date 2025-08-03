# ActionStack V3

<p align="center">
  <img src="https://github.com/actioncrew/actionstack/blob/master/LOGO.png?raw=true" alt="ActionStack Logo" width="800">
</p>

<p align="center">
  <strong>Next-generation state management for reactive applications</strong><br>
  Built on <a href="https://www.npmjs.com/package/@actioncrew/streamix">Streamix</a> for ultimate performance and simplicity
</p>

<p align="center">
  <a href="https://github.com/actioncrew/actionstack/workflows/build/badge.svg">
    <img src="https://github.com/actioncrew/actionstack/workflows/build/badge.svg" alt="Build Status">
  </a>
  <a href="https://www.npmjs.com/package/@actioncrew/actionstack">
    <img src="https://img.shields.io/npm/v/@actioncrew/actionstack.svg?style=flat-square" alt="NPM Version">
  </a>
  <a href="https://www.npmjs.com/package/@actioncrew/actionstack">
    <img src="https://img.shields.io/npm/dm/@actioncrew/actionstack.svg?style=flat-square" alt="NPM Downloads">
  </a>
  <a href="https://bundlephobia.com/package/@actioncrew/actionstack">
    <img src="https://img.shields.io/bundlephobia/minzip/%40actioncrew%2Factionstack" alt="Bundle Size">
  </a>
</p>

---

## ✨ Key Features

- **🧩 Modular Architecture** — Feature-based modules with co-located state and logic
- **⚡ Reactive Streams** — Built on Streamix for high-performance reactive updates
- **🔄 Action Handlers** — No reducers needed - sync actions with state logic
- **⚡ Thunk Support** — Built-in async operations via thunks
- **🔒 Safe Concurrency** — Built-in locking and execution control
- **📦 Dynamic Loading** — Load/unload modules at runtime
- **🎯 Type Safety** — Full TypeScript support with intelligent inference
- **🔌 Redux Ecosystem** — Works with existing middlewares from Redux ecosystem

---

## 📦 Installation

```bash
npm install @actioncrew/actionstack
```

---

## 🚀 Quick Start

```typescript
import { createStore, createModule, action, thunk, selector } from '@actioncrew/actionstack';

// Actions with built-in state handlers
const increment = action('increment', 
  (state: number, payload: number = 1) => state + payload
);

const reset = action('reset', () => 0);

// Create module
const counterModule = createModule({
  slice: 'counter',
  initialState: 0,
  actions: { increment, reset },
  selectors: {
    count: selector((state: number) => state),
  }
});

// Initialize
const store = createStore();
counterModule.init(store);

// Use actions directly
counterModule.actions.increment(5);  // Counter: 5
counterModule.actions.reset();       // Counter: 0

// Subscribe to changes
counterModule.data$.count().subscribe(count => {
  console.log('Counter:', count);
});
```

---

## 🎯 Real-World Example

```typescript
interface TodoState {
  todos: Todo[];
  loading: boolean;
}

const addTodo = action('add', 
  (state: TodoState, text: string) => ({
    ...state,
    todos: [...state.todos, { id: Date.now(), text, completed: false }]
  })
);

const setTodos = action('setTodos',
  (state: TodoState, todos: Todo[]) => ({ ...state, todos, loading: false })
);

const setLoading = action('setLoading',
  (state: TodoState, loading: boolean) => ({ ...state, loading })
);

// Thunk using createThunk
const fetchTodos = thunk('fetchTodos', () => 
  (dispatch, getState, dependencies) => {
    dispatch(setLoading(true));
    
    dependencies.todoService.fetchTodos()
      .then(todos => dispatch(setTodos(todos)))
      .catch(error => {
        dispatch(setLoading(false));
        console.error('Failed to fetch todos:', error);
      });
  }
);

// Selectors
const selectActiveTodos = selector(
  (state: TodoState) => state.todos.filter(t => !t.completed)
);

// Module with dependencies
const todoModule = createModule({
  slice: 'todos',
  initialState: { todos: [], loading: false },
  actions: { addTodo, setTodos, setLoading, fetchTodos },
  selectors: { selectActiveTodos },
  dependencies: { todoService: new TodoService() }
});

// Usage
todoModule.init(store);
todoModule.actions.fetchTodos();

// Reactive UI updates
todoModule.data$.selectActiveTodos().subscribe(activeTodos => {
  renderTodos(activeTodos);
});
```

---

## 🔄 Advanced Features

### Static Module Loading
```typescript
let store = createStore(mainModule);
store.populate(authModule, uiModule, settingsModule);
```

### Dynamic Module Loading
```typescript
// Load modules at runtime
const featureModule = createDashboardModule();
featureModule.init(store);

// Unload when no longer needed and clear state
featureModule.destroy(true);
```

### Stream Composition
```typescript
import { combineLatest, map, filter, eachValueFrom } from '@actioncrew/streamix';

// Combine data from multiple modules
const dashboardData$ = combineLatest([
  userModule.data$.selectCurrentUser(),
  todoModule.data$.selectActiveTodos(),
  notificationModule.data$.selectUnread()
]).pipe(
  map(([user, todos, notifications]) => ({
    user,
    todoCount: todos.length,
    hasNotifications: notifications.length > 0
  }))
);

// React to combined state changes
for await (const data of eachValueFrom(dashboardData$)) {
  updateDashboard(data);
}
```

### Store Configuration
```typescript
const store = createStore({
  dispatchSystemActions: true,
  awaitStatePropagation: true,
  enableGlobalReducers: false,
  exclusiveActionProcessing: false
}, applyMiddleware(logger, devtools));
```

---

## 🆚 vs Other Solutions

| Feature | ActionStack V3 | Redux + RTK | Zustand |
|---------|----------------|-------------|---------|
| Bundle Size | Minimal | Large | Small |
| Reactivity | Built-in | Manual | Manual |
| Modules | Native | Manual | Manual |
| Type Safety | Excellent | Good | Good |
| Async Actions | Native | Thunks | Manual |

---

## 📚 Resources

- **[GitHub](https://github.com/actioncrew/actionstack)** - Source code and issues
- **[Discussions](https://github.com/actioncrew/actionstack/discussions)** - Community support
- **[Streamix](https://www.npmjs.com/package/@actioncrew/streamix)** - Reactive foundation

---

<p align="center">
  <strong>Ready for next-gen state management? 🚀</strong><br>
  <a href="https://www.npmjs.com/package/@actioncrew/actionstack">Install from NPM</a> • 
  <a href="https://github.com/actioncrew/actionstack">View on GitHub</a>
</p>
