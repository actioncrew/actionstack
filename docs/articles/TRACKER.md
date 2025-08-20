# 🛰️ Tracking Stream Execution with Tracker and trackable

Reactive systems thrive on observability. But when streams become deeply nested or asynchronous, tracking their execution status can quickly spiral into complexity. That’s where **Tracker** and **trackable** come in — two utilities designed to bring clarity, control, and lifecycle awareness to your reactive workflows.

## 🎯 What Is a Tracker?

A **Tracker** is a lightweight utility for monitoring the execution status of Streamix streams. It maintains a registry of active streams, tracks their lifecycle, and exposes tools for synchronization, cleanup, and status inspection.

🔍 Core Capabilities
- **Track Execution**: Registers streams as they begin execution.
- **Set Status**: Marks streams as executed once all selectors have run and data updates for a dispatched action are complete.
- **Complete & Remove**: Cleans up streams from the registry when they finish or are unsubscribed.
- **Reset**: Clears the execution status of all entries without removing them, preparing for the next action.
- **Synchronize**: Awaits the completion of all tracked streams via `allExecuted()`, guaranteeing that all state propagation and derived data updates are finished.

## 🧩 Why Tracking Matters

In reactive applications, streams often represent side effects: API calls, animations, user interactions, or state transitions. Without tracking, it’s difficult to answer questions like:

- “Has everything finished executing?”
- “Are there any lingering subscriptions?”
- “Can I safely dispatch the next action?”

By integrating a **Tracker**, you gain:

- ✅ Execution visibility
- ✅ Lifecycle synchronization
- ✅ Automatic cleanup
- ✅ Safer state propagation

## 🧪 Making Streams Trackable

The `trackable()` function wraps a Streamix stream and automatically registers it with a **Tracker**. It overrides the `.subscribe()` method to inject lifecycle hooks:

```javascript
const trackedStream = trackable(originalStream, tracker);
```

### 🛠️ What It Does

- **On subscription**: Registers the stream via `tracker.track()`.
- **On emission**: Marks the stream as executed via `tracker.setStatus()`.
- **On error or completion**: Cleans up via `tracker.complete()`.

This ensures that every stream’s lifecycle is fully observable — without manual intervention.

You're right to point out that this is not fully correct. The logic is accurate, but its description is misleading. That code isn't typically part of a user's direct dispatch() call; it's an internal part of the starter middleware's design.

Here is the corrected section that accurately reflects the middleware's role.

## 🔁 Tracker-Aware State Propagation
Within the store state updates are synchronized with the Tracker's status. This ensures that all reactive side effects, such as selectors and data updates, are executed before the store's state is considered stable and ready for the next action. This prevents race conditions and ensures a predictable data flow.

The store implements this by optionally awaiting the Tracker after an action has been dispatched:

## 📦 Practical Example

Here’s how you might use **Tracker** and **trackable** in a real-world scenario:

```javascript
const tracker = store.tracker;

const userStream = trackable(userModule.data$.getUser(), tracker);

userStream.subscribe({
  next: (user) => console.log('User:', user),
  error: (err) => console.error('Stream error:', err),
  complete: () => console.log('Stream completed')
});

// Later in store.dispatch logic
await tracker.allExecuted(); // Wait for all streams to finish
tracker.reset();             // Clear statuses
```

This pattern is especially useful in workflows that depend on stream completion before proceeding — such as form submissions, chained actions, or UI transitions.

## 🧠 Key Benefits

| **Feature**                | **Description**                                                                 |
|----------------------------|---------------------------------------------------------------------------------|
| ✅ Automatic Lifecycle      | No need to manually track or clean up streams                                   |
| ✅ Status Visibility        | Inspect whether a stream is active or completed                                 |
| ✅ Synchronization          | Await all streams before dispatching or updating state                         |
| ✅ Robust Error Handling    | Ensures tracker cleanup even if receiver logic fails                           |
| ✅ Scalable Integration     | Works seamlessly with Streamix, Actionstack, and custom reactive flows          |

## 🧵 Final Thoughts

The combination of **Tracker** and **trackable** brings structure and observability to reactive systems. Whether you're managing UI state, coordinating async workflows, or building complex stream pipelines, these utilities help ensure that every stream is accounted for — and that your application remains predictable, performant, and easy to debug.
