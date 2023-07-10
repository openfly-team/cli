import { terser } from "rollup-plugin-terser";
import typescript from 'rollup-plugin-typescript2';

export default {
	input: 'src/index.ts',
	output: {
		file: 'index.js',
		format: 'cjs'
	},
	plugins: [terser(),typescript()],
	external: ['ejs']
};