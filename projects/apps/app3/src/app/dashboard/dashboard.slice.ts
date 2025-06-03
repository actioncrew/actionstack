import { messagesModule } from './../messages/messages.slice';
import { action, featureSelector, selector, FeatureModule, createModule, thunk } from '@actioncrew/actionstack';
import { Hero } from '../hero';
import { addMessage } from '../messages/messages.slice';
import { firstValueFrom } from '@actioncrew/streamix';
import { HeroService } from '../hero.service';

export const slice = "dashboard";

// Typed state interface
export interface DashboardState {
  heroes: Hero[];
  loading: boolean;
  error: Error | null;
}

export const initialState: DashboardState = {
  heroes: [],
  loading: false,
  error: null
};

// Action creators with integrated handlers
export const loadHeroesRequest = action(
  'LOAD_HEROES_REQUEST',
  (state: DashboardState) => ({
    ...state,
    loading: true
  })
);

export const loadHeroesSuccess = action(
  'LOAD_HEROES_SUCCESS',
  (state: DashboardState, { heroes }: { heroes: Hero[] }) => ({
    ...state,
    loading: false,
    heroes
  })
);

export const loadHeroesFailure = action(
  'LOAD_HEROES_FAILURE',
  (state: DashboardState, { error }: { error: Error }) => ({
    ...state,
    loading: false,
    error
  })
);

// Thunk remains similar but with better typing
export const loadHeroes = thunk(
  "LOAD_HEROES", () => async (dispatch: any, getState: any, { heroService }: any) => {
    dashboardModule.actions.loadHeroesRequest();
    try {
      const heroes = await firstValueFrom(heroService.getHeroes());
      dashboardModule.actions.loadHeroesSuccess({ heroes });
      messagesModule.actions.addMessage('HeroService: fetched heroes');
    } catch (error) {
      dashboardModule.actions.loadHeroesFailure({ error });
      throw error;
    }
  }
);

// Selectors remain the same
export const selectTopHeroes = selector(state => state.heroes.slice(1, 5));

// Export for registration
export const dashboardModule = createModule({
  slice,
  initialState,
  actions: {
    loadHeroesRequest,
    loadHeroesSuccess,
    loadHeroesFailure,
    loadHeroes
  },
  selectors: {
    selectTopHeroes
  },
  dependencies: {
    heroService: new HeroService()
  }
});
