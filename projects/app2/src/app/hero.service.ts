import { Store } from '@actionstack/angular';
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

import { Hero } from './hero';
import { HEROES } from './mock-heroes';

@Injectable({ providedIn: 'root' })
export class HeroService {
  timeout = 200;

  constructor(private store: Store) { }

  getHeroes(): Observable<Hero[]> {
    return from(new Promise<Hero[]>((resolve) => {
      setTimeout(() => {
        resolve(HEROES);
      }, this.timeout);
    }));
  }

  getHero(id: number): Observable<Hero> {
    return from(new Promise<Hero>((resolve) => {
      setTimeout(() => {
        const hero = HEROES.find(h => h.id === id)!;
        resolve(hero);
      }, this.timeout);
    }));
  }
}
