# 🧭 Mastering Starter Middleware in @actioncrew/actionstack

Starter middleware in **@actioncrew/actionstack** is the foundational layer of your store's middleware pipeline. It orchestrates how actions—especially asynchronous ones—are processed, ensuring predictable and controlled action flows throughout your application.

## 🧩 What It Does

Starter middleware manages two essential responsibilities:

- **Concurrency Control**: Implements exclusive (serial) or concurrent (parallel) processing strategies to manage side effects and prevent race conditions across your application.

- **Thunk Orchestration**: Executes asynchronous thunk functions with full access to `dispatch`, `getState`, and injected dependencies, enabling complex async workflows like API calls, multi-step operations, and coordinated state updates.

## 🏗️ Architecture

The starter middleware is automatically integrated as the first middleware in every @actioncrew/actionstack store. The framework uses a module-based architecture where features are self-contained units:

```javascript
import { createStore, applyMiddleware, createModule, action, thunk } from '@actioncrew/actionstack';

// Define a feature module with encapsulated state and logic
const userModule = createModule({
  slice: 'user',
  initialState: {
    data: null,
    loading: false,
    error: null
  },
  
  // Module-scoped dependencies for testability and modularity
  dependencies: {
    userAPI: {
      authenticate: async (credentials) => {
        // Simulate authentication API
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { id: 1, name: 'Jane Doe', token: 'abc123' };
      },
      fetchProfile: async (userId) => {
        // Simulate profile API
        await new Promise(resolve => setTimeout(resolve, 500));
        return { id: userId, preferences: { theme: 'dark' } };
      }
    }
  },
  
  // Define selectors for accessing state
  selectors: {
    getUser: () => (state) => state.data,
    isLoading: () => (state) => state.loading,
    getError: () => (state) => state.error,
  },
  
  actions: {
    // Synchronous actions with built-in state handlers
    setLoading: action('setLoading', (state, loading: boolean) => ({
      ...state,
      loading
    })),
    
    setUser: action('setUser', (state, user: any) => ({
      ...state,
      loading: false,
      data: user,
      error: null
    })),
    
    setError: action('setError', (state, error: string) => ({
      ...state,
      loading: false,
      error
    })),
    
    // Callable thunks for complex async operations
    loginUser: thunk(
      'loginUser',
      (credentials) => async (dispatch, getState, dependencies) => {
        userModule.actions.setLoading(true);
        try {
          const user = await dependencies.userAPI.authenticate(credentials);
          userModule.actions.setUser(user);
          return user;
        } catch (error) {
          userModule.actions.setError(error.message);
          throw error;
        }
      }
    ),
    
    // Multi-step thunk with conditional logic
    loadUserWithProfile: thunk(
      'loadUserWithProfile',
      (userId, includePreferences = false) => async (dispatch, getState, dependencies) => {
        userModule.actions.setLoading(true);
        try {
          // Step 1: Load basic user data
          const user = await dependencies.userAPI.authenticate({ userId });
          userModule.actions.setUser(user);
          
          // Step 2: Conditionally load additional profile data
          if (includePreferences) {
            const profile = await dependencies.userAPI.fetchProfile(userId);
            userModule.actions.setUser({ ...user, ...profile });
          }
        } catch (error) {
          userModule.actions.setError(error.message);
        }
      }
    )
  }
});

// Create store with concurrency configuration
const store = createStore(
  {
    exclusiveActionProcessing: false, // Enable concurrent processing
    enableGlobalReducers: true,
    awaitStatePropagation: true,
    dispatchSystemActions: true
  },
  // Add custom middleware after starter (optional)
  applyMiddleware(
    // loggerMiddleware,
    // analyticsMiddleware,
  )
);

// Load modules and access state through selectors
await store.populate(userModule);

// Subscribe to state changes using module's data$ stream
const userSubscription = userModule.data$.subscribe({
  next: (userState) => {
    console.log('User state updated:', userState);
  }
});

// Or use specific selectors
const userDataStream = store.select(userModule.selectors.getUser());
userDataStream.subscribe({
  next: (userData) => {
    console.log('User data:', userData);
  }
});

// Dispatch callable thunks with parameters
try {
  const user = await store.dispatch(userModule.actions.loginUser({ 
    username: 'jane', 
    password: 'secret123' 
  }));
  
  // Chain additional operations
  await store.dispatch(userModule.actions.loadUserWithProfile(user.id, true));
} catch (error) {
  console.error('Login failed:', error);
}
```

