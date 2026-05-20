// Environment configuration for API endpoints

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  keycloakEnabled: false,
  keycloakBaseUrl: 'https://keycloak.pollak.info',
  keycloakRealm: 'master',
  keycloakClientId: 'student-space',
  keycloakRedirectUri: undefined as string | undefined,
  keycloakLoginUrl: undefined as string | undefined,
};
