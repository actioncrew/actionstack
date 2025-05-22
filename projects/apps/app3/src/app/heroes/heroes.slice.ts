import { action, featureSelector, selector } from '@actioncrew/actionstack';
import { ofType } from '@actioncrew/actionstack/epics';
import { concatMap, firstValueFrom, from, Stream, take, withLatestFrom } from '@actioncrew/streamix';

import { Hero } from '../hero';
import { addMessage } from '../messages/messages.slice';
import { Action } from '@actionstack/store';

// --- Slice name
export const slice = "heroes";

// --- Typed state
export interface HeroesState {
  heroes: Hero[];
}

// --- Initial state
export const initialState: HeroesState = {
  heroes: [],
};

// --- Action handlers
const actionHandlers = {
  GET_HEROES_REQUEST: (state: HeroesState, { heroes }: { heroes: Hero[] }) => ({
    ...state,
    heroes
  }),
  GET_HEROES_SUCCESS: (state: HeroesState, { heroes }: { heroes: Hero[] }) => ({
    ...state,
    heroes
  }),
};

// --- Action creators
export const getHeroesRequest = action("GET_HEROES_REQUEST", actionHandlers.GET_HEROES_REQUEST);
export const getHeroesSuccess = action("GET_HEROES_SUCCESS", actionHandlers.GET_HEROES_SUCCESS);

// --- Epic (side-effect logic)
export const loadHeroes = (action$: Stream<Action<any>>, state$: Stream<any>, { heroService }: any): Stream<Action<any>> => {
  return action$.pipe(
    ofType(getHeroesRequest.type),
    withLatestFrom(state$!),
    concatMap<Array<any>, Action<any>>(([action, state]) =>
      heroService.getHeroes().pipe(
        concatMap((heroes) => from([
          getHeroesSuccess(heroes),
          addMessage('HeroService: fetched heroes')  // Dispatch addMessage action
        ]))
      ) as Stream<Action<any>>
    ),
    take(2)
  );
};


// --- Selectors
export const feature = featureSelector<HeroesState>(slice);
export const selectHeroes = selector(feature, (state) => state.heroes);

// --- Module export
export const heroesModule = {
  name: slice,
  initialState,
  actionHandlers,
  actions: {
    getHeroesRequest,
    getHeroesSuccess,
  },
  epics: {
    loadHeroes,
  },
  selectors: {
    selectHeroes,
  },
};
