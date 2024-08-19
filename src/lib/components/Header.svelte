<script>
	import Settings from '$lib/settings/Settings.svelte';
</script>

<span id="header">
	<h1>Neo4j Graph Editor</h1>
	<nav>
		<Settings />
	</nav>
</span>

<style>
	#header {
		display: flex;
		justify-content: space-between;
		padding: 0 0.25em;

		height: 100%;
		width: 100%;

		font-size: 1.5em;
	}

	h1 {
		padding: 0;
		margin: auto 0;
		font-size: inherit;
	}

	nav {
		display: flex;
	}
</style>
