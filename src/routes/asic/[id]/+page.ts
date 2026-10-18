import { error } from '@sveltejs/kit';
import designs from '../../../lib/asic.ts';

export function entries() {
	return designs.map((design) => ({ id: design.id }));
}

export function load({ params }) {
	const design = designs.find((d) => d.id === params.id);
	if (!design) error(404, 'Design not found');
	return { design };
}
