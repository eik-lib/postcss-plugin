export default {
    input: 'src/plugin.js',
    external: ['node-fetch', 'url'],
    output: [{ file: 'dist/plugin.js', format: 'cjs' }],
};
