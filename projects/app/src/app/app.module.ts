import { Action, createStore } from '@actioncrew/actionstack';
import { epics } from '@actioncrew/actionstack/epics';
import { perfmon } from '@actioncrew/actionstack/tools';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessagesModule } from './messages/messages.module';

export const store = createStore({
  middleware: [epics, perfmon],
  reducer: (state: any = {}) => state,
  dependencies: {},
  strategy: "exclusive"
});

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    MessagesModule
  ],
  declarations: [
    AppComponent
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

