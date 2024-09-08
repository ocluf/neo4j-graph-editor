export function getNeo4jValue(value) {
	console.log(`[Properties.getNeo4jValue] value:${JSON.stringify(value)}`, value);
	if (typeof value === 'object' && 'low' in value && 'high' in value) {
		return Number(value.low);
	} else {
		return value;
	}
}
