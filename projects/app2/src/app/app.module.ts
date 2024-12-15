import { Action, STORE_ENHANCER, StoreModule } from '@actionstack/angular';
import { epics } from '@actionstack/epics';
import { perfmon } from '@actionstack/tools';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessagesModule } from './messages/messages.module';
import { applyMiddleware } from '@actionstack/store';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    StoreModule.forRoot({
      reducer: (state: any = {}, action: Action<any>) => state,
      dependencies: {},
      strategy: "exclusive"
    }),
    MessagesModule
  ],
  declarations: [
    AppComponent
  ],
  providers: [
    { provide: STORE_ENHANCER, useValue: applyMiddleware(epics, perfmon) } // Provide custom enhancer
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

