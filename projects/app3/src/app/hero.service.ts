import { Injectable } from '@angular/core';

import { Hero } from './hero';
import { HEROES } from './mock-heroes';
import { from, fromPromise, Stream } from '@actioncrew/@actioncrew/actionstack';

@Injectable({ providedIn: 'root' })
export class HeroService {
  timeout = 200;

  constructor() { }

  getHeroes(): Stream<Hero[]> {
    return fromPromise(new Promise<Hero[]>((resolve) => {
      setTimeout(() => {
        resolve(HEROES);
      }, this.timeout);
    }));
  }

  getHero(id: number): Stream<Hero> {
    return fromPromise(new Promise<Hero>((resolve) => {
      setTimeout(() => {
        const hero = HEROES.find(h => h.id === id)!;
        resolve(hero);
      }, this.timeout);
    }));
  }
}
