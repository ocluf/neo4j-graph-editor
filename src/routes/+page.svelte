<script>
	import Editor from '$lib/components/Editor.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import { settings } from '$lib/stores.svelte';
</script>

<div class="flex flex-col h-screen">
	<Header />
	{#if settings.settings.password && settings.settings.user && settings.settings.server && !settings.settings.initialCypher}
		<Editor />
	{:else}
		<div class="flex flex-col items-center justify-center h-screen">
			<h1 class="text-4xl font-bold">No proper settings found</h1>
			<p class="text-lg">Please configure the Neo4j connection settings with the settings button</p>
		</div>
	{/if}
	<Footer />
</div>
