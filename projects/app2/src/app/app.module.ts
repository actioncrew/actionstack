import { EpicStore, storeEnhancer } from '@actionstack/angular/epics';
import { combineEnhancers } from 'projects/actionstack/store/src/lib/utils';
import { Store, STORE_ENHANCER, STORE_SETTINGS, StoreModule } from '@actionstack/angular';
import { epics } from '@actionstack/epics';
import { perfmon } from '@actionstack/tools';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessagesModule } from './messages/messages.module';
import { Action, applyMiddleware } from '@actionstack/store';
import { HeroService } from './hero.service';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    StoreModule.forRoot({
      reducer: (state: any = {}, action: Action<any>) => state,
      dependencies: { heroService: HeroService },
    }),
    MessagesModule
  ],
  declarations: [
    AppComponent
  ],
  providers: [
    { provide: STORE_SETTINGS, useValue: { dispatchSystemActions: true,
                                           awaitStatePropagation: false,
                                           enableMetaReducers: false,
                                           enableAsyncReducers: true,
                                           exclusiveActionProcessing: false }
    },
    { provide: EpicStore, useValue: Store },
    { provide: STORE_ENHANCER, useValue: combineEnhancers(storeEnhancer, applyMiddleware(epics, perfmon)) } // Provide custom enhancer
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

