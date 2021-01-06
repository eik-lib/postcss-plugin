# postcss-import-map

PostCSS [Eik](https://eik.dev/) plugin to support the use of import maps to map "bare" import specifiers in CSS @import rules.

**Notes:**

-   **This plugin should probably be used as the first plugin of your list.**
-   **If you use `postcss-import` please [read this.](#postcss-import-usage)**

## Installation

```bash
$ npm install @eik/postcss-import-map
```

## Usage

```js
// dependencies
var fs = require('fs');
var postcss = require('postcss');
var eikImportMapPlugin = require('@eik/postcss-import-map');

// css to be processed
var css = fs.readFileSync('css/input.css', 'utf8');

// process css
postcss()
    .use(
        eikImportMapPlugin({
            imports: {
                'normalize.css':
                    'https://unpkg.com/normalize.css@8/normalize.css',
            },
        })
    )
    .process(css, {
        // `from` option is needed here
        from: 'css/input.css',
    })
    .then(function (result) {
        var output = result.css;

        console.log(output);
    });
```

`css/input.css`:

```css
@import 'normalize.css';

body {
    background: black;
}
```

will give you:

```css
@import 'https://unpkg.com/normalize.css@8/normalize.css';

body {
    background: black;
}
```

## PostCSS Import Usage

If you're using [postcss-import](https://github.com/postcss/postcss-import) make sure you update the `plugins` option.
`postcss.config.js`

```js
module.exports = (ctx) => ({
    plugins: [
        require('@eik/postcss-import-map')(),
        require('postcss-import')({
            // It needs to be added here as well to ensure everything is mapped
            plugins: [require('@eik/postcss-import-map')],
        }),
    ],
});
```

## Reading config from eik.json or package.json

By default, this plugin will try to read config from your projects `eik.json` or `package.json` files in the root of the current working directory.

The path to the location of an `eik.json` file can be specified with the `path` option.
`path` defaults to the current working directory.

```js
module.exports = (ctx) => ({
    plugins: [
        require('@eik/postcss-import-map')({ path: '/path/to/eik.json' }),
        require('postcss-import')({
            // It needs to be added here as well to ensure everything is mapped
            plugins: [
                require('@eik/postcss-import-map')({
                    path: '/path/to/eik.json',
                }),
            ],
        }),
    ],
});
```

The path to the location of a `package.json` file can be specified with the `packagePath` option.
`packagePath` defaults to the current working directory.

```js
module.exports = (ctx) => ({
    plugins: [
        require('@eik/postcss-import-map')({
            packagePath: '/path/to/package.json',
        }),
        require('postcss-import')({
            // It needs to be added here as well to ensure everything is mapped
            plugins: [
                require('@eik/postcss-import-map')({
                    packagePath: '/path/to/package.json',
                }),
            ],
        }),
    ],
});
```

## Options

This plugin takes an [import map](https://github.com/WICG/import-maps) as options:

| option      | default            | type     | required | details                                                     |
| ----------- | ------------------ | -------- | -------- | ----------------------------------------------------------- |
| path        | `cwd/eik.json`     | `string` | `false`  | Path to eik.json file.                                      |
| packagePath | `cwd/package.json` | `string` | `false`  | Path to package.json file.                                  |
| urls        | `[]`               | `array`  | `false`  | Array of import map URLs to fetch from.                     |
| imports     | `{}`               | `object` | `false`  | Mapping between "bare" import specifiers and absolute URLs. |

This module only cares about "bare" import specifies which map to absolute
URLs in the import map. Any other import specifiers defined in the import map
are ignored.

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
