import type { Attachment } from 'svelte/attachments';
import photos from '#lib/generated/gallery.json';

export type Meta = {
	title?: string;
	camera?: string;
	lens?: string;
	focalLength?: string;
	aperture?: string;
	shutter?: string;
	iso?: number;
};

export type Photo = (typeof photos)[number] & { meta: Meta };

export default photos as Photo[];

export function details(photo: Photo, { withLens = true } = {}): string {
	const { meta } = photo;
	return [
		photo.date,
		meta.camera,
		withLens && meta.lens,
		meta.focalLength,
		meta.aperture,
		meta.shutter,
		meta.iso && `ISO ${meta.iso}`
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
