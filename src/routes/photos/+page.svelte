<script lang="ts">
	import photos from '../../lib/gallery.ts';
	import Photo from '../../lib/Photo.svelte';

	// photos come sorted newest first, so each day is one run
	let days = Map.groupBy(photos, (photo) => photo.date);
</script>

<svelte:head>
	<title>photos | s-miras</title>
</svelte:head>

<article>
	<h2>Photos</h2>
	{#each days as [date, group] (date)}
		<section>
			<p class="day"><small>{date}</small></p>
			{#each group as photo (photo.id)}
				<Photo {photo} />
			{/each}
		</section>
	{/each}
</article>

<style>
	.day {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0 0 1rem;
	}

	.day::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--fg-muted);
	}
</style>
