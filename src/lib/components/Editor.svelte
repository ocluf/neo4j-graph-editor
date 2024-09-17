<script lang="ts">
	import { Network } from 'vis-network';
	import { neo4jNetwork, settings } from '$lib/stores.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from './ui/badge';
	import { Label } from './ui/label';
	import { Input } from './ui/input';
	import Button from './ui/button/button.svelte';
	import { getOptions } from '$lib/networkOptions';
	import { throttle } from '$lib/utils';
	import CreateNodeDialog from './CreateNodeDialog.svelte';
	import Cypher from './Cypher.svelte';
	import { dev } from '$app/environment';
	let graph: HTMLDivElement;
	let changedProperties: Record<string, any> = $state({});
	let selectedNode = $derived(
		neo4jNetwork.selectedNodeId && neo4jNetwork.nodes.get(neo4jNetwork.selectedNodeId)
	);
	let network: Network;

	let nodeCreateDialogOpen = $state(false);
	let nodeCreateDialogConnectionNodeId = $state('');
	let onClose = $state(() => (nodeCreateDialogOpen = false));

	$effect(() => {
		const data = { nodes: neo4jNetwork.nodes, edges: neo4jNetwork.edges };
		network = new Network(graph, data, getOptions());

		network.on('selectNode', (params) => {
			const nodes = network.getSelectedNodes();
			const nodePosition = network.getPosition(nodes[0]);

			if (neo4jNetwork.isMouseInHoverArea(nodePosition.x, nodePosition.y)) {
				neo4jNetwork.selectedNodeId = null;
				network.unselectAll();
				return;
			}
			neo4jNetwork.selectedNodeId = params.nodes[0];
		});

		network.on('deselectNode', () => {
			neo4jNetwork.selectedNodeId = null;
		});

		network.on('dragStart', (params) => {
			console.log('dragStart', params);
			// Check if there's a node at the drag start location
			console.log('params.pointer.canvas', params.pointer.canvas);
			const nodeAtDragStart = network.getNodeAt({
				x: params.pointer.DOM.x,
				y: params.pointer.DOM.y
			});

			if (nodeAtDragStart === undefined) {
				return;
			}

			const nodePosition = network.getPosition(nodeAtDragStart);
			if (neo4jNetwork.isMouseInHoverArea(nodePosition.x, nodePosition.y)) {
				console.log('Node is in hover area at drag start');
				network.setOptions({
					physics: {
						enabled: false
					},
					interaction: {
						dragNodes: false,
						dragView: false
					}
				});
				neo4jNetwork.ghostNodeConnectionPosition = {
					x: nodePosition.x,
					y: nodePosition.y,
					nodeId: nodeAtDragStart
				};
				neo4jNetwork.addGhostNode();
			}
		});

		network.on('dragEnd', (params) => {
			console.log('dragEnd event triggered', params);

			if (!neo4jNetwork.ghostNodeConnectionPosition) {
				console.log('No ghost node connection position');
				return;
			}
			console.log('Ghost node connection position:', neo4jNetwork.ghostNodeConnectionPosition);

			const connectionNodeId = neo4jNetwork.ghostNodeConnectionPosition.nodeId;
			console.log('Connection node ID:', connectionNodeId);

			neo4jNetwork.removeGhostNode();
			console.log('Ghost node removed');

			network.setOptions({
				physics: {
					enabled: true
				},
				interaction: {
					dragNodes: true,
					dragView: true
				}
			});
			console.log('Network options reset');

			nodeCreateDialogConnectionNodeId = connectionNodeId;
			console.log('nodeCreateDialogConnectionNodeId set to:', nodeCreateDialogConnectionNodeId);

			nodeCreateDialogOpen = true;
			console.log('nodeCreateDialogOpen set to true');
		});
		network.on('doubleClick', (params) => {
			if (neo4jNetwork.selectedNodeId) {
				const cypher = `MATCH (n1)<-[r]->(n2) WHERE ID(n1)=${neo4jNetwork.selectedNodeId} RETURN n1,r,n2`;
				neo4jNetwork.loadCypher(cypher);
			}
		});

		const updateMousePosition = throttle((event: MouseEvent) => {
			const rect = graph.getBoundingClientRect();
			const position = network.DOMtoCanvas({
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			});

			neo4jNetwork.canvasMousePositionX = position.x;
			neo4jNetwork.canvasMousePositionY = position.y;
		}, 25);

		graph.addEventListener('mousemove', updateMousePosition);
		neo4jNetwork.initialize(settings.settings);

		return () => {
			graph.removeEventListener('mousemove', updateMousePosition);
		};
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
	{#if dev}
		<div class="absolute z-50 top-2 left-2">
			<Cypher />
			<p class="text-xs text-gray-500 ml-2">only visible in dev mode</p>
		</div>
	{/if}
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
					<div class="flex w-full justify-between mt-5">
						<Button
							variant="destructive"
							onclick={() => {
								neo4jNetwork.removeNodeFromDB(selectedNode.id);
								neo4jNetwork.selectedNodeId = null;
							}}>delete</Button
						>
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

<CreateNodeDialog
	open={nodeCreateDialogOpen}
	connectionNodeId={nodeCreateDialogConnectionNodeId}
	{onClose}
/>
