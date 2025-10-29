import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@services/auth-service';

/**
 * Auth Guard to protect routes that require authentication
 *
 * Usage in routes:
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard]
 * }
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialization to complete
  if (!authService.authInitialized()) {
    // If auth is not initialized yet, allow the guard to pass temporarily
    // This prevents flashing the login page during initial load
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (authService.authInitialized()) {
          clearInterval(checkInterval);
          if (authService.isAuthenticated()) {
            resolve(true);
          } else {
            router.navigate(['/login'], {
              queryParams: { returnUrl: state.url },
            });
            resolve(false);
          }
        }
      }, 10);
    });
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login page with return URL
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};

/**
 * Role Guard to protect routes based on user role
 *
 * Usage in routes:
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [roleGuard],
 *   data: { roles: ['admin'] }
 * }
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];
  const userRoles = authService.userRoles();

  if (authService.isAuthenticated() && requiredRoles.some((role) => userRoles.includes(role))) {
    return true;
  }

  router.navigate(['/']);
  return false;
};

export const authenticatedLoginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialization to complete
  if (!authService.authInitialized()) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (authService.authInitialized()) {
          clearInterval(checkInterval);
          if (!authService.isAuthenticated()) {
            resolve(true);
          } else {
            router.navigate(['/']);
            resolve(false);
          }
        }
      }, 10);
    });
  }

  if (!authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
