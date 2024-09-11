import { DataSet } from 'vis-data';
import * as neo4j from 'neo4j-driver';
import { toast } from 'svelte-sonner';
import { defaultNodeStyle, nodeGroupStyles } from './networkOptions';
import type { IdType } from 'vis-network';

type Node = {
	id: number | string;
	label: string;
	labels: string[];
	properties: Record<string, string>;
	level: number;
	group: string;
	ctxRenderer: (params: {
		ctx: CanvasRenderingContext2D;
		x: number;
		y: number;
		style: Record<string, any>;
		label: string;
		state: { hover: boolean; selected: boolean };
	}) => {
		drawNode: () => void;
		nodeDimensions: { width: number; height: number };
	};
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

	canvasMousePositionX: number | null = null;
	canvasMousePositionY: number | null = null;
	ghostNodeConnectionPosition: { x: number; y: number; nodeId: IdType } | null = null;

	#currentCypher: string = '';
	#neo4jDriver!: neo4j.Driver;
	#neo4jSession!: neo4j.Session;

	#visibleRadius: number = 50; // Radius of the visible circle
	hoverRadius: number = 60; // Radius of the hidden hover circle

	constructor(serverSettings: Settings) {
		this.nodes = new DataSet([]);
		this.edges = new DataSet([]);
		this.initialize(serverSettings);

		// An ugly hack where the nodes get updated with there exising label every 50ms.
		// This is necessary to trigger ctxRenderer so it can recalculate the hover ring state.
		// TODO: if performance is an issue, you could update this to track the node that is currently being hovered.
		// over with onNodehover and onNodeBlur event. and only update that one node in the loop.
		this.#nodeRenderLoop();
	}

	async initialize(serverSettings: Settings) {
		await this.connect(serverSettings);
		await this.loadCypher(serverSettings.initialCypher);
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

	async loadCypher(cypher: string, clear = false) {
		try {
			const result = await this.#neo4jSession.run(cypher);

			const newNodes = new Set<number>();
			const newEdges = new Set<number>();
			const nodesToUpdate: Node[] = [];
			const edgesToUpdate: Edge[] = [];

			result.records.forEach((record) => {
				record.forEach((field) => {
					if (field instanceof neo4j.types.Node) {
						const node = this.#parseNeo4jNode(field);
						newNodes.add(node.id as number);
						nodesToUpdate.push(node);
					} else if (field instanceof neo4j.types.Relationship) {
						const edge = this.#parseNeo4jRelationship(field);
						newEdges.add(edge.id);
						edgesToUpdate.push(edge);
					}
				});
			});

			// Remove nodes and edges that are no longer in the new set
			this.nodes.forEach((node) => {
				if (!newNodes.has(node.id as number)) {
					this.nodes.remove(node.id);
				}
			});
			this.edges.forEach((edge) => {
				if (!newEdges.has(edge.id)) {
					this.edges.remove(edge.id);
				}
			});

			// Update existing nodes and edges, and add new ones
			this.nodes.update(nodesToUpdate);
			this.edges.update(edgesToUpdate);

			this.#currentCypher = cypher;
		} catch (error) {
			toast.error('Error loading cypher.');
			console.error('Error loading cypher:', error);
		}
	}

	#parseNeo4jNode(neoNode: neo4j.Node): Node {
		const id = neoNode.identity.toInt();
		const labels = neoNode.labels;
		const properties = neoNode.properties;
		const label = properties.text || properties.name || properties.title;
		const level = this.#getLevelByLabels(labels);
		const group = labels[0] ? labels[0].toLowerCase() : '';

		return {
			id,
			label,
			labels,
			properties,
			level,
			group,
			ctxRenderer: this.ctxRenderer
		};
	}

	#parseNeo4jRelationship(neoRelationship: neo4j.Relationship): Edge {
		const id = neoRelationship.identity.toInt();
		const from = neoRelationship.start.toInt();
		const to = neoRelationship.end.toInt();
		const type = neoRelationship.type;
		const label = type || '';

		return {
			id,
			label,
			from,
			to,
			type
		};
	}

	async addNodeToDB(params: {
		nodeId: IdType;
		edgeName: string;
		edgeDirection: 'outgoing' | 'incoming';
		group: string;
		nodeName: string;
	}) {
		try {
			const { nodeId, edgeName, edgeDirection, group, nodeName } = params;
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
				toast.error('Invalid edge direction. Must be "outgoing" or "incoming".');
				throw new Error('Invalid edge direction. Must be "outgoing" or "incoming".');
			}

			const result = await this.#neo4jSession.run(query, { nodeId, nodeName });
			const newNodeId = result.records[0].get('newNodeId').toNumber();

			console.log(`New node created with ID: ${newNodeId}, group: ${group}, and name: ${nodeName}`);

			const cypher = `MATCH (n1)<-[r]->(n2) WHERE ID(n1)=${nodeId} RETURN n1,r,n2`;
			// Reload the network to reflect the changes
			await this.loadCypher(cypher);

			return newNodeId;
		} catch (error) {
			toast.error('Error adding new node.' + error);
			console.error('[Neo4jNetworkStore.addNodeToDB] Error adding new node:', error);
		}
	}

	async removeNodeFromDB(nodeId: number | string) {
		try {
			await this.#neo4jSession.run(`MATCH (n) WHERE id(n) = ${nodeId} DETACH DELETE n`);
			await this.loadCypher(this.#currentCypher);
		} catch (error) {
			console.error('[Neo4jNetworkStore.removeNodeFromDB] Error removing node:', error);
			throw error;
		}
	}

	#nodeRenderLoop() {
		const updateNodeLabel = () => {
			this.nodes.forEach((node) => {
				if (node.label) {
					// Set the label to its current value
					this.nodes.update({ id: node.id, label: node.label });
				}
				if (node.id === 'ghost') {
					// Update ghost node position to current mouse position
					this.nodes.update({
						id: 'ghost',
						x: this.canvasMousePositionX,
						y: this.canvasMousePositionY
					});
				}
			});
			setTimeout(updateNodeLabel, 20);
		};

		updateNodeLabel();
	}

	isMouseInHoverArea(nodeX: number, nodeY: number): boolean {
		if (this.canvasMousePositionX !== null && this.canvasMousePositionY !== null) {
			const dx = this.canvasMousePositionX - nodeX;
			const dy = this.canvasMousePositionY - nodeY;
			const distanceSquared = dx * dx + dy * dy;
			return (
				distanceSquared <= this.hoverRadius * this.hoverRadius &&
				distanceSquared > this.#visibleRadius * this.#visibleRadius
			);
		}
		return false;
	}

	addGhostNode() {
		const ghostNode = {
			id: 'ghost',
			x: this.canvasMousePositionX,
			y: this.canvasMousePositionY,
			label: '+',
			fixed: true,
			physics: false,
			size: 100,
			ctxRenderer: ({
				ctx,
				x,
				y,
				style,
				label
			}: {
				ctx: CanvasRenderingContext2D;
				x: number;
				y: number;
				label: string;
			}) => {
				return {
					drawNode: () => {
						// Draw the ghost node
						ctx.beginPath();
						ctx.arc(x, y, style.size / 2, 0, 2 * Math.PI);
						ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
						ctx.fill();
						ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';
						ctx.lineWidth = 2;
						ctx.stroke();

						// Draw the label
						ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
						ctx.font = `${24}px Arial`;
						ctx.textAlign = 'center';
						ctx.textBaseline = 'middle';
						ctx.fillText(label, x, y);

						// Draw line from center to ghost node connection position
						if (this.ghostNodeConnectionPosition) {
							ctx.beginPath();
							ctx.moveTo(x, y);
							const nodeRadius = style.size / 2;
							const dx = this.ghostNodeConnectionPosition.x - x;
							const dy = this.ghostNodeConnectionPosition.y - y;
							const length = Math.sqrt(dx * dx + dy * dy);
							const unitX = dx / length;
							const unitY = dy / length;
							const startX = x + nodeRadius * unitX;
							const startY = y + nodeRadius * unitY;
							const endX = this.ghostNodeConnectionPosition.x - nodeRadius * unitX;
							const endY = this.ghostNodeConnectionPosition.y - nodeRadius * unitY;
							ctx.moveTo(startX, startY);
							ctx.lineTo(endX, endY);
							ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';
							ctx.lineWidth = 2;
							ctx.stroke();
						}
					}
				};
			}
		};

		this.nodes.update(ghostNode);

		// Remove the ghost node after a short delay
		setTimeout(() => {
			this.nodes.remove(-1);
		}, 2000);
	}

	removeGhostNode() {
		// Remove the ghost node from the nodes DataSet
		this.nodes.remove('ghost');
		neo4jNetwork.ghostNodeConnectionPosition = null;
	}

	ctxRenderer = ({
		ctx,
		x,
		y,
		style,
		label
	}: {
		ctx: CanvasRenderingContext2D;
		x: number;
		y: number;
		style: Record<string, any>;
		label: string;
		state: { hover: boolean; selected: boolean };
	}) => {
		const fontSize = 14;
		ctx.font = `${fontSize}px Arial`;

		return {
			drawNode: () => {
				// Calculate distance from mouse to node center
				const isMouseInHoverArea = this.isMouseInHoverArea(x, y);

				// Draw hover circle in the background only if mouse is in the hover area
				if (isMouseInHoverArea) {
					// Draw outer circle (donut)
					ctx.beginPath();
					ctx.arc(x, y, this.hoverRadius, 0, 2 * Math.PI);
					ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Transparent gray
					ctx.fill();
					ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Transparent gray border
					ctx.lineWidth = 1;
					ctx.stroke();
				}

				// Draw visible circle
				ctx.beginPath();
				ctx.arc(x, y, this.#visibleRadius, 0, 2 * Math.PI);
				ctx.fillStyle = style.color;
				ctx.fill();
				ctx.strokeStyle = style.color.border;
				ctx.lineWidth = style.borderWidth;
				ctx.stroke();

				// Draw label inside the circle
				ctx.fillStyle = style?.font?.color || 'black';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(label, x, y);
			},
			nodeDimensions: { width: this.hoverRadius * 2, height: this.hoverRadius * 2 }
		};
	};

	/**
	 * Updates a property of a node in the network and the Neo4j database.
	 * @param {Number} id - The id of the node to update
	 * @param {any[]} updates
	 */
	async updateNodeProperty(id, updates) {
		try {
			// Update the node in the Neo4j database

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
