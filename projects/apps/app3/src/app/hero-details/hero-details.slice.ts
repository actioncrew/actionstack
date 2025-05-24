import { messagesModule } from './../messages/messages.slice';
import { createModule, thunk } from '@actioncrew/actionstack';
import { action, featureSelector, selector, FeatureModule } from '@actioncrew/actionstack';
import { Hero } from '../hero';
import { addMessage } from '../messages/messages.slice';
import { firstValueFrom } from '@actioncrew/streamix';
import { HeroService } from '../hero.service';

export const slice = "heroDetails";

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

export const loadHeroRequest = action(
  'LOAD_HERO_REQUEST',
  (state: HeroDetailsState) => ({
    ...state,
    loading: true
  })
);

export const loadHeroSuccess = action(
  'LOAD_HERO_SUCCESS',
  (state: HeroDetailsState, { hero }: { hero: Hero }) => ({
    ...state,
    loading: false,
    hero
  })
);

export const loadHeroFailure = action(
  'LOAD_HERO_FAILURE',
  (state: HeroDetailsState, { error }: { error: Error }) => ({
    ...state,
    loading: false,
    error
  })
);

export const loadHero = thunk("LOAD_HEROES", (id: number) => async (dispatch: any, getState: any, { heroService }: any) => {
    dispatch(heroDetailsModule.actions.loadHeroRequest());
    try {
      const hero = await firstValueFrom(heroService.getHero(id));
      dispatch(messagesModule.actions.addMessage(`HeroService: fetched hero id=${id}`));
      dispatch(heroDetailsModule.actions.loadHeroSuccess({ hero }));
    } catch (error) {
      dispatch(heroDetailsModule.actions.loadHeroFailure({ error }));
    }
  });

// Selectors
export const feature = featureSelector<HeroDetailsState>(slice);
export const heroSelector = selector(feature, (state) => state.hero);

export const heroDetailsModule = createModule({
  slice,
  initialState,
  actions: { loadHeroRequest, loadHeroSuccess, loadHeroFailure },
  selectors: { heroSelector },
  dependencies: { heroService: new HeroService() }
});
