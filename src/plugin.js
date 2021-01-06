/* eslint-disable no-restricted-syntax, no-shadow */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const parseCssUrls = require('css-url-parser');

const notUrl = (url) => url.substr(0, 4) !== 'http';

const notBare = (str) =>
    str.startsWith('/') || str.startsWith('./') || str.startsWith('../');

async function readJSONFile(path) {
    try {
        const contents = await fs.promises.readFile(path);
        return JSON.parse(contents);
    } catch (err) {
        return {};
    }
}

async function readEikJSONMaps(eikJSONPath, pkgJSONPath) {
    const eikJSON = await readJSONFile(eikJSONPath);
    const pkgJSON = await readJSONFile(pkgJSONPath);

    if (eikJSON.name && pkgJSON.eik) {
        throw new Error('Eik configuration was defined in both in package.json and eik.json. You must specify one or the other.');
    }

    const config = { ...eikJSON, ...pkgJSON.eik };

    if (typeof config['import-map'] === 'string') return [config['import-map']];
    return config['import-map'] || [];
}

async function fetchImportMaps(urls = []) {
    try {
        const maps = urls.map((map) =>
            fetch(map).then((result) => {
                if (result.status === 404) {
                    throw new Error('Import map could not be found on server');
                } else if (result.status >= 400 && result.status < 500) {
                    throw new Error('Server rejected client request');
                } else if (result.status >= 500) {
                    throw new Error('Server error');
                }
                return result.json();
            })
        );
        const results = await Promise.all(maps);
        const dependencies = results.map((result) => result.imports);
        return Object.assign({}, ...dependencies);
    } catch (err) {
        throw new Error(
            `Unable to load import map file from server: ${err.message}`
        );
    }
}

// @TODO this could be a @eik/import-map-utils package
async function populateImportMap({
    path: eikPath = path.join(process.cwd(), 'eik.json'),
    packagePath = path.join(process.cwd(), 'package.json'),
    urls = [],
    imports = {},
} = {}) {
    const mapping = new Map();

    const importmapUrls = await readEikJSONMaps(eikPath, packagePath);
    for (const map of importmapUrls) {
        urls.push(map);
    }

    let imprts = {};
    if (urls.length > 0) {
        imprts = { ...(await fetchImportMaps(urls)) };
    }
    Object.assign(imprts, imports);

    Object.keys(imprts).forEach((key) => {
        const value = Array.isArray(imprts[key]) ? imprts[key][0] : imprts[key];

        if (notBare(key)) return;

        if (notUrl(value))
            throw Error('Target for import specifier must be an absolute URL.');

        mapping.set(key, value);
    });

    return mapping;
}

module.exports = ({ path, packagePath, urls, imports } = {}) => {
    return {
        postcssPlugin: '@eik/postcss-import-map',
        prepare() {
            // Avoid parsing things more than necessary
            const processed = new WeakMap();
            // Only replace once per url
            const replaced = new Set();
            // Eagerly start resolving
            const mapFetch = populateImportMap({ path, packagePath, urls, imports });
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
            return {
                // Run initially once, this is to ensure it runs before postcss-import
                async Once(root) {
                    const mapping = await mapFetch;

                    root.walkAtRules('import', (decl) => {
                        applyImportMap(mapping, decl);
                    });
                },
                AtRule: {
                    import: async (decl) => {
                        const mapping = await mapFetch;
                        applyImportMap(mapping, decl);
                    },
                },
            };
        },
    };
};

module.exports.postcss = true;
