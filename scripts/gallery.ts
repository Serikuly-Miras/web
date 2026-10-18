import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'src/lib/gallery';
const OUT = 'static/gallery';
const MANIFEST = 'src/lib/generated/gallery.json';
const WIDTHS = [2560, 3840];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEEP_CHUNKS = new Set([
	'IHDR',
	'PLTE',
	'IDAT',
	'IEND',
	'tRNS',
	'cHRM',
	'gAMA',
	'iCCP',
	'sRGB',
	'sBIT',
	'cICP',
	'mDCV',
	'cLLI'
]);

function stripPng(buf: Buffer): Buffer {
	const parts = [buf.subarray(0, 8)];
	let pos = 8;
	while (pos < buf.length) {
		const len = buf.readUInt32BE(pos);
		const type = buf.toString('latin1', pos + 4, pos + 8);
		const end = pos + 12 + len;
		if (KEEP_CHUNKS.has(type)) parts.push(buf.subarray(pos, end));
		pos = end;
	}
	return Buffer.concat(parts);
}

async function mtime(file: string): Promise<number> {
	return (await stat(file).catch(() => null))?.mtimeMs ?? 0;
}

async function readMeta(file: string): Promise<Record<string, unknown>> {
	const text = await readFile(file, 'utf8').catch(() => '');
	return text.trim() ? JSON.parse(text) : {};
}

await mkdir(OUT, { recursive: true });
await mkdir(path.dirname(MANIFEST), { recursive: true });

const photos = [];
const expected = new Set<string>();

for (const date of (await readdir(SRC)).sort().reverse()) {
	if (!DATE.test(date)) continue;
	const dir = path.join(SRC, date);
	const pngs = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort();

	for (const file of pngs) {
		const name = path.basename(file, '.png');
		const id = `${date}-${name}`;
		const src = path.join(dir, file);
		const { width, height } = await sharp(src).metadata();
		const widths = [...WIDTHS.filter((w) => w < width), Math.min(width, WIDTHS.at(-1)!)];
		const unique = [...new Set(widths)];

		const outputs = [`${id}.png`, ...unique.flatMap((w) => [`${id}-${w}.avif`, `${id}-${w}.jpg`])];
		outputs.forEach((f) => expected.add(f));

		const srcTime = await mtime(src);
		const stale = (await Promise.all(outputs.map((f) => mtime(path.join(OUT, f))))).some(
			(t) => t < srcTime
		);

		if (stale) {
			console.log(`gallery: building ${id}`);
			await writeFile(path.join(OUT, `${id}.png`), stripPng(await readFile(src)));
			for (const w of unique) {
				const resized = sharp(src).resize({ width: w });
				await resized
					.clone()
					.avif({ quality: 90, effort: 6 })
					.toFile(path.join(OUT, `${id}-${w}.avif`));
				await resized
					.clone()
					.jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
					.toFile(path.join(OUT, `${id}-${w}.jpg`));
			}
		}

		const srcset = (ext: string) =>
			unique.map((w) => `/gallery/${id}-${w}.${ext} ${w}w`).join(', ');

		photos.push({
			id,
			date,
			width,
			height,
			avif: srcset('avif'),
			jpg: srcset('jpg'),
			fallback: `/gallery/${id}-${unique.at(-1)}.jpg`,
			png: `/gallery/${id}.png`,
			pngBytes: (await stat(path.join(OUT, `${id}.png`))).size,
			meta: await readMeta(path.join(dir, `${name}.json`))
		});
	}
}

for (const f of await readdir(OUT)) {
	if (!expected.has(f)) {
		console.log(`gallery: removing ${f}`);
		await rm(path.join(OUT, f));
	}
}

await writeFile(MANIFEST, JSON.stringify(photos, null, '\t') + '\n');
