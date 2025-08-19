import { messagesModule } from './../messages/messages.slice';
import { action, createModule, createThunk, selector } from '@actioncrew/actionstack';
import { firstValueFrom } from '@actioncrew/streamix';

import { Hero } from '../hero';
import { Action } from '@actioncrew/actionstack';
import { HeroService } from '../hero.service';

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

export const getHeroesRequest = action(
  "GET_HEROES_REQUEST",
  (state: HeroesState, { heroes }: { heroes: Hero[] }) => ({
    ...state,
    heroes
  })
);

export const getHeroesSuccess = action(
  "GET_HEROES_SUCCESS",
  (state: HeroesState, { heroes }: { heroes: Hero[] }) => ({
    ...state,
    heroes
  }),
  (heroes: Hero[]) => ({ heroes })
);

// --- Selectors
export const selectHeroes = selector((state) => state.heroes);

// --- Epic (side-effect logic)
export const loadHeroes = createThunk(
  "LOAD_HEROES",
  () => async (dispatch, getState, { heroService }) => {
    const heroes: Hero[] = await firstValueFrom(heroService.getHeroes());

    heroesModule.actions.getHeroesSuccess(heroes);
    messagesModule.actions.addMessage('HeroService: fetched heroes');
  },
  [
    getHeroesRequest.type
  ]
);

// --- Module export
export const heroesModule = createModule({
  slice,
  initialState,
  actions: {
    getHeroesRequest,
    getHeroesSuccess,
    loadHeroes
  },
  selectors: {
    selectHeroes,
  },
  dependencies: {
    heroService: new HeroService()
  }
});

