import { Action, action, featureSelector, selector } from '@actioncrew/actionstack';
import { firstValueFrom } from 'rxjs';

import { Hero } from '../hero';
import { addMessage } from '../messages/messages.slice';

export const slice = "hero-details";

export const loadHeroRequest = action('LOAD_HERO_REQUEST');
export const loadHeroSuccess = action('LOAD_HERO_SUCCESS', (hero: Hero) => ({ hero }));
export const loadHeroFailure = action('LOAD_HERO_FAILURE', (error: Error) => ({ error }));

export const loadHero = action((id: number) => async (dispatch: Function, getState: Function, dependencies: any) => {
  dispatch(loadHeroRequest(id));
  try {
    const heroService = dependencies.heroService;
    const hero = await firstValueFrom(heroService.getHero(id));
    dispatch(addMessage(`HeroService: fetched hero id=${id}`));
    dispatch(loadHeroSuccess(hero));
  } catch (error) {
    dispatch(loadHeroFailure(error));
  }
});

const initialState = { hero: undefined, loading: false, error: null };

export const reducer = (state = initialState, action: Action<any>) => {
  switch (action.type) {
    case loadHeroRequest.type:
      return { ...state, loading: true };
    case loadHeroSuccess.type:
      return { ...state, loading: false, hero: action.payload.hero };
    case loadHeroFailure.type:
      return { ...state, loading: false, error: action.payload.error };
    default:
      return state;
  }
};

export const feature = featureSelector(slice);
export const heroSelector = selector(feature, (state) => state.hero);
