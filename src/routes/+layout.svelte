<!--
  @component

  This is the root layout component for the application. It serves as the main wrapper
  for all pages and includes global styles and components.

  Features:
  - Imports global CSS styles
  - Includes the Toaster component for displaying notifications
  - Provides a slot for page-specific content

  Usage:
  This component is automatically used by SvelteKit as the layout for all pages.
  It wraps the content of each page, ensuring consistent styling and functionality
  across the entire application.

  Dependencies:
  - '../app.css': Global styles for the application
  - '$lib/components/ui/sonner': Toaster component for notifications
-->

<script>
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
</script>

<Toaster position="top-right" richColors />
<slot />
