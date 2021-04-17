import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
	input: 'src/index.ts',
    output: {
        file: 'lib/index.js',
		format: 'cjs',
		sourcemap: true,
    },
	plugins: [
        resolve(),
		commonjs(),
		typescript(),
	],
    watch: {
        include: [
            'src',
        ],
    },
}
