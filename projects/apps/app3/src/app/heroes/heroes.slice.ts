import { Action, action, featureSelector, selector } from '@actioncrew/actionstack';
import { ofType } from '@actioncrew/actionstack/epics';

import { Hero } from '../hero';
import { addMessage } from '../messages/messages.slice';
import { concatMap, from, Stream, take, withLatestFrom } from '@actioncrew/streamix';

export const slice = "heroes";

export const getHeroesRequest = action("GET_HEROES_REQUEST", (heroes: Hero[]) => ({ heroes }));
export const getHeroesSuccess = action("GET_HEROES_SUCCESS", (heroes: Hero[]) => ({ heroes }));

export const loadHeroes = (action$: Stream<Action<any>>, state$: Stream<any>, { heroService }: any): Stream<Action<any>> => {
  return action$.pipe(
    ofType(getHeroesRequest.type),
    withLatestFrom(state$!),
    concatMap<Array<any>, Action<any>>(([action, state]) =>
      heroService.getHeroes().pipe(
        concatMap((heroes) => from([
          getHeroesSuccess(heroes as Hero[]),
          addMessage('HeroService: fetched heroes')  // Dispatch addMessage action
        ]))
      ) as Stream<Action<any>>
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
