import { Action, provideStore } from '@actioncrew/actionstack';
import { EpicModule, epics } from '@actioncrew/actionstack/epics';
import { perfmon } from '@actioncrew/actionstack/tools';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessagesModule } from './messages/messages.module';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    EpicModule,
    provideStore({
      middleware: [epics, perfmon],
      reducer: (state: any = {}, action: Action<any>) => state,
      dependencies: {},
      strategy: "exclusive"
    }),
    MessagesModule
  ],
  declarations: [
    AppComponent
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

