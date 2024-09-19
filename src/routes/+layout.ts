/**
 * This file contains the layout configuration for the application.
 *
 * @file
 * @module +layout
 *
 * Configuration:
 * - prerender: Set to true, enabling static site generation for improved performance.
 * - ssr: Set to false, disabling server-side rendering.
 *
 * These settings are particularly useful for client-side only applications
 * or when dealing with content that doesn't require server-side processing.
 *
 * @see {@link https://kit.svelte.dev/docs/page-options#prerender} for more information on prerendering.
 * @see {@link https://kit.svelte.dev/docs/page-options#ssr} for more information on server-side rendering.
 */

export const prerender = true;
export const ssr = false;
