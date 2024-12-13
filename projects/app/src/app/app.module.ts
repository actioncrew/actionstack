import { Action, createStore, StoreCreator, StoreEnhancer } from '@actionstack/store';
import { epics } from '@actionstack/epics';
import { logger, perfmon } from '@actionstack/tools';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessagesModule } from './messages/messages.module';
import { applyMiddleware, combineEnhancers } from 'projects/actionstack/store/src/lib/utils';

export const store = createStore({
  reducer: (state: any = {}) => state,
  dependencies: {},
  strategy: "exclusive"
}, applyMiddleware(logger, epics));

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

