// Production environment configuration

export const environment = {
  production: true,
  apiUrl: 'https://example.com/api',
  keycloakEnabled: false,
  keycloakBaseUrl: 'https://keycloak.pollak.info',
  keycloakRealm: 'master',
  keycloakClientId: 'student-space',
  keycloakRedirectUri: undefined as string | undefined,
  keycloakLoginUrl: undefined as string | undefined,
};
