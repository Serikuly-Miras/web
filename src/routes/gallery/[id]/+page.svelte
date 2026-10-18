<script lang="ts">
	import { details, megabytes } from '../../../lib/gallery.ts';

	let { data } = $props();
	let photo = $derived(data.photo);

	let img: HTMLImageElement;
	let loaded = $state(false);
	let zoomed = $state(false);

	$effect(() => {
		if (img.complete) loaded = true;
	});
</script>

<svelte:head>
	<title>{photo.meta.title ?? photo.id} | s-miras</title>
</svelte:head>

<div class="viewer" class:zoomed>
	{#if !loaded}
		<p class="status"><small>loading png, {megabytes(photo.pngBytes)}</small></p>
	{/if}
	<button onclick={() => (zoomed = !zoomed)} title={zoomed ? 'fit to screen' : 'actual size'}>
		<img
			bind:this={img}
			class:loaded
			src={photo.png}
			width={photo.width}
			height={photo.height}
			alt={photo.meta.title ?? photo.id}
			onload={() => (loaded = true)}
			onerror={() => (loaded = true)}
		/>
	</button>
	<p class="info">
		<small>{details(photo)} · <a href="/gallery">gallery</a></small>
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
		visibility: hidden;
	}

	img.loaded {
		visibility: visible;
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
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
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
