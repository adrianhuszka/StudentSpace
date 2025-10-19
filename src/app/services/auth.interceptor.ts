import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CookieService } from './cookie.service';

/**
 * HTTP Interceptor to automatically include the auth token in request headers
 * Reads the token from cookies and adds it to the Authorization header
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const cookieService = inject(CookieService);

  // Get token from cookie
  const token = cookieService.getCookie('auth_token');

  // If token exists and request is to the API, add Authorization header
  if (token && !req.headers.has('Authorization')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};
