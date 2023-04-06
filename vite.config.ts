import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig( {
	build: {
		lib: {
			entry: resolve( __dirname, "src/comfy.ts" ),
			name: "comfy.js",
			formats: [ "cjs", "es" ],
			fileName: "comfy",
		},
		// sourcemap: true,
		minify: false,
	},
} );
