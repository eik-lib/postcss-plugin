import tap from 'tap';
import postcss from 'postcss';
import plugin from '../src/plugin';

const simple = `
  @import 'normalize.css';
`;
const advanced = `
  @import url(normalize.css);
  @import url("normalize.css");
  @import "normalize.css";
`;
const webpack = `
  @import '~normalize.css';
  @import url(~normalize.css);
  @import url("~normalize.css");
  @import "~normalize.css";
`;

/*
 * When running tests on Windows, the output code get some extra \r on each line.
 * Remove these so snapshots work on all OSes.
 */
const clean = (str) => str.split('\r').join('');

tap.test(
    'plugin() - target is not an absolute URL - should reject process',
    (t) => {
        t.rejects(
            postcss(
                plugin({
                    imports: {
                        foo: './foo',
                    },
                })
            ).process(simple, { from: undefined }),
            new Error('Target for import specifier must be an absolute URL.')
        );
        t.end();
    }
);

tap.test(
    'plugin() - simple module - should replace normalize.css with CDN URL',
    async (t) => {
        const { css } = await postcss(
            plugin({
                imports: {
                    'normalize.css': 'https://unpkg.com/normalize.css@8/normalize.css',
                },
            })
        ).process(simple, { from: undefined });

        t.matchSnapshot(clean(css), 'simple example');
        t.end();
    }
);

tap.test(
    'plugin() - advanced module - should replace normalize.css with CDN URL',
    async (t) => {
        const { css } = await postcss(
            plugin({
                imports: {
                    'normalize.css': 'https://unpkg.com/normalize.css@8/normalize.css',
                },
            })
        ).process(advanced, { from: undefined });

        t.matchSnapshot(clean(css), 'advanced example');
        t.end();
    }
);

tap.test(
    'plugin() - webpack module - should replace normalize.css with CDN URL',
    async (t) => {
        const { css } = await postcss(
            plugin({
                imports: {
                    'normalize.css': 'https://unpkg.com/normalize.css@8/normalize.css',
                },
            })
        ).process(webpack, { from: undefined });

        t.matchSnapshot(clean(css), 'webpack example');
        t.end();
    }
);

tap.test(
    'plugin() - import values is an Array - should use the first entry in the Array',
    async (t) => {
        const { css } = await postcss(
            plugin({
                imports: {
                    'normalize.css': [
                        'https://unpkg.com/normalize.css@8/normalize.css',
                        'https://unpkg.com/normalize.css@7/normalize.css',
                    ],
                },
            })
        ).process(simple, { from: undefined });

        t.matchSnapshot(clean(css), 'first array entry');
        t.end();
    }
);
