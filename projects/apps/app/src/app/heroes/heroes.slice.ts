import { Action, action, featureSelector, selector } from '@actionstack/angular';
import { ofType } from '@actionstack/epics';
import { concatMap, take, withLatestFrom } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';

import { Hero } from '../hero';
import { addMessage } from '../messages/messages.slice';

export const slice = "heroes";

export const getHeroesRequest = action("GET_HEROES_REQUEST", (heroes: Hero[]) => ({ heroes }));
export const getHeroesSuccess = action("GET_HEROES_SUCCESS", (heroes: Hero[]) => ({ heroes }));

export const loadHeroes = (action$: Observable<Action<any>>, state$: Observable<any>, { heroService }: any): Observable<Action<any>> => {
  return action$.pipe(
    ofType(getHeroesRequest.type),
    withLatestFrom(state$!),
    concatMap(([action, state]) =>
      heroService.getHeroes().pipe(
        concatMap((heroes: Hero[]) => [
          getHeroesSuccess(heroes),
          addMessage('HeroService: fetched heroes')  // Dispatch addMessage action
        ])
      ) as Observable<Action<any>>
    ),
    take(2)
  );
};

const initialState = {
  heroes: [],
};

// Define the reducer
export function reducer(state = initialState, action: Action<any>) {
  switch (action.type) {
    case getHeroesRequest.type:
    case getHeroesSuccess.type:
      return {
        ...state,
        heroes: action.payload.heroes
      };
    default:
      return state;
  }
}

export const feature = featureSelector(slice);
export const selectHeroes = selector(feature, state => state.heroes);
