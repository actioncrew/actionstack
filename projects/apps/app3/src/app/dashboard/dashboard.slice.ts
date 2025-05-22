import { action, featureSelector, selector, thunk } from '@actioncrew/actionstack';
import { Hero } from '../hero';
import { addMessage } from '../messages/messages.slice';
import { firstValueFrom } from '@actioncrew/streamix';

export const slice = "dashboard";

// Action handlers (replaces reducer)
const actionHandlers = {
  LOAD_HEROES_REQUEST: (state: DashboardState) => ({
    ...state,
    loading: true
  }),
  LOAD_HEROES_SUCCESS: (state: DashboardState, { heroes }: { heroes: Hero[] }) => ({
    ...state,
    loading: false,
    heroes
  }),
  LOAD_HEROES_FAILURE: (state: DashboardState, { error }: { error: Error }) => ({
    ...state,
    loading: false,
    error
  })
};

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
  actionHandlers.LOAD_HEROES_REQUEST
);

export const loadHeroesSuccess = action(
  'LOAD_HEROES_SUCCESS',
  actionHandlers.LOAD_HEROES_SUCCESS
);

export const loadHeroesFailure = action(
  'LOAD_HEROES_FAILURE',
  actionHandlers.LOAD_HEROES_FAILURE
);

// Thunk remains similar but with better typing
export const loadHeroes = () => thunk(
  'LOAD_HEROES',
  async (dispatch, getState, { heroService }) => {
    dispatch(loadHeroesRequest());
    try {
      const heroes = await firstValueFrom(heroService.getHeroes());
      dispatch(loadHeroesSuccess({ heroes }));
      dispatch(addMessage('HeroService: fetched heroes'));
    } catch (error) {
      dispatch(loadHeroesFailure({ error }));
      throw error;
    }
  }
);

// Selectors remain the same
export const feature = featureSelector<DashboardState>(slice);
export const selectTopHeroes = selector(
  feature,
  state => state.heroes.slice(1, 5)
);

// Export for registration
export const dashboardModule = {
  name: slice,
  initialState,
  actionHandlers,
  actions: {
    loadHeroesRequest,
    loadHeroesSuccess,
    loadHeroesFailure,
    loadHeroes
  },
  selectors: {
    selectTopHeroes
  }
};
