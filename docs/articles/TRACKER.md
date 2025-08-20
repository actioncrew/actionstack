# 🛰️ Tracking Stream Execution with Tracker and trackable

Reactive systems thrive on observability. But when streams become deeply nested or asynchronous, tracking their execution status can quickly spiral into complexity. That’s where **Tracker** and **trackable** come in — two utilities designed to bring clarity, control, and lifecycle awareness to your reactive workflows.

## 🕵️‍♂️ What Is a Tracker?

A **Tracker** is a lightweight utility for monitoring the execution status of Streamix streams. It maintains a registry of active streams, tracks their lifecycle, and exposes tools for synchronization, cleanup, and status inspection.

## 🔍 Core Capabilities
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

## 🔁 Tracker-Aware State Propagation
Within the store state updates are synchronized with the Tracker's status. This ensures that all reactive side effects, such as selectors and data updates, are executed before the store's state is considered stable and ready for the next action. This prevents race conditions and ensures a predictable data flow.

The store implements this by optionally awaiting the Tracker after an action has been dispatched:

## 😂 A Meme-Worthy Example
Let’s say you’re building an app where users fetch their profile data, and you need to know when it’s done before moving on. Without Tracker, it’s like sending a kid to the store for snacks and hoping they don’t get distracted by a puppy. With Tracker, it’s more like:

```javascript
const tracker = store.tracker; // The hall monitor with a walkie-talkie

const userStream = trackable(userModule.data$.getUser(), tracker); // Slap a GPS on that stream!

userStream.subscribe({
  next: (user) => console.log(`User ${user} arrived with snacks! 😋`),
  error: (err) => console.error(`User got lost in the TikTok void: ${err}`),
  complete: () => console.log('User went home, party’s over 🎉')
});

// Wait for everyone to finish their snacks
await tracker.allExecuted(); // "No one leaves until the chips are gone!"
tracker.reset(); // "Alright, clean up for the next snack run!"
```

This pattern is especially useful in workflows that depend on stream completion before proceeding — such as form submissions, chained actions, or UI transitions.

## 🤓 Why This Duo Saves Your Sanity

- **No Ghost Streams**: Tracker ensures no streams are haunting your app after they’re done.
- **No Race Condition Raves**: Synchronization means your actions don’t step on each other’s toes.
- **Debugging Like a Boss**: Know exactly which stream is slacking or causing trouble.
- **Scales Like a Pro**: Handles everything from a single API call to a full-on stream mosh pit.

## 🧠 Key Benefits

| **Feature**                | **Description**                                                                 |
|----------------------------|---------------------------------------------------------------------------------|
| ✅ Automatic Lifecycle      | No need to manually track or clean up streams                                   |
| ✅ Status Visibility        | Inspect whether a stream is active or completed                                 |
| ✅ Synchronization          | Await all streams before dispatching or updating state                         |
| ✅ Robust Error Handling    | Ensures tracker cleanup even if receiver logic fails                           |
| ✅ Scalable Integration     | Works seamlessly with Streamix, Actionstack, and custom reactive flows          |

## 🚀 Beyond Tracking: Measuring with Perfmon

While Tracker and trackable give you visibility into when streams start, finish, or get cleaned up, sometimes you also need to know how much impact each action has on performance.

That’s where perfmon
 from **@actioncrew/actionstack/tools** comes in.

## 🧭 What is Perfmon?
**perfmon** is a lightweight performance monitor built into Actionstack. It measures execution time, frequency, and impact of every dispatched action, so you can correlate which actions are slow with how streams are behaving.

## 🔗 How it Works with Tracker

- **Tracker** → Observes current action lifecycle (who’s completed, who’s done).

- **Perfmon** → Observes the cost of actions (how long updates and side-effects take).

Together, they give you a full observability story:

Perfmon tells you *Action X took 75ms and triggered 12 selectors*.

Tracker tells you *These 12 streams have now all completed*.

## 🧵 Final Thoughts

The combination of **Tracker** and **trackable** brings structure and observability to reactive systems. Whether you're managing UI state, coordinating async workflows, or building complex stream pipelines, these utilities help ensure that every stream is accounted for — and that your application remains predictable, performant, and easy to debug.

*Track every stream, chase every dream—your app’s ready to shine! 🌟🚀*
