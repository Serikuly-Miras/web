import type { Attachment } from 'svelte/attachments';
import photos from '#lib/generated/gallery.json';

export type Meta = {
	title: string;
	time?: string;
	offset?: string;
	camera?: string;
	lens?: string;
	focalLength?: string;
	focalLength35?: string;
	aperture?: string;
	shutter?: string;
	iso?: number;
};

export type Photo = (typeof photos)[number] & { meta: Meta };

export default photos as Photo[];

// a photo at least this wide (width / height) gets a row of its own
const WIDE = 1.3;
// below this it is a portrait; portraits and squares only share rows with their own kind
const PORTRAIT = 0.9;
// from here on it is a panorama (xpan) and spans the whole column
const PANO = 2;
// narrower photos share a row while their ratios add up to at most this
const ROW = 2.4;
const PER_ROW = 3;

export type Row = { photos: Photo[]; width: number };

export const ratio = (photo: Photo) => photo.width / photo.height;
const solo = (photo: Photo) => ratio(photo) >= WIDE;

// width: fraction of the column the row fills; a lone landscape takes two thirds,
// a lone portrait or square a third, as if it shared a full row
function width(photos: Photo[]): number {
	if (photos.length > 1) return 1;
	const r = ratio(photos[0]);
	return r >= PANO ? 1 : r >= WIDE ? 2 / 3 : 1 / PER_ROW;
}

export function rows(photos: Photo[]): Row[] {
	const out: Photo[][] = [];
	// narrow photos fill the last unfilled row of their kind even across wide ones
	// in between, so portraits shot around a panorama still end up side by side
	const open = new Map<boolean, Photo[]>();
	for (const photo of photos) {
		if (solo(photo)) {
			out.push([photo]);
			continue;
		}
		const portrait = ratio(photo) < PORTRAIT;
		const row = open.get(portrait);
		const fits =
			row && row.length < PER_ROW && row.reduce((sum, p) => sum + ratio(p), ratio(photo)) <= ROW;
		if (fits) row.push(photo);
		else {
			out.push([photo]);
			open.set(portrait, out.at(-1)!);
		}
	}
	return out.map((photos) => ({ photos, width: width(photos) }));
}

export function details(photo: Photo): string {
	const { meta } = photo;
	return [
		[photo.date, meta.time, meta.offset].filter(Boolean).join(' '),
		meta.camera,
		meta.lens,
		meta.focalLength35 ? `${meta.focalLength} (${meta.focalLength35} eq.)` : meta.focalLength,
		meta.aperture,
		meta.shutter,
		meta.iso && `ISO ${meta.iso}`,
		`${((photo.width * photo.height) / 1_000_000).toFixed(1)} MP`
	]
		.filter(Boolean)
		.join(' · ');
}

export function megabytes(bytes: number): string {
	return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export const reveal: Attachment<HTMLImageElement> = (img) => {
	if (img.complete) return;
	img.classList.add('loading');
	const show = () => img.classList.remove('loading');
	img.addEventListener('load', show);
	img.addEventListener('error', show);
	return () => {
		img.removeEventListener('load', show);
		img.removeEventListener('error', show);
	};
};
