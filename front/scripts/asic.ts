import { copyFile, link, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'src/lib/asic';
const OUT = 'static/asic';
const MANIFEST = 'src/lib/generated/asic.json';

async function mtime(file: string): Promise<number> {
	return (await stat(file).catch(() => null))?.mtimeMs ?? 0;
}

await mkdir(OUT, { recursive: true });
await mkdir(path.dirname(MANIFEST), { recursive: true });

const designs = [];
const expected = new Set<string>();

for (const id of (await readdir(SRC).catch(() => [])).sort()) {
	const dir = path.join(SRC, id);
	const json = path.join(dir, 'layout.json');
	const glb = path.join(dir, 'layout.glb');
	if (!(await mtime(json))) continue;
	if (!(await mtime(glb))) {
		console.warn(`asic: skipping ${id}, no layout.glb`);
		continue;
	}

	const out = path.join(OUT, `${id}.glb`);
	expected.add(`${id}.glb`);
	if ((await mtime(out)) < (await mtime(glb))) {
		console.log(`asic: linking ${id}`);
		await rm(out, { force: true });
		await link(glb, out).catch(() => copyFile(glb, out));
	}

	designs.push({
		id,
		glb: `/asic/${id}.glb`,
		glbBytes: (await stat(out)).size,
		layout: JSON.parse(await readFile(json, 'utf8'))
	});
}

for (const f of await readdir(OUT)) {
	if (!expected.has(f)) {
		console.log(`asic: removing ${f}`);
		await rm(path.join(OUT, f));
	}
}

await writeFile(MANIFEST, JSON.stringify(designs, null, '\t') + '\n');
