import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Hero } from '../hero';
import { heroSelector, loadHero, heroDetailsModule } from './hero-details.slice';
import { store } from '../app.module';
import { Stream } from '@actioncrew/streamix';
import { map, Subscription, tap } from 'rxjs';

@Component({
  selector: 'app-hero-details',
  templateUrl: './hero-details.component.html',
  styleUrls: [ './hero-details.component.css' ]
})
export class HeroDetailsComponent implements OnInit {
  hero$!: Stream<Hero | undefined>;
  subscription: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private location: Location
  ) {
    heroDetailsModule.init(store);
  }

    async ngOnInit() {
      this.hero$ = heroDetailsModule.data$.heroSelector();

      this.subscription = this.route.paramMap
        .pipe(
          map((params) => Number(params.get('id'))),
          tap((id) => store.dispatch(loadHero(id)))
        )
        .subscribe();
  }

  goBack(): void {
    this.location.back();
  }

  ngOnDestroy() {
    if(this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
