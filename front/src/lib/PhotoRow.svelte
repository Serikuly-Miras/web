<script lang="ts">
	import { ratio, type Row } from './gallery.ts';
	import Photo from './Photo.svelte';

	let { row }: { row: Row } = $props();

	// flex-grow proportional to aspect ratio with flex-basis 0 gives every photo the same height;
	// scaled to row.width, the grows sum below 1 and leave the rest of the row empty
	let ratios = $derived(row.photos.map(ratio));
	let total = $derived(ratios.reduce((sum, r) => sum + r, 0));
</script>

<div class="row">
	{#each row.photos as photo, i (photo.id)}
		<Photo {photo} share={(ratios[i] / total) * row.width} />
	{/each}
</div>

<style>
	.row {
		display: flex;
		gap: 0.5rem;
	}
</style>
