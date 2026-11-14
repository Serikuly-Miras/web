import designs from '#lib/generated/asic.json';

export type Layer = {
	name: string;
	z: number;
	thickness: number;
	color: string;
	nodes: Partial<Record<'logic' | 'filler', { node: string; shapes: number }>>;
};

export type Label = {
	text: string;
	position: [number, number, number];
	layer: string;
	direction: string;
	use: string;
};

export type Layout = {
	design: string;
	pdk: string;
	size: [number, number];
	die: { node: string; color: string; thickness: number };
	layers: Layer[];
	labels: Label[];
	stats: Record<string, Record<string, number>>;
};

export type Design = { id: string; glb: string; glbBytes: number; layout: Layout };

export default designs as unknown as Design[];

export function formatStat(value: number): string {
	return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)));
}
