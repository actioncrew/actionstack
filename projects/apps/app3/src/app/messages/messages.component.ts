import { Store } from '@actioncrew/actionstack';
import { Component } from '@angular/core';
import { addMessage, clearMessages, selectMessages, messagesModule } from './messages.slice';
import { store } from '../app.module';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent {
  messages$ = store.select(messagesModule.selectors.selectMessages());

  constructor() {}

  addMessage(message: string) {
    store.dispatch(messagesModule.actions.addMessage(message));
  }

  clearMessages() {
    store.dispatch(messagesModule.actions.clearMessages());
  }
}
