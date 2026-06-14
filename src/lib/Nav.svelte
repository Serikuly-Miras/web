<script lang="ts">
	import { onMount } from 'svelte';

	let dark = $state(true);
	let ready = $state(false);

	onMount(() => {
		dark = localStorage.getItem('theme') !== 'light';
		ready = true;
	});

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('light', !dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}
</script>

<nav>
	<a href="/">home</a>
	&nbsp;|&nbsp;
	<a href="/cv">cv</a>
	&nbsp;|&nbsp;
	<button class="theme-toggle" onclick={toggle}
		>{ready ? (dark ? 'light' : 'dark') : '-----'}</button
	>
</nav>
