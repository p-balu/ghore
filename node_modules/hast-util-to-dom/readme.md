# hast-util-to-dom

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[hast][] utility to transform to a [DOM][] tree.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`toDom(tree[, options])`](#todomtree-options)
    *   [`AfterTransform`](#aftertransform)
    *   [`Options`](#options)
*   [Syntax tree](#syntax-tree)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a utility that creates a DOM tree (defaulting to the actual DOM
but also supporting things like [`jsdom`][jsdom]) from a [hast][] (HTML) syntax
tree.

## When should I use this?

You can use this project when you want to turn hast into a DOM in browsers,
either to use it directly on a page, or to enable the use of DOM APIs (such as
`querySelector` to find things or `innerHTML` to serialize stuff).

The hast utility [`hast-util-from-dom`][hast-util-from-dom] does the inverse of
this utility.
It turns DOM trees into hast.

The rehype plugin [`rehype-dom-stringify`][rehype-dom-stringify] wraps this
utility to serialize as HTML with DOM APIs.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install hast-util-to-dom
```

In Deno with [`esm.sh`][esmsh]:

```js
import {toDom} from 'https://esm.sh/hast-util-to-dom@4'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {toDom} from 'https://esm.sh/hast-util-to-dom@4?bundle'
</script>
```

## Use

Say our page `example.html` looks as follows:

```html
<!doctype html>
<title>Example</title>
<body>
  <script type="module">
    import {h} from 'https://esm.sh/hastscript?bundle'
    import {toDom} from 'https://esm.sh/hast-util-to-dom?bundle'

    const tree = h('main', [
      h('h1', 'Hi'),
      h('p', [h('em', 'Hello'), ', world!'])
    ])

    document.body.append(toDom(tree))
  </script>
```

Now running `open example.html` shows the `main`, `h1`, and `p` elements on the
page.

## API

This package exports the identifier [`toDom`][api-to-dom].
There is no default export.

### `toDom(tree[, options])`

Turn a hast tree into a DOM tree.

###### Parameters

*   `tree` ([`HastNode`][hast-node])
    — tree to transform
*   `options` ([`Options`][api-options], optional)
    — configuration

###### Returns

DOM node ([`DomNode`][dom-node]).

### `AfterTransform`

Callback called when each node is transformed (TypeScript type).

###### Parameters

*   `hastNode` ([`HastNode`][hast-node])
    — hast node that was handled
*   `domNode` ([`DomNode`][dom-node])
    — corresponding DOM node

###### Returns

Nothing.

### `Options`

Configuration (TypeScript type).

###### Fields

*   `afterTransform` ([`AfterTransform`][api-after-transform], optional)
    — callback called when each node is transformed
*   `document` (`Document`, default: `globalThis.document`)
    — document interface to use.
*   `fragment` (`boolean`, default: `false`)
    — whether to return a DOM fragment (`true`) or a whole document (`false`)
*   `namespace` (`string`, default: depends)
    — namespace to use to create elements

## Syntax tree

The syntax tree is [hast][].

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`AfterTransform`][api-after-transform] and
[`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `hast-util-to-dom@^4`,
compatible with Node.js 16.

## Security

Use of `hast-util-to-dom` can open you up to a
[cross-site scripting (XSS)][xss] attack if the hast tree is unsafe.
Use [`hast-util-santize`][hast-util-sanitize] to make the hast tree safe.

## Related

*   [`hast-util-sanitize`](https://github.com/syntax-tree/hast-util-sanitize)
    — sanitize hast nodes
*   [`hast-util-to-html`](https://github.com/syntax-tree/hast-util-to-html)
    — serialize as HTML
*   [`hast-util-from-dom`](https://github.com/syntax-tree/hast-util-from-dom)
    — create a hast tree from a DOM tree

## Contribute

See [`contributing.md`][contributing] in [`syntax-tree/.github`][health] for
ways to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[ISC][license] © [Keith McKnight][author]

<!-- Definitions -->

[build-badge]: https://github.com/syntax-tree/hast-util-to-dom/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/hast-util-to-dom/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/hast-util-to-dom.svg

[coverage]: https://codecov.io/github/syntax-tree/hast-util-to-dom

[downloads-badge]: https://img.shields.io/npm/dm/hast-util-to-dom.svg

[downloads]: https://www.npmjs.com/package/hast-util-to-dom

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=hast-util-to-dom

[size]: https://bundlejs.com/?q=hast-util-to-dom

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[typescript]: https://www.typescriptlang.org

[license]: license

[author]: https://keith.mcknig.ht

[health]: https://github.com/syntax-tree/.github

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[hast-util-sanitize]: https://github.com/syntax-tree/hast-util-sanitize

[hast-util-from-dom]: https://github.com/syntax-tree/hast-util-from-dom

[jsdom]: https://github.com/jsdom/jsdom

[rehype-dom-stringify]: https://github.com/rehypejs/rehype-dom/tree/main/packages/rehype-dom-stringify

[hast]: https://github.com/syntax-tree/hast

[hast-node]: https://github.com/syntax-tree/hast#nodes

[dom]: https://developer.mozilla.org/docs/Web/API/Document_Object_Model

[dom-node]: https://developer.mozilla.org/docs/Web/API/Node

[api-to-dom]: #todomtree-options

[api-after-transform]: #aftertransform

[api-options]: #options
