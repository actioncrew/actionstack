import { action, featureSelector, selector, FeatureModule } from '@actioncrew/actionstack';
import { Hero } from '../hero';
import { addMessage } from '../messages/messages.slice';
import { firstValueFrom } from '@actioncrew/streamix';
import { HeroService } from '../hero.service';

export const slice = "hero-details";

// Typed state interface
export interface HeroDetailsState {
  hero?: Hero;
  loading: boolean;
  error: Error | null;
}

// Initial state
export const initialState: HeroDetailsState = {
  hero: undefined,
  loading: false,
  error: null,
};

// Action handlers (replace reducer)
const actionHandlers = {
  LOAD_HERO_REQUEST: (state: HeroDetailsState) => ({ ...state, loading: true }),
  LOAD_HERO_SUCCESS: (state: HeroDetailsState, { hero }: { hero: Hero }) => ({
    ...state,
    loading: false,
    hero,
  }),
  LOAD_HERO_FAILURE: (state: HeroDetailsState, { error }: { error: Error }) => ({
    ...state,
    loading: false,
    error,
  }),
};

// Actions with integrated handlers
export const loadHeroRequest = action('LOAD_HERO_REQUEST', actionHandlers.LOAD_HERO_REQUEST);
export const loadHeroSuccess = action('LOAD_HERO_SUCCESS', actionHandlers.LOAD_HERO_SUCCESS);
export const loadHeroFailure = action('LOAD_HERO_FAILURE', actionHandlers.LOAD_HERO_FAILURE);

export const loadHero = (id: number) =>
  action(async (dispatch: any, getState: any, { heroService }: any) => {
    dispatch(loadHeroRequest());
    try {
      const hero = await firstValueFrom(heroService.getHero(id));
      dispatch(addMessage(`HeroService: fetched hero id=${id}`));
      dispatch(loadHeroSuccess({ hero }));
    } catch (error) {
      dispatch(loadHeroFailure({ error }));
    }
  });

// Selectors
export const feature = featureSelector<HeroDetailsState>(slice);
export const heroSelector = selector(feature, (state) => state.hero);

export const heroDetailsModule = {
  slice,
  state: initialState,
  actionHandlers,
  actions: { loadHeroRequest, loadHeroSuccess, loadHeroFailure, loadHero },
  selectors: { heroSelector },
  dependencies: { heroService: new HeroService() }
} as FeatureModule;
