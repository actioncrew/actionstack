
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Hero } from '../hero';
import { HeroService } from './../hero.service';
import { loadHeroes, reducer, selectTopHeroes, slice } from './dashboard.slice';
import { store } from '../app.module';

store.loadModule({
  slice: slice,
  reducer: reducer,
  dependencies: { heroService: new HeroService() },
});

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.component.css' ],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class DashboardComponent implements OnInit {
  heroes$: Observable<Hero[]> = store.select(selectTopHeroes());

  constructor() {
  }

  ngOnInit(): void {
    store.dispatch(loadHeroes());
  }

  ngOnDestroy(): void {
  }
}
