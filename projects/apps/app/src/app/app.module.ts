import { createStore } from '@actioncrew/actionstack';
import { logger, perfmon } from '@actioncrew/actionstack/tools';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessagesModule } from './messages/messages.module';
import { applyMiddleware } from '@actioncrew/actionstack';
import { epics } from '@actioncrew/actionstack/epics';


export const store = createStore({ exclusiveActionProcessing: true }, applyMiddleware(logger, epics));


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

