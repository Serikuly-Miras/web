<script lang="ts">
	import photos from './gallery.ts';
	import Photo from './Photo.svelte';

	let { ids }: { ids: string[] } = $props();

	// flex-grow proportional to aspect ratio with flex-basis 0 gives every photo the same height
	let ratios = $derived(
		ids.map((id) => {
			const photo = photos.find((p) => p.id === id);
			if (!photo) throw new Error(`PhotoRow: unknown id "${id}"`);
			return photo.width / photo.height;
		})
	);
	let total = $derived(ratios.reduce((sum, r) => sum + r, 0));
</script>

<div class="row">
	{#each ids as id, i (id)}
		<Photo {id} share={ratios[i] / total} />
	{/each}
</div>

<style>
	.row {
		display: flex;
		gap: 0.5rem;
	}

	@media (max-width: 640px) {
		.row {
			flex-direction: column;
			gap: 0;
		}
	}
</style>
