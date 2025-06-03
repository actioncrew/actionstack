import { epicsModule } from '@actioncrew/actionstack/epics';
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
    store.loadModule(heroesModule);
    store.loadModule(epicsModule);
    epicsModule.actions.run(loadHeroes);

    heroesModule.data$.selectHeroes().subscribe(value => {
      this.heroes = value;
    });

    this.getHeroes();
  }

  getHeroes(): void {
    heroesModule.actions.getHeroesRequest(this.heroes);
  }

  ngOnDestroy(): void {
    heroesModule.destroyed$.next();

    epicsModule.actions.stop(loadHeroes);
  }
}
