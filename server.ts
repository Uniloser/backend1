import app from './src/app';
import { env } from './src/config/env';

app.listen(env.port, env.host, () => {
	console.log(`API listening on ${env.host}:${env.port}`);
});
// Application entry point stub.
// TODO: load environment configuration, create the Express app, register the
// HTTP middleware and route modules, attach the error handler, and start the
// server on the configured port.
