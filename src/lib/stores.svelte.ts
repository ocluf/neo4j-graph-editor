import { DataSet } from 'vis-data';
import * as neo4j from 'neo4j-driver';
import { toast } from 'svelte-sonner';
import { defaultNodeStyle, nodeGroupStyles } from './networkOptions';

type Node = {
	id: number;
	label: string;
	labels: string[];
	properties: Record<string, string>;
	level: number;
	group: string;
};

type Edge = {
	id: number;
	label: string;
	from: number;
	to: number;
	type: string;
};

class Neo4jNetwork {
	nodes: DataSet<Node>;
	edges: DataSet<Edge>;

	selectedNodeId: number | null = $state(null);

	#currentCypher: string = '';
	#neo4jDriver!: neo4j.Driver;
	#neo4jSession!: neo4j.Session;

	constructor(serverSettings: Settings) {
		this.nodes = new DataSet([]);
		this.edges = new DataSet([]);
		this.initialize(serverSettings);
		this.handleDataSetEvent = this.handleDataSetEvent.bind(this);
	}

	async initialize(serverSettings: Settings) {
		await this.connect(serverSettings);
		await this.loadCypher(serverSettings.initialCypher);
		this.nodes.on('*', this.handleDataSetEvent);
		this.edges.on('*', this.handleDataSetEvent);
	}

	async connect(serverSettings: Settings) {
		if (this.#neo4jDriver || this.#neo4jSession) {
			await this.disconnect();
		}

		try {
			this.#neo4jDriver = neo4j.driver(
				serverSettings.server,
				neo4j.auth.basic(serverSettings.user, serverSettings.password)
			);
			await this.#neo4jDriver.getServerInfo();
			this.#neo4jSession = this.#neo4jDriver.session();
		} catch (error) {
			toast.error('Error connecting to Neo4j. Make sure the settings are correct.');
			console.error('Error connecting to Neo4j:', error);
		}
	}

	async disconnect() {
		try {
			await this.#neo4jSession.close();
			await this.#neo4jDriver.close();
		} catch (error) {
			toast.error('Error disconnecting from Neo4j.');
			console.error('Error disconnecting from Neo4j:', error);
		}
	}

	async loadCypher(cypher: string, clear = true) {
		try {
			if (clear) {
				// clear the current network before loading a new one.
				this.#clear();
			}
			const result = await this.#neo4jSession.run(cypher);
			result.records.forEach((records) => {
				this.#parseNeo4jRecords(records);
			});
			this.#currentCypher = cypher;
		} catch (error) {
			toast.error('Error loading cypher.');
			console.error('Error loading cypher:', error);
		}
	}

	/**
	 * Updates a property of a node in the network and the Neo4j database.
	 * @param {Number} id - The id of the node to update
	 * @param {any[]} updates
	 */
	async updateNodeProperty(id, updates) {
		try {
			// Update the node in the Neo4j database
			console.log(
				`[Neo4jNetworkStore.updateNodeProperty] Updating node ${id} with properties: ${JSON.stringify(updates)}`
			);

			let query = `MATCH (x) WHERE id(x) = ${id}`;
			for (const update of updates) {
				query += ` SET x.${update.key} = $${update.key}`;
			}
			const params = updates.reduce((acc, update) => {
				acc[update.key] = update.value;
				return acc;
			}, {});

			await this.#neo4jSession.run(query, params);
			await this.loadCypher(this.#currentCypher, false);
		} catch (error) {
			console.error(`[Neo4jNetworkStore.updateNodeProperty] Error updating node ${id}:`, error);
		}
	}

	async loadAdditionalConnections(nodeId) {
		const cypher = `MATCH (n1)<-[r]->(n2) WHERE ID(n1)=${nodeId} RETURN n1,r,n2`;
		await this.loadCypher(cypher);
	}

	#clear() {
		this.nodes.clear();
		this.edges.clear();
	}

	#parseNeo4jRecords(records: neo4j.Record[]) {
		const nodesToUpdate: Node[] = [];
		const edgesToUpdate: Edge[] = [];

		records.forEach((record) => {
			if (record instanceof neo4j.types.Node) {
				const id = record.identity.toInt();
				const labels = record.labels;
				const properties = record.properties;
				const label = properties.text || properties.name || properties.title;
				const level = this.#getLevelByLabels(labels);
				const group = labels[0] ? labels[0].toLowerCase() : null;
				const node = {
					id,
					label,
					labels,
					properties,
					level,
					group
				};

				nodesToUpdate.push(node);
			} else if (record instanceof neo4j.types.Relationship) {
				const id = record.identity.toInt();
				const from = record.start.toInt();
				const to = record.end.toInt();
				const type = record.type;
				const label = type || '';
				edgesToUpdate.push({
					id,
					label,
					from,
					to,
					type
				});
			}
		});

		if (nodesToUpdate.length > 0) {
			this.nodes.update(nodesToUpdate);
		}
		if (edgesToUpdate.length > 0) {
			this.edges.update(edgesToUpdate);
		}
	}

	/**
	 * Helper function that returns a vis-hierarchy-level
	 * based on the provides labels.
	 * TODO: This is not ideal, because this is very domain-specific.
	 *
	 * @param {String[]} labels
	 * @returns {Number} vis-hierarchy-level [0..n]
	 */
	#getLevelByLabels(labels: string[]): number {
		const label = labels[0]?.toLowerCase();
		console.log(label);
		return nodeGroupStyles[label]?.level || defaultNodeStyle?.level || 0;
	}

	/**
	 * This function is called every time a internat vis-DataSet fires an event.
	 *
	 * @see https://visjs.github.io/vis-data/data/dataset.html#Callback
	 * @param {String} event
	 * @param {Object | null} properties
	 * @param {String | Number} senderId
	 */
	handleDataSetEvent(event, properties, senderId) {
		if (this.selectedNode) {
			const currentNodeId = this.selectedNode.id;
			this.selectedNode = this.nodes.get(currentNodeId);
		}
	}
}

type Settings = {
	server: string;
	user: string;
	password: string;
	initialCypher: string;
};

function createSettings() {
	const storedSettings = localStorage.getItem('settings');
	const initialSettings = storedSettings ? JSON.parse(storedSettings) : '';

	let settings = $state(initialSettings);

	return {
		get settings() {
			return settings;
		},
		set settings(newSettings) {
			console.log('newSettings', newSettings);
			settings = newSettings;
			localStorage.setItem('settings', JSON.stringify(newSettings));
		}
	};
}

export const settings = createSettings();
export const neo4jNetwork = new Neo4jNetwork(settings.settings);
