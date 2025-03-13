
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Hero } from '../hero';
import { HeroService } from './../hero.service';
import { loadHeroes, reducer, selectTopHeroes, slice } from './dashboard.slice';
import { store } from '../app.module';
import { Stream } from '@actioncrew/streamix';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.component.css' ],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class DashboardComponent implements OnInit {
  heroes$: Stream<Hero[]> = store.select(selectTopHeroes());

  constructor() {
    store.loadModule({
      slice: slice,
      reducer: reducer,
      dependencies: { heroService: new HeroService() },
    });
  }

  ngOnInit(): void {
    store.dispatch(loadHeroes());
  }

  ngOnDestroy(): void {
  }
}
