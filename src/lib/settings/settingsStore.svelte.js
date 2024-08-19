export const SERVER_SETTINGS_KEY = 'serverSettings';
export const APPPLICATION_SETTINGS_KEY = 'appSettings';

function createAppSettings() {
	const savedAppSettings = localStorage.getItem(APPPLICATION_SETTINGS_KEY);
	let value = savedAppSettings
		? JSON.parse(savedAppSettings)
		: { initialCypher: 'MATCH (n)-[r]->(m) RETURN n,r,m' };

	// eslint-disable-next-line no-undef
	let appSettings = $state(value);

	return {
		get appSettings() {
			return appSettings;
		},
		set appSettings(setting) {
			appSettings = setting;
		}
	};
}

function createServerSettings() {
	const savedServerSettings = localStorage.getItem(SERVER_SETTINGS_KEY);
	let value = savedServerSettings
		? JSON.parse(savedServerSettings)
		: {
				server: undefined,
				user: undefined,
				password: undefined
			};

	// eslint-disable-next-line no-undef
	let serverSettings = $state(value);

	return {
		get serverSettings() {
			return serverSettings;
		},
		set serverSettings(setting) {
			serverSettings = setting;
		}
	};
}

export const serverSettings = createServerSettings();
export const appSettings = createAppSettings();
