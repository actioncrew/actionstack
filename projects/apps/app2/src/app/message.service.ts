import { Store } from '@actionstack/angular';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MessageService {
  messages: string[] = [];

  constructor(private store: Store) {
  }

  add(message: string) {
    this.messages.push(message);
  }

  clear() {
    this.messages = [];
  }
}
