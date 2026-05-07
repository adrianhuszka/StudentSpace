import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService } from './auth-service';
import { CookieService } from './cookie.service';
import { environment } from 'src/environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let cookieServiceSpy: jasmine.SpyObj<CookieService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const createToken = (payload: Record<string, any>) => {
    const base64Payload = btoa(JSON.stringify(payload));
    return `header.${base64Payload}.signature`;
  };

  beforeEach(() => {
    cookieServiceSpy = jasmine.createSpyObj<CookieService>('CookieService', [
      'getCookie',
      'setCookie',
      'deleteCookie',
    ]);
    cookieServiceSpy.getCookie.and.returnValue(null);

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CookieService, useValue: cookieServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully and persist auth state', async () => {
    const loginPromise = service.login('john', 'secret');

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'john', password: 'secret' });
    expect(req.request.withCredentials).toBeTrue();

    const token = createToken({
      sub: 'john',
      userId: 'u-1',
      fullName: 'John Doe',
      roles: ['USER'],
    });

    req.flush({
      accessToken: token,
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 3600000,
    });

    const success = await loginPromise;

    expect(success).toBeTrue();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.getToken()).toBe(token);
    expect(service.getUser()?.username).toBe('john');
    expect(cookieServiceSpy.setCookie).toHaveBeenCalled();
    expect(service.errorMessage()).toBeNull();
  });

  it('should set error message when login fails', async () => {
    const loginPromise = service.login('john', 'wrong');

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ message: 'Bad credentials' }, { status: 401, statusText: 'Unauthorized' });

    const success = await loginPromise;

    expect(success).toBeFalse();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.errorMessage()).toBe('Bad credentials');
  });

  it('should return success result for forgotPassword', async () => {
    const requestPromise = service.forgotPassword('john@example.com');

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'john@example.com' });
    req.flush({ message: 'Email sent' });

    const result = await requestPromise;
    expect(result).toEqual({ success: true, message: 'Email sent' });
  });

  it('should return failed result for forgotPassword error', async () => {
    const requestPromise = service.forgotPassword('john@example.com');

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/forgot-password`);
    req.flush({ message: 'User not found' }, { status: 404, statusText: 'Not Found' });

    const result = await requestPromise;
    expect(result).toEqual({ success: false, message: 'User not found' });
  });

  it('should logout and clear auth state and cookies', async () => {
    (service as any)._authState.set({
      isLoggedIn: true,
      user: { id: 'u-1', username: 'john', fullName: 'John Doe', roles: ['USER'] },
      accessToken: 'token',
    });

    await service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeUndefined();
    expect(cookieServiceSpy.deleteCookie).toHaveBeenCalledTimes(5);
  });
});
