<script lang="ts">
	import { Network } from 'vis-network';
	import { neo4jNetwork } from '$lib/stores.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from './ui/badge';
	import { Label } from './ui/label';
	import { Input } from './ui/input';
	import Button from './ui/button/button.svelte';
	import { getOptions } from '$lib/networkOptions';

	let graph: HTMLDivElement;
	let changedProperties: Record<string, any> = $state({});
	let selectedNode = $derived(
		neo4jNetwork.selectedNodeId && neo4jNetwork.nodes.get(neo4jNetwork.selectedNodeId)
	);
	let network: Network;

	$effect(() => {
		const data = { nodes: neo4jNetwork.nodes, edges: neo4jNetwork.edges };
		network = new Network(graph, data, getOptions());

		network.on('selectNode', (params) => {
			neo4jNetwork.selectedNodeId = params.nodes[0];
		});

		network.on('doubleClick', (params) => {
			const nodeId = params.nodes[0];
			neo4jNetwork.loadAdditionalConnections(nodeId);
		});
	});

	function handlePropertyChange(key: string, value: any) {
		console.log('handlePropertyChange', key, value);
		changedProperties[key] = value;
	}

	async function saveChanges() {
		if (neo4jNetwork.selectedNodeId) {
			const updates = Object.entries(changedProperties).map(([key, value]) => ({ key, value }));
			await neo4jNetwork.updateNodeProperty(neo4jNetwork.selectedNodeId, updates);
			changedProperties = {};
			const nodeId = neo4jNetwork.selectedNodeId;
			neo4jNetwork.selectedNodeId = null;
			neo4jNetwork.selectedNodeId = nodeId;
		}
	}
</script>

<div class="relative flex-grow">
	{#if selectedNode}
		<div class="absolute z-50 top-5 right-5 w-[275px]">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>{selectedNode.label}</Card.Title>
						<Badge variant="outline"><span class="mr-3">ID</span> {selectedNode.id}</Badge>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-4 py-4">
						{#each Object.entries(selectedNode.properties) as [key, value]}
							<div class="grid grid-cols-1 items-center gap-2">
								<Label for={key} class="mb-1">{key}</Label>
								<Input
									id={key}
									value={changedProperties[key] !== undefined ? changedProperties[key] : value}
									oninput={(e) => handlePropertyChange(key, e.currentTarget.value)}
									class="w-full"
								/>
							</div>
						{/each}
					</div>
					<div class="flex mt-5">
						<Button
							disabled={Object.keys(changedProperties).length === 0}
							onclick={saveChanges}
							class="ml-auto"
						>
							Save changes
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
	<div class="w-full h-full" bind:this={graph}></div>
</div>
