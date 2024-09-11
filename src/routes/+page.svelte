<script>
	import Editor from '$lib/components/Editor.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import { settings } from '$lib/stores.svelte';
</script>

<div class="flex flex-col h-screen">
	<Header />
	<Editor />
	<Footer />
</div>
