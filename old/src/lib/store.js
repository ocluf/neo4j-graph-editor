import Neo4j from 'neo4j-driver';
import { DataSet } from 'vis-data';
import { nanoid } from 'nanoid';
import { writable } from 'svelte/store';

import { defaultNodeStyle, nodeGroupStyles } from './settings/labels';
import { renderHoverInfo } from './helpers/renderHoverInfos';

/**
 * The Neo4jNetworkStore loads nodes and edges from the neo4j db
 * and provides them as a svelte store to the different components.
 */
class Neo4jNetworkStore {
	// a svelte writable store that provides the node/edge data
	dataStore;

	// create two private DataSets
	#nodes;
	#edges;

	/* internal server-setting.
	 * use setServerSettings to set them! */
	

	// the store creates one session and keeps it open.
	#neo4jDriver;
	#neo4jSession;
	#currentCypher;

	/**
	 * Creates a new Neo4jNetworkStore instance.
	 * @constructor
	 */
	constructor() {
		/* Create two vis-DataSets
		 * one for node and one for edges (relations). */
		this.#nodes = new DataSet([]);
		this.#edges = new DataSet([]);

		/* Creates a svelte writable store for the node/edge data. */
		this.dataStore = writable({
			nodes: this.#nodes,
			edges: this.#edges
		});

		/* Creates a simple svelte store for the loading-state */
		this.loading = writable(true);
	}

	/**
	 * Connect to the neo4j database using and the local server settings
	 * ans store the session in a local member.
	 */
	async connect() {
		console.log(`[Neo4jNetworkStore.connect] connecting to server:${this.#serverSettings.server}`);
		this.#neo4jDriver = Neo4j.driver(
			this.#serverSettings.server,
			Neo4j.auth.basic(this.#serverSettings.user, this.#serverSettings.password)
		);
		await this.#neo4jDriver.verifyConnectivity();
		this.#neo4jSession = this.#neo4jDriver.session();
		console.log(`[Neo4jNetworkStore.connect] new session initialized`);
	}

	/**
	 * Close the neo4j session and driver.
	 */
	async disconnect() {
		console.log(`[Neo4jNetworkStore.disconnect]`);
		await this.#neo4jSession.close();
		await this.#neo4jDriver.close();
	}

	/**
	 * Validates the provides neo4j server settings
	 * by verifying connectivity using the nea4j driver.
	 *
	 * @param {*} serverSettings
	 * @returns
	 */
	async validateServerSettings(serverSettings) {
		try {
			const driver = Neo4j.driver(
				serverSettings.server,
				Neo4j.auth.basic(serverSettings.user, serverSettings.password)
			);
			await driver.verifyConnectivity();
			await driver.close();
			return true;
		} catch (err) {
			return false;
		}
	}

