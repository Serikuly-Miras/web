<script lang="ts">
	import photos, { details, megabytes, reveal } from '../../lib/gallery.ts';
	const sizes = '(min-width: 640px) 608px, calc(100vw - 2rem)';
</script>

<svelte:head>
	<title>photos | s-miras</title>
</svelte:head>

<article>
	<h2>Photos</h2>
	{#each photos as photo (photo.id)}
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
						alt={photo.meta.title ?? photo.id}
					/>
				</picture>
			</a>
			<figcaption>
				{#if photo.meta.title}{photo.meta.title}<br />{/if}
				<small>
					{details(photo, { withLens: false })} ·
					<a href="/photos/{photo.id}" target="_blank" rel="noopener"
						>png, {megabytes(photo.pngBytes)}</a
					>
				</small>
			</figcaption>
		</figure>
	{:else}
		<p>Nothing here yet.</p>
	{/each}
</article>

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
</style>