The starter middleware processes actions through a sophisticated pipeline:

- **Module Registration**: When modules are loaded via `populate()`, their action handlers and thunks are automatically registered
- **Dependency Injection**: Module dependencies are merged and made available to all thunks
- **Concurrency Management**: The `exclusiveActionProcessing` setting determines processing strategy
- **State Isolation**: Each action gets proper locking to prevent race conditions

| Setting                      | Value   | Behavior                                        | Best For                                          |
|------------------------------|---------|------------------------------------------------|---------------------------------------------------|
| **exclusiveActionProcessing** | `false` | Concurrent - multiple actions run in parallel | Independent operations, data fetching, UI updates |
| **exclusiveActionProcessing** | `true`  | Exclusive - one action processed at a time    | Sequential workflows, atomic operations, critical updates |

## ⚙️ How Thunks Work

### Callable Thunks in Action

Thunks are the primary mechanism for handling complex async logic in @actioncrew/actionstack. They provide a clean way to encapsulate multi-step operations:

```javascript
const orderModule = createModule({
  slice: 'orders',
  initialState: { items: [], processing: false, total: 0 },
  
  dependencies: {
    paymentAPI: {
      processPayment: async (amount, method) => ({ transactionId: 'tx123' }),
      validateCard: async (cardDetails) => ({ valid: true })
    },
    inventoryAPI: {
      reserveItems: async (items) => ({ reserved: true, id: 'res123' }),
      releaseReservation: async (reservationId) => ({ released: true })
    }
  },
  
  // Define selectors first
  selectors: {
    getItems: () => (state) => state.items,
    isProcessing: () => (state) => state.processing,
    getTotal: () => (state) => state.total,
    getLastOrder: () => (state) => state.lastOrder,
  },
  
  actions: {
    setProcessing: action('setProcessing', (state, processing) => ({
      ...state,
      processing
    })),
    
    setOrderComplete: action('setOrderComplete', (state, order) => ({
      ...state,
      processing: false,
      items: [],
      total: 0,
      lastOrder: order
    })),
    
    // Complex multi-step checkout process
    processCheckout: thunk(
      'processCheckout',
      (items, paymentDetails) => async (dispatch, getState, dependencies) => {
        orderModule.actions.setProcessing(true);
        
        let reservationId = null;
        try {
          // Step 1: Validate payment method
          await dependencies.paymentAPI.validateCard(paymentDetails.card);
          
          // Step 2: Reserve inventory
          const reservation = await dependencies.inventoryAPI.reserveItems(items);
          reservationId = reservation.id;
          
          // Step 3: Process payment
          const payment = await dependencies.paymentAPI.processPayment(
            paymentDetails.amount, 
            paymentDetails.method
          );
          
          // Step 4: Complete order
          const order = {
            id: Date.now(),
            items,
            payment: payment.transactionId,
            total: paymentDetails.amount
          };
          
          orderModule.actions.setOrderComplete(order);
          return order;
          
        } catch (error) {
          // Cleanup on failure
          if (reservationId) {
            await dependencies.inventoryAPI.releaseReservation(reservationId);
          }
          orderModule.actions.setProcessing(false);
          throw error;
        }
      }
    ),
    
    // Simpler single-operation thunk
    cancelOrder: thunk(
      'cancelOrder',
      (orderId) => async (dispatch, getState, dependencies) => {
        orderModule.actions.setProcessing(true);
        try {
          await dependencies.orderAPI.cancel(orderId);
          orderModule.actions.setOrderComplete(null);
        } catch (error) {
          orderModule.actions.setProcessing(false);
          throw error;
        }
      }
    )
  }
});

// Access state through module's data$ stream and selectors
await store.populate(orderModule);

// Subscribe to the module's data stream
const orderSubscription = orderModule.data$.subscribe({
  next: (orderState) => {
    console.log('Order state updated:', orderState);
  }
});

// Use selectors with the store's select method
const processingStream = store.select(orderModule.selectors.isProcessing());
processingStream.subscribe({
  next: (isProcessing) => {
    console.log('Processing status:', isProcessing);
  }
});
```

### Key Features of Thunk Execution

The starter middleware provides several guarantees when executing thunks:

- **Dependency Injection**: All module dependencies are automatically available in the thunk context
- **State Access**: `getState()` provides read access to the current application state
- **Nested Dispatching**: Thunks can dispatch other actions and thunks with proper concurrency control
- **Error Handling**: Failed thunks can be caught and handled gracefully
- **Return Values**: Thunks can return values, enabling composition and chaining

