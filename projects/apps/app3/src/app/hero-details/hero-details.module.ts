import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { HeroService } from '../hero.service';
import { HeroDetailsComponent } from './hero-details.component';
import { initialState, slice } from './hero-details.slice';
import { store } from '../app.module';

const routes: Routes = [
  { path: '', component: HeroDetailsComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
  declarations: [
    HeroDetailsComponent,
  ],
  exports: [
    HeroDetailsComponent
  ]
})
export class HeroDetailsModule {
  constructor() {
    store.loadModule({
      slice: slice,
      state: initialState,
      actions: {},
      dependencies: { heroService: new HeroService() }
    });
  }
}

