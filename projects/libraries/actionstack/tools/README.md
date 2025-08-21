# 🛠️ ActionStack Tools: Your App’s Wingmen

ActionStack’s got your back with its built-in tools—Logger, Performance Monitor, and State Freezer. They’re like your app’s trusty sidekicks, handling debugging, keeping things speedy, and locking down your state so nothing weird sneaks in.

## 🧩 Middleware: The ActionStack Gatekeepers

These tools are all **middleware**, basically the cool bouncers at the club:

    action → starter → middleware chain → store.dispatch → new state

Every **action** has to pass through these guys before hitting the reducers to update your app’s state.

### Why Middleware?

Middleware wraps around your dispatch like a warm hug. Set it up like this:

```ts
import { createStore, applyMiddleware } from '@actioncrew/actionstack';
import { perfmon } from '@actioncrew/actionstack/tools';

export const store = createStore(applyMiddleware(perfmon));
```

Here’s the deal when you dispatch an action:
1. **Logger** jots down what’s going on in the console.
2. **Performance Monitor** clocks how fast everything’s moving.
3. **State Freezer** makes sure nobody’s messing with your state.
4. Then, the action slides into the reducers to do its thing.

These tools can let the action roll through, tweak it, or (super rarely) stop it. Mostly, they’re just watching and keeping things chill.

## ⚡ Meet the Team

### 1. Logger
Your go-to for debugging, like a friend who remembers every detail.

- Spills the beans on state before and after actions (names, types, payloads).
- Spots sneaky bugs or weird changes.
- Lets you pick log vibes—quiet `info` or loud `error`.

### 2. Performance Monitor
The speed nerd who’s all about keeping your app zippy.

- Tracks how long actions and state updates take.
- Calls out anything dragging its feet.
- Hands you the data to make your app run like a dream.

### 3. State Freezer
The no-nonsense guard keeping your state untouchable.

- Stops anyone from tweaking state on the sly.
- Throws warnings if someone tries to mess with it.
- Keeps your app steady and predictable, like your favorite coffee order.

## ⚙️ Getting Started

Grab ActionStack if you haven’t yet:

```bash
npm install @actioncrew/actionstack
```

Then, hook up the tools:

```ts
import { createStore, applyMiddleware } from '@actioncrew/actionstack';
import { logger, storeFreeze } from '@actioncrew/actionstack/tools';

export const store = createStore(applyMiddleware(logger, storeFreeze));
```

## 🎬 Wrap-Up

Logger, Performance Monitor, and State Freezer are your app’s dream team, chilling between actions and `store.dispatch`. They’ve got your back—tracking, timing, and guarding your app so it stays smooth, fast, and drama-free.

*Remember: You won’t lose your mind if you use the right tools in the right place. So, keep calm and let ActionStack save your sanity. 🌟🚀*
