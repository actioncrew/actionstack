import { Store } from '@actionstack/angular';
import { Component } from '@angular/core';
import { addMessage, clearMessages, selectMessages } from './messages.slice';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent {
  messages$ = this.store.select(selectMessages());

  constructor(private store: Store) {}

  addMessage(message: string) {
    this.store.dispatch(addMessage(message));
  }

  clearMessages() {
    this.store.dispatch(clearMessages());
  }
}
