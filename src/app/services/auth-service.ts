import { computed, Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { CookieService } from './cookie.service';
import { Router } from '@angular/router';

interface User {
  id: string;
  username: string;
  fullName: string;
  roles: string[];
}

interface AuthState {
  isLoggedIn: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  message?: string;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

interface AuthMessageResponse {
  message: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private cookieService = inject(CookieService);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  private _authState = signal<AuthState>({ isLoggedIn: false });
  private _authInitialized = signal(false);

  isAuthenticated = computed(() => this._authState().isLoggedIn);
  userRoles = computed(() => this._authState().user?.roles ?? ['GUEST']);
  authInitialized = computed(() => this._authInitialized());

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  private readonly AUTH_TOKEN_COOKIE = 'auth_token';
  private readonly AUTH_USER_COOKIE = 'auth_user';
  private readonly AUTH_REFRESH_TOKEN_COOKIE = 'auth_refresh_token';
  private readonly AUTH_TOKEN_TYPE_COOKIE = 'auth_token_type';
  private readonly AUTH_TOKEN_EXPIRY_COOKIE = 'auth_token_expiry';

  private refreshTokenTimer?: ReturnType<typeof setTimeout>;
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor() {
    this.loadAuthFromCookies();

    this._authInitialized.set(true);

    if (this.isAuthenticated()) {
      this.scheduleTokenRefresh();
    }
  }

  /**
   * Load authentication state from cookies
   */
  private loadAuthFromCookies() {
    try {
      const token = this.cookieService.getCookie(this.AUTH_TOKEN_COOKIE);
      const userJson = this.cookieService.getCookie(this.AUTH_USER_COOKIE);
      const expiryStr = this.cookieService.getCookie(this.AUTH_TOKEN_EXPIRY_COOKIE);

      if (token && userJson) {
        const user = JSON.parse(decodeURIComponent(userJson));
        const expiresIn = expiryStr ? parseInt(expiryStr, 10) : undefined;

        this._authState.set({
          isLoggedIn: true,
          user,
          accessToken: token,
          refreshToken: this.cookieService.getCookie(this.AUTH_REFRESH_TOKEN_COOKIE) ?? undefined,
          tokenType: this.cookieService.getCookie(this.AUTH_TOKEN_TYPE_COOKIE) ?? undefined,
          expiresIn,
        });
      }
    } catch (error) {
      console.error('Error loading auth from cookies:', error);
      this.clearAuthCookies();
    }
  }

  /**
   * Save authentication data to cookies
   */
  private saveAuthToCookies(
    user: User,
    accessToken: string,
    refreshToken: string,
    tokenType: string,
    expiresIn: number,
  ) {
    try {
      const expiryDays = expiresIn / 1000 / 60 / 60 / 24;

      this.cookieService.setCookie(this.AUTH_TOKEN_COOKIE, accessToken, expiryDays);
      this.cookieService.setCookie(this.AUTH_REFRESH_TOKEN_COOKIE, refreshToken, 7);
      this.cookieService.setCookie(this.AUTH_TOKEN_TYPE_COOKIE, tokenType, 7);
      this.cookieService.setCookie(this.AUTH_TOKEN_EXPIRY_COOKIE, expiresIn.toString(), expiryDays);

      const userJson = JSON.stringify(user);
      this.cookieService.setCookie(this.AUTH_USER_COOKIE, userJson, expiryDays);
    } catch (error) {
      console.error('Error saving auth to cookies:', error);
    }
  }

  /**
   * Clear authentication cookies
   */
  private clearAuthCookies() {
    this.cookieService.deleteCookie(this.AUTH_TOKEN_COOKIE);
    this.cookieService.deleteCookie(this.AUTH_USER_COOKIE);
    this.cookieService.deleteCookie(this.AUTH_REFRESH_TOKEN_COOKIE);
    this.cookieService.deleteCookie(this.AUTH_TOKEN_TYPE_COOKIE);
    this.cookieService.deleteCookie(this.AUTH_TOKEN_EXPIRY_COOKIE);
  }

  /**
   * Schedule automatic token refresh before it expires
   */
  private scheduleTokenRefresh() {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
    }

    const expiresIn = this._authState().expiresIn;
    if (!expiresIn) {
      return;
    }

    const refreshTime = Math.min(expiresIn * 0.8, expiresIn - 60000);

    if (refreshTime > 0) {
      this.refreshTokenTimer = setTimeout(() => {
        this.refreshAccessToken();
      }, refreshTime);
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing) {
      return false;
    }

    const refreshToken = this._authState().refreshToken;
    if (!refreshToken) {
      console.error('No refresh token available');
      await this.logout();
      return false;
    }

    this.isRefreshing = true;

    try {
      const response = await firstValueFrom(
        this.http.post<RefreshTokenResponse>(
          `${this.apiUrl}/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        ),
      );

      const tokenParts = response.accessToken.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      const user: User = {
        username: payload.sub || payload.userId,
        fullName: payload.fullName || payload.username,
        roles: payload.roles || ['user'],
        id: payload.userId,
      };

      this._authState.set({
        isLoggedIn: true,
        user: user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        tokenType: response.tokenType,
        expiresIn: response.expiresIn,
      });

      this.saveAuthToCookies(
        user,
        response.accessToken,
        response.refreshToken,
        response.tokenType,
        response.expiresIn,
      );

      this.scheduleTokenRefresh();

      this.refreshTokenSubject.next(response.accessToken);

      return true;
    } catch (err: any) {
      console.error('Token refresh failed:', err);

      await this.logout();
      this.router.navigate(['/login']);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Check if token refresh is in progress
   */
  isRefreshingToken(): boolean {
    return this.isRefreshing;
  }

  /**
   * Get the refresh token subject for coordination in interceptor
   */
  getRefreshTokenSubject() {
    return this.refreshTokenSubject;
  }

  async login(username: string, password: string): Promise<boolean> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(
          `${this.apiUrl}/auth/login`,
          { username, password },
          { withCredentials: true },
        ),
      );

      const tokenParts = response.accessToken.split('.');

      this.applyAuthenticationResponse(response);

      return true;
    } catch (err: any) {
      const errorMsg = err?.error?.message || 'Hibás bejelentkezési adatok';
      console.error(err);
      this.errorMessage.set(errorMsg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async register(username: string, email: string, password: string): Promise<boolean> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload: RegisterRequest = {
      username,
      email,
      password,
    };

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiUrl}/auth/register`, payload, {
          withCredentials: true,
        }),
      );

      this.applyAuthenticationResponse(response);

      return true;
    } catch (err: any) {
      const errorMsg = err?.error?.message || 'A regisztráció nem sikerült';
      console.error(err);
      this.errorMessage.set(errorMsg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  private applyAuthenticationResponse(response: LoginResponse): void {
    const tokenParts = response.accessToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    console.log(payload);
    const user: User = {
      username: payload.sub || payload.userId,
      fullName: payload.fullName || payload.username,
      roles: payload.roles || ['user'],
      id: payload.userId,
    };

    this._authState.set({
      isLoggedIn: true,
      user: user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: response.tokenType,
      expiresIn: response.expiresIn,
    });

    this.saveAuthToCookies(
      user,
      response.accessToken,
      response.refreshToken,
      response.tokenType,
      response.expiresIn,
    );

    this.scheduleTokenRefresh();
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthMessageResponse>(
          `${this.apiUrl}/auth/forgot-password`,
          { email },
          { withCredentials: true },
        ),
      );

      return {
        success: true,
        message: response?.message ?? 'Ha az email cím létezik, új jelszót küldtünk rá.',
      };
    } catch (err: any) {
      const errorMsg = err?.error?.message || 'Nem sikerült elindítani a jelszó-visszaállítást.';
      return { success: false, message: errorMsg };
    }
  }

  loginWithKeycloak(): void {
    if (!environment.keycloakEnabled) {
      this.errorMessage.set('A Keycloak bejelentkezés jelenleg még fejlesztés alatt áll.');
      return;
    }

    const apiOrigin = new URL(this.apiUrl).origin;
    const backendOAuthLoginUrl = `${apiOrigin}/oauth2/authorization/keycloak`;

    if (environment.keycloakLoginUrl) {
      window.location.href = environment.keycloakLoginUrl;
      return;
    }
    window.location.href = backendOAuthLoginUrl;
  }

  async logout(): Promise<void> {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = undefined;
    }

    try {
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthCookies();
      this._authState.set({ isLoggedIn: false });
    }
  }

  /**
   * Get the current auth token from state
   */
  getToken(): string | undefined {
    return this._authState().accessToken;
  }

  /**
   * Get the current user from state
   */
  getUser(): User | undefined {
    return this._authState().user;
  }

  get authState() {
    return this._authState;
  }
}
