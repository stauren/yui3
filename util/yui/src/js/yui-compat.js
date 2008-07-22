// Compatibility layer for 2.x
YUI.add("compat", function(Y) {


    if (YUI !== window.YAHOO) {

        // Bind the core modules to the YUI global
        YUI._setup();
        
        // get any existing YAHOO obj props
        var o = (window.YAHOO) ? YUI.merge(window.YAHOO) : null;

        // Make the YUI global the YAHOO global
        window.YAHOO = YUI;

        // augment old YAHOO props
        if (o) {
            Y.mix(Y, o);
        }

    }

    if (Y !== YUI) {
        YUI.use('compat');
    }

    // add old namespaces
    Y.namespace("util", "widget", "example");

    // case/location change
    Y.env = (Y.env) ? Y.mix(Y.env, Y.Env) : Y.Env;
    Y.lang = (Y.lang) ? Y.mix(Y.lang, Y.Lang) : Y.Lang;
    Y.env.ua = Y.UA; 

    // support Y.register
    Y.mix(Y.env, {
            modules: [],
            listeners: [],
            getVersion: function(name) {
                return this.Env.modules[name] || null;
            }
    });

    var L = Y.lang;

    // add old lang properties 
    Y.mix(L, {

        augmentObject: function(r, s) {
            var a = arguments, wl = (a.length > 2) ? Y.Array(a, 2, true) : null;
            return Y.mix(r, s, (wl), wl);
        },
     
        augmentProto: function(r, s) {
            var a = arguments, wl = (a.length > 2) ? Y.Array(a, 2, true) : null;
            return Y.mix(r, s, (wl), wl, 1);
        },

        extend: Y.bind(Y.extend, Y), 
        // merge: Y.bind(Y.merge, Y)
        merge: Y.merge
    }, true);

    L.augment = L.augmentProto;

    // IE won't enumerate this
    L.hasOwnProperty = Y.Object.owns;

    // L.merge = Y.merge;

    Y.augmentProto = L.augmentProto;

    // add register function
    Y.mix(Y, {
        register: function(name, mainClass, data) {
            var mods = Y.Env.modules;
            if (!mods[name]) {
                mods[name] = { versions:[], builds:[] };
            }
            var m=mods[name],v=data.version,b=data.build,ls=Y.Env.listeners;
            m.name = name;
            m.version = v;
            m.build = b;
            m.versions.push(v);
            m.builds.push(b);
            m.mainClass = mainClass;
            // fire the module load listeners
            for (var i=0;i<ls.length;i=i+1) {
                ls[i](m);
            }
            // label the main class
            if (mainClass) {
                mainClass.VERSION = v;
                mainClass.BUILD = b;
            } else {
                Y.log("mainClass is undefined for module " + name, "warn");
            }
        }
    });

    // add old load listeners
    if ("undefined" !== typeof YAHOO_config) {
        var l=YAHOO_config.listener,ls=Y.Env.listeners,unique=true,i;
        if (l) {
            // if YAHOO is loaded multiple times we need to check to see if
            // this is a new config object.  If it is, add the new component
            // load listener to the stack
            for (i=0;i<ls.length;i=i+1) {
                if (ls[i]==l) {
                    unique=false;
                    break;
                }
            }
            if (unique) {
                ls.push(l);
            }
        }
    }
        
    // add old registration for yahoo
    Y.register("yahoo", Y, {version: "@VERSION@", build: "@BUILD@"});

    if (Y.Event) {

        var o = {
            
            /**
             * Safari detection
             * @property isSafari
             * @private
             * @static
             * @deprecated use Y.Env.UA.webkit
             */
            isSafari: Y.UA.webkit,
            
            /**
             * webkit version
             * @property webkit
             * @type string
             * @private
             * @static
             * @deprecated use Y.Env.UA.webkit
             */
            webkit: Y.UA.webkit,

            /**
             * Normalized keycodes for webkit/safari
             * @property webkitKeymap
             * @type {int: int}
             * @private
             * @static
             * @final
             */
            webkitKeymap: {
                63232: 38, // up
                63233: 40, // down
                63234: 37, // left
                63235: 39, // right
                63276: 33, // page up
                63277: 34, // page down
                25: 9      // SHIFT-TAB (Safari provides a different key code in
                           // this case, even though the shiftKey modifier is set)
            },
            
            /**
             * IE detection 
             * @property isIE
             * @private
             * @static
             * @deprecated use Y.Env.UA.ie
             */
            isIE: Y.UA.ie,

            /**
             * Returns scrollLeft
             * @method _getScrollLeft
             * @static
             * @private
             */
            _getScrollLeft: function() {
                return this._getScroll()[1];
            },

            /**
             * Returns scrollTop
             * @method _getScrollTop
             * @static
             * @private
             */
            _getScrollTop: function() {
                return this._getScroll()[0];
            },

            /**
             * Returns the scrollTop and scrollLeft.  Used to calculate the 
             * pageX and pageY in Internet Explorer
             * @method _getScroll
             * @static
             * @private
             */
            _getScroll: function() {
                var d = Y.config.doc, dd = d.documentElement, db = d.body;
                if (dd && (dd.scrollTop || dd.scrollLeft)) {
                    return [dd.scrollTop, dd.scrollLeft];
                } else if (db) {
                    return [db.scrollTop, db.scrollLeft];
                } else {
                    return [0, 0];
                }
            },

            /**
             * Returns the event's pageX
             * @method getPageX
             * @param {Event} ev the event
             * @return {int} the event's pageX
             * @static
             */
            getPageX: function(ev) {
                var x = ev.pageX;
                if (!x && 0 !== x) {
                    x = ev.clientX || 0;

                    if ( Y.UA.ie ) {
                        x += this._getScrollLeft();
                    }
                }

                return x;
            },

            /**
             * Returns the charcode for an event
             * @method getCharCode
             * @param {Event} ev the event
             * @return {int} the event's charCode
             * @static
             */
            getCharCode: function(ev) {
                var code = ev.keyCode || ev.charCode || 0;

                // webkit normalization
                if (Y.UA.webkit && (code in Y.Event.webkitKeymap)) {
                    code = Y.Event.webkitKeymap[code];
                }
                return code;
            },

            /**
             * Returns the event's pageY
             * @method getPageY
             * @param {Event} ev the event
             * @return {int} the event's pageY
             * @static
             */
            getPageY: function(ev) {
                var y = ev.pageY;
                if (!y && 0 !== y) {
                    y = ev.clientY || 0;

                    if ( Y.UA.ie ) {
                        y += this._getScrollTop();
                    }
                }


                return y;
            },

            /**
             * Returns the pageX and pageY properties as an indexed array.
             * @method getXY
             * @param {Event} ev the event
             * @return {[x, y]} the pageX and pageY properties of the event
             * @static
             */
            getXY: function(ev) {
                return [this.getPageX(ev), this.getPageY(ev)];
            },

            /**
             * Returns the event's related target 
             * @method getRelatedTarget
             * @param {Event} ev the event
             * @return {HTMLElement} the event's relatedTarget
             * @static
             */
            getRelatedTarget: function(ev) {
                var t = ev.relatedTarget;
                if (!t) {
                    if (ev.type == "mouseout") {
                        t = ev.toElement;
                    } else if (ev.type == "mouseover") {
                        t = ev.fromElement;
                    }
                }

                return this.resolveTextNode(t);
            },

            /**
             * Returns the time of the event.  If the time is not included, the
             * event is modified using the current time.
             * @method getTime
             * @param {Event} ev the event
             * @return {Date} the time of the event
             * @static
             */
            getTime: function(ev) {
                if (!ev.time) {
                    var t = new Date().getTime();
                    try {
                        ev.time = t;
                    } catch(ex) { 
                        this.lastError = ex;
                        return t;
                    }
                }

                return ev.time;
            },

            /**
             * Convenience method for stopPropagation + preventDefault
             * @method stopEvent
             * @param {Event} ev the event
             * @static
             */
            stopEvent: function(ev) {
                this.stopPropagation(ev);
                this.preventDefault(ev);
            },

            /**
             * Stops event propagation
             * @method stopPropagation
             * @param {Event} ev the event
             * @static
             */
            stopPropagation: function(ev) {
                if (ev.stopPropagation) {
                    ev.stopPropagation();
                } else {
                    ev.cancelBubble = true;
                }
            },

            /**
             * Prevents the default behavior of the event
             * @method preventDefault
             * @param {Event} ev the event
             * @static
             */
            preventDefault: function(ev) {
                if (ev.preventDefault) {
                    ev.preventDefault();
                } else {
                    ev.returnValue = false;
                }
            },

            /**
             * Returns the event's target element.  Safari sometimes provides
             * a text node, and this is automatically resolved to the text
             * node's parent so that it behaves like other browsers.
             * @method getTarget
             * @param {Event} ev the event
             * @param {boolean} resolveTextNode when set to true the target's
             *                  parent will be returned if the target is a 
             *                  text node.  @deprecated, the text node is
             *                  now resolved automatically
             * @return {HTMLElement} the event's target
             * @static
             */
            getTarget: function(ev, resolveTextNode) {
                var t = ev.target || ev.srcElement;
                return this.resolveTextNode(t);
            },

            /**
             * In some cases, some browsers will return a text node inside
             * the actual element that was targeted.  This normalizes the
             * return value for getTarget and getRelatedTarget.
             * @method resolveTextNode
             * @param {HTMLElement} node node to resolve
             * @return {HTMLElement} the normized node
             * @static
             */
            resolveTextNode: function(node) {
                if (node && 3 == node.nodeType) {
                    return node.parentNode;
                } else {
                    return node;
                }
            },

            /**
             * We cache elements bound by id because when the unload event 
             * fires, we can no longer use document.getElementById
             * @method getEl
             * @static
             * @private
             * @deprecated Elements are not cached any longer
             */
            getEl: function(id) {
                return Y.get(id);
            }
        };

        Y.mix(Y.Event, o);

        Y.util.Event = Y.Event;

        Y.register("event", Y, {version: "@VERSION@", build: "@BUILD@"});
    }


    // @todo subscribe register to the module added event to pick
    // modules registered with the new method.
}, "@VERSION@");