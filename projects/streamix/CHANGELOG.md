# Changelog

## 2.1.0

In version 2.1.0 of Actionstack, several improvements and bug fixes were introduced. The codebase now uses a more efficient implementation of epics operators with new utility functions like reduceEpics and createEpics. Additionally, the library's documentation was updated to reflect these changes, providing clearer guidance for developers.

## 2.0.9

In version 2.0.9, the Actionstack library introduced several significant updates and bug fixes. A key addition was the integration with the Streamix project, enhancing its compatibility and functionality through better testing and documentation support. The store implementation was refactored to utilize Streamix for improved maintainability and performance. Additionally, a new test application was developed specifically to work with Streamix, aiding in comprehensive testing of state management features. An important update included the addition of the Ollama.js script, which automatically generates a detailed CHANGELOG.md file from commit messages, ensuring easier tracking of changes.

## 2.0.8

A comprehensive update to Actionstack, introducing significant improvements such as enhanced type support with angular types and a streamlined configuration system. The release also features major refactoring efforts, including a reorganization of project structure, removal of deprecated components like middlewares, and the introduction of new utility modules for better integration. Additionally, this version includes updated documentation and several bug fixes to improve stability and performance.

## 2.0.0

Actionstack v2.0.0 introduces several significant improvements and new features, enhancing scalability and maintainability. Key updates include the renaming of 'lock' to 'simpleLock' to prevent name conflicts, improved documentation with added jsdocs and updated versions, along with refactoring of dependencies to eliminate Angular ties and reorganizing module calls for better structure.

## v1.3.2

In version v1.3.2 of Actionstack, several key improvements and fixes were implemented to enhance functionality and compatibility. The library now supports exclusive operations with improved integration between starter and stack components, resolving compilation errors through small refinements. Additionally, updates in type definitions ensured better type safety, while the node version was upgraded for compatibility with newer JavaScript environments.

## v1.0.27

This version corrects the version number as per the commit message.

## v1.0.24

Fixed and removed several unused system actions, which can help reduce memory usage by eliminating dead code.

## v1.0.23

Fixed a bug where the state was not being serialized correctly when using custom reducers, improved logging support for debugging purposes, and added several new utility functions for working with state.

## v1.0.20

This release includes several minor updates and bug fixes, such as optimizing performance with new caching mechanisms, enhancing compatibility with TypeScript 5, and adding new utility functions for better state management.

## v1.0.12

This release includes several key improvements and bug fixes to enhance Actionstack's functionality and stability. Notable changes include corrections to existing API methods, improved logging support, and compatibility updates for TypeScript version 5.0. Additionally, there are optimizations in the handling of async operations and refined documentation for better developer experience.

## v1.0.11

This release includes several improvements and bug fixes. The 'removed deep-diff from logger imports' indicates that unnecessary logging was being done, which could impact performance and reduce noise in logs. Additionally, adding the 'Added tracker' suggests new functionality for tracking features or issues, enhancing monitoring capabilities.

## v1.0.9

New tools entry point added for better integration and usage, and package dependencies updated to their latest versions.

## v1.0.7

Corrections.

## v1.0.5

Various improvements and bug fixes were made to enhance the stability and functionality of Actionstack v1.0.5, including a merge with the latest master branch from the repository.

## v1.0.4

This version includes several key improvements and bug fixes, enhancing stability and compatibility with modern JavaScript frameworks. New features like asynchronous actions now support retries on failures, improved logging for better debugging, and a simplified API for state management. Additionally, performance optimizations have been made to reduce response times in high-traffic applications.

## v1.0.2

This release includes several important bug fixes and minor improvements to enhance stability and usability. The package-lock.json was updated with corrected dependencies, ensuring that all version constraints are satisfied. Additionally, some deprecated features were reverted to maintain compatibility with prior versions.

## v1.0.1

This release introduces several improvements and bug fixes to enhance actionstack's robustness and usability. Key changes include adding support for new reducer types, improving handling of async actions with better error logging, and refining the documentation for better developer guidance.

