import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import exifr from 'exifr';
import sharp, { type Metadata } from 'sharp';

const SRC = 'src/lib/gallery';
const OUT = 'static/gallery';
const MANIFEST = 'src/lib/generated/gallery.json';
const WIDTHS = [2560, 3840];

type Box = { type: string; body: number; end: number };

function* boxes(buf: Buffer, start: number, end: number): Generator<Box> {
	let pos = start;
	while (pos + 8 <= end) {
		let size = buf.readUInt32BE(pos);
		let body = pos + 8;
		if (size === 1) {
			size = Number(buf.readBigUInt64BE(body));
			body += 8;
		} else if (size === 0) size = end - pos;
		if (size < body - pos || pos + size > end) throw new Error('bad box');
		yield { type: buf.toString('latin1', pos + 4, pos + 8), body, end: pos + size };
		pos += size;
	}
}

function child(buf: Buffer, box: Box, type: string, skip = 0): Box | undefined {
	for (const b of boxes(buf, box.body + skip, box.end)) if (b.type === type) return b;
}

// AVIF keeps Exif and XMP (mime) as items: zero their bytes and retype the
// items so readers skip them. Pixels and colour info stay untouched.
function stripAvif(input: Buffer, file: string): Buffer {
	const buf = Buffer.from(input);
	try {
		const top = { type: '', body: 0, end: buf.length };
		const meta = child(buf, top, 'meta');
		const iinf = meta && child(buf, meta, 'iinf', 4);
		const iloc = meta && child(buf, meta, 'iloc', 4);
		if (!meta || !iinf || !iloc) throw new Error('no meta/iinf/iloc');
		const idat = child(buf, meta, 'idat', 4);

		const strip = new Set<number>();
		const iinfVersion = buf[iinf.body];
		const infeStart = iinf.body + 4 + (iinfVersion === 0 ? 2 : 4);
		for (const infe of boxes(buf, infeStart, iinf.end)) {
			const v = buf[infe.body];
			if (infe.type !== 'infe' || v < 2) continue;
			let p = infe.body + 4;
			const id = v === 2 ? buf.readUInt16BE(p) : buf.readUInt32BE(p);
			p += (v === 2 ? 2 : 4) + 2;
			const type = buf.toString('latin1', p, p + 4);
			if (type === 'Exif' || type === 'mime') {
				strip.add(id);
				buf.write('free', p, 'latin1');
			}
		}

		let p = iloc.body;
		const v = buf[p];
		const read = (n: number) => {
			const value = n === 0 ? 0 : n === 4 ? buf.readUInt32BE(p) : Number(buf.readBigUInt64BE(p));
			p += n;
			return value;
		};
		const offsetSize = buf[p + 4] >> 4;
		const lengthSize = buf[p + 4] & 15;
		const baseSize = buf[p + 5] >> 4;
		const indexSize = v > 0 ? buf[p + 5] & 15 : 0;
		p += 6;
		const count = v < 2 ? buf.readUInt16BE(p) : buf.readUInt32BE(p);
		p += v < 2 ? 2 : 4;
		for (let i = 0; i < count; i++) {
			const id = v < 2 ? buf.readUInt16BE(p) : buf.readUInt32BE(p);
			p += v < 2 ? 2 : 4;
			const method = v > 0 ? buf.readUInt16BE(p) & 15 : 0;
			p += (v > 0 ? 2 : 0) + 2;
			const base = read(baseSize);
			const extents = buf.readUInt16BE(p);
			p += 2;
			for (let e = 0; e < extents; e++) {
				read(indexSize);
				const offset = read(offsetSize);
				const length = read(lengthSize);
				if (!strip.has(id)) continue;
				if (method > 1 || (method === 1 && !idat)) throw new Error('unsupported item location');
				const start = (method === 1 ? idat!.body : 0) + base + offset;
				const end = length ? start + length : method === 1 ? idat!.end : buf.length;
				if (end > buf.length) throw new Error('item out of bounds');
				buf.fill(0, start, end);
			}
		}
		return buf;
	} catch (err) {
		throw new Error(
			`${file}: cannot strip AVIF metadata (${(err as Error).message}), re-export it`
		);
	}
}

function shutter(seconds: number): string {
	return seconds >= 1 ? `${+seconds.toFixed(1)}s` : `1/${Math.round(1 / seconds)}`;
}

// the darktable title names the photo (and its url), so exports keep camera filenames
const TITLE = /<dc:title>\s*<rdf:Alt>\s*<rdf:li[^>]*>([^<]+)<\/rdf:li>/;
const SLUG = /^[a-z0-9-]+$/;

