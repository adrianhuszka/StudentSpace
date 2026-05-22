// Environment configuration for API endpoints

import { runtimeApiUrl, runtimeGeminiApiKey } from './runtime-config';

export const environment = {
  production: false,
  apiUrl: runtimeApiUrl ?? 'http://localhost:8080/api/v1',
  geminiApiKey: runtimeGeminiApiKey ?? 'AIzaSyAAR0wQi4665kLyW-kW7K6Uj99jVoaEmT4',
  keycloakEnabled: false,
  keycloakBaseUrl: 'https://keycloak.pollak.info',
  keycloakRealm: 'master',
  keycloakClientId: 'student-space',
  keycloakRedirectUri: undefined as string | undefined,
  keycloakLoginUrl: undefined as string | undefined,
};
