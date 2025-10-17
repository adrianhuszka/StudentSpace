import { Routes } from '@angular/router';

export const REGISTER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./register').then((m) => m.Register) },
];
