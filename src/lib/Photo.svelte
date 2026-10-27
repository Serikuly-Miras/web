<script lang="ts">
	import { reveal, type Photo } from './gallery.ts';

	let { photo }: { photo: Photo } = $props();
	let caption = $derived(
		[
			photo.meta.focalLength35 ? `${photo.meta.focalLength35} eq.` : photo.meta.focalLength,
			photo.meta.aperture,
			photo.meta.shutter,
			photo.meta.iso && `ISO ${photo.meta.iso}`
		].filter(Boolean)
	);
	const sizes = '(min-width: 640px) 608px, calc(100vw - 2rem)';
</script>

<figure>
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
				alt={photo.meta.title}
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
