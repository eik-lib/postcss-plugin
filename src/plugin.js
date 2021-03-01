/* eslint-disable no-restricted-syntax, no-shadow */

const parseCssUrls = require('css-url-parser');
const { helpers } = require('@eik/common');
const fetch = require('node-fetch');

const notUrl = (url) => url.substr(0, 4) !== 'http';

async function fetchImportMaps(urls = []) {
    try {
        const maps = urls.map((map) => fetch(map).then((result) => {
            if (result.status === 404) {
                throw new Error('Import map could not be found on server');
            } else if (result.status >= 400 && result.status < 500) {
                throw new Error('Server rejected client request');
            } else if (result.status >= 500) {
                throw new Error('Server error');
            }
            return result.json();
        }));
        return await Promise.all(maps);
    } catch (err) {
        throw new Error(
            `Unable to load import map file from server: ${err.message}`,
        );
    }
}

const validate = (map) => Object.keys(map.imports).map((key) => {
    const value = map.imports[key];
   
    if (notUrl(value)) {
        throw Error(`Import specifier can NOT be mapped to a bare import statement. Import specifier "${key}" is being wrongly mapped to "${value}"`);
    }

    return { key, value };
});

module.exports = ({
    path = process.cwd(),
    maps = [],
    urls = [],
} = {}) => {
    const pMaps = Array.isArray(maps) ? maps : [maps];
    const pUrls = Array.isArray(urls) ? urls : [urls];

    return {
        postcssPlugin: '@eik/postcss-import-map',
        prepare() {
            // Avoid parsing things more than necessary
            const processed = new WeakMap();
            // Only replace once per url
            const replaced = new Set();
            // Eagerly start resolving

            // Reused replace logic
            const applyImportMap = (mapping, decl) => {
                if (processed.has(decl)) {
                    return;
                }

                let key;
                // First check if it's possibly using syntax like url()
                const parsedUrls = parseCssUrls(decl.params);
                if (parsedUrls.length > 0) {
                    // eslint-disable-next-line prefer-destructuring
                    key = parsedUrls[0];
                } else {
                    // Handle the common cases where it's not wrapped in url() but may have quotes
                    key = decl.params.replace(/["']/g, '');
                }

                // Webpack interop
                key = key.replace(/^~/, '');

                if (replaced.has(key)) {
                    decl.remove();
                } else if (mapping.has(key)) {
                    // eslint-disable-next-line no-param-reassign
                    decl.params = `'${mapping.get(key)}'`;
                    replaced.add(key);
                }

                // Cache we've processed this
                processed.set(decl, true);
            };

            const mapping = new Map();

            return {
                // Run initially once, this is to ensure it runs before postcss-import
                async Once(root) {
                    // Load eik config from eik.json or package.json
                    const config = await helpers.getDefaults(path);

                    // Fetch import maps from the server
                    const fetched = await fetchImportMaps([...config.map, ...pUrls]);
                    
                    const allImportMaps = [...fetched, ...pMaps];
                    allImportMaps.forEach((item) => {
                        const i = validate(item);
                        i.forEach((obj) => {
                            mapping.set(obj.key, obj.value);
                        });
                    });;

                    root.walkAtRules('import', (decl) => {
                        applyImportMap(mapping, decl);
                    });
                },
                AtRule: {
                    import: async (decl) => {
                        applyImportMap(mapping, decl);
                    },
                },
            };
        },
    };
};

module.exports.postcss = true;