// sharp extracts the EXIF block; exifr's own AVIF reader chokes on it
async function readTags(file: string, { exif: raw, xmp }: Metadata) {
	const title = xmp?.toString().match(TITLE)?.[1].trim();
	if (!title || !SLUG.test(title))
		throw new Error(`${file}: set a darktable title like "ducks" (a-z, 0-9, -)`);
	if (raw?.toString('latin1', 0, 6) === 'Exif\0\0') raw = raw.subarray(6);
	const exif = raw
		? await exifr.parse(raw, {
				// only these reach the site; everything else in the file is dropped
				pick: [
					'CreateDate',
					'OffsetTime',
					'Model',
					'LensModel',
					'FocalLength',
					'FocalLengthIn35mmFormat',
					'FNumber',
					'ExposureTime',
					'ISO'
				],
				// keep "2026:09:27 14:16:57" as written, so no timezone can shift the day
				reviveValues: false
			})
		: undefined;
	if (!exif?.CreateDate) throw new Error(`${file}: no CreateDate in EXIF, export with exif data`);
	const { CreateDate, OffsetTime, Model, LensModel, FocalLength, FocalLengthIn35mmFormat } = exif;
	const { FNumber, ExposureTime, ISO } = exif;
	const [day, time] = CreateDate.split(' ');
	const meta = Object.fromEntries(
		Object.entries({
			title,
			time,
			offset: OffsetTime,
			camera: Model,
			lens: LensModel,
			focalLength: FocalLength && `${+FocalLength.toFixed(1)}mm`,
			focalLength35: FocalLengthIn35mmFormat && `${FocalLengthIn35mmFormat}mm`,
			aperture: FNumber && `f/${+FNumber.toFixed(1)}`,
			shutter: ExposureTime && shutter(ExposureTime),
			iso: ISO
		}).filter(([, value]) => value)
	);
	return { date: day.replaceAll(':', '-'), title, meta };
}

async function mtime(file: string): Promise<number> {
	return (await stat(file).catch(() => null))?.mtimeMs ?? 0;
}

await mkdir(OUT, { recursive: true });
await mkdir(path.dirname(MANIFEST), { recursive: true });

const photos = [];
const expected = new Set<string>();
const sourceOf = new Map<string, string>();

for (const file of (await readdir(SRC)).filter((f) => f.endsWith('.avif')).sort()) {
	const src = path.join(SRC, file);
	const info = await sharp(src).metadata();
	const { width, height } = info;
	const { date, title, meta } = await readTags(src, info);
	const id = `${date}-${title}`;
	if (sourceOf.has(id)) throw new Error(`${src}: id ${id} is already used by ${sourceOf.get(id)}`);
	sourceOf.set(id, src);
	const original = `${id}.avif`;
	const widths = [...WIDTHS.filter((w) => w < width), Math.min(width, WIDTHS.at(-1)!)];
	const unique = [...new Set(widths)];

	const outputs = [original, ...unique.flatMap((w) => [`${id}-${w}.avif`, `${id}-${w}.jpg`])];
	outputs.forEach((f) => expected.add(f));

	const srcTime = await mtime(src);
	const stale = (await Promise.all(outputs.map((f) => mtime(path.join(OUT, f))))).some(
		(t) => t < srcTime
	);

	if (stale) {
		console.log(`gallery: building ${id}`);
		await writeFile(path.join(OUT, original), stripAvif(await readFile(src), src));
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

	const srcset = (ext: string) => unique.map((w) => `/gallery/${id}-${w}.${ext} ${w}w`).join(', ');

	photos.push({
		id,
		date,
		width,
		height,
		avif: srcset('avif'),
		jpg: srcset('jpg'),
		fallback: `/gallery/${id}-${unique.at(-1)}.jpg`,
		large: `/gallery/${id}-${unique.at(-1)}.avif`,
		original: `/gallery/${original}`,
		originalBytes: (await stat(path.join(OUT, original))).size,
		meta
	});
}

// newest shot first
photos.sort((a, b) => `${b.date} ${b.meta.time}`.localeCompare(`${a.date} ${a.meta.time}`));

for (const f of await readdir(OUT)) {
	if (!expected.has(f)) {
		console.log(`gallery: removing ${f}`);
		await rm(path.join(OUT, f));
	}
}

await writeFile(MANIFEST, JSON.stringify(photos, null, '\t') + '\n');
