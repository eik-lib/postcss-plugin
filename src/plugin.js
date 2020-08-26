/* eslint-disable no-restricted-syntax */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import postcss from 'postcss';
import parseCssUrls from 'css-url-parser';

const notUrl = (url) => url.substr(0, 4) !== 'http';

const notBare = (str) => str.startsWith('/') || str.startsWith('./') || str.startsWith('../');

async function readEikJSONMaps(eikJSONPath) {
    try {
        const contents = await fs.promises.readFile(eikJSONPath);
        const eikJSON = JSON.parse(contents);
        if (typeof eikJSON['import-map'] === 'string') return [eikJSON['import-map']];
        return eikJSON['import-map'] || [];
    } catch (err) {
        return [];
    }
}

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
        const results = await Promise.all(maps);
        const dependencies = results.map((result) => result.imports);
        return Object.assign({}, ...dependencies);
    } catch (err) {
        throw new Error(
            `Unable to load import map file from server: ${err.message}`
        );
    }
}

export default postcss.plugin(
    '@eik/postcss-import-map',
    ({
        path: eikPath = path.join(process.cwd(), 'eik.json'),
        urls = [],
        imports = {},
    } = {}) => {
        const mapping = new Map();

        // Work with options here
        return async (root) => {
            const importmapUrls = await readEikJSONMaps(eikPath);
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

                if (notUrl(value)) throw Error('Target for import specifier must be an absolute URL.');

                mapping.set(key, value);
            });

            root.walkAtRules('import', (decl) => {
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

                if (mapping.has(key)) {
                    // eslint-disable-next-line no-param-reassign
                    decl.params = `'${mapping.get(key)}'`;
                }
            });
        };
    }
);
