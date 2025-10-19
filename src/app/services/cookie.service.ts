import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Cookie service that works with SSR
 * Provides methods to set, get, and delete cookies safely
 */
@Injectable({
  providedIn: 'root',
})
export class CookieService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Set a cookie
   * @param name Cookie name
   * @param value Cookie value
   * @param days Days until expiration (default: 7)
   * @param path Cookie path (default: '/')
   */
  setCookie(name: string, value: string, days: number = 7, path: string = '/'): void {
    if (!this.isBrowser) return;

    try {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      const expires = `expires=${date.toUTCString()}`;

      // Additional security flags
      const sameSite = 'Strict'; // or 'Lax' for more flexibility
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';

      document.cookie = `${name}=${value}; ${expires}; path=${path}; SameSite=${sameSite}${secure}`;
    } catch (error) {
      console.error('Error setting cookie:', error);
    }
  }

  /**
   * Get a cookie value by name
   * @param name Cookie name
   * @returns Cookie value or null if not found
   */
  getCookie(name: string): string | null {
    if (!this.isBrowser) return null;

    try {
      const nameEQ = `${name}=`;
      const cookies = document.cookie.split(';');

      for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(nameEQ) === 0) {
          return cookie.substring(nameEQ.length);
        }
      }
      return null;
    } catch (error) {
      console.error('Error reading cookie:', error);
      return null;
    }
  }

  /**
   * Delete a cookie
   * @param name Cookie name
   * @param path Cookie path (default: '/')
   */
  deleteCookie(name: string, path: string = '/'): void {
    if (!this.isBrowser) return;

    try {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
    } catch (error) {
      console.error('Error deleting cookie:', error);
    }
  }

  /**
   * Check if a cookie exists
   * @param name Cookie name
   * @returns true if cookie exists
   */
  hasCookie(name: string): boolean {
    return this.getCookie(name) !== null;
  }

  /**
   * Clear all cookies
   */
  clearAll(): void {
    if (!this.isBrowser) return;

    try {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        this.deleteCookie(name);
      }
    } catch (error) {
      console.error('Error clearing cookies:', error);
    }
  }
}
