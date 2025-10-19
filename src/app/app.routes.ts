import { Routes } from '@angular/router';
import { authenticatedLoginGuard, authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/home' },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.routes').then((m) => m.HOME_ROUTES),
    canActivate: [authGuard],
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.routes').then((m) => m.REGISTER_ROUTES),
    canActivate: [authenticatedLoginGuard],
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.routes').then((m) => m.LOGIN_ROUTES),
    canActivate: [authenticatedLoginGuard],
  },
  {
    path: 'selected-profession',
    loadChildren: () =>
      import('./pages/selected-profession/selected-profession.routes').then(
        (m) => m.SELECTED_PROFESSION_ROUTES
      ),
    canActivate: [authGuard],
  },
];
