import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { UserOutline, LeftOutline, RightOutline } from '@ant-design/icons-angular/icons';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { provideHttpClient } from '@angular/common/http';

registerLocaleData(en);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideNzI18n(en_US),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideNzIcons([UserOutline, LeftOutline, RightOutline]),
  ],
};
