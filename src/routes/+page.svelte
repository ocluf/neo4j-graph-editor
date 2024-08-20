<script>
	import Editor from '$lib/components/Editor.svelte';
	import Header from '$lib/components/Header.svelte';
</script>

<main>
	<header>
		<Header />
	</header>

	<article>
		<Editor />
	</article>
	<footer>
		<!-- <Footer /> -->
	</footer>
</main>

<style>
	:root {
		--header-height: 3em;
		--footer-height: 3em;

		--background: white;
		--text-primary: gray;
		--text-secondary: lightgray;
		--text-action: lightgreen;

		--border: lightgray;
	}

	main {
		height: 100%;
		min-height: 100vh;
		color: var(--text-primary);
	}

	main header {
		height: var(--header-height);
	}

	main article {
		height: calc(100vh - var(--header-height) - var(--footer-height));
	}

	main footer {
		height: var(--footer-height);
	}
</style>
