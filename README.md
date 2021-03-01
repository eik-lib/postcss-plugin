# @eik/postcss-plugin

PostCSS [Eik](https://eik.dev/) plugin to support the use of import maps to map "bare" import specifiers in CSS @import rules.

## Installation

```bash
$ npm install @eik/postcss-plugin
```

## Usage

```js
const postcss = require('postcss');
const plugin = require('@eik/postcss-plugin');
const fs = require('fs');

// CSS to be processed
const css = fs.readFileSync('css/input.css', 'utf8');

postcss()
    .use(
        plugin()
    )
    .process(css, {
        // `from` option is needed here
        from: 'css/input.css',
    })
    .then(function (result) {
        console.log(result.css);
    });
```

## Description

This plugin transforms "bare" import specifiers to absolute URL specifiers in
CSS modules by applying an Import Map ahead of time.

For a more detailed description of Import Maps, please see our [Import Maps section](https://eik.dev/docs/mapping_import_map).

The main target for Import Maps is to map import statements in EcmaScript Modules but it can be applied to CSS import statements too.

Given the following CSS:

```css
@import 'normalize.css';

body {
    background: black;
}
```

when applaying the following Import Map:

```json
{
    "imports": {
        "normalize.css": "https://cdn.eik.dev/normalize.css@8/normalize.css",
    },
}
```

one will get a transformed CSS like so:

```css
@import 'https://cdn.eik.dev/normalize.css@8/normalize.css';

body {
    background: black;
}
```

## Options

This plugin takes the following as options:

| option  | default         | type     | required | details                                                                       |
| ------- | --------------- | -------- | -------- | ----------------------------------------------------------------------------- |
| path    | `process.cwd()` | `string` | `false`  | Path to directory containing a eik.json file or package.json with eik config. |
| urls    | `[]`            | `array`  | `false`  | Array of import map URLs to fetch from.                                       |
| maps    | `[]`            | `array`  | `false`  | Array of import map as objects.                                               |

The plugin will attempt to read import map URLs from [`eik.json` or `package.json`](https://eik.dev/docs/overview_eik_json) files in the root of the current working directory if present.

```js
postcss()
    .use(
        plugin()
    )
    .process(css, {...})
    .then(...);
```

The path to the location of an `eik.json` file can be specified with the `path` option.

```js
postcss()
    .use(
        plugin({ path: '/path/to/eik-json-folder' })
    )
    .process(css, {...})
    .then(...);
```

The plugin can also be told which URLs to load import maps from directly using the `urls` option.

```js
postcss()
    .use(
        plugin({ urls: 'http://myserver/import-map' })
    )
    .process(css, {...})
    .then(...);
```

Additionally, individual mappings can be specified using the `maps` option.

```js
postcss()
    .use(
        plugin({
            maps: [{
                "imports": {
                    "normalize.css": "https://cdn.eik.dev/normalize.css@8/normalize.css",
                },
            }],
        })
    )
    .process(css, {...})
    .then(...);
```

### Precedence

If several of the options are used, `maps` takes precedence over `urls` which takes precedence over values loaded from an `eik.json` or `package.json` file.

ie. in the following example

```js
postcss()
    .use(
        plugin({
            path: '/path/to/eik-json-folder',
            urls: ['http://myserver/import-map'],
            maps: [{
                "imports": {
                    "normalize.css": "https://cdn.eik.dev/normalize.css@8/normalize.css",
                },
            }],
        })
    )
    .process(css, {...})
    .then(...);
```

Any import map URLs in `eik.json` will be loaded first, then merged with (and overridden if necessary by) the result of fetching from `http://myserver/import-map` before finally being merged with (and overriden if necessary by) specific mappings defined in `maps`.

## PostCSS Import Usage

If you're using [postcss-import](https://github.com/postcss/postcss-import) make sure you update the `plugins` option.
`postcss.config.js`

```js
module.exports = (ctx) => ({
    plugins: [
        require('@eik/postcss-plugin')(),
        require('postcss-import')({
            // It needs to be added here as well to ensure everything is mapped
            plugins: [require('@eik/postcss-plugin')],
        }),
    ],
});
```

## License

Copyright (c) 2020 Finn.no

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
