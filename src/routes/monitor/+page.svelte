<script lang="ts">
	import { getServerTime } from './time.remote';

	const time = getServerTime();
</script>

<svelte:head>
	<title>Monitor | s-miras</title>
</svelte:head>

<article>
	<h1>Monitor</h1>
	<p>Server time: <strong>{await time}</strong></p>
</article>
