import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'details/:id', loadChildren: () => import('./hero-details/hero-details.module').then(m => m.HeroDetailsModule) },
  { path: 'heroes', loadChildren: () => import('./heroes/heroes.module').then(m => m.HeroesModule) }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
