<script lang="ts">
	import ChipViewer from '../../../lib/ChipViewer.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.design.layout.design} | s-miras</title>
</svelte:head>

{#key data.design.id}
	<ChipViewer design={data.design} />
{/key}
