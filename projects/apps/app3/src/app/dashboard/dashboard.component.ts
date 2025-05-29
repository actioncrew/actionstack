
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Hero } from '../hero';
import { HeroService } from './../hero.service';
import { dashboardModule, initialState, loadHeroes, selectTopHeroes, slice } from './dashboard.slice';
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
  heroes$!: Stream<Hero[]>;

  constructor() {

  }

  async ngOnInit() {
    await store.loadModule(dashboardModule);
    this.heroes$ = dashboardModule.data$.selectTopHeroes();
    store.dispatch(loadHeroes());
  }

  ngOnDestroy(): void {
  }
}
