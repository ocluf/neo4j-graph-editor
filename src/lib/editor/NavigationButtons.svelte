<script>
	import { createEventDispatcher } from 'svelte';

	import { editorState } from './editorState.svelte';
	import networkStore from '../../../src/lib/store';

	let { selectedNode = $bindable(), focusOnSelected, loadConnectionsForSelectedNode } = $props();

	let unsubscribeEditorState;

	function createNewNode() {
		//create new node and connect it to the selected node.
		const newId = networkStore.addNode(undefined, '', [], {});
		networkStore.addEdge(undefined, 'new edge', newId, selectedNode.id, undefined);
	}

	function deleteSelectedNode() {
		//TODO delete selected node from network.
	}

	function centerOnSelectedNode() {
		focusOnSelected();
	}

	let navCenterTitle = $derived(
		selectedNode ? 'focus on the selected node' : 'please select a node first'
	);
</script>

<nav>
	<ul id="graph_navigation">
		<!-- <li><button on:click={createNewNode}>New Node</button></li> -->
		<!-- <li><button on:click={deleteSelectedNode}>Delete Selected Node</button></li> -->
		{#if selectedNode}
			<li>
				<button
					id="nav_center"
					class="noselect"
					onclick={centerOnSelectedNode}
					disabled={!selectedNode}
					title={navCenterTitle}
				>
					focus on node
				</button>
			</li>
		{/if}
		{#if selectedNode}
			<li>
				<button
					id="nav_add"
					class="noselect"
					onclick={() => loadConnectionsForSelectedNode()}
					disabled={!selectedNode}
					title={navCenterTitle}
				>
					load connected nodes
				</button>
			</li>
		{/if}
	</ul>
</nav>

<style>
	ul#graph_navigation {
		list-style: none;
		margin: 0rem;
		margin-left: 1rem;
		padding: 0.25rem;
		display: flex;
	}
	ul#graph_navigation li {
		margin: 0;
		padding: 0;
	}

	button {
		margin: 0.25rem;
		padding: 0.25rem;
		border-radius: 0.5rem;
		border: 1px solid gray;
		box-shadow: 1px 1px 0px 1px lightgrey;
		background: #eee;
	}
</style>
