<script>
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { neo4jNetwork } from '$lib/stores.svelte';

	let cypherQuery = $state('');
	let isLoading = $state(false);

	async function runCypher() {
		isLoading = true;
		await neo4jNetwork.runCypher(cypherQuery);
		isLoading = false;
	}
</script>

<div class="flex items-center p-1 mx-auto">
	<div class="relative flex-grow">
		<Input
			type="text"
			placeholder="Enter Cypher query"
			class="w-[400px] pr-24 h-12"
			bind:value={cypherQuery}
		/>
		<Button
			onclick={runCypher}
			class="absolute right-1 top-1/2 transform -translate-y-1/2"
			disabled={isLoading || cypherQuery.trim() === ''}
		>
			{#if isLoading}
				Loading...
			{:else}
				Run Cypher
			{/if}
		</Button>
	</div>
</div>
