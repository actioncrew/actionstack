import { heroesModule } from './heroes/heroes.slice';
import { Action, createStore, StoreCreator, StoreEnhancer } from '@actioncrew/actionstack';
import { logger, perfmon } from '@actioncrew/actionstack/tools';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessagesModule } from './messages/messages.module';
import { applyMiddleware } from '@actioncrew/actionstack';
import { epics } from '@actioncrew/actionstack/epics';
import { dashboardModule } from './dashboard/dashboard.slice';
import { heroDetailsModule } from './hero-details/hero-details.slice';
import { messagesModule } from './messages/messages.slice';

export const store = createStore({ exclusiveActionProcessing: true }, applyMiddleware(logger, epics));
store.populate(dashboardModule, heroDetailsModule, heroesModule, messagesModule);
store.unloadModule(dashboardModule);


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

