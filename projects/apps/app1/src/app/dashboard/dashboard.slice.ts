import { action, featureSelector, selector } from '@actionstack/store';
import { firstValueFrom } from 'rxjs';

import { Hero } from '../hero';
import { addMessage } from '../messages/messages.slice';

export const slice = "dashboard";

export const loadHeroesRequest = action('LOAD_HEROES_REQUEST');
export const loadHeroesSuccess = action('LOAD_HEROES_SUCCESS', (heroes: Hero[]) => ({ heroes }));
export const loadHeroesFailure = action('LOAD_HEROES_FAILURE', (error: Error) => ({ error }));

export const loadHeroes = action(() => async (dispatch: Function, getState: Function, dependencies: any) => {
  dispatch(loadHeroesRequest());
  try {
    const heroService = dependencies.heroService;
    const heroes = await firstValueFrom(heroService.getHeroes());
    dispatch(loadHeroesSuccess(heroes));
    dispatch(addMessage('HeroService: fetched heroes'));
  } catch (error: any) {
    dispatch(loadHeroesFailure(error));
    throw error;
  }
});

const initialState = { heroes: [], loading: false, error: null };

export function reducer(state = initialState, action: any): any {
  switch (action.type) {
    case loadHeroesRequest.type:
      return { ...state, loading: true };
    case loadHeroesSuccess.type:
      return { ...state, loading: false, heroes: action.payload.heroes };
    case loadHeroesFailure.type:
      return { ...state, loading: false, error: action.payload.error };
    default:
      return state;
  }
}

export const feature = featureSelector(slice);
export const selectTopHeroes = selector(feature, state => state.heroes.slice(1, 5));
