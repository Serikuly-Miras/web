<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
	import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
	import { formatStat, type Design } from './asic.ts';
	import { megabytes } from './gallery.ts';

	// Mounted inside {#key}, so a design never changes under a live viewer.
	let { design }: { design: Design } = $props();
	let layout = $derived(design.layout);

	let stage: HTMLDivElement;
	let received = $state(0);
	let loaded = $state(false);
	let failed = $state(false);
	let progress = $derived(Math.min(received / design.glbBytes, 1));

	let showFiller = $state(false);
	let showDie = $state(false);
	let showLabels = $state(false);
	let showPower = $state(false);
	let zScale = $state(2);
	let layerOff = $state<Record<string, boolean>>({});

	// Scene objects, filled in once the model is parsed; the visibility effect reruns on `loaded`.
	let model: THREE.Object3D | undefined;
	let pins: THREE.Group | undefined;

	$effect(() => {
		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setPixelRatio(devicePixelRatio);
		stage.append(renderer.domElement);
		const labelRenderer = new CSS2DRenderer();
		labelRenderer.domElement.className = 'labels';
		stage.append(labelRenderer.domElement);

		const [w, h] = layout.size;
		const span = Math.max(w, h);
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, 1, span / 1000, span * 20);
		camera.position.set(-0.7 * span, 0.9 * span, 0.9 * span);
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;

		scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
		const sun = new THREE.DirectionalLight(0xffffff, 1.4);
		sun.position.set(1, 2, 1.5);
		scene.add(sun);
		// Weaker fill from below so the underside isn't flat when viewed from under the chip.
		const under = new THREE.DirectionalLight(0xffffff, 0.9);
		under.position.set(-1, -2, -1.5);
		scene.add(under);

		const resize = () => {
			const { clientWidth: cw, clientHeight: ch } = stage;
			camera.aspect = cw / ch;
			camera.updateProjectionMatrix();
			renderer.setSize(cw, ch);
			labelRenderer.setSize(cw, ch);
		};
		const resizer = new ResizeObserver(resize);
		resizer.observe(stage);

		// Follow the site theme: the nav toggles `light` on <html>.
		const theme = () => {
			const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
			scene.background = new THREE.Color(bg);
		};
		theme();
		const themer = new MutationObserver(theme);
		themer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		// Edge pins are nudged outward so the text sits just off the die.
		const labels = new THREE.Group();
		const nudge = span * 0.03;
		for (const label of layout.labels) {
			const power = label.use === 'power' || label.use === 'ground';
			const el = document.createElement('div');
			el.className = power ? 'pin power' : 'pin';
			el.textContent = label.text;
			const pin = new CSS2DObject(el);
			let [x, y, z] = label.position;
			if (!power) {
				if (w / 2 - Math.abs(x) < h / 2 - Math.abs(z)) x += Math.sign(x) * nudge;
				else z += Math.sign(z) * nudge;
			}
			pin.position.set(x, y, z);
			pin.userData = { y, power };
			labels.add(pin);
		}

		const controller = new AbortController();
		(async () => {
			try {
				const res = await fetch(design.glb, { signal: controller.signal });
				if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
				const reader = res.body.getReader();
				const chunks: Uint8Array<ArrayBuffer>[] = [];
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					chunks.push(value);
					received += value.length;
				}
				const buffer = await new Blob(chunks).arrayBuffer();
				const gltf = await new GLTFLoader().parseAsync(buffer, '');
				if (controller.signal.aborted) return;
				// Labels join the scene with the model so they don't float alone while it loads.
				model = gltf.scene;
				pins = labels;
				scene.add(model, pins);
				loaded = true;
			} catch {
				if (!controller.signal.aborted) failed = true;
			}
		})();

		renderer.setAnimationLoop(() => {
			controls.update();
			renderer.render(scene, camera);
			labelRenderer.render(scene, camera);
		});

		return () => {
			controller.abort();
			renderer.setAnimationLoop(null);
			resizer.disconnect();
			themer.disconnect();
			controls.dispose();
			scene.traverse((obj) => {
				if (obj instanceof THREE.Mesh) {
					obj.geometry.dispose();
					for (const m of [obj.material].flat()) m.dispose();
				}
			});
			renderer.dispose();
			stage.replaceChildren();
			model = pins = undefined;
			loaded = false;
		};
	});

	$effect(() => {
		if (!loaded || !model || !pins) return;
		for (const layer of layout.layers) {
			for (const [kind, node] of Object.entries(layer.nodes)) {
				const obj = model.getObjectByName(node.node);
				if (obj) obj.visible = !layerOff[layer.name] && (kind === 'logic' || showFiller);
			}
		}
		const die = model.getObjectByName(layout.die.node);
		if (die) die.visible = showDie;
		model.scale.y = zScale;
		for (const pin of pins.children) {
			pin.visible = pin.userData.power ? showPower : showLabels;
			pin.position.y = pin.userData.y * zScale;
		}
	});
