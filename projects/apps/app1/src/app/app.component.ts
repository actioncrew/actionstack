import { Component, OnDestroy, OnInit } from '@angular/core';
import { takeEvery } from 'redux-saga/effects';
import { Subscription } from 'rxjs/internal/Subscription';


function* helloSaga() {
  console.log('Hello from the Saga!');
}

function* watchHelloSaga() {
  yield takeEvery('*', helloSaga); // Listens for 'ACTION_NAME'
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Tour of Heroes';
  subscription!: Subscription;
  constructor() {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }
}
