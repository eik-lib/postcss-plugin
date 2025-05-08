import parseCssUrls from "css-url-parser";
import { helpers } from "@eik/common";

/**
 * @param {string} url
 * @returns {boolean}
 */
const notUrl = (url) => url.substr(0, 4) !== "http";

/**
 * @typedef {object} ImportMap
 * @property {Record<string, string>} imports
 */

/**
 * @param {ImportMap} map
 * @returns {Array<{ key: string; value: string; }>}
 */
const validate = (map) =>
	Object.keys(map.imports).map((key) => {
		const value = map.imports[key];

		if (notUrl(value)) {
			throw Error(
				`Import specifier can NOT be mapped to a bare import statement. Import specifier "${key}" is being wrongly mapped to "${value}"`,
			);
		}

		return { key, value };
	});

/**
 * @typedef {object} PluginOptions
 * @property {string} [path=process.cwd()]
 * @property {string[]} [urls=[]] URLs to import maps hosted on an Eik server. Takes precedence over `eik.json`.
 * @property {ImportMap[]} [maps=[]] Inline import maps that should be used. Takes precedence over `urls` and `eik.json`.
 */

/**
 * @typedef {object} PrepareResult
 * @property {(root: import('postcss').Root) => Promise<void>} Once
 * @property {{ import: (decl: import('postcss').AtRule) => Promise<void> }} AtRule
 */

/**
 * @typedef {object} Plugin
 * @property {string} postcssPlugin
 * @property {() => PrepareResult} prepare
 */

/**
 * Returns the plugin which will apply the given import maps during the build.
 * @param {PluginOptions} options
 * @returns {Plugin}
 */
export default ({ path = process.cwd(), maps = [], urls = [] } = {}) => {
	const pMaps = Array.isArray(maps) ? maps : [maps];
	const pUrls = Array.isArray(urls) ? urls : [urls];

	return {
		postcssPlugin: "@eik/postcss-import-map",
		prepare() {
			// Avoid parsing things more than necessary
			const processed = new WeakMap();
			// Only replace once per url
			const replaced = new Set();
			// Eagerly start resolving

			// Reused replace logic
			/**
			 *
			 * @param {Map<string, string>} mapping
			 * @param {import('postcss').AtRule} decl
			 * @returns {void}
			 */
			const applyImportMap = (mapping, decl) => {
				if (processed.has(decl)) {
					return;
				}

				let key;
				// First check if it's possibly using syntax like url()
				const parsedUrls = parseCssUrls(decl.params);
				if (parsedUrls.length > 0) {
					key = parsedUrls[0];
				} else {
					// Handle the common cases where it's not wrapped in url() but may have quotes
					key = decl.params.replace(/["']/g, "");
				}

				// Webpack interop
				key = key.replace(/^~/, "");

				if (replaced.has(key)) {
					decl.remove();
				} else if (mapping.has(key)) {
					decl.params = `'${mapping.get(key)}'`;
					replaced.add(key);
				}

				// Cache we've processed this
				processed.set(decl, true);
			};

			/** @type {Map<string, string>} */
			const mapping = new Map();

			return {
				// Run initially once, this is to ensure it runs before postcss-import
				async Once(root) {
					// Load eik config from eik.json or package.json
					const config = helpers.getDefaults(path);

					// Fetch import maps from the server
					const fetched = await helpers.fetchImportMaps([
						...config.map,
						...pUrls,
					]);

					const allImportMaps = [...fetched, ...pMaps];
					allImportMaps.forEach((item) => {
						const i = validate(item);
						i.forEach((obj) => {
							mapping.set(obj.key, obj.value);
						});
					});

					root.walkAtRules("import", (decl) => {
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