</script>

<div class="viewer">
	<div class="stage" bind:this={stage}></div>

	{#if !loaded}
		<div class="status" aria-live="polite">
			{#if failed}
				<small>failed to load {design.glb}</small>
			{:else}
				<small>loading model · {megabytes(received)} / {megabytes(design.glbBytes)}</small>
				<div
					class="bar"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(progress * 100)}
				>
					<div style:width="{progress * 100}%"></div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="panel">
		<div>{layout.design}</div>
		<small>{layout.pdk} · {layout.size[0]} × {layout.size[1]} µm</small>

		<details>
			<summary>layers</summary>
			{#each layout.layers as layer (layer.name)}
				<label>
					<input
						type="checkbox"
						checked={!layerOff[layer.name]}
						onchange={(e) => (layerOff[layer.name] = !e.currentTarget.checked)}
					/>
					<span class="swatch" style:background={layer.color}></span>
					{layer.name}
					<small>{layer.nodes.logic?.shapes ?? 0}</small>
				</label>
			{/each}
		</details>

		<details>
			<summary>show</summary>
			<label><input type="checkbox" bind:checked={showFiller} /> filler cells</label>
			<label><input type="checkbox" bind:checked={showDie} /> die</label>
			<label><input type="checkbox" bind:checked={showLabels} /> pin labels</label>
			<label><input type="checkbox" bind:checked={showPower} /> power labels</label>
			<label>
				<span>z ×{zScale}</span>
				<input type="range" min="1" max="20" step="0.5" bind:value={zScale} />
			</label>
		</details>

		<details>
			<summary>info</summary>
			<table>
				<tbody>
					{#each Object.entries(layout.stats) as [section, rows] (section)}
						<tr><th colspan="2">{section}</th></tr>
						{#each Object.entries(rows) as [name, value] (name)}
							<tr><td>{name}</td><td>{formatStat(value)}</td></tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</details>
	</div>

	<p class="info">
		<small>drag to orbit · right-drag to pan · scroll to zoom · <a href="/blog">blog</a></small>
	</p>
</div>

<style>
	.viewer {
		position: fixed;
		inset: 0;
		background: var(--bg);
		display: flex;
		flex-direction: column;
	}

	.stage {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.stage :global(canvas) {
		display: block;
	}

	.stage :global(.labels) {
		position: absolute;
		top: 0;
		pointer-events: none;
	}

	.stage :global(.pin) {
		padding: 0 0.25rem;
		background: var(--bg);
		color: var(--fg);
		white-space: nowrap;
	}

	.stage :global(.pin.power) {
		color: var(--fg-muted);
	}

	.panel {
		position: absolute;
		top: 1rem;
		left: 1rem;
		max-width: calc(100% - 2rem);
		max-height: calc(100% - 5rem);
		overflow: auto;
		padding: 0.5rem 0.75rem;
		background: var(--bg);
	}

	summary {
		cursor: pointer;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	input {
		accent-color: var(--fg);
	}

	.swatch {
		width: 0.75rem;
		height: 0.75rem;
	}

	table {
		border-collapse: collapse;
	}

	th {
		text-align: left;
		font-weight: inherit;
		color: var(--fg-muted);
		padding-top: 0.5rem;
	}

	td + td {
		text-align: right;
		padding-left: 1rem;
	}

	.status {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.bar {
		width: 12rem;
		height: 2px;
		background: var(--fg-muted);
	}

	.bar div {
		height: 100%;
		background: var(--fg);
	}

	.info {
		margin: 0;
		padding: 0.5rem 1rem;
		text-align: center;
	}
</style>