## 🧠 Why It Matters

Starter middleware transforms state management from reactive to proactive:

- ✅ **Predictable Concurrency**: Choose between parallel and sequential processing based on your application's needs
- ✅ **Clean Architecture**: Encapsulate complex logic in thunks while keeping action handlers pure and focused
- ✅ **Dependency Management**: Inject and manage external services cleanly through the module system
- ✅ **Error Resilience**: Built-in error handling and cleanup mechanisms for robust async operations
- ✅ **Testable Logic**: Isolated dependencies and pure functions make testing straightforward
- ✅ **Scalable Design**: Module-based architecture grows naturally with application complexity

## 🧪 Advanced Patterns

### Thunk Composition and Chaining

```javascript
// Composable thunks that build on each other
const authModule = createModule({
  slice: 'auth',
  
  selectors: {
    getUser: () => (state) => state.user,
    isAuthenticated: () => (state) => !!state.user,
  },
  
  actions: {
    setUser: action('setUser', (state, user) => ({
      ...state,
      user
    })),
    
    authenticate: thunk(
      'authenticate',
      (credentials) => async (dispatch, getState, dependencies) => {
        const user = await dependencies.authAPI.login(credentials);
        authModule.actions.setUser(user);
        return user;
      }
    ),
    
    initializeUserSession: thunk(
      'initializeUserSession',
      (credentials) => async (dispatch, getState, dependencies) => {
        // Chain multiple operations
        const user = authModule.actions.authenticate(credentials);
        profileModule.actions.loadProfile(user.id);
        preferencesModule.actions.loadPreferences(user.id);
        
        return { user, sessionInitialized: true };
      }
    )
  }
});

// Access state through module's data$ stream
authModule.data$.subscribe({
  next: (authState) => {
    console.log('Auth state:', authState);
  }
});

// Use selectors for specific data
const userStream = store.select(authModule.selectors.getUser());
userStream.subscribe({
  next: (user) => {
    console.log('Current user:', user);
  }
});
```

### Dynamic Concurrency Control

```javascript
// Conditionally switch between exclusive and concurrent processing
const criticalOperationThunk = thunk(
  'criticalOperation',
  (data, isUrgent = false) => async (dispatch, getState, dependencies) => {
    // For urgent operations, process exclusively to ensure immediate handling
    if (isUrgent) {
      // Implementation would coordinate with store settings
      // This is conceptual - actual implementation depends on store configuration
    }
    
    // Process the operation
    await dependencies.criticalAPI.process(data);
  }
);
```

### Error Recovery Patterns

```javascript
// Thunk with sophisticated error handling and retry logic
const dataModule = createModule({
  slice: 'data',
  
  selectors: {
    getData: () => (state) => state.data,
    getError: () => (state) => state.error,
    getRetryCount: () => (state) => state.retryCount,
  },
  
  actions: {
    setData: action('setData', (state, data) => ({
      ...state,
      data,
      error: null
    })),
    
    setError: action('setError', (state, error) => ({
      ...state,
      error
    })),
    
    incrementRetry: action('incrementRetry', (state) => ({
      ...state,
      retryCount: (state.retryCount || 0) + 1
    })),
    
    resilientDataFetch: thunk(
      'resilientDataFetch',
      (dataId, maxRetries = 3) => async (dispatch, getState, dependencies) => {
        let attempt = 0;
        
        while (attempt < maxRetries) {
          try {
            const data = await dependencies.dataAPI.fetch(dataId);
            dataModule.actions.setData(data);
            return data;
          } catch (error) {
            attempt++;
            dataModule.actions.incrementRetry();
            
            if (attempt >= maxRetries) {
              dataModule.actions.setError(`Failed after ${maxRetries} attempts`);
              throw error;
            }
            
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    )
  }
});

// Monitor retry attempts through module's data$ stream
dataModule.data$.subscribe((dataState) => {
  if (dataState.retryCount > 0) {
    console.log(`Retry attempt: ${dataState.retryCount}`);
  }
});
```

## 🧵 Final Thoughts

Starter middleware in **@actioncrew/actionstack** provides a sophisticated foundation for modern state management. By focusing on callable thunks and modular architecture, it enables developers to build applications that are both powerful and maintainable. The combination of dependency injection, concurrency control, and clean async patterns creates a development experience that scales from simple applications to complex enterprise systems.

Master the art of thunk composition, leverage the module system's encapsulation benefits, and use concurrency settings strategically to build applications that are both performant and predictable.
