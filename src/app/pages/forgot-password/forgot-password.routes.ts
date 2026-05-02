import { Routes } from '@angular/router';

export const FORGOT_PASSWORD_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./forgot-password').then((m) => m.ForgotPassword) },
];
