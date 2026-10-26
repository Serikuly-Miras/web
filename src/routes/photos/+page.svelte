<script lang="ts">
	import Photo from '../../lib/Photo.svelte';
	import PhotoRow from '../../lib/PhotoRow.svelte';
</script>

<svelte:head>
	<title>photos | s-miras</title>
</svelte:head>

<article>
	<h2>Photos</h2>
	<PhotoRow ids={['2026-08-21-building', '2026-08-21-chestnut', '2026-08-21-bark']} />
	<Photo id="2026-09-27-ducks" />
</article>
