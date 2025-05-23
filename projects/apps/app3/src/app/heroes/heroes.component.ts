import { Store } from '@actioncrew/actionstack';
import { run, stop } from '@actioncrew/actionstack/epics';
import { Component, OnDestroy, OnInit } from '@angular/core';


import { Hero } from '../hero';
import { HeroService } from './../hero.service';
import { getHeroesRequest, loadHeroes, selectHeroes, heroesModule } from './heroes.slice';
import { store } from '../app.module';
import { Subscription } from '@actioncrew/streamix';

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
    store.dispatch(run(loadHeroes));

    this.subscription = store.select(heroesModule.selectors.selectHeroes()).subscribe(value => {
      this.heroes = value;
    });

    this.getHeroes();
  }

  getHeroes(): void {
    store.dispatch(heroesModule.actions.getHeroesRequest(this.heroes));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();

    store.dispatch(stop(loadHeroes));
  }
}
