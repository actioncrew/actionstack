# ActionStack Angular: A Centralized State Management Solution for Angular

ActionStack Angular is an Angular wrapper for the ActionStack state management library. It integrates ActionStack’s powerful state management features seamlessly into Angular applications, offering a modular and flexible way to handle global application state. With ActionStack Angular, developers can easily manage state through a centralized store, dispatch actions, and organize state into slices for better modularity and maintainability.

## Key Features
- Centralized State Management: Use a single store instance across the entire application to manage global state.
- Modular State Slices: Define and manage specific parts of the application state (slices) for better organization and scalability.
- Action Dispatching: Dispatch actions to modify the application state, making state updates predictable and traceable.
- State Selection: Select portions of the state as observables, allowing reactive updates to components.
- Feature Modules Support: Dynamically load and unload feature modules, encapsulating state management for specific parts of the application.
- Configurable Store: Customize store settings, including reducers, strategies, and enhancements, to meet specific application requirements.

## Core Components
- StoreModule: The core module that configures and provides access to the store. It offers methods for setting up the store at the root level (forRoot()) and within feature modules (forFeature()).
- Store: The central store class for dispatching actions, selecting state, and managing modules. It supports state reading, dispatching system actions, and using async reducers.
- Slice: A class for managing a specific slice of state within the store. It provides methods for configuring the slice, dispatching actions, and selecting state.

## Usage
### StoreModule:
Registers the store at the root level or for feature modules.

    import { StoreModule } from '@actionstack/angular';

    @NgModule({
      imports: [
        ...,
        StoreModule.forRoot({
          reducer: (state: any = {}) => state,
          dependencies: {},
          strategy: "concurrent"
        }),
        MessagesModule
      ],
      declarations: [
        AppComponent
      ],
      bootstrap: [AppComponent],
    })
    export class AppModule {}

or instead of use StoreModule use helper functions:

    provideStore({
      reducer: (state: any = {}, action: Action<any>) => state,
      dependencies: {},
      strategy: "exclusive"
    })

for feature module:
    
    provideModule({
      slice: slice,
      reducer: reducer,
      dependencies: { heroService: new HeroService() }
    })

### Slice:
Defines slices of state for specific parts of the application, allowing for modular state management.

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
        this.slice.setup({
          slice: slice,
          reducer: reducer,
          dependencies: { heroService: new HeroService() },
          strategy: "persistent"
        });

        this.slice.dispatch(loadHeroes());
      }

      ngOnDestroy(): void {
      }
    }

### Store: 
Acts as the single source of truth for application state, providing a unified place to manage, update, and access state across the entire application.
    
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

      goBack(): void {
        this.location.back();
      }

      ngOnDestroy() {
        if(this.subscription) {
          this.subscription.unsubscribe();
        }
      }
    }


## Benefits
- Seamless Integration: ActionStack Angular leverages Angular's dependency injection and module system for easy setup and configuration.
- Scalable State Management: With modular slices and dynamic feature modules, applications can grow without losing manageability.
- Customizable Store: Developers can fine-tune the store’s behavior to meet the specific needs of their application, using settings, reducers, and store enhancers.

## Conclusion
ActionStack Angular provides a robust, flexible, and scalable solution for managing application state in Angular applications. By integrating seamlessly with Angular’s features and offering powerful state management capabilities, it helps developers build maintainable and high-performing applications.
