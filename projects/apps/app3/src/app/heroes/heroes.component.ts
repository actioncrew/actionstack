import { Store } from '@actioncrew/actionstack';
import { run, stop, epicsModule } from '@actioncrew/actionstack/epics';
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

  async ngOnInit() {
    await store.loadModule(epicsModule);
    store.dispatch(epicsModule.actions.run(loadHeroes));

    heroesModule.streams$.selectHeroes().subscribe(value => {
      this.heroes = value;
    });

    this.getHeroes();
  }

  getHeroes(): void {
    store.dispatch(heroesModule.actions.getHeroesRequest(this.heroes));
  }

  ngOnDestroy(): void {
    heroesModule.destroy$.next();

    store.dispatch(epicsModule.actions.stop(loadHeroes));
  }
}
