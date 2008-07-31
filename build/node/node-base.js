YUI.add('node-base', function(Y) {

/**
 * Provides a wrapper for dom nodes that supports selector queries normalizes x-browser differences.
 * @module node
 */

    /**
     * A wrapper for DOM Nodes.
     * Node properties can be accessed via the set/get methods.
     * With the exception of the noted properties,
     * only strings, numbers, and booleans are passed through. 
     * Use Y.get() or Y.Node.get() to retrieve Node instances.
     *
     * @class Node
     */

    var BASE_NODE                   = 0, 
        ELEMENT_NODE                = 1,
        //ATTRIBUTE_NODE              = 2,
        //TEXT_NODE                   = 3,
        //CDATA_SECTION_NODE          = 4,
        //ENTITY_REFERENCE_NODE       = 5,
        //ENTITY_NODE                 = 6,
        //PROCESSING_INSTRUCTION_NODE = 7,
        //COMMENT_NODE                = 8,
        DOCUMENT_NODE               = 9; //,
        //DOCUMENT_TYPE_NODE          = 10,
        //DOCUMENT_FRAGMENT_NODE      = 11,
        //NOTATION_NODE               = 12;


    var OWNER_DOCUMENT = 'ownerDocument',
        TAG_NAME = 'tagName',
        NODE_NAME = 'nodeName',
        NODE_TYPE = 'nodeType';

    var RE_VALID_PROP_TYPES = /(?:string|boolean|number)/;

    var Selector = Y.Selector;
    var _instances = {};
    var _nodes = {};
    var _nodelists = {};
    var _restrict = null;

    var slice = [].slice;

    // private factory
    var wrapDOM = function(node) {
        var ret = null,
            yuid = (node) ? node._yuid : null,
            instance = _instances[yuid],
            existingNode = _nodes[yuid];

        if (node) {
            if (NODE_TYPE in node) {
                if (instance && existingNode && node === existingNode) {
                    ret = instance; // reuse existing Nodes if nodes match
                } else {
                    ret = new Node(node);
                }
            } else if ('item' in node || 'push' in node) {
                ret = new Y.NodeList(node);
            }
        }
        return ret;
    };

    var wrapFn = function(node, fn) {
        if (fn) {
            return function() {
                return fn(node);
            }();
        }
    };

    var getDoc = function(node) {
        node = _nodes[node._yuid];
        return (node[NODE_TYPE] === 9) ? node : node[OWNER_DOCUMENT];
    };

    // returns HTMLElement
    var getDOMNode = function(node) {
        if (node && !node.nodeType && node._yuid) {
            node = _nodes[node._yuid];
        }

        return  node || null;

    };

    /**
     * Wraps the input and outputs of a node instance
     */
    var nodeInOut = function(method, a, b, c, d, e) {
        if (a) { // first 2 may be Node instances or nodes (TODO: or strings?)
            a = getDOMNode(a);
            if (b) {
                b = getDOMNode(b);
            }
        }
        return wrapDOM(_nodes[this._yuid][method](a, b, c, d, e));
    };

    /*
     * Wraps the return value in a node instance
     */
    var nodeOut = function(method, a, b, c, d, e) {
        return wrapDOM(_nodes[this._yuid][method](a, b, c, d, e));
    };

    /* 
     * Returns directy from node method call 
     */
    var rawOut = function(method, a, b, c, d, e) {
        return _nodes[this._yuid][method](a, b, c, d, e);
    };

    var noOut = function(method, a, b, c, d, e) {
        _nodes[this._yuid][method](a, b, c, d, e);
        return this;
    };

    var PROPS_WRAP = {
        /**
         * Returns a Node instance. 
         * @attribute parentNode
         * @type Node
         */
        'parentNode': BASE_NODE,

        /**
         * Returns a NodeList instance. 
         * @attribute childNodes
         * @type NodeList
         */
        'childNodes': BASE_NODE,

        /**
         * Returns a NodeList instance. 
         * @attribute children
         * @type NodeList
         */
        'children': function(node) {
            node = _nodes[node._yuid];
            var children = node.children;

            if (children === undefined) {
                var childNodes = node.childNodes;
                children = [];

                for (var i = 0, len = childNodes.length; i < len; ++i) {
                    if (childNodes[i][TAG_NAME]) {
                        children[children.length] = childNodes[i];
                    }
                }
            }
            return children;
        },

        /**
         * Returns a Node instance. 
         * @attribute firstChild
         * @type Node
         */
        'firstChild': BASE_NODE,

        /**
         * Returns a Node instance. 
         * @attribute lastChild
         * @type Node
         */
        'lastChild': BASE_NODE,

        /**
         * Returns a Node instance. 
         * @attribute previousSibling
         * @type Node
         */
        'previousSibling': BASE_NODE,

        /**
         * Returns a Node instance. 
         * @attribute previousSibling
         * @type Node
         */
        'nextSibling': BASE_NODE,

        /**
         * Returns a Node instance. 
         * @attribute ownerDocument
         * @type Doc
         */
        'ownerDocument': BASE_NODE,

        /**
         * Returns a Node instance. 
         * @attribute offsetParent
         * @type Node
         */
        'offsetParent': ELEMENT_NODE,

        /**
         * Returns a Node instance. 
         * @attribute documentElement
         * @type Node
         */
        'documentElement': DOCUMENT_NODE,

        /**
         * Returns a Node instance. 
         * @attribute body
         * @type Node
         */
        'body': DOCUMENT_NODE,

        // form
        /**
         * Returns a NodeList instance. 
         * @attribute elements
         * @type NodeList
         */
        'elements': ELEMENT_NODE,

        // table
        /**
         * Returns a NodeList instance. 
         * @attribute rows
         * @type NodeList
         */
        'rows': ELEMENT_NODE,

        /**
         * Returns a NodeList instance. 
         * @attribute cells
         * @type NodeList
         */
        'cells': ELEMENT_NODE,

        /**
         * Returns a Node instance. 
         * @attribute tHead
         * @type Node
         */
        'tHead': ELEMENT_NODE,

        /**
         * Returns a Node instance. 
         * @attribute tFoot
         * @type Node
         */
        'tFoot': ELEMENT_NODE,

        /**
         * Returns a NodeList instance. 
         * @attribute tBodies
         * @type NodeList
         */
        'tBodies': ELEMENT_NODE
    };

    var METHODS = {
        /**
         * Passes through to DOM method.
         * @method replaceChild
         * @param {HTMLElement | Node} node Node to be inserted 
         * @param {HTMLElement | Node} refNode Node to be replaced 
         * @return {Node} The replaced node 
         */
        replaceChild: nodeInOut,

        /**
         * Passes through to DOM method.
         * @method appendChild
         * @param {HTMLElement | Node} node Node to be appended 
         * @return {Node} The appended node 
         */
        appendChild: nodeInOut,

        /**
         * Passes through to DOM method.
         * @method insertBefore
         * @param {HTMLElement | Node} newNode Node to be appended 
         * @param {HTMLElement | Node} refNode Node to be inserted before 
         * @return {Node} The inserted node 
         */
        insertBefore: nodeInOut,

        /**
         * Passes through to DOM method.
         * @method removeChild
         * @param {HTMLElement | Node} node Node to be removed 
         * @return {Node} The removed node 
         */
        removeChild: nodeInOut,

        /**
         * Passes through to DOM method.
         * @method hasChildNodes
         * @return {Boolean} Whether or not the node has any childNodes 
         */
        hasChildNodes: rawOut,

        /**
         * Passes through to DOM method.
         * @method cloneNode
         * @param {HTMLElement | Node} node Node to be cloned 
         * @return {Node} The clone 
         */
        cloneNode: nodeOut,

        /**
         * Passes through to DOM method.
         * @method getAttribute
         * @param {String} attribute The attribute to retrieve 
         * @return {String} The current value of the attribute 
         */
        getAttribute: rawOut,

        /**
         * Passes through to DOM method.
         * @method setAttribute
         * @param {String} attribute The attribute to set 
         * @param {String} The value to apply to the attribute 
         */
        setAttribute: noOut,

        /**
         * Passes through to DOM method.
         * @method hasAttribute
         * @param {String} attribute The attribute to test for 
         * @return {Boolean} Whether or not the attribute is present 
         */
        hasAttribute: rawOut,

        /**
         * Passes through to DOM method.
         * @method scrollIntoView
         */
        scrollIntoView: noOut,

        /**
         * Passes through to DOM method.
         * @method getElementsByTagName
         * @param {String} tagName The tagName to collect 
         * @return {NodeList} A NodeList representing the HTMLCollection
         */
        getElementsByTagName: nodeOut,

        /**
         * Passes through to DOM method.
         * @method focus
         */
        focus: noOut,

        /**
         * Passes through to DOM method.
         * @method blur
         */
        blur: noOut,

        /**
         * Passes through to DOM method.
         * Only valid on FORM elements
         * @method submit
         */
        submit: noOut,

        /**
         * Passes through to DOM method.
         * Only valid on FORM elements
         * @method reset
         */
        reset: noOut
    };

    var addNodeListMethod = function(name) {
        NodeList.prototype[name] = function() {
            var a = [],
                nodes = _nodelists[this._yuid],
                ret;

            for (var i = 0, len = nodes.length; i < len; ++i) {
                _nodes[_tmpNode._yuid] = nodes[i];
                ret = _tmpNode[name].apply(_tmpNode, arguments);
                if (ret !== _tmpNode) {
                    a[i] = ret;
                }
            }

            return a.length ? a : this;
        };
    };

    var METHODS_INVOKE = {
        'getBoundingClientRect': true
    };

    var Node = function(node) {
        if (!node || !node[NODE_TYPE]) {
            return null;
        }
        
        var yuid = Y.guid();
        try { // IE errors on non-element expandos (cant be reused)
            node._yuid = yuid;
        } catch(e) {}
        this._yuid = yuid;
        _nodes[yuid] = node;
        _instances[yuid] = this;

    };

    var SETTERS = {};
    var GETTERS = {
        /**
         * Normalizes nodeInnerText and textContent. 
         * @property text
         * @type String
         */
        'text': function(node) {
            return node.get('innerText') || node.get('textContent') || '';
        },

        'options': function(node) {
            return (node) ? node.getElementsByTagName('option') : [];
        }


    };

    Node.setters = function(prop, fn) {
        if (typeof prop == 'string') {
            SETTERS[prop] = fn;
        } else { // assume object
            Y.each(prop, function(fn, prop) {
                Node.setters(prop, fn);
            });
        } 
    };

    Node.getters = function(prop, fn) {
        if (typeof prop == 'string') {
            GETTERS[prop] = fn;
        } else { // assume object
            Y.each(prop, function(fn, prop) {
                Node.getters(prop, fn);
            });
        } 
    };

    Node.methods = function(name, fn) {
        if (typeof name == 'string') {
            Node.prototype[name] = function() {
                var args = slice.call(arguments);
                args.unshift(this);
                var ret = fn.apply(null, args);
                if (ret === undefined) {
                    ret = this;
                }
                return ret;
            };

            addNodeListMethod(name);


        } else { // assume object
            Y.each(name, function(fn, name) {
                Node.methods(name, fn);
            });
        }
    };

    Node.getDOMNode = function(node) {
        var ret;

        if (node.nodeType) {
            ret = node;
        } else if (typeof node === 'string') {
            ret = Selector.query(node, null, true);
        } else {
            ret = _nodes[node._yuid];
        }
        return ret || null;
    };

    Node.wrapDOMMethod = function(name) {
        return function() {
            var args = slice.call(arguments);
            args.unshift(Y.Node.getDOMNode(args.shift()));
            return Y.DOM[name].apply(Y.DOM, args);
        };

    };

    Node.addDOMMethods = function(methods) {
        var add = {}; 
        Y.each(methods, function(v, n) {
            add[v] = Y.Node.wrapDOMMethod(v);
        });

        Y.Node.methods(add);
    };

    Node.prototype = {
        /**
         * Set the value of the property/attribute on the HTMLElement bound to this Node.
         * Only strings/numbers/booleans are passed through unless a SETTER exists.
         * @method set
         * @param {String} prop Property to set 
         * @param {any} val Value to apply to the given property
         */
        set: function(prop, val) {
            var node = _nodes[this._yuid];
            if (prop in SETTERS) { // use custom setter
                SETTERS[prop](this, prop, val);  // passing Node instance
            } else if (RE_VALID_PROP_TYPES.test(typeof node[prop])) { // safe to write
                node[prop] = val;
            }
            return this;
        },

        /**
         * Get the value of the property/attribute on the HTMLElement bound to this Node.
         * Only strings/numbers/booleans are passed through unless a GETTER exists.
         * @method get
         * @param {String} prop Property to get 
         * @return {any} Current value of the property
         */
        get: function(prop) {
            var val;
            var node = _nodes[this._yuid];
            if (prop in GETTERS) { // use custom getter
                val = GETTERS[prop](this, prop);
            } else if (prop in PROPS_WRAP) { // wrap DOM object (HTMLElement, HTMLCollection, Document)
                if (typeof PROPS_WRAP[prop] === 'function') {
                    val = PROPS_WRAP[prop](this);
                } else {
                    val = node[prop];
                }

                if (_restrict && _restrict[this._yuid] && !Y.DOM.contains(node, val)) {
                    val = null; // not allowed to go outside of root node
                } else {
                    val = wrapDOM(val);
                }
            } else if (RE_VALID_PROP_TYPES.test(typeof node[prop])) { // safe to read
                val = node[prop];
            }
            return val;
        },

        invoke: function(method, a, b, c, d, e) {
            if (a) { // first 2 may be Node instances or strings
                a = (a[NODE_TYPE]) ? a : getDOMNode(a);
                if (b) {
                    b = (b[NODE_TYPE]) ? b : getDOMNode(b);
                }
            }
            var node = _nodes[this._yuid];
            if (node && METHODS_INVOKE[method] && node[method]) {
                return node[method](a, b, c, d, e);
            }
            return null;
        },

        hasMethod: function(method) {
            return !!(METHODS_INVOKE[method] && _nodes[this._yuid][method]);
        },

        //normalize: function() {},
        //isSupported: function(feature, version) {},
        toString: function() {
            var node = _nodes[this._yuid] || {};
            return node.id || node[NODE_NAME] || 'undefined node';
        },

        /**
         * Retrieves a single node based on the given CSS selector. 
         * @method query
         *
         * @param {string} selector The CSS selector to test against.
         * @return {Node} A Node instance for the matching HTMLElement.
         */
        query: function(selector) {
            return wrapDOM(Selector.query(selector, _nodes[this._yuid], true));
        },

        /**
         * Retrieves a nodeList based on the given CSS selector. 
         * @method queryAll
         *
         * @param {string} selector The CSS selector to test against.
         * @return {NodeList} A NodeList instance for the matching HTMLCollection/Array.
         */
        queryAll: function(selector) {
            return wrapDOM(Selector.query(selector, _nodes[this._yuid]));
        },

        /**
         * Test if the supplied node matches the supplied selector.
         * @method test
         *
         * @param {string} selector The CSS selector to test against.
         * @return {boolean} Whether or not the node matches the selector.
         */
        test: function(selector) {
            return Selector.test(_nodes[this._yuid], selector);
        },

        /**
         * Compares nodes to determine if they match.
         * Node instances can be compared to each other and/or HTMLElements/selectors.
         * @method compareTo
         * @param {String | HTMLElement | Node} refNode The reference node to compare to the node.
         * @return {Boolean} True if the nodes match, false if they do not. 
         */
        compareTo: function(refNode) {
            refNode = refNode[NODE_TYPE] ? refNode : _nodes[refNode._yuid];
            return _nodes[this._yuid] === refNode;
        },

       /*
         * Returns the nearest ancestor that passes the test applied by supplied boolean method.
         * @method ancestor
         * @param {Function} fn - A boolean method for testing elements which receives the element as its only argument.
         * @return {Node} The matching Node instance or null if not found
         */
        ancestor: function(fn) {
            return wrapDOM(Y.DOM.elementByAxis(_nodes[this._yuid], 'parentNode', wrapFn(this, fn)));
        },

        /**
         * Returns the previous sibling that is an HTMLElement. 
         * Returns the nearest HTMLElement sibling if no method provided.
         * @method previous
         * @param {Function} fn A boolean function used to test siblings
         * that receives the sibling node being tested as its only argument.
         * @param {Boolean} all optional Whether all node types should be returned, or just element nodes.
         * @return {Node} Node instance or null if not found
         */
        previous: function(fn, all) {
            return wrapDOM(Y.DOM.elementByAxis(_nodes[this._yuid], 'previousSibling', wrapFn(fn)), all);
        }, 

        /**
         * Returns the next sibling that passes the boolean method. 
         * Returns the nearest HTMLElement sibling if no method provided.
         * @method next
         * @param {Function} fn A boolean function used to test siblings
         * that receives the sibling node being tested as its only argument.
         * @param {Boolean} all optional Whether all node types should be returned, or just element nodes.
         * @return {Object} HTMLElement or null if not found
         */
        next: function(fn, all) {
            return wrapDOM(Y.DOM.elementByAxis(_nodes[this._yuid], 'nextSibling', wrapFn(fn)), all);
        },
        
       /**
         * Attaches a DOM event handler.
         * @method attach
         * @param {String} type The type of DOM Event to listen for 
         * @param {Function} fn The handler to call when the event fires 
         * @param {Object} arg An argument object to pass to the handler 
         */

        attach: function(type, fn, arg) {
            var args = slice.call(arguments, 0);
            args.unshift(_nodes[this._yuid]);
            return Y.Event.addListener.apply(Y.Event, args);
        },

       /**
         * Alias for attach.
         * @method on
         * @param {String} type The type of DOM Event to listen for 
         * @param {Function} fn The handler to call when the event fires 
         * @param {Object} arg An argument object to pass to the handler 
         * @see attach
         */

        on: function(type, fn, arg) {
            return this.attach.apply(this, arguments);
        },

        addEventListener: function(type, fn, arg) {
            return Y.Event.nativeAdd(_nodes[this._yuid], type, fn, arg);
        },
        
       /**
         * Detaches a DOM event handler. 
         * @method detach
         * @param {String} type The type of DOM Event
         * @param {Function} fn The handler to call when the event fires 
         */
        detach: function(type, fn) {
            var args = slice.call(arguments, 0);
            args.unshift(_nodes[this._yuid]);
            return Y.Event.removeListener.apply(Y.Event, args);
        },

        removeEventListener: function(type, fn) {
            return Y.Event.nativeRemove(_nodes[this._yuid], type, fn);
        },

       /**
         * Creates a Node instance from HTML string
         * @method create
         * @param {String|Array} html The string of html to create
         * @return {Node} A new Node instance 
         */
        create: function(html) {
            return Y.Node.create(html);
        },

        /**
         * Determines whether an HTMLElement is an ancestor of another HTML element in the DOM hierarchy.
         * @method contains
         * @param {String | HTMLElement} needle The possible descendent
         * @return {Boolean} Whether or not this node is an ancestor of needle
         */
        contains: function(needle) {
            return Y.DOM.contains(_nodes[this._yuid], getDOMNode(needle));
        },

        plug: function(PluginClass, config) {
            config = config || {};
            config.owner = this;
            if (PluginClass && PluginClass.NS) {
                this[PluginClass.NS] = new PluginClass(config);
            }
            return this;
        },

        /**
         * Determines whether an HTMLElement is attached to a document.
         * @method inDoc
         * @param {Node|HTMLElement} doc optional An optional document to check against.
         * Defaults to current document. 
         * @return {Boolean} Whether or not this node is attached to the document. 
         */
        inDoc: function(doc) {
            var node = _nodes[this._yuid];
            doc = (doc) ? getDoc(doc) : node.ownerDocument;
            if (doc.documentElement) {
                return Y.DOM.contains(doc.documentElement, node);
            }
        }
    };

    Y.each(METHODS, function(fn, method) {
        Node.prototype[method] = function() {
            return fn.apply(this, [method].concat(slice.call(arguments)));
        };
    });

    /** 
     *  Creates a Node instance from an HTML string
     * @method create
     * @param {String | Array} html HTML string
     */
    Node.create = function(html) {
        return wrapDOM(Y.DOM.create(html));
    };

    /** 
     * Returns a node instance wrapping the DOM element with the given ID. 
     * @method getById
     * @static
     * @param {String} id The ID to retrieve 
     * @param {Node|HTMLElement} doc optional An optional document to search. 
     * Defaults to current document.
     */
    Node.getById = function(id, doc) {
        doc = (doc && doc[NODE_TYPE]) ? doc : Y.config.doc;
        return wrapDOM(doc.getElementById(id));
    };

    /**
     * Retrieves a Node instance for the given object/string. 
     * Note: Use 'document' string to retrieve document Node instance from string
     * @method get
     * @static
     * @param {document|HTMLElement|HTMLCollection|Array|String} node The object to wrap.
     * @param {document|Node} doc optional The document containing the node. Defaults to current document.
     * @param {boolean} isRoot optional Whether or not this node should be treated as a root node. Root nodes
     * aren't allowed to traverse outside their DOM tree.
     * @return {Node} A wrapper instance for the supplied object.
     */
    Node.get = function(node, doc, isRoot) {
        if (node instanceof Node) {
            return node;
        }

        if (!doc) {
            doc = Y.config.doc;
        } else if (doc._yuid && _nodes[doc._yuid]) {
            doc = _nodes[doc._yuid]; 
        }
    
        if (node && typeof node === 'string') {
            if (node === 'document') {
                node = Y.config.doc;
            } else {
                node = Y.Selector.query(node, doc, true);
            }
        }

        node = wrapDOM(node);

        if (isRoot) {
            _restrict = _restrict || {};
            _restrict[node._yuid] = node;
        }

        return node;
    };

    /**
     * Retrieves a NodeList instance for the given object/string. 
     * @method all
     * @static
     * @param {HTMLCollection|Array|String} node The object to wrap.
     * @param {document|Node} doc optional The document containing the node. Defaults to current document.
     * @return {NodeList} A wrapper instance for the supplied nodes.
     */
    Node.all = function(nodes, doc) {
        if (nodes instanceof NodeList) {
            return nodes;
        }

        if (!doc) {
            doc = Y.config.doc;
        } else if (doc._yuid && _nodes[doc._yuid]) {
            doc = _nodes[doc._yuid]; 
        }
    
        if (nodes && typeof nodes == 'string') {
            nodes = Selector.query(nodes, doc);
        }

        return wrapDOM(nodes);

    };

    /** 
     * A wrapper for manipulating multiple DOM elements
     * @class NodeList
     */
    var NodeList = function(nodes) {
        // TODO: input validation
        _nodelists[Y.stamp(this)] = nodes;
    };

    // used to call Node methods against NodeList nodes
    var _tmpNode = Node.create('<div></div>');
    NodeList.prototype = {};

    Y.each(Node.prototype, function(fn, name) {
        if (typeof Node.prototype[name] == 'function') {
            addNodeListMethod(name);
        }
    });

    Y.mix(NodeList.prototype, {
        /**
         * Retrieves the Node instance at the given index. 
         * @method item
         *
         * @param {Number} index The index of the target Node.
         * @return {Node} The Node instance at the given index.
         */
        item: function(index) {
            var node = _nodelists[this._yuid][index];
            return (node && node[TAG_NAME]) ? wrapDOM(node) : (node && node.get) ? node : null;
        },

        /**
         * Set the value of the property/attribute on all HTMLElements bound to this NodeList.
         * Only strings/numbers/booleans are passed through unless a SETTER exists.
         * @method set
         * @param {String} prop Property to set 
         * @param {any} val Value to apply to the given property
         * @see Node
         */
        set: function(name, val) {
            var nodes = _nodelists[this._yuid];
            for (var i = 0, len = nodes.length; i < len; ++i) {
                _nodes[_tmpNode._yuid] = nodes[i];
                _tmpNode.set(name, val);
            }

            return this;
        },

        /**
         * Get the value of the property/attribute for each of the HTMLElements bound to this NodeList.
         * Only strings/numbers/booleans are passed through unless a GETTER exists.
         * @method get
         * @param {String} prop Property to get 
         * @return {Array} Array containing the current values mapped to the Node indexes 
         * @see Node
         */
        get: function(name) {
            if (name == 'length') { // TODO: remove
                return _nodelists[this._yuid].length;
            }
            var nodes = _nodelists[this._yuid];
            var ret = [];
            for (var i = 0, len = nodes.length; i < len; ++i) {
                _nodes[_tmpNode._yuid] = nodes[i];
                ret[i] = _tmpNode.get(name);
            }

            return ret;
        },

        /**
         * Filters the NodeList instance down to only nodes matching the given selector.
         * @method filter
         * @param {String} selector The selector to filter against
         * @return {NodeList} NodeList containing the updated collection 
         * @see Selector
         */
        filter: function(selector) {
            return wrapDOM(Selector.filter(_nodelists[this._yuid], selector));
        },

        /**
         * Applies the given function to each Node in the NodeList.
         * @method each
         * @param {Function} fn The function to apply 
         * @param {Object} context optional An optional context to apply the function with
         * Default context is the NodeList instance
         * @return {NodeList} NodeList containing the updated collection 
         * @see Y.each
         */
        each: function(fn, context) {
            context = context || this;
            var nodes = _nodelists[this._yuid];
            for (var i = 0, len = nodes.length; i < len; ++i) {
                fn.call(context, Y.Node.get(nodes[i]), i, this);
            }
            return this;
        },

        /**
         * Returns the current number of items in the NodeList.
         * @method size
         * @return {Int} The number of items in the NodeList. 
         */
        size: function() {
            return _nodelists[this._yuid].length;
        },

        toString: function() {
            var nodes = _nodelists[this._yuid] || [];
            return 'NodeList (' + nodes.length + ' items)';
        }

    }, true);

    Y.Node = Node;
    Y.NodeList = NodeList;
    Y.all = Y.Node.all;
    Y.get = Y.Node.get;
/**
 * Extended Node interface for managing classNames.
 * @module node-class
 */

    /**
     * An interface for manipulating className strings.
     * @interface NodeClassName
     */
    Y.Node.addDOMMethods([
        /**
         * Determines whether an HTMLElement has the given className.
         * @method hasClass
         * @param {String} className the class name to search for
         * @return {Boolean} A boolean value or array of boolean values
         */
        'hasClass',

        /**
         * Adds a class name to a given element or collection of elements.
         * @method addClass         
         * @param {String} className the class name to add to the class attribute
         */
        'addClass',

        /**
         * Removes a class name from a given element or collection of elements.
         * @method removeClass         
         * @param {String} className the class name to remove from the class attribute
         */
        'removeClass',

        /**
         * Replace a class with another class for a given element or collection of elements.
         * If no oldClassName is present, the newClassName is simply added.
         * @method replaceClass  
         * @param {String} oldClassName the class name to be replaced
         * @param {String} newClassName the class name that will be replacing the old class name
         */
        'replaceClass',

        /**
         * If the className exists on the node it is removed, if it doesn't exist it is added.
         * @method toggleClass  
         * @param {String} className the class name to be toggled
         */
        'toggleClass'
    ]);


}, '@VERSION@' ,{requires:['dom-base', 'selector']});