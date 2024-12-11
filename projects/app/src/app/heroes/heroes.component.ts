import { Store } from '@actioncrew/actionstack';
import { addEpics, removeEpics } from '@actioncrew/actionstack/epics';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { Hero } from '../hero';
import { HeroService } from './../hero.service';
import { getHeroesRequest, loadHeroes, selectHeroes } from './heroes.slice';
import { store } from '../app.module';

@Component({
  selector: 'app-heroes',
  templateUrl: './heroes.component.html',
  styleUrls: ['./heroes.component.css']
})
export class HeroesComponent implements OnInit, OnDestroy {
  heroes: Hero[] = [];
  subscription!: Subscription;

  constructor(private heroService: HeroService) { }

  ngOnInit(): void {
    store.dispatch(addEpics(loadHeroes));

    this.subscription = store.select(selectHeroes()).subscribe(value => {
      this.heroes = value;
    });

    this.getHeroes();
  }

  getHeroes(): void {
    store.dispatch(getHeroesRequest(this.heroes));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();

    store.dispatch(removeEpics(loadHeroes));
  }
}
