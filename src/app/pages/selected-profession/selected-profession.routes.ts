import { Routes } from '@angular/router';

export const SELECTED_PROFESSION_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () => import('./selected-profession').then((m) => m.SelectedProfession),
  },
];
