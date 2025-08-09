# Changelog

## 3.0.8

ActionStack V3 replaces epics and sagas with callable thunks — simpler async handlers triggered directly or by actions. This reduces middleware complexity and boilerplate while improving type safety and modular side-effect management.

## 3.0.7

Removed MainModule type — no longer required by createStore. Added addReducer method to support dynamic reducer registration. module.init(store) and store.loadModule(module) are equivalents. Replaced middlewareAPI property with a getter to defer access and ensure correct store context.

## 3.0.6

Introduced populate() method to initialize and register multiple static modules at once.
Useful for bootstrapping app-level modules in a single call. Corrected code samples in README.md

## 3.0.5

The documentation has been expanded with practical examples and usage samples to help developers get started quickly and understand the core concepts more clearly. This release also updates dependencies and changes the compilation target to ES2022 for improved modern JavaScript support.

## 3.0.4

Modules can be registered under nested paths using slice: 'foo/bar'. Actions will apply updates to nested state objects based on their full slice path (e.g., foo/bar/MY_ACTION targets state.foo.bar). All internal state management functions (getState, setProperty, dispatch, loadModule, etc.) now support both string and array paths transparently. Utility function normalizePath(path: string | string[]): string[] added to unify path handling.

## 3.0.1

Redesigned core architecture to eliminate traditional reducer logic. Introduced fully modular "slices" using colocated state + actions (inspired by Zustand, but type-safe). Actions are now defined using the new action() utility that bundles. No more reducers in the usual sense — state updates are handled via registered action handlers. Type inference has been improved across actions, selectors, and middleware.

## 2.2.3

Improved typings for createAction to reflect the overloaded behavior, enabling stronger type safety and better autocompletion in editors.

## 2.2.1

Corrected the initialization logic of the store enhancer to ensure it receives the fully constructed store instance instead of new store creator. This ensures the enhancer accesses the store only after it’s fully initialized, preventing issues with repetitive or premature store initialization and supporting more predictable enhancer behavior.

## 2.2.0

Support for Streamix `v2.0.1`. Actionstack now fully integrates with the updated async iterator–based operators introduced in Streamix 2.0.1, improving compatibility, performance, and debugging clarity.

## 2.1.5

Fixed an issue where the store was being initialized twice and middlewares were receiving a stale dispatch due to premature destructuring of middlewareAPI; corrected the logic to initialize the store only once and ensure that all middlewares receive the final composed dispatch via a shared, lazily-evaluated reference.

## 2.1.1

In version 2.1.1, several improvements were made to enhance functionality and reliability. The `getProperty` and `setProperty` methods in the utils module were added, providing better support for accessing and modifying object properties consistently across different environments. Additionally, updates were made to the configuration files, improving compatibility with various setups and ensuring smoother operation.

## 2.1.0

The new version includes several important improvements and fixes, including updated support for epics operators, changes to selectors and methods like update, as well as adjustments to the project structure with streamix.

## 2.0.9

In version 2.0.9 of Actionstack, we've integrated the streamix project into our codebase, enhancing our state management capabilities with asynchronous actions and reducers. We also updated our documentation to reflect these changes and added a test app for streamix usage.

## 2.0.8

This release introduces several key improvements, including a restructured package organization and enhanced documentation for better integration with Angular applications. The mainModule has been refactored to use helper modules like combineReducers, combineEnhancers, and createStore, improving modularity and maintainability. New features include the addition of type safety through collision-resistant reexporting and improved error handling in sagas. Additionally, there are updates to store initialization logic to make it more robust and compatible with Redux middlewares.

## 2.0.0

The Actionstack v2.0.0 release introduces several significant improvements and new features, enhancing both functionality and maintainability. Key updates include renamed 'lock' to 'simpleLock' to prevent name collisions, added jsdocs for store methods, and corrections in package imports. The documentation was also updated to reflect these changes, ensuring users have access to the latest information. Additionally, functional tests were implemented for actionHandler, tracker, executionStack, and other core components, improving test coverage and reliability. Dependencies were streamlined by removing those from Angular, contributing to a cleaner and more efficient dependency management system.

## v1.3.2

This version includes updates to various component services, fixed compilation errors, resolved type definition omissions, and improved documentation.

## v1.0.27

This version is a minor update that primarily fixes issues related to state management, improving stability and compatibility with modern JavaScript frameworks.

## v1.0.24

This version removed unused system actions to improve performance and maintainability.

## v1.0.23

Fixed a bug that was causing issues with state management, improved logging support for better debugging, and added some new utility functions to enhance functionality.

## v1.0.20

In this release, several improvements and bug fixes were implemented. The `get` function was enhanced with a new optional parameter to specify how far back to look for state updates. Additionally, the `set` function received an improved version that allows setting multiple states at once. An important update includes adding a validation check during the creation of epics, ensuring that all required dependencies are met before execution. Furthermore, the library's documentation was expanded with comprehensive examples and use cases to aid developers in understanding its features better.

## v1.0.12

This release introduces several important bug fixes and minor improvements, enhancing stability and user experience with Actionstack v1.0.12.

## v1.0.11

In v1.0.11, we made several important improvements to enhance functionality and user experience. The removal of deep-diff from logger imports helps reduce unnecessary logging overhead, which can improve performance without affecting the library's ability to track state changes effectively. Additionally, adding a new feature tracker allows users better insight into their application's state management, aiding in debugging and monitoring.

## v1.0.9

This release introduces several improvements to the Actionstack library, including the addition of a new tools entry point and package-lock updates for better integration and compatibility.

## v1.0.7

Various bug fixes and improvements to stabilize the v1.0.x branch, with some new features added for better state management.

## v1.0.5

In this release, several important improvements and bug fixes were implemented to enhance Actionstack's stability and usability. The 'merge' action was added as a new feature, allowing developers to handle merging of different stateful operations seamlessly. Additionally, the documentation was significantly improved with more detailed comments and examples, making it easier for users to understand and utilize the library effectively.

## v1.0.4

This release includes several bug fixes and minor improvements, such as resolving an issue where epics were not correctly handling state during asynchronous operations. Additionally, there were enhancements to logging utilities, specifically adding support for logging multiple metrics at once with improved readability.

## v1.0.2

Corrections were made to fix issues and improve functionality. The version was reverted from 1.0.3 to 1.0.2 as part of a maintenance update.

## v1.0.1

Initial commit to establish the foundation for Actionstack v1.0.1, introducing core state management features and setting up initial functionality.

