<script>
	import { getNeo4jValue } from '$lib/utils';
	import networkStore from '$lib/store';
	let { nodeId, selectedNode = $bindable() } = $props();

	let properties = $state(null);
	let changedProperties = $state({});
	let isSaveActive = $state(false);
	let showAddNodeForm = $state(false);
	let newNodeName = $state('');
	let newNodeGroup = $state('');
	let newNodeDirection = $state('outgoing');
	let newEdgeName = $state('');

	networkStore.dataStore.subscribe((store) => {
		const node = store.nodes.get(nodeId);
		if (node) {
			properties = node.properties;
			changedProperties = {};
			isSaveActive = false;
		}
	});

	function handlePropertyChange(key, value) {
		changedProperties[key] = value;
		isSaveActive = Object.keys(changedProperties).length > 0;
	}

	function saveChanges() {
		const updates = Object.entries(changedProperties).map(([key, value]) => ({ key, value }));
		networkStore.updateNodeProperty(nodeId, updates);
		changedProperties = {};
		isSaveActive = false;
	}

	function showAddNodeDialog() {
		showAddNodeForm = true;
	}

	function cancelAddNode() {
		showAddNodeForm = false;
		newNodeName = '';
		newNodeGroup = '';
		newNodeDirection = 'outgoing';
		newEdgeName = '';
	}

	async function saveNewNode() {
		if (newNodeName && newNodeGroup && newEdgeName) {
			await networkStore.addNodeToDB(
				nodeId,
				newEdgeName,
				newNodeDirection,
				newNodeGroup,
				newNodeName
			);
			cancelAddNode();
		}
	}
</script>

<filedset>
	<legend>
		<h3>Properties</h3>
	</legend>
	<form class="properties">
		{#each Object.keys(properties) as key}
			<label for={key}>{key}</label>
			<input
				type="text"
				id={key}
				name={key}
				value={changedProperties[key] !== undefined
					? changedProperties[key]
					: getNeo4jValue(properties[key])}
				oninput={(e) => handlePropertyChange(key, e.target.value)}
			/>
		{/each}
	</form>
	<div class="button-container">
		<button type="button" class="save-button" disabled={!isSaveActive} onclick={saveChanges}>
			Save Property Changes
		</button>
	</div>
	<div class="button-container">
		<button class="action-button add-button" onclick={showAddNodeDialog} disabled={showAddNodeForm}
			>Add Node</button
		>
		<button
			class="action-button remove-button"
			onclick={() => networkStore.removeNodeFromDB(nodeId)}
			disabled={showAddNodeForm}>Remove Node</button
		>
	</div>
	{#if showAddNodeForm}
		<div class="add-node-form">
			<h4>Add New Node</h4>
			<label for="newNodeName">Name:</label>
			<input type="text" id="newNodeName" bind:value={newNodeName} />
			<label for="newNodeGroup">Group:</label>
			<input type="text" id="newNodeGroup" bind:value={newNodeGroup} />
			<label for="newEdgeName">Edge Name:</label>
			<input type="text" id="newEdgeName" bind:value={newEdgeName} />
			<label for="newNodeDirection">Direction:</label>
			<select id="newNodeDirection" bind:value={newNodeDirection}>
				<option value="outgoing">Outgoing</option>
				<option value="incoming">Incoming</option>
			</select>
			<div class="button-container">
				<button class="action-button save-button" onclick={saveNewNode}>Save</button>
				<button class="action-button cancel-button" onclick={cancelAddNode}>Cancel</button>
			</div>
		</div>
	{/if}
</filedset>

<style>
	.properties {
		display: grid;
		grid-template-columns: min-content 1fr;
		align-items: center;
	}
	.properties label {
		text-align: right;
		margin-top: 0.5em;
		margin-right: 0.5em;
	}
	.button-container {
		display: flex;
		justify-content: flex-end;
		margin-top: 1em;
	}
	.save-button,
	.action-button {
		border: none;
		color: white;
		padding: 10px 20px;
		text-align: center;
		text-decoration: none;
		display: inline-block;
		font-size: 16px;
		margin: 4px 2px;
		cursor: pointer;
		border-radius: 4px;
		transition: background-color 0.3s;
	}
	.save-button {
		background-color: #4caf50;
	}
	.save-button:hover:not(:disabled) {
		background-color: #45a049;
	}
	.save-button:disabled {
		background-color: #cccccc;
		cursor: not-allowed;
	}
	.add-button {
		background-color: #008cba;
	}
	.add-button:hover:not(:disabled) {
		background-color: #007b9a;
	}
	.remove-button {
		background-color: #f44336;
	}
	.remove-button:hover:not(:disabled) {
		background-color: #da190b;
	}
	.cancel-button {
		background-color: #f44336;
	}
	.cancel-button:hover {
		background-color: #da190b;
	}
	.add-node-form {
		margin-top: 1em;
		padding: 1em;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	.add-node-form label {
		display: block;
		margin-top: 0.5em;
	}
	.add-node-form input,
	.add-node-form select {
		width: 100%;
		padding: 0.5em;
		margin-top: 0.25em;
	}
	.action-button:disabled {
		background-color: #cccccc;
		cursor: not-allowed;
	}
</style>
