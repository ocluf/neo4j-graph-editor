<script>
	import { getNeo4jValue } from '$lib/utils';
	import networkStore from '$lib/store';
	let { nodeId } = $props();

	let properties = $state(null);
	let changedProperties = $state({});
	let isSaveActive = $state(false);

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
			Save Changes
		</button>
	</div>
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
	.save-button {
		background-color: #4caf50;
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
	.save-button:hover:not(:disabled) {
		background-color: #45a049;
	}
	.save-button:disabled {
		background-color: #cccccc;
		cursor: not-allowed;
	}
</style>
