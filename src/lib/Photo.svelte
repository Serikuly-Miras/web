<script lang="ts">
	import photos, { reveal } from './gallery.ts';

	// share: fraction of the column width this photo takes (set by PhotoRow)
	let { id, share = 1 }: { id: string; share?: number } = $props();

	let photo = $derived.by(() => {
		const found = photos.find((p) => p.id === id);
		if (!found) throw new Error(`Photo: unknown id "${id}"`);
		return found;
	});
	let caption = $derived(
		[
			photo.meta.focalLength,
			photo.meta.aperture,
			photo.meta.shutter,
			photo.meta.iso && `ISO ${photo.meta.iso}`
		].filter(Boolean)
	);
	let sizes = $derived(`(min-width: 640px) ${Math.ceil(608 * share)}px, calc(100vw - 2rem)`);
</script>

<figure style:flex={share}>
	<a href="/photos/{photo.id}" target="_blank" rel="noopener">
		<picture>
			<source type="image/avif" srcset={photo.avif} {sizes} />
			<img
				{@attach reveal}
				src={photo.fallback}
				srcset={photo.jpg}
				{sizes}
				width={photo.width}
				height={photo.height}
				loading="lazy"
				decoding="async"
				alt={photo.meta.title ?? photo.id}
			/>
		</picture>
	</a>
	<figcaption>
		<!-- each value stays whole; lines may only break after a separator -->
		<small
			>{#each caption as part, i}{#if i}&nbsp;·{' '}{/if}<span>{part}</span>{/each}</small
		>
	</figcaption>
</figure>

<style>
	figure {
		margin: 0 0 2rem;
		min-width: 0;
	}

	img {
		display: block;
		width: 100%;
		height: auto;
	}

	:global(:root.light) img {
		outline: 1px solid var(--fg-muted);
		outline-offset: -1px;
	}

	img:global(.loading) {
		visibility: hidden;
	}

	figcaption {
		margin-top: 0.5rem;
	}

	figcaption span {
		white-space: nowrap;
	}
</style>
