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

export function details(photo: Photo): string {
	const { meta } = photo;
	return [
		[photo.date, meta.time, meta.offset].filter(Boolean).join(' '),
		meta.camera,
		meta.lens,
		meta.focalLength35 ? `${meta.focalLength} (${meta.focalLength35} eq.)` : meta.focalLength,
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
