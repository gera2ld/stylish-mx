import test from 'tape';
import { parseStyle, parseFirefoxCss } from 'src/background/utils/db';

test('parseStyle', t => {
  t.test('should parse JSON style', q => {
    parseStyle({
      meta: {
        name: 'hello',
      },
      config: {
        shouldUpdate: false,
      },
      sections: [
        { domains: [], code: '/* hi */' },
      ],
    })
    .then(res => {
      q.ok(res.data.update.props.id);
      q.ok(res.data.update.props.lastModified);
      q.ok(res.data.update.props.lastUpdated);
      delete res.data.update.props.id;
      delete res.data.update.props.lastModified;
      delete res.data.update.props.lastUpdated;
      q.deepEqual(res, {
        cmd: 'AddStyle',
        data: {
          update: {
            message: 'msgInstalled,',
            config: {
              enabled: 1,
              shouldUpdate: 0,
              removed: 0,
            },
            props: {},
            meta: {
              name: 'hello',
            },
            sections: [
              {
                domains: [],
                code: '/* hi */',
              },
            ],
          },
          where: {
            id: 1,
          },
        },
      });
      q.end();
    });
  });

  t.test('should parse Firefox CSS', q => {
    parseFirefoxCss({
      filename: 'aaa',
      code: `
/* ==UserCSS==
@name hello
@url http://www.example.com
==/UserCSS== */

@-moz-document domain("www.baidu.com") {
  body { /* whatever */ }
}
      `,
    })
    .then(res => {
      q.ok(res.data.update.props.id);
      q.ok(res.data.update.props.lastModified);
      q.ok(res.data.update.props.lastUpdated);
      delete res.data.update.props.id;
      delete res.data.update.props.lastModified;
      delete res.data.update.props.lastUpdated;
      q.deepEqual(res, {
        cmd: 'AddStyle',
        data: {
          update: {
            message: 'msgInstalled,',
            config: {
              enabled: 1,
              shouldUpdate: 1,
              removed: 0,
            },
            props: {},
            meta: {
              name: 'hello',
              url: 'http://www.example.com',
            },
            sections: [
              {
                domains: [
                  'www.baidu.com',
                ],
                regexps: [],
                urlPrefixes: [],
                urls: [],
                code: '\n  body { /* whatever */ }\n',
              },
            ],
          },
          where: {
            id: 2,
          },
        },
      });
      q.end();
    });
  });
});
