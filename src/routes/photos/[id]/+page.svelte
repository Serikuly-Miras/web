<script lang="ts">
	import { details, megabytes } from '../../../lib/gallery.ts';

	let { data } = $props();
	let photo = $derived(data.photo);

	// the 4k avif shows right away; the lossless original only loads on request
	let lossless = $state(false);
	let src = $state<string>();
	let received = $state(0);
	let loaded = $state(false);
	let zoomed = $state(false);

	let filename = $derived(photo.original.split('/').pop()!);

	$effect(() => {
		if (!lossless) return;
		const url = photo.original;
		const controller = new AbortController();
		let blobUrl: string | undefined;
		received = 0;
		loaded = false;
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
				blobUrl = URL.createObjectURL(new Blob(chunks, { type: 'image/avif' }));
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
	<title>{photo.meta.title} | s-miras</title>
</svelte:head>

<div class="viewer" class:zoomed>
	<button onclick={() => (zoomed = !zoomed)} title={zoomed ? 'fit to screen' : 'actual size'}>
		<picture class:hidden={loaded}>
			<source type="image/avif" srcset={photo.large} />
			<img src={photo.fallback} width={photo.width} height={photo.height} alt={photo.meta.title} />
		</picture>
		{#if src}
			<img
				class:hidden={!loaded}
				{src}
				width={photo.width}
				height={photo.height}
				alt={photo.meta.title}
				onload={() => (loaded = true)}
				onerror={() => (loaded = true)}
			/>
		{/if}
	</button>
	<p class="info">
		<small
			>{details(photo)} ·
			{#if !lossless}
				<button class="link" onclick={() => (lossless = true)}>show lossless</button> ·
			{:else if !loaded}
				<span aria-live="polite"
					>loading lossless {megabytes(received)} / {megabytes(photo.originalBytes)}</span
				> ·
			{/if}
			<a href={src ?? photo.original} download={filename}>save</a> ·
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

	picture {
		display: contents;
	}

	.hidden {
		display: none;
	}

	button.link {
		flex: none;
		display: inline;
		font: inherit;
		color: var(--fg);
		text-decoration: underline;
		cursor: pointer;
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

	.info {
		margin: 0;
		padding: 0.5rem 1rem;
		text-align: center;
	}

	.zoomed .info {
		display: none;
	}
</style>
