<!--
  @component

  The Editor component is the main interface for visualizing and interacting with a Neo4j graph database. It provides the following features:

  - Displays a network graph of nodes and edges using vis-network
  - Allows selection and editing of node properties
  - Supports creating new nodes and relationships
  - Provides a context menu for additional actions
  - Shows details of selected nodes and edges
  - Integrates with the Neo4jNetwork store for data management
  - Includes a Cypher query input in development mode

  Key interactions:
  - Click a node to select and view/edit its properties
  - Double-click a node to expand its relationships
  - Drag nodes to reposition them in the graph
  - Use the context menu for additional options

  Props:
  - None

  State:
  - changedProperties: Tracks modifications to node properties
  - selectedNode: Currently selected node
  - selectedEdge: Currently selected edge
  - nodeCreateDialogOpen: Controls visibility of node creation dialog
  - nodeCreateDialogConnectionNodeId: ID of node to connect when creating a new node

  Dependencies:
  - vis-network for graph visualization
  - neo4jNetwork and settings stores for data management
  - Various UI components from $lib/components/ui
-->
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
	let selectedEdge = $derived(
		neo4jNetwork.selectedEdgeId && neo4jNetwork.edges.get(neo4jNetwork.selectedEdgeId)
	);
	let network: Network;

	let open = $state(false);
	let nodeCreateDialogConnectionNodeId = $state('');
	let onClose = $state(() => (open = false));

	let newPropertyKey = $state('');
	let newPropertyValue = $state('');
	let showAddProperty = $state(false);

	let hasChanges = $derived(Object.keys(changedProperties).length > 0);

	$effect(() => {
		// Reset changes when selecting a different node or edge, or deselecting
		if (neo4jNetwork.selectedNodeId !== null || neo4jNetwork.selectedEdgeId !== null) {
			cancelChanges();
		}
	});

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

		network.on('selectEdge', (params) => {
			neo4jNetwork.selectedEdgeId = params.edges[0];
		});

		network.on('deselectEdge', (params) => {
			neo4jNetwork.selectedEdgeId = null;
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

			open = true;
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
		changedProperties[key] = value;
	}

	function deleteProperty(key: string) {
		changedProperties[key] = null; // Mark for deletion
	}

	function toggleAddProperty() {
		showAddProperty = !showAddProperty;
		if (!showAddProperty) {
			newPropertyKey = '';
			newPropertyValue = '';
		}
	}

	function addProperty() {
		if (newPropertyKey && newPropertyValue) {
			changedProperties[newPropertyKey] = newPropertyValue;
			newPropertyKey = '';
			newPropertyValue = '';
			showAddProperty = false;
		}
	}

	function isPropertyDeleted(key: string) {
		return changedProperties[key] === null;
	}

	function cancelChanges() {
		changedProperties = {};
		showAddProperty = false;
		newPropertyKey = '';
		newPropertyValue = '';
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
	{#if selectedEdge}
		<div class="absolute z-50 top-5 right-5 w-[275px]">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>{selectedEdge.label}</Card.Title>
						<Badge variant="outline"><span class="mr-3">ID</span> {selectedEdge.id}</Badge>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-4 py-4">
						<div class="grid grid-cols-1 items-center gap-2">
							<Label for="type" class="mb-1">Type</Label>
							<Input id="type" value={selectedEdge.label} readonly class="w-full" />
						</div>
					</div>
				</Card.Content>
			</Card.Root>
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
						{#each Object.entries( { ...selectedNode.properties, ...changedProperties } ) as [key, value]}
							{#if !isPropertyDeleted(key)}
								<div class="grid grid-cols-1 items-center gap-2">
									<div class="flex justify-between items-center">
										<Label for={key} class="mb-1">{key}</Label>
										<Button
											variant="ghost"
											size="icon"
											onclick={() => deleteProperty(key)}
											class="h-6 w-6 text-red-500 hover:text-red-700"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M3 6h18" />
												<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
												<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
											</svg>
										</Button>
									</div>
									<Input
										id={key}
										value={changedProperties[key] !== undefined ? changedProperties[key] : value}
										oninput={(e) => handlePropertyChange(key, e.currentTarget.value)}
										class="w-full"
									/>
								</div>
							{/if}
						{/each}
						<div class="grid grid-cols-1 items-center">
							<Button
								onclick={toggleAddProperty}
								class="flex items-center justify-center"
								variant="outline"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="mr-2"
								>
									{#if showAddProperty}
										<path d="M18 6L6 18" />
										<path d="M6 6l12 12" />
									{:else}
										<path d="M12 5v14M5 12h14" />
									{/if}
								</svg>
								{showAddProperty ? 'Cancel' : 'Add Property'}
							</Button>
							{#if showAddProperty}
								<div class="flex gap-2 mt-2">
									<Input
										id="newPropertyKey"
										placeholder="Key"
										bind:value={newPropertyKey}
										class="w-1/2"
									/>
									<Input
										id="newPropertyValue"
										placeholder="Value"
										bind:value={newPropertyValue}
										class="w-1/2"
									/>
								</div>
								<Button onclick={addProperty} class="mt-2">Add</Button>
							{/if}
						</div>
					</div>
					<div class="flex w-full justify-between">
						{#if hasChanges}
							<div class="flex justify-between gap-2 w-full">
								<Button variant="secondary" onclick={cancelChanges}>Cancel</Button>
								<Button onclick={saveChanges}>Save changes</Button>
							</div>
						{/if}
					</div>
					{#if selectedNode}
						<div class="mt-4">
							<Button
								variant="outline"
								class="text-red-500 hover:text-red-700 w-full flex items-center justify-center"
								onclick={() => {
									if (confirm('Are you sure you want to delete this node?')) {
										neo4jNetwork.removeNodeFromDB(selectedNode.id);
										neo4jNetwork.selectedNodeId = null;
									}
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="mr-2"
								>
									<path d="M3 6h18" />
									<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
									<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
								</svg>
								Delete Node
							</Button>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
	<div class="w-full h-full" bind:this={graph}></div>
</div>

<CreateNodeDialog bind:open connectionNodeId={nodeCreateDialogConnectionNodeId} {onClose} />
