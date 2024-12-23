# ActionStack Angular: A Centralized State Management Solution for Angular

ActionStack Angular is an Angular wrapper for the ActionStack state management library. It integrates ActionStack’s powerful state management features seamlessly into Angular applications, offering a modular and flexible way to handle global application state. With ActionStack Angular, developers can easily manage state through a centralized store, dispatch actions, and organize state into slices for better modularity and maintainability.

> **Important:** The `@actionstack/store` package is re-exported by `@actionstack/angular`. It is strongly recommended **not to use `@actionstack/store` directly** in your Angular project. Always use the Angular-specific wrappers and modules provided by `@actionstack/angular` for proper integration and functionality.

## Key Features
- Centralized State: Manage global state with a single store instance.
- Modular Slices: Organize state into slices for better scalability and maintainability.
- Predictable Updates: Dispatch actions to modify state in a traceable manner.
- Reactive State: Select and observe portions of the state for automatic component updates.
- Dynamic Modules: Load and unload feature modules dynamically for encapsulated state management.
- Customizable Store: Tailor reducers, strategies, and enhancements to suit your application needs.

## Core Components
- StoreModule: The core module that configures and provides access to the store. It offers methods for setting up the store at the root level (forRoot()) and within feature modules (forFeature()).
- Store: The central store class for dispatching actions, selecting state, and managing modules. It supports state reading, dispatching system actions, and using async reducers.
- Slice: A class for managing a specific slice of state within the store. It provides methods for configuring the slice, dispatching actions, and selecting state.

## Usage
### StoreModule:
StoreModule registers the store at the root level and for feature modules:

```typescript
    import { EpicStore, storeEnhancer } from '@actionstack/angular/epics';
    import { combineEnhancers } from '@actionstack/angular';
    import { Store, STORE_ENHANCER, STORE_SETTINGS, StoreModule } from '@actionstack/angular';
    import { epics } from '@actionstack/angular/epics';
    import { perfmon } from '@actionstack/tools';
    import { NgModule } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BrowserModule } from '@angular/platform-browser';

    import { AppRoutingModule } from './app-routing.module';
    import { AppComponent } from './app.component';
    import { MessagesModule } from './messages/messages.module';
    import { Action, applyMiddleware } from '@actionstack/angular';
    import { HeroService } from './hero.service';

    @NgModule({
      imports: [
        BrowserModule,
        FormsModule,
        StoreModule.forRoot({
          reducer: rootReducer,
          dependencies: { heroService: HeroService },
        }),
        MessagesModule
      ],
      declarations: [
        AppComponent
      ],
      providers: [
        { provide: STORE_SETTINGS, useValue: { dispatchSystemActions: true,
                                              awaitStatePropagation: false,
                                              enableMetaReducers: false,
                                              enableAsyncReducers: true,
                                              exclusiveActionProcessing: false }
        },
        { provide: EpicStore, useValue: Store },
        { provide: STORE_ENHANCER, useValue: 
            combineEnhancers(storeEnhancer, applyMiddleware(epics, perfmon)) }
      ],
      bootstrap: [AppComponent],
    })
    export class AppModule {}
```

or instead of use StoreModule use helper functions:

```typescript
    provideStore({
      reducer: rootReducer,
      dependencies: rootDependencies,
      metaReducers: [formsMetaReducer]
    })
```

for feature module:

```typescript
    provideModule({
      slice: sliceName,
      reducer: reducer
    })
```

### Slice:
If you prefer a component-oriented store, you can utilize Slices. Slices allow you to group state, actions, and reducers logically by feature or component, making your store structure more modular and easier to maintain.

```typescript
    import { Slice } from '@actionstack/angular';

    @Component({
      selector: 'app-dashboard',
      templateUrl: './dashboard.component.html',
      styleUrls: [ './dashboard.component.css' ],
      standalone: true,
      imports: [CommonModule, RouterModule],
      providers: [Slice]
    })
    export class DashboardComponent implements OnInit {
      heroes$: Observable<Hero[]> = this.slice.select(selectTopHeroes());

      constructor(private slice: Slice) {
      }

      ngOnInit(): void {
        this.slice.init({
          slice: slice,
          reducer: reducer,
          dependencies: { heroService: HeroService },
          strategy: "persistent"
        });

        this.slice.dispatch(loadHeroes());
      }

      ngOnDestroy(): void {
      }
    }
```

### Store: 
Acts as the single source of truth for application state, providing a unified place to manage, update, and access state across the entire application.

```typescript
    import { Component, OnInit } from '@angular/core';
    import { Observable, Subscription, map, tap } from 'rxjs';
    ...
    import { Store } from '@actionstack/angular';

    @Component({
      selector: 'app-hero-details',
      templateUrl: './hero-details.component.html',
      styleUrls: [ './hero-details.component.css' ]
    })
    export class HeroDetailsComponent implements OnInit {
      hero$!: Observable<Hero | undefined>;
      subscription: Subscription | undefined;

      constructor(
        private store: Store,
        private route: ActivatedRoute,
        private location: Location
      ) {}

      ngOnInit(): void {
        this.hero$ = this.store.select(heroSelector());

        this.subscription = this.route.paramMap.pipe(
          map(params => Number(params.get('id'))),
          tap(id => this.store.dispatch(loadHero(id)))
        ).subscribe();
      }
    }
```

## Benefits
- Seamless Integration: ActionStack Angular leverages Angular's dependency injection and module system for easy setup and configuration.
- Scalable State Management: With modular slices and dynamic feature modules, applications can grow without losing manageability.
- Customizable Store: Developers can fine-tune the store’s behavior to meet the specific needs of their application, using settings, reducers, and store enhancers.

## Conclusion
ActionStack Angular provides a robust, flexible, and scalable solution for managing application state in Angular applications. By integrating seamlessly with Angular’s features and offering powerful state management capabilities, it helps developers build maintainable and high-performing applications.

If you're interested, join our discussions on [GitHub](https://github.com/actioncrew/actionstack/discussions)!
 
Have fun and happy coding!
