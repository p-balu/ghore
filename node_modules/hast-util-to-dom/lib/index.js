/**
 * @typedef {import('hast').Comment} HastComment
 * @typedef {import('hast').Doctype} HastDoctype
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('hast').Nodes} HastNodes
 * @typedef {import('hast').Properties} HastProperties
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').RootContent} HastRootContent
 * @typedef {import('hast').Text} HastText
 *
 * @typedef {import('property-information').Schema} Schema
 */

/**
 * @callback AfterTransform
 *   Callback called when each node is transformed.
 * @param {HastNodes} hastNode
 *   hast node that was handled.
 * @param {Node} domNode
 *   Corresponding DOM node.
 * @returns {undefined | void}
 *   Nothing.
 *
 *   Note: `void` included until TS infers `undefined` fine.
 *
 * @typedef Options
 *   Configuration.
 * @property {AfterTransform | null | undefined} [afterTransform]
 *   Callback called when each node is transformed (optional).
 * @property {Document | null | undefined} [document]
 *   Document interface to use (default: `globalThis.document`).
 * @property {boolean | null | undefined} [fragment=false]
 *   Whether to return a DOM fragment (`true`) or a whole document (`false`)
 *   (default: `false`).
 * @property {string | null | undefined} [namespace]
 *   Namespace to use to create elements (optional).
 *
 * @typedef State
 *   Info passed around about the current state.
 * @property {Document} doc
 *   Document interface to use.
 * @property {boolean} fragment
 *   Whether a fragment (`true`) or whole document (`false`) is built.
 * @property {string | undefined} namespace
 *   Explicit namespace to use.
 * @property {string | undefined} impliedNamespace
 *   Namespace.
 * @property {AfterTransform | undefined} afterTransform
 *   Callback called after each hast node is transformed.
 */

/* eslint-env browser */

import {html, find, svg} from 'property-information'
import {webNamespaces} from 'web-namespaces'

const own = {}.hasOwnProperty

/**
 * Transform a hast tree to a DOM tree
 *
 * @param {HastNodes} tree
 *   Tree to transform.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Comment | Document | DocumentFragment | DocumentType | Element | Text}
 *   Equivalent DOM node.
 */
export function toDom(tree, options) {
  const config = options || {}
  return transform(tree, {
    doc: config.document || document,
    fragment: config.fragment || false,
    namespace: config.namespace || undefined,
    impliedNamespace: undefined,
    afterTransform: config.afterTransform || undefined
  })
}

/**
 * @param {HastNodes} node
 *   Node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {Comment | Document | DocumentFragment | DocumentType | Element | Text}
 *   Equivalent DOM node.
 */
function transform(node, state) {
  const transformed = one(node, state)
  if (state.afterTransform) state.afterTransform(node, transformed)
  return transformed
}

/**
 * Transform any hast node.
 *
 * @param {HastNodes} node
 *   Node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {Comment | Document | DocumentFragment | DocumentType | Element | Text}
 *   Equivalent DOM node.
 */
function one(node, state) {
  switch (node.type) {
    case 'root': {
      return root(node, state)
    }

    case 'text': {
      return text(node, state)
    }

    case 'doctype': {
      return doctype(node, state)
    }

    case 'comment': {
      return comment(node, state)
    }

    default: {
      // Important: unknown nodes are passed to `element`.
      return element(node, state)
    }
  }
}

/**
 * Create a document.
 *
 * @param {HastRoot} node
 *   Node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {Document | DocumentFragment | HTMLHtmlElement}
 *   Equivalent DOM node.
 */
