<script lang="ts">
	import { details, megabytes } from '../../../lib/gallery.ts';

	let { data } = $props();
	let photo = $derived(data.photo);

	let src = $state<string>();
	let received = $state(0);
	let loading = $state(false);
	let loaded = $state(false);
	let zoomed = $state(false);
	let progress = $derived(Math.min(received / photo.pngBytes, 1));

	let filename = $derived(photo.png.split('/').pop());

	$effect(() => {
		const url = photo.png;
		const controller = new AbortController();
		let blobUrl: string | undefined;
		received = 0;
		loaded = false;
		loading = true;
		src = undefined;

		(async () => {
			try {
				const res = await fetch(url, { signal: controller.signal });
				if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
				const reader = res.body.getReader();
				const chunks: Uint8Array<ArrayBuffer>[] = [];
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					chunks.push(value);
					received += value.length;
				}
				blobUrl = URL.createObjectURL(new Blob(chunks, { type: 'image/png' }));
				src = blobUrl;
			} catch {
				if (!controller.signal.aborted) src = url;
			}
		})();

		return () => {
			controller.abort();
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	});
</script>

<svelte:head>
	<title>{photo.meta.title ?? photo.id} | s-miras</title>
</svelte:head>

<div class="viewer" class:zoomed>
	<button onclick={() => (zoomed = !zoomed)} title={zoomed ? 'fit to screen' : 'actual size'}>
		{#if src}
			<img
				class:hidden={!loaded}
				{src}
				width={photo.width}
				height={photo.height}
				alt={photo.meta.title ?? photo.id}
				onload={() => (loaded = true)}
				onerror={() => (loaded = true)}
			/>
		{/if}
		<noscript>
			<img
				src={photo.png}
				width={photo.width}
				height={photo.height}
				alt={photo.meta.title ?? photo.id}
			/>
		</noscript>
	</button>
	{#if loading && !loaded}
		<div class="status" aria-live="polite">
			<small>loading png · {megabytes(received)} / {megabytes(photo.pngBytes)}</small>
			<div
				class="bar"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(progress * 100)}
			>
				<div style:width="{progress * 100}%"></div>
			</div>
		</div>
	{/if}
	<p class="info">
		<small
			>{details(photo)} · <a href={src ?? photo.png} download={filename}>save</a> ·
			<a href="/photos">photos</a></small
		>
	</p>
</div>

<style>
	.viewer {
		position: fixed;
		inset: 0;
		overflow: auto;
		background: var(--bg);
		display: flex;
		flex-direction: column;
	}

	button {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: 0;
		cursor: zoom-in;
	}

	img {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
	}

	:global(:root.light) img {
		outline: 1px solid var(--fg-muted);
		outline-offset: -1px;
	}

	img.hidden {
		visibility: hidden;
	}

	.zoomed button {
		flex: none;
		display: block;
		cursor: zoom-out;
	}

	.zoomed img {
		max-width: none;
		max-height: none;
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

	.zoomed .info {
		display: none;
	}
</style>
