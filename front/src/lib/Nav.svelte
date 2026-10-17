<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let dark = $state(true);
	let ready = $state(false);

	const links = [
		{ href: '/', label: 'home' },
		{ href: '/articles', label: 'articles' },
		{ href: '/gallery', label: 'gallery' },
		{ href: '/contacts', label: 'contacts' }
	];

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
	{#each links as link (link.href)}
		<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}
			>{link.label}</a
		>
		&nbsp;|&nbsp;
	{/each}
	<button class="theme-toggle" onclick={toggle}
		>{ready ? (dark ? 'light' : 'dark') : '-----'}</button
	>
</nav>

<style>
	nav a,
	nav a:visited {
		color: var(--fg-muted);
	}

	nav a[aria-current='page'] {
		color: var(--fg);
	}
</style>
