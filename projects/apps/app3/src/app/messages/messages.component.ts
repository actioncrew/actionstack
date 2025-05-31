import { Component } from '@angular/core';
import { messagesModule } from './messages.slice';
import { store } from '../app.module';
import { Stream } from '@actioncrew/streamix';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent {
  messages$!: Stream<any>;

  constructor() {
  }

  async ngOnInit() {
    store.loadModule(messagesModule);
    this.messages$ = messagesModule.data$.selectMessages();
  }

  addMessage(message: string) {
    messagesModule.actions.addMessage(message);
  }

  clearMessages() {
    messagesModule.actions.clearMessages();
  }
}
