import { query } from '$app/server';

export const getServerTime = query.live(async function* () {
	while (true) {
		yield new Date().toISOString();
		await new Promise((r) => setTimeout(r, 100));
	}
});
