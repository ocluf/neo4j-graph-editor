<script>
	import { neo4jNetwork, settings } from '$lib/stores.svelte';
	import Settings from './Settings.svelte';
</script>

<header class="flex items-center justify-between px-6 py-4 bg-white border-b">
	<div class="flex items-center space-x-4">
		<h1 class="text-xl font-bold">Neo4j Node Editor</h1>
	</div>

	<nav class="flex items-center space-x-4">
		<Settings />
	</nav>
</header>
