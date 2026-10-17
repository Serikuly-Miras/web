<svelte:head>
	<title>contacts | s-miras</title>
</svelte:head>

<article>
	<h2>Contacts</h2>
	<ul class="contacts">
		<li><a href="https://t.me/@serikuly_miras">Telegram</a></li>
		<li><a href="https://github.com/Serikuly-Miras">GitHub</a></li>
		<li><a href="https://www.linkedin.com/in/serikuly-miras/">LinkedIn</a></li>
		<li>
			<a href="https://almaty.hh.kz/resume/e5101efeff0c336d4b0039ed1f757454556c32">HeadHunter</a>
		</li>
		<li><a href="mailto:serikuly.miras.16@gmail.com">Gmail</a></li>
	</ul>
</article>

<style>
	.contacts {
		display: flex;
		flex-wrap: wrap;
		list-style: none;
		padding: 0;
	}

	.contacts li + li::before {
		content: '';
		display: inline-block;
		width: 1px;
		height: 0.8em;
		margin: 0 0.75rem;
		vertical-align: middle;
		background: var(--fg-muted);
	}
</style>
