import { Action, createStore, StoreCreator, StoreEnhancer } from '@actioncrew/actionstack';
import { epics } from '@actioncrew/actionstack/epics';
import { logger, perfmon } from '@actioncrew/actionstack/tools';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessagesModule } from './messages/messages.module';
import { applyMiddleware, combineEnhancers } from '@actioncrew/actionstack';

export const store = createStore({
  reducer: (state: any = {}) => state,
  dependencies: {},
}, { exclusiveActionProcessing: true }, applyMiddleware(logger, epics));

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

