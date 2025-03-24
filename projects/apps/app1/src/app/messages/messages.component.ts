import { Store } from '@actionstack/store';
import { Component } from '@angular/core';
import { addMessage, clearMessages, selectMessages } from './messages.slice';
import { store } from '../app.module';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent {
  messages$ = store.select(selectMessages());

  constructor() {}

  addMessage(message: string) {
    store.dispatch(addMessage(message));
  }

  clearMessages() {
    store.dispatch(clearMessages());
  }
}
