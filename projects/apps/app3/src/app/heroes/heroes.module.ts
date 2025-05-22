import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { HeroService } from '../hero.service';
import { HeroesComponent } from './heroes.component';
import { slice } from './heroes.slice';
import { store } from '../app.module';

const routes: Routes = [
  { path: '', component: HeroesComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
  declarations: [
    HeroesComponent,
  ],
  exports: [
    HeroesComponent
  ]
})
export class HeroesModule {
  constructor() {
    store.loadModule({
      slice: slice,
      state: { heroes: [] },
      actions: {},
      dependencies: { heroService: new HeroService() }
    });
  }
}

