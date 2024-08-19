function createEditorState() {
	// eslint-disable-next-line no-undef
	let layoutHierarchical = $state(false);

	return {
		get value() {
			return layoutHierarchical;
		},
		set value(value) {
			layoutHierarchical = value;
		}
	};
}

export const editorState = createEditorState();
