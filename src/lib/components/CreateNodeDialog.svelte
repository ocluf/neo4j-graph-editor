<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Select from '$lib/components/ui/select';
	import { neo4jNetwork } from '$lib/stores.svelte';

	let {
		open = $bindable(),
		connectionNodeId,
		onClose
	}: { open: boolean; connectionNodeId: string; onClose: () => void } = $props();

	let direction: 'incoming' | 'outgoing' = $state('outgoing');
	let selectedLabel = $state('MENU');
	let nodeName = $state('name');
	let edgeName = $state('CMD');

	const labels = ['MENU', 'PERSON']; // Add more labels as needed

	function handleSave() {
		console.log('Adding node to DB:', {
			nodeId: connectionNodeId,
			edgeName,
			edgeDirection: direction,
			group: selectedLabel,
			nodeName
		});

		neo4jNetwork.addNodeToDB({
			nodeId: connectionNodeId,
			edgeName: edgeName,
			edgeDirection: direction,
			group: selectedLabel,
			nodeName: nodeName
		});

		// Reset values after database call
		direction = 'outgoing';
		selectedLabel = '';
		nodeName = '';
		edgeName = 'CMD';

		onClose();
	}

	function handleLabelChange(event: CustomEvent<string>) {
		console.log('Label changed to:', event.detail);
		selectedLabel = event.detail;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create New Node</Dialog.Title>
			<Dialog.Description>Set the properties for the new node you're creating.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<Tabs.Root value={direction} class="w-full" onValueChange={(value) => (direction = value)}>
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="outgoing">Outgoing</Tabs.Trigger>
					<Tabs.Trigger value="incoming">Incoming</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="label" class="text-right">Label</Label>
				<div class="col-span-3">
					<Select.Root
						selected={selectedLabel}
						onSelectedChange={(v) => {
							v && handleLabelChange({ detail: v.value });
						}}
					>
						<Select.Trigger class="w-full">
							<Select.Value placeholder="Select a label" />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each labels as label}
									<Select.Item value={label}>{label}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="name" class="text-right">Name</Label>
				<Input id="name" bind:value={nodeName} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="edgeName" class="text-right">Edge Name</Label>
				<Input id="edgeName" bind:value={edgeName} class="col-span-3" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={onClose}>Cancel</Button>
			<Button onclick={handleSave}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
