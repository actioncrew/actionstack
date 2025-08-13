import { StoreModule } from '@actionstack/angular';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MessagesComponent } from './messages.component';
import { reducer, slice } from './messages.slice';
import { HeroService } from '../hero.service';


@NgModule({
  imports: [CommonModule, FormsModule, RouterModule, StoreModule.forFeature({
    slice: slice,
    reducer: reducer
  })],
  declarations: [
    MessagesComponent,
  ],
  exports: [
    MessagesComponent
  ]
})
export class MessagesModule {}

