'use strict';

const postcss = require('postcss');
const fastify = require('fastify');
const path = require('path');
const tap = require('tap');
const fs = require('fs');
const plugin = require("..");

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
                    maps: [{
                        imports: {
                            foo: './foo',
                        },
                    }],
                })
            ).process(simple, { from: undefined }),
            new Error('Import specifier can NOT be mapped to a bare import statement. Import specifier "foo" is being wrongly mapped to "./foo"')
        );
        t.end();
    }
);

tap.test(
    'plugin() - simple module - should replace normalize.css with CDN URL',
    async (t) => {
        const { css } = await postcss(
            plugin({
                maps: [{
                    imports: {
                        "normalize.css": 'https://cdn.eik.dev/normalize.css@8/normalize.css',
                    },
                }],
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
                maps: [{
                    imports: {
                        'normalize.css': 'https://cdn.eik.dev/normalize.css@8/normalize.css',
                    },
                }],
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
                maps: [{
                    imports: {
                        'normalize.css': 'https://cdn.eik.dev/normalize.css@8/normalize.css',
                    },
                }],
            })
        ).process(webpack, { from: undefined });

        t.matchSnapshot(clean(css), 'webpack example');
        t.end();
    }
);

tap.test('plugin() - eik.json defined import maps', async (t) => {
    const server = fastify();
    server.get('/one', (request, reply) => {
        reply.send({
            imports: {
                'normalize.css': 'https://cdn.eik.dev/normalize.css@8/normalize.css',
            },
        });
    });
    const address = await server.listen();

    await fs.promises.writeFile(path.join(process.cwd(), 'eik.json'), JSON.stringify({
        name: 'test',
        server: address,
        version: '1.0.0',
        files: {
            '/css': '/src/css/',
            '/js': '/src/js/',
        },
        'import-map': `${address}/one`,
    }));

    const { css } = await postcss(
        plugin()
    ).process(simple, { from: undefined });

    t.matchSnapshot(clean(css), 'import maps specified in eik.json');
    await server.close();
    await fs.promises.unlink(path.join(process.cwd(), 'eik.json'));
    t.end();
});

tap.test('plugin() - Import map defined through constructor "maps" argument take precedence over import map defined in eik.json', async (t) => {
    const server = fastify();
    server.get('/one', (request, reply) => {
        reply.send({
            imports: {
                'normalize.css': 'https://cdn.eik.dev/normalize.css@7/normalize.css',
            },
        });
    });
    const address = await server.listen();

    await fs.promises.writeFile(path.join(process.cwd(), 'eik.json'), JSON.stringify({
        name: 'test',
        server: address,
        version: '1.0.0',
        files: {
            '/css': '/src/css/',
            '/js': '/src/js/',
        },
        'import-map': `${address}/one`,
    }));

    const { css } = await postcss(
        plugin({
            maps: [{
                imports: {
                    'normalize.css': 'https://cdn.eik.dev/normalize.css@8/normalize.css',
                },
            }],
        })
    ).process(simple, { from: undefined });

    t.matchSnapshot(clean(css), 'Should rewrite import statement to https://cdn.eik.dev/normalize.css@8/normalize.css');
    await server.close();
    await fs.promises.unlink(path.join(process.cwd(), 'eik.json'));
    t.end();
});


tap.test('plugin() - Import map defined through constructor "urls" argument take precedence over import map defined in eik.json', async (t) => {
    const server = fastify();
    server.get('/one', (request, reply) => {
        reply.send({
            imports: {
                'normalize.css': 'https://cdn.eik.dev/normalize.css@7/normalize.css',
            },
        });
    });
    server.get('/two', (request, reply) => {
        reply.send({
            imports: {
                'normalize.css': 'https://cdn.eik.dev/normalize.css@8/normalize.css',
            },
        });
    });
    const address = await server.listen();

    await fs.promises.writeFile(path.join(process.cwd(), 'eik.json'), JSON.stringify({
        name: 'test',
        server: address,
        version: '1.0.0',
        files: {
            '/css': '/src/css/',
            '/js': '/src/js/',
        },
        'import-map': `${address}/one`,
    }));

    const { css } = await postcss(
        plugin({
            urls: [
                `${address}/two`
            ],
        })
    ).process(simple, { from: undefined });

    t.matchSnapshot(clean(css), 'Should rewrite import statement to https://cdn.eik.dev/normalize.css@8/normalize.css');
    await server.close();
    await fs.promises.unlink(path.join(process.cwd(), 'eik.json'));
    t.end();
});

tap.test('plugin() - Import map defined through constructor "maps" argument take precedence over import map defined through constructor "urls" argument', async (t) => {
    const server = fastify();
    server.get('/one', (request, reply) => {
        reply.send({
            imports: {
                'normalize.css': 'https://cdn.eik.dev/normalize.css@6/normalize.css',
            },
        });
    });
    server.get('/two', (request, reply) => {
        reply.send({
            imports: {
                'normalize.css': 'https://cdn.eik.dev/normalize.css@7/normalize.css',
            },
        });
    });
    const address = await server.listen();

    await fs.promises.writeFile(path.join(process.cwd(), 'eik.json'), JSON.stringify({
        name: 'test',
        server: address,
        version: '1.0.0',
        files: {
            '/css': '/src/css/',
            '/js': '/src/js/',
        },
        'import-map': `${address}/one`,
    }));

    const { css } = await postcss(
        plugin({
            urls: [
                `${address}/two`
            ],
            maps: [{
                imports: {
                    'normalize.css': 'https://cdn.eik.dev/normalize.css@8/normalize.css',
                },
            }],
        })
    ).process(simple, { from: undefined });

    t.matchSnapshot(clean(css), 'Should rewrite import statement to https://cdn.eik.dev/normalize.css@8/normalize.css');
    await server.close();
    await fs.promises.unlink(path.join(process.cwd(), 'eik.json'));
    t.end();
});