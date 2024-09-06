const defaultSettings = {
	isHierarchical: false
};

/* see https://visjs.github.io/vis-network/docs/network/nodes.html for availibe options. */
export const nodeGroupStyles = {
	problem: {
		level: 4,
		font: {
			color: 'black'
		},
		color: {
			border: 'red',
			background: 'white',
			highlight: { background: 'white', border: 'red' },
			hover: { background: 'white', border: 'red' }
		}
	},
	observation: {
		level: 3,
		font: {
			color: 'black'
		},
		color: {
			border: 'orange',
			background: 'white',
			highlight: { background: 'white', border: 'orange' },
			hover: { background: 'white', border: 'orange' }
		}
	},
	obs_instance: {
		level: 2,
		font: {
			color: 'black'
		},
		color: {
			border: 'blue',
			background: 'white',
			highlight: { background: 'white', border: 'blue' },
			hover: { background: 'white', border: 'blue' }
		}
	},
	patient: {
		level: 1
	}
};

export const defaultNodeStyle = {
	level: 0,
	font: {
		color: 'black'
	},
	color: {
		background: 'lightgray',
		border: 'black',
		highlight: { background: 'darkgray', border: 'black' },
		hover: { background: 'darkgray', border: 'black' }
	}
};

/**
 * Set vis-network options.
 * @see https://visjs.github.io/vis-network/docs/network/#options
 *
 * @param {*} settings
 * @returns {*} vis-network options
 */
export function getOptions(settings = defaultSettings) {
	const options = {
		// see https://visjs.github.io/vis-network/docs/network/interaction.html
		interaction: {
			// 	When true, the nodes use their hover colors when the mouse moves over them. [false]
			hover: true,

			// When true, on hovering over a node, it's connecting edges are highlighted. [true]
			hoverConnectedEdges: false,

			// When true, the nodes and edges can be selected by the user. [true]
			selectable: true,

			// When true, on selecting a node, its connecting edges are highlighted. [true]
			selectConnectedEdges: false
		},

		// https://visjs.github.io/vis-network/docs/network/manipulation.html
		manipulation: {
			// Toggle the manipulation system on or off.
			// Even when false, the manipulation API through the methods will still work.
			// This property is optional.
			// If you define any of the options below and enabled is undefined, this will be set to true. [false]
			enabled: false
		},

		// https://visjs.github.io/vis-network/docs/network/physics.html
		physics: {
			enabled: true,
			barnesHut: {
				centralGravity: 0,
				springLength: 200
			},
			minVelocity: 0.75
		},

		// https://visjs.github.io/vis-network/docs/network/nodes.html
		nodes: {
			shape: 'circle',
			borderWidth: 3,
			shadow: false,
			widthConstraint: {
				minimum: 100,
				maximum: 100
			},
			// default node style (if no group is set)
			...defaultNodeStyle
		},

		// https://visjs.github.io/vis-network/docs/network/edges.html
		edges: {
			smooth: {
				type: 'continuous'
				//forceDirection: 'none',
				//roundness: 0.01,
			},
			arrows: {
				to: {
					enabled: true
				}
			},
			shadow: false
		},

		// https://visjs.github.io/vis-network/docs/network/groups.html
		groups: nodeGroupStyles
	};

	return options;
}
