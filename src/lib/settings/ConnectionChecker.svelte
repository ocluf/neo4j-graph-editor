<script>
	import * as neo4j from 'neo4j-driver';

	import { serverSettings } from '$lib/settings/settingsStore.svelte';
	import { useDebounce, watch } from 'runed';

	let status = $state('initializing...');

	async function connectToServer() {
		console.log('running');
		try {
			status = `connection...`;
			const driver = neo4j.driver(
				serverSettings.serverSettings.server,
				neo4j.auth.basic(serverSettings.serverSettings.user, serverSettings.serverSettings.password)
			);
			await driver.verifyConnectivity();
			status = `🎉 Valid credentials!`;
			await driver.close();
		} catch (err) {
			status = `😞 Error connecting: ${err}`;
		}
	}

	const tryConnect = useDebounce(() => {
		connectToServer();
	}, 1000);

	watch(
		[
			() => serverSettings.serverSettings.server,
			() => serverSettings.serverSettings.user,
			() => serverSettings.serverSettings.password
		],
		() => {
			tryConnect();
		}
	);
</script>

<div>{status}</div>

<style>
</style>
