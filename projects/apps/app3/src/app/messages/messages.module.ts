import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MessagesComponent } from './messages.component';
import { initialState, messagesModule, slice } from './messages.slice';
import { store } from '../app.module';

@NgModule({
  imports: [CommonModule, FormsModule, RouterModule],
  declarations: [
    MessagesComponent,
  ],
  exports: [
    MessagesComponent
  ]
})
export class MessagesModule {
  constructor() {

  }
}

