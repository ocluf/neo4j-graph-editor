<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { neo4jNetwork, settings } from '$lib/stores.svelte';
	import * as neo4j from 'neo4j-driver';
	import { toast } from 'svelte-sonner';

	let newSettings = $state({
		server: settings.settings.server,
		user: settings.settings.user,
		password: settings.settings.password,
		initialCypher: settings.settings.initialCypher
	});

	let open = $state(false);

	async function validateAndSaveSettings() {
		try {
			const driver = neo4j.driver(
				newSettings.server,
				neo4j.auth.basic(newSettings.user, newSettings.password)
			);
			await driver.getServerInfo();
			await driver.close();
			settings.settings = newSettings;
			open = false;
			neo4jNetwork.initialize(settings.settings);
		} catch (e) {
			toast.error('Failed to connect to database with given credentials: ' + e);
			console.error(e);
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>Settings</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[525px]">
		<Dialog.Header>
			<Dialog.Title>Edit settings</Dialog.Title>
			<Dialog.Description>Configure the server settings and initial cypher</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="server" class="text-right">Server</Label>
				<Input id="server" bind:value={newSettings.server} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="username" class="text-right">User</Label>
				<Input id="username" bind:value={newSettings.user} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="password" class="text-right">Password</Label>
				<Input id="password" bind:value={newSettings.password} type="password" class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="initialCypher" class="text-right">Initial Cypher</Label>
				<textarea
					id="initialCypher"
					bind:value={newSettings.initialCypher}
					class="col-span-3 bg-transparent p-2 border rounded"
				></textarea>
			</div>
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				class="mr-2"
				onclick={() => {
					newSettings = settings.settings;
					open = false;
				}}>Cancel</Button
			>
			<Button onclick={() => validateAndSaveSettings()}>Verify and Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
