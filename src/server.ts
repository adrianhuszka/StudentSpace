import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const defaultAllowedHosts = [
  'localhost',
  '127.0.0.1',
  'student-space.pollak.info',
  'api-student-space.pollak.info',
];

const allowedHosts = (process.env['FRONTEND_ALLOWED_HOSTS'] || defaultAllowedHosts.join(','))
  .split(',')
  .map((host) => host.trim())
  .filter((host) => host.length > 0);

const app = express();
const angularApp = new AngularNodeAppEngine({
  allowedHosts,
});

app.get('/runtime-config.js', (_req, res) => {
  const apiUrl = process.env['API_URL'] || 'http://localhost:8080/api/v1';
  const geminiApiKey = process.env['GEMINI_API_KEY'] || '';
  const runtimeConfig = { apiUrl, geminiApiKey };

  res
    .type('application/javascript')
    .set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    .send(`window.__STUDENTSPACE_CONFIG__ = ${JSON.stringify(runtimeConfig)};`);
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
