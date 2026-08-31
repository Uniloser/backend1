const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
const endpoint = `${apiUrl.replace(/\/$/, '')}/discover`;

async function main(): Promise<void> {
	console.log(`Testing ${endpoint}`);

	try {
		const response = await fetch(endpoint);
		const body = await response.text();

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
		}

		console.log(`PASS: backend responded with HTTP ${response.status}`);
		console.log(`Response: ${body.slice(0, 200)}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`FAIL: could not reach the backend: ${message}`);
		process.exitCode = 1;
	}
}

void main();