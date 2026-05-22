// Production environment configuration

import { runtimeApiUrl } from './runtime-config';

export const environment = {
  production: true,
  apiUrl: runtimeApiUrl ?? 'https://api-student-space.pollak.info/api/v1',
  geminiApiKey: '',
  keycloakEnabled: false,
  keycloakBaseUrl: 'https://keycloak.pollak.info',
  keycloakRealm: 'master',
  keycloakClientId: 'student-space',
  keycloakRedirectUri: undefined as string | undefined,
  keycloakLoginUrl: undefined as string | undefined,
};
