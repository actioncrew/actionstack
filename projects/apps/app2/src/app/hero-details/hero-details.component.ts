import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, map, tap } from 'rxjs';

import { Store } from '@actionstack/angular';
import { Hero } from '../hero';
import { heroSelector, loadHero } from './hero-details.slice';

@Component({
  selector: 'app-hero-details',
  templateUrl: './hero-details.component.html',
  styleUrls: [ './hero-details.component.css' ]
})
export class HeroDetailsComponent implements OnInit {
  hero$!: Observable<Hero | undefined>;
  subscription: Subscription | undefined;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.hero$ = this.store.select(heroSelector());

    this.subscription = this.route.paramMap.pipe(
      map(params => Number(params.get('id'))),
      tap(id => this.store.dispatch(loadHero(id)))
    ).subscribe();
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
