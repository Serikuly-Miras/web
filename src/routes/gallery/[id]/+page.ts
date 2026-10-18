import { error } from '@sveltejs/kit';
import photos from '../../../lib/gallery.ts';

export function entries() {
	return photos.map((photo) => ({ id: photo.id }));
}

export function load({ params }) {
	const photo = photos.find((p) => p.id === params.id);
	if (!photo) error(404, 'Photo not found');
	return { photo };
}
