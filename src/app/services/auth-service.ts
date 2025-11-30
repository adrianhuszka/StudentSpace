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

  // Cookie names
  private readonly AUTH_TOKEN_COOKIE = 'auth_token';
  private readonly AUTH_USER_COOKIE = 'auth_user';
  private readonly AUTH_REFRESH_TOKEN_COOKIE = 'auth_refresh_token';
  private readonly AUTH_TOKEN_TYPE_COOKIE = 'auth_token_type';
  private readonly AUTH_TOKEN_EXPIRY_COOKIE = 'auth_token_expiry';

  // Token refresh
  private refreshTokenTimer?: ReturnType<typeof setTimeout>;
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor() {
    // Check if user is already logged in from cookies
    this.loadAuthFromCookies();
    // Mark as initialized after loading from cookies
    this._authInitialized.set(true);
    // Start automatic token refresh if logged in
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
    expiresIn: number
  ) {
    try {
      const expiryDays = expiresIn / 1000 / 60 / 60 / 24;

      // Store tokens
      this.cookieService.setCookie(this.AUTH_TOKEN_COOKIE, accessToken, expiryDays);
      this.cookieService.setCookie(this.AUTH_REFRESH_TOKEN_COOKIE, refreshToken, 7);
      this.cookieService.setCookie(this.AUTH_TOKEN_TYPE_COOKIE, tokenType, 7);
      this.cookieService.setCookie(this.AUTH_TOKEN_EXPIRY_COOKIE, expiresIn.toString(), expiryDays);

      // Store user data (encode to handle special characters)
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
    // Clear any existing timer
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
    }

    const expiresIn = this._authState().expiresIn;
    if (!expiresIn) {
      return;
    }

    // Refresh token 1 minute before it expires (or at 80% of the expiry time, whichever is sooner)
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
    // Prevent multiple simultaneous refresh attempts
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
          { withCredentials: true }
        )
      );

      // Parse JWT to extract user info
      const tokenParts = response.accessToken.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      const user: User = {
        username: payload.sub || payload.userId,
        fullName: payload.fullName || payload.username,
        roles: payload.roles || ['user'],
        id: payload.userId,
      };

      // Update state with new tokens
      this._authState.set({
        isLoggedIn: true,
        user: user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        tokenType: response.tokenType,
        expiresIn: response.expiresIn,
      });

      // Save to cookies
      this.saveAuthToCookies(
        user,
        response.accessToken,
        response.refreshToken,
        response.tokenType,
        response.expiresIn
      );

      // Schedule next refresh
      this.scheduleTokenRefresh();

      // Notify subscribers that token has been refreshed
      this.refreshTokenSubject.next(response.accessToken);

      return true;
    } catch (err: any) {
      console.error('Token refresh failed:', err);
      // If refresh fails, logout the user
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
          { withCredentials: true }
        )
      );

      // Parse JWT to extract user info
      const tokenParts = response.accessToken.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log(payload);
      const user: User = {
        username: payload.sub || payload.userId,
        fullName: payload.fullName || payload.username,
        roles: payload.roles || ['user'],
        id: payload.userId,
      };

      // Update state with user info and token
      this._authState.set({
        isLoggedIn: true,
        user: user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        tokenType: response.tokenType,
        expiresIn: response.expiresIn,
      });

      // Save to cookies
      this.saveAuthToCookies(
        user,
        response.accessToken,
        response.refreshToken,
        response.tokenType,
        response.expiresIn
      );

      // Schedule automatic token refresh
      this.scheduleTokenRefresh();

      return true;
    } catch (err: any) {
      const errorMsg = err?.error?.message || 'Invalid credentials';
      console.error(err);
      this.errorMessage.set(errorMsg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    // Clear the refresh timer
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = undefined;
    }

    try {
      // await firstValueFrom(
      //   this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      // );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear cookies and local state
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
