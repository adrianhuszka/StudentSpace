import { computed, Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CookieService } from './cookie.service';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'user';
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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private cookieService = inject(CookieService);
  private apiUrl = environment.apiUrl;

  private _authState = signal<AuthState>({ isLoggedIn: false });

  isAuthenticated = computed(() => this._authState().isLoggedIn);
  userRole = computed(() => this._authState().user?.role ?? 'guest');

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Cookie names
  private readonly AUTH_TOKEN_COOKIE = 'auth_token';
  private readonly AUTH_USER_COOKIE = 'auth_user';
  private readonly AUTH_REFRESH_TOKEN_COOKIE = 'auth_refresh_token';
  private readonly AUTH_TOKEN_TYPE_COOKIE = 'auth_token_type';

  constructor() {
    // Check if user is already logged in from cookies
    this.loadAuthFromCookies();
  }

  /**
   * Load authentication state from cookies
   */
  private loadAuthFromCookies() {
    try {
      const token = this.cookieService.getCookie(this.AUTH_TOKEN_COOKIE);
      const userJson = this.cookieService.getCookie(this.AUTH_USER_COOKIE);

      if (token && userJson) {
        const user = JSON.parse(decodeURIComponent(userJson));
        this._authState.set({
          isLoggedIn: true,
          user,
          accessToken: token,
          refreshToken: this.cookieService.getCookie(this.AUTH_REFRESH_TOKEN_COOKIE) ?? undefined,
          tokenType: this.cookieService.getCookie(this.AUTH_TOKEN_TYPE_COOKIE) ?? undefined,
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
      // Store tokens
      this.cookieService.setCookie(
        this.AUTH_TOKEN_COOKIE,
        accessToken,
        expiresIn / 1000 / 60 / 60 / 24
      );
      this.cookieService.setCookie(this.AUTH_REFRESH_TOKEN_COOKIE, refreshToken, 7);
      this.cookieService.setCookie(this.AUTH_TOKEN_TYPE_COOKIE, tokenType, 7);

      // Store user data (encode to handle special characters)
      const userJson = JSON.stringify(user);
      this.cookieService.setCookie(
        this.AUTH_USER_COOKIE,
        userJson,
        expiresIn / 1000 / 60 / 60 / 24
      );
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
      const user: User = {
        id: payload.sub || payload.userId,
        name: payload.name || payload.username,
        role: payload.role || 'user',
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