function root(node, state) {
  const children = node.children || []
  let rootIsDocument = children.length === 0
  let index = -1
  /** @type {string | undefined} */
  let foundNamespace

  while (++index < children.length) {
    const child = children[index]

    if (child.type === 'element' && child.tagName === 'html') {
      // If we have a root HTML node, we don’t need to render as a fragment.
      rootIsDocument = true

      // Take namespace.
      foundNamespace =
        String((child.properties && child.properties.xmlns) || '') ||
        webNamespaces.html

      break
    }
  }

  const namespace = state.namespace || foundNamespace
  // The root node will be `Document`, `DocumentFragment`, or `HTMLElement`.
  /** @type {Document | DocumentFragment | HTMLHtmlElement} */
  let result

  if (rootIsDocument) {
    result = state.doc.implementation.createDocument(
      // Note: `null` is different from `undefined`.
      namespace || null,
      ''
    )
  } else if (state.fragment) {
    result = state.doc.createDocumentFragment()
  } else {
    result = state.doc.createElement('html')
  }

  appendAll(result, children, {
    ...state,
    namespace,
    impliedNamespace: namespace
  })

  return result
}

/**
 * Create a `doctype`.
 *
 * @param {HastDoctype} _
 *   Node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {DocumentType}
 *   DOM document type.
 */
function doctype(_, state) {
  return state.doc.implementation.createDocumentType('html', '', '')
}

/**
 * Create a `text`.
 *
 * @param {HastText} node
 *   Node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {Text}
 *   DOM text.
 */
function text(node, state) {
  return state.doc.createTextNode(node.value)
}

/**
 * Create a `comment`.
 *
 * @param {HastComment} node
 *   Node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {Comment}
 *   DOM comment.
 */
function comment(node, state) {
  return state.doc.createComment(node.value)
}

/**
 * Create an `element`.
 *
 * @param {HastElement} node
 *   Node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {Element}
 *   DOM element.
 */
function element(node, state) {
  let impliedNamespace = state.impliedNamespace || state.namespace
  // Important: unknown nodes are passed to `element`.
  const tagName =
    node.tagName || (impliedNamespace === webNamespaces.svg ? 'g' : 'div')
  const properties = node.properties || {}
  const children = node.children || []

  // Switch automatically from HTML to SVG on `<svg>`.
  if (
    (impliedNamespace === undefined ||
      impliedNamespace === webNamespaces.html) &&
    tagName === 'svg'
  ) {
    impliedNamespace = webNamespaces.svg
  }

  const result = impliedNamespace
    ? state.doc.createElementNS(impliedNamespace, tagName)
    : state.doc.createElement(tagName)

  addProperties(
    result,
    properties,
    impliedNamespace === webNamespaces.svg ? svg : html
  )

  const currentImpliedNamespace = state.impliedNamespace
  state.impliedNamespace = impliedNamespace
  appendAll(result, children, state)
  state.impliedNamespace = currentImpliedNamespace

  return result
}

/**
 * Add all properties.
 *
 * @param {Element} result
 *   Element.
 * @param {HastProperties} properties
 *   Properties from hast element.
 * @param {Schema} schema
 *   Schema from `property-information`.
 * @returns {undefined}
 *   Nothing.
 */
function addProperties(result, properties, schema) {
  /** @type {string} */
  let key

  for (key in properties) {
    if (own.call(properties, key)) {
      const info = find(schema, key)
      let value = properties[key]

      if (Array.isArray(value)) {
        value = value.join(info.commaSeparated ? ', ' : ' ')
      }

      if (info.mustUseProperty) {
        // @ts-expect-error: setting the property is fine, according to
        // `property-information`.
        result[info.property] = value
      }

      if (
        info.boolean ||
        (info.overloadedBoolean && typeof value === 'boolean')
      ) {
        if (value) {
          result.setAttribute(info.attribute, '')
        }
      } else if (info.booleanish) {
        result.setAttribute(info.attribute, String(value))
      } else if (value === true) {
        result.setAttribute(info.attribute, '')
      } else if (value || value === 0 || value === '') {
        result.setAttribute(info.attribute, String(value))
      }
    }
  }
}

/**
 * Add all children.
 *
 * @param {Document | DocumentFragment | Element} node
 *   DOM node to append to.
 * @param {Array<HastRootContent>} children
 *   hast children.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function appendAll(node, children, state) {
  let index = -1

  while (++index < children.length) {
    node.append(transform(children[index], state))
  }
}