	/**
	 * Takes a server-settings object and sets the internal server-settings,
	 * if the settings are valid.
	 *
	 * @param {*} serverSettings
	 * @returns {Promise<boolean>} true if the settings are valid, false otherwise.
	 */
	async setServerSettings(serverSettings = this.#serverSettings) {
		const isValid = await this.validateServerSettings(serverSettings);
		if (isValid) {
			this.#serverSettings = serverSettings;
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Remove all nodes and edges from the internat vis-DataSets
	 */
	clear() {
		console.log(`[Neo4jNetworkStore.clear] removing all nodes and edges.`);
		// disable auto sync to neo4j
		this.#disableDBAutoUpdates();
		this.#nodes.clear();
		this.#edges.clear();
		this.#enableDBAutoUpdates();
	}

	/**
	 * Getter for the internal node vis-DataSet containing all the nodes.
	 */
	get nodes() {
		return this.#nodes;
	}

	/**
	 * Getter for the internal vis-DataSet containing all the edges.
	 */
	get edges() {
		return this.#edges;
	}

	/**
	 * Adds a node with the given properties to the network.
	 * If a node with the given id already exists, it will be updated.
	 * The node is not added to the database, but only the internal store.
	 *
	 * @param {Number} id
	 * @param {String} label
	 * @param {String[]} labels
	 * @param {Object | null} properties
	 */
	addNode(id, label, labels, properties) {
		console.log(
			`[Neo4jNetworkStore.addNode] ` +
				[
					`id:${id}`,
					`label:${label}`,
					`labels:${labels.join(',')}`,
					`properties:${JSON.stringify(properties)}`
				].join(', ')
		);

		// use given id or create a new one
		id = id || nanoid();

		// check if a node with this id already exists.
		let node = this.#nodes.get(id);

		const container = document.createElement('div');
		container.classList.add('node-hover-info');
		container.innerHTML = renderHoverInfo(id, label, labels, properties);

		const newNode = {
			id,
			font: { multi: 'html' },
			label: this.#getNodeLabel(id, label, labels, properties),
			group: labels[0] ? labels[0].toLowerCase() : null,
			level: this.#getLevelByLabels(labels),
			title: container,
			labels,
			properties
		};

		if (node) {
			// update existing node
			this.#nodes.updateOnly({
				...node,
				...newNode,
				id: node.id
			});
		} else {
			// create a new node
			this.#nodes.add(newNode);
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

			await this.loadNetwork(this.#currentCypher);
		} catch (error) {
			console.error(`[Neo4jNetworkStore.updateNodeProperty] Error updating node ${id}:`, error);
		}
	}

	async addNodeToDB(nodeId, edgeName, edgeDirection, group, nodeName) {
		try {
			let query;
			if (edgeDirection === 'outgoing') {
				query = `
					MATCH (existingNode)
					WHERE id(existingNode) = $nodeId
					CREATE (existingNode)-[r:${edgeName}]->(newNode:${group} {name: $nodeName})
					RETURN id(newNode) as newNodeId
				`;
			} else if (edgeDirection === 'incoming') {
				query = `
					MATCH (existingNode)
					WHERE id(existingNode) = $nodeId
					CREATE (newNode:${group} {name: $nodeName})-[r:${edgeName}]->(existingNode)
					RETURN id(newNode) as newNodeId
				`;
			} else {
				throw new Error('Invalid edge direction. Must be "outgoing" or "incoming".');
			}

			const result = await this.#neo4jSession.run(query, { nodeId, nodeName });
			const newNodeId = result.records[0].get('newNodeId').toNumber();

			console.log(`New node created with ID: ${newNodeId}, group: ${group}, and name: ${nodeName}`);

			const cypher = `MATCH (n1)<-[r]->(n2) WHERE ID(n1)=${nodeId} RETURN n1,r,n2`;
			// Reload the network to reflect the changes
			await this.loadNetwork(cypher);

			return newNodeId;
		} catch (error) {
			console.error('[Neo4jNetworkStore.addNodeToDB] Error adding new node:', error);
			throw error;
		}
	}

	async removeNodeFromDB(nodeId) {
		try {
			await this.#neo4jSession.run(`MATCH (n) WHERE id(n) = ${nodeId} DETACH DELETE n`);
			await this.loadNetwork(this.#currentCypher);
		} catch (error) {
			console.error('[Neo4jNetworkStore.removeNodeFromDB] Error removing node:', error);
			throw error;
		}
	}

	/**
	 * Adds a edge to the network.
	 * If a edge with the given id already exists, it will be updated.
	 * The edge is added to the database, but only the internal store.
	 *
	 * @param {Number} id
	 * @param {String} label
	 * @param {Number} from
	 * @param {Number} to
	 * @param {String} type
	 */
	addEdge(id, label, from, to, type) {
		console.log(
			`[Neo4jNetworkStore.addEdge] ` +
				[`id:${id}`, `label:${label}`, `from:${from}`, `to:${to}`, `type:${type}`].join(', ')
		);

		// use given id or create a new one
		id = id || nanoid();

		// check if a edge with this id already exists.
		let edge = this.#edges.get(id);

		const newEdge = {
			id,
			label,
			from,
			to,
			type
		};

		if (edge) {
			// update existing edge
			this.#edges.updateOnly({
				...edge,
				...newEdge,
				id: edge.id
			});
		} else {
			// create a new edge
			this.#edges.add(newEdge);
		}
	}

