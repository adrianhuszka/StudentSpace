import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { CookieService } from './cookie.service';

describe('CookieService', () => {
  let service: CookieService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });

    service = TestBed.inject(CookieService);
    service.clearAll();
  });

  afterEach(() => {
    service.clearAll();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get cookie', () => {
    service.setCookie('test_cookie', 'test_value', 1);

    expect(service.getCookie('test_cookie')).toBe('test_value');
  });

  it('should return null for missing cookie', () => {
    expect(service.getCookie('missing_cookie')).toBeNull();
  });

  it('should detect cookie existence with hasCookie', () => {
    service.setCookie('exists_cookie', 'yes', 1);

    expect(service.hasCookie('exists_cookie')).toBeTrue();
    expect(service.hasCookie('no_cookie')).toBeFalse();
  });

  it('should delete cookie', () => {
    service.setCookie('remove_cookie', 'value', 1);
    expect(service.getCookie('remove_cookie')).toBe('value');

    service.deleteCookie('remove_cookie');

    expect(service.getCookie('remove_cookie')).toBeNull();
  });

  it('should clear all cookies', () => {
    service.setCookie('cookie_one', '1', 1);
    service.setCookie('cookie_two', '2', 1);

    service.clearAll();

    expect(service.getCookie('cookie_one')).toBeNull();
    expect(service.getCookie('cookie_two')).toBeNull();
  });
});
