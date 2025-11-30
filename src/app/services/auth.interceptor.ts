import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CookieService } from './cookie.service';
import { AuthService } from './auth-service';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { throwError, from } from 'rxjs';

/**
 * HTTP Interceptor to automatically include the auth token in request headers
 * Reads the token from cookies and adds it to the Authorization header
 * Automatically refreshes the token when receiving a 401 Unauthorized response
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const cookieService = inject(CookieService);
  const authService = inject(AuthService);

  // Get token from cookie
  const token = cookieService.getCookie('auth_token');

  // If token exists and request is to the API, add Authorization header
  let authReq = req;
  // Exclude external APIs like Gemini
  const isExternalApi = req.url.includes('generativelanguage.googleapis.com');

  if (token && !req.headers.has('Authorization') && !isExternalApi) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If we get a 401 error and it's not a login/refresh request, try to refresh the token
      if (
        error.status === 401 &&
        !authReq.url.includes('/auth/login') &&
        !authReq.url.includes('/auth/refresh') &&
        authService.isAuthenticated()
      ) {
        // Check if token refresh is already in progress
        if (authService.isRefreshingToken()) {
          // Wait for the token to be refreshed and retry the request
          return authService.getRefreshTokenSubject().pipe(
            filter((token) => token !== null),
            take(1),
            switchMap(() => {
              const newToken = cookieService.getCookie('auth_token');
              const retryReq = authReq.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });
              return next(retryReq);
            })
          );
        } else {
          // Attempt to refresh the token
          return from(authService.refreshAccessToken()).pipe(
            switchMap((success) => {
              if (success) {
                const newToken = cookieService.getCookie('auth_token');
                const retryReq = authReq.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`,
                  },
                });
                return next(retryReq);
              } else {
                return throwError(() => error);
              }
            }),
            catchError(() => throwError(() => error))
          );
        }
      }

      return throwError(() => error);
    })
  );
};