	/**
	 * Takes in a neo4j cypher statement and executes it.
	 * After the query is executed, the result is parsed
	 * and the nodes and edges are added to the internal stores.
	 * If clear is true the internal node and edge store will be cleared before.
	 */
	async loadNetwork(cypher, clear = true) {
		this.#currentCypher = cypher;
		//todo set loading to true without have it rerender the network before it is done loading
		//this.loading.set(true);

		if (clear) {
			// clear the current network before loading a new one.
			this.clear();
		}

		//this.connect();

		try {
			console.log(`[Neo4jNetworkStore.loadNetwork] run:${cypher}`);
			this.#neo4jSession
				.run(cypher)
				.then((result) => {
					/* We need to disable auto-updates TO the database here
					 * because the data has just been loaded FROM the database. */
					this.#disableDBAutoUpdates();

					/* queue Changes before throwing events.
					 * see https://visjs.github.io/vis-data/data/dataset.html#Methods */
					// const queueSettings = {
					// 	queue: { delay: 2000 },
					// };
					// this.#nodes.setOptions(queueSettings);
					// this.#edges.setOptions(queueSettings);

					// add all nodes and edges from teh server
					result.records.forEach((record) => {
						this.#parseNeo4jRecords(record);
					});

					// flush queued DataSet events
					//this.#nodes.flush();
					//this.#edges.flush();

					this.#enableDBAutoUpdates();
				})
				.catch((err) => {
					//TODO: better error handling!
					this.loading.set(false);
					alert(`Error executing cypher:\n${err}`);
				})
				.then(() => {
					/* Update the data-store to inform the graph that new data has been loaded.
					 * This is used to stabilize (physics) the network */
					this.dataStore.set({
						nodes: this.#nodes,
						edges: this.#edges
					});

					// close the current session
					//this.disconnect();

					this.loading.set(false);
				});

			//OK: console.dir(readResult);
		} catch (err) {
			console.error(`[Neo4jNetworkStore.loadNetwork] error running cypher: "${cypher}": ${err}`);
			this.loading.set(false);
		}
	}

	#parseNeo4jRecords(records) {
		//console.time('⌚ [Neo4jNetworkStore.parseNeo4jRecords]');
		records.map(async (x) => {
			if (x instanceof Neo4j.types.Node) {
				console.log(`-----------------node, ${x}`);
				const id = x.identity.toInt();
				const labels = x.labels;
				const properties = x.properties;
				const label = properties.text || properties.name || properties.title;
				this.addNode(id, label, labels, properties);
			} else if (x instanceof Neo4j.types.Relationship) {
				const id = x.identity.toInt();
				const from = x.start.toInt();
				const to = x.end.toInt();
				const type = x.type;
				const label = type || '';
				this.addEdge(id, label, from, to, type);
			} else if (x instanceof Neo4j.types.Path) {
				console.warn(`[Editor.parseNeo4jRecord] Results of type "Path" are not supported yet.`);
			} else {
				console.warn(`[Editor.parseNeo4jRecord] Result of unknown type "${typeof x}" found: `, x);
			}
		});
		//console.timeEnd('⌚ [Neo4jNetworkStore.parseNeo4jRecords]');
	}

	/**
	 * This function is called every time a internat vis-DataSet fires an event.
	 *
	 * @see https://visjs.github.io/vis-data/data/dataset.html#Callback
	 * @param {String} event
	 * @param {Object | null} properties
	 * @param {String | Number} senderId
	 */
	#handleDataSetEvent(event, properties, senderId) {
		// console.log(
		// 	`[Neo4jNetworkStore.#handleDataSetEvent] event "${event}": ${JSON.stringify(properties)}`
		// );
		//TODO: convert the network-change to a cypher and execute it
	}

	/**
	 * Hooks all events of the internal vis-DataSets to the #handleDataSetEvent function.
	 * This function should only be called once after creating the DataSets.
	 *
	 * @see https://visjs.github.io/vis-data/data/dataset.html#Subscriptions
	 */
	#enableDBAutoUpdates() {
		console.log(`[Neo4jNetworkStore.#enableDBAutoUpdates]`);
		this.#nodes.on('*', this.#handleDataSetEvent);
		this.#edges.on('*', this.#handleDataSetEvent);
	}

	/**
	 * Un-hooks all events from the internal vis-DataSets.
	 *
	 * @see https://visjs.github.io/vis-data/data/dataset.html#Subscriptions
	 */
	#disableDBAutoUpdates() {
		console.log(`[Neo4jNetworkStore.#disableDBAutoUpdates]`);
		this.#nodes.off('*', this.#handleDataSetEvent);
		this.#edges.off('*', this.#handleDataSetEvent);
	}

	/**
	 * Helper function that creates a label-string
	 * from the given labels.
	 *
	 * @param {Number} id
	 * @param {String} label
	 * @param {String[]} labels
	 * @param {*} properties
	 * @returns {String}
	 */
	#getNodeLabel(id, label, labels, properties) {
		return [label, labels.map((l) => `<i>${l}</i>`)].join('\n');
	}

	/**
	 * Helper function that returns a vis-hierarchy-level
	 * based on the provides labels.
	 * TODO: This is not ideal, because this is very domain-specific.
	 *
	 * @param {String[]} labels
	 * @returns {Number} vis-hierarchy-level [0..n]
	 */
	#getLevelByLabels(labels) {
		const label = labels[0]?.toLowerCase();
		return nodeGroupStyles[label]?.level || defaultNodeStyle?.level || 0;
	}
}

const networkStore = new Neo4jNetworkStore();

// return as singleton
export default networkStore;
