import { Routes } from '@angular/router';
import { authenticatedLoginGuard, authGuard, roleGuard } from './guards/auth.guard';

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
        (m) => m.SELECTED_PROFESSION_ROUTES,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    canActivate: [roleGuard, authGuard],
    data: { roles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: 'profile',
    loadChildren: () => import('./pages/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
    canActivate: [authGuard],
  },
  {
    path: 'quiz',
    loadChildren: () => import('./pages/quiz/quiz.routes').then((m) => m.QUIZ_ROUTES),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '/home',
  },
];
