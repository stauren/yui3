/**
 * Adds the ability to filter log entries on their category/logLevel or their
 * source (global, event, attribute, etc).
 * Checkboxes are added to the Console footer to control the visibility of each
 * category and source.  
 *
 * @module console-filters
 * @namespace Plugin
 * @class ConsoleFilters
 */

// Some common strings and functions
var getCN = Y.ClassNameManager.getClassName,
    CONSOLE = 'console',
    FILTERS = 'filters',
    FILTER  = 'filter',
    CATEGORY = 'category',
    SOURCE   = 'source',
    CATEGORY_DOT = 'category.',
    SOURCE_DOT   = 'source.',

    HOST     = 'host',
    PARENT_NODE = 'parentNode',
    CHECKED  = 'checked',

    DOT = '.',
    DISPLAY = 'display',
    EMPTY   = '',
    NONE    = 'none',

    C_BODY       = DOT + Y.Console.CHROME_CLASSES.console_bd_class,
    C_FOOT       = DOT + Y.Console.CHROME_CLASSES.console_ft_class,

    SEL_CHECK    = 'input[type=checkbox].';

function ConsoleFilters() {
    ConsoleFilters.superclass.constructor.apply(this,arguments);
}

Y.mix(ConsoleFilters,{
    /**
     * Plugin name.
     *
     * @property ConsoleFilters.NAME
     * @type String
     * @readOnly
     * @static
     * @default 'consoleFilters'
     */
    NAME : 'consoleFilters',

    /**
     * The namespace hung off the host object that this plugin will inhabit.
     *
     * @property ConsoleFilters.NS
     * @type String
     * @readOnly
     * @static
     * @default 'filter'
     */
    NS : FILTER,

    /**
     * Markup template used to create the container for the category filters.
     *
     * @property ConsoleFilters.CATEGORIES_TEMPLATE
     * @type String
     * @static
     */
    CATEGORIES_TEMPLATE :
        '<div class="{controls} {categories}"></div>',

    /**
     * Markup template used to create the container for the source filters.
     *
     * @property ConsoleFilters.SOURCES_TEMPLATE
     * @type String
     * @static
     */
    SOURCES_TEMPLATE :
        '<div class="{controls} {sources}"></div>',

    /**
     * Markup template used to create the category and source filters.
     *
     * @property ConsoleFilters.FILTER_TEMPLATE
     * @type String
     * @static
     */
    FILTER_TEMPLATE :
        '<wbr><label class="{filter_label}">'+
            '<input type="checkbox" value="{filter_name}" '+
                'class="{filter} {filter_class}"> {filter_name}'+
        '</label>',

    /** 
     * Classnames used by the templates when creating nodes.
     *
     * @property ConsoleFilters.CHROME_CLASSES
     * @type Object
     * @static
     * @protected
     */
    CHROME_CLASSES : {
        controls     : Y.Console.CHROME_CLASSES.console_controls_class,
        categories   : getCN(CONSOLE,FILTERS,'categories'),
        sources      : getCN(CONSOLE,FILTERS,'sources'),
        category     : getCN(CONSOLE,FILTER,CATEGORY),
        source       : getCN(CONSOLE,FILTER,SOURCE),
        filter       : getCN(CONSOLE,FILTER),
        filter_label : getCN(CONSOLE,FILTER,'label')
    },

    ATTRS : {
        /**
         * Default visibility applied to new categories and sources.
         *
         * @attribute defaultVisibility
         * @type {Boolean}
         * @default true
         */
        defaultVisibility : {
            value : true,
            validator : Y.Lang.isBoolean
        },

        /**
         * <p>Map of entry categories to their visibility status.  Update a
         * particular category's visibility by setting the subattribute to true
         * (visible) or false (hidden).</p>
         *
         * <p>For example, yconsole.filter.set('category.info', false) to hide
         * log entries with the category/logLevel of 'info'.</p>
         *
         * <p>Similarly, yconsole.filter.get('category.warn') will return a
         * boolean indicating whether that category is currently being included
         * in the UI.</p>
         *
         * <p>Unlike the YUI instance configuration's logInclude and logExclude
         * properties, filtered entries are only hidden from the UI, but
         * can be made visible again.</p>
         *
         * @attribute category
         * @type Object
         */
        category : {
            value : {},
            validator : function (v,k) {
                return this._validateCategory(k,v);
            }
        },

        /**
         * <p>Map of entry sources to their visibility status.  Update a
         * particular sources's visibility by setting the subattribute to true
         * (visible) or false (hidden).</p>
         *
         * <p>For example, yconsole.filter.set('sources.slider', false) to hide
         * log entries originating from Y.Slider.</p>
         *
         * @attribute source
         * @type Object
         */
        source : {
            value : {},
            validator : function (v,k) {
                return this._validateSource(k,v);
            }
        }
    }
});

Y.extend(ConsoleFilters, Y.Plugin.Base, {

    /**
     * Collection of all log messages passed through since the plugin's
     * instantiation.  This holds all messages regardless of filter status.
     * Used as a single source of truth for repopulating the Console body when
     * filters are changed.
     *
     * @property _entries
     * @type Array
     * @protected
     */
    _entries : null,

    /**
     * The container node created to house the category filters.
     *
     * @property _categories
     * @type Node
     * @protected
     */
    _categories : null,

    /**
     * The container node created to house the source filters.
     *
     * @property _sources
     * @type Node
     * @protected
     */
    _sources : null,

    /**
     * Initialize this plugin.
     *
     * @method initializer
     */
    initializer : function () {
        this._entries = [];

        this.get(HOST).on("entry", this._onEntry, this);

        this.doAfter("renderUI", this.renderUI);
        this.doAfter("syncUI", this.syncUI);
        this.doAfter("bindUI", this.bindUI);

        this.doAfter("clearConsole", this._afterClearConsole);

        if (this.get(HOST).get('rendered')) {
            this.renderUI();
            this.syncUI();
            this.bindUI();
        }
    },

    /**
     * Removes the plugin UI and unwires events.
     *
     * @method destructor
     */
    destructor : function () {
        //TODO: grab last {consoleLimit} entries and update the console with
        //them (no filtering)
        this._entries = [];

        if (this._categories) {
            this._categories.get(PARENT_NODE).removeChild(this._categories);
        }
        if (this._sources) {
            this._sources.get(PARENT_NODE).removeChild(this._sources);
        }
    },

    /**
     * Adds the category and source filter sections to the Console footer.
     *
     * @method renderUI
     */
    renderUI : function () {
        var foot = this.get(HOST).get('contentBox').query(C_FOOT),
            html;

        if (foot) {
            html = Y.substitute(
                        ConsoleFilters.CATEGORIES_TEMPLATE,
                        ConsoleFilters.CHROME_CLASSES);

            this._categories = foot.appendChild(Y.Node.create(html));

            html = Y.substitute(
                        ConsoleFilters.SOURCES_TEMPLATE,
                        ConsoleFilters.CHROME_CLASSES);

            this._sources = foot.appendChild(Y.Node.create(html));
        }
    },

    /**
     * Binds to checkbox click events and internal attribute change events to
     * maintain the UI state.
     *
     * @method bindUI
     */
    bindUI : function () {
        this._categories.on('click', Y.bind(this._onCategoryCheckboxClick, this));

        this._sources.on('click', Y.bind(this._onSourceCheckboxClick, this));
            
        this.after('categoryChange',this._afterCategoryChange);
        this.after('sourceChange',  this._afterSourceChange);
    },

    /**
     * Updates the UI to be in accordance with the current state of the plugin.
     *
     * @method syncUI
     */
    syncUI : function () {
        Y.each(this.get(CATEGORY), function (v, k) {
            this._uiSetCheckbox(CATEGORY, k, v);
        }, this);

        Y.each(this.get(SOURCE), function (v, k) {
            this._uiSetCheckbox(SOURCE, k, v);
        }, this);

        this.refreshConsole();
    },

    /**
     * Ensures a filter is set up for any new categories or sources and
     * collects the messages in _entries.  If the message is stamped with a
     * category or source that is currently being filtered out, the message
     * will not pass to the Console's print buffer.
     *
     * @method _onEntry
     * @param e {Event} the custom event object
     * @protected
     */
    _onEntry : function (e) {
        this._entries.push(e.message);

        var cat = CATEGORY_DOT + e.message.category,
            src = SOURCE_DOT + e.message.source,
            cat_filter = this.get(cat),
            src_filter = this.get(src),
            visible;

        if (cat_filter === undefined) {
            visible = this.get('defaultVisibility');
            this.set(cat, visible);
            cat_filter = visible;
        }

        if (src_filter === undefined) {
            visible = this.get('defaultVisibility');
            this.set(src, visible);
            src_filter = visible;
        }
        
        if (!cat_filter || !src_filter) {
            e.preventDefault();
        }
    },

    /**
     * Flushes the cached entries after a call to the Console's clearConsole().
     *
     * @method _afterClearConsole
     * @protected
     */
    _afterClearConsole : function () {
        this._entries = [];
    },

    /**
     * Triggers the Console to update if a known category filter
     * changes value (e.g. visible => hidden).  Updates the appropriate
     * checkbox's checked state if necessary.
     *
     * @method _afterCategoryChange
     * @param e {Event} the attribute change event object
     * @protected
     */
    _afterCategoryChange : function (e) {
        var cat    = e.subAttrName.replace(/category\./, EMPTY),
            before = e.prevVal,
            after  = e.newVal;

        // Don't update the console for new categories
        if (!cat || before[cat] !== undefined) {
            this.refreshConsole();

            this._filterBuffer();
        }

        if (cat && !e.fromUI) {
            this._uiSetCheckbox(CATEGORY, cat, after);
        }
    },

    /**
     * Triggers the Console to update if a known source filter
     * changes value (e.g. visible => hidden).  Updates the appropriate
     * checkbox's checked state if necessary.
     *
     * @method _afterSourceChange
     * @param e {Event} the attribute change event object
     * @protected
     */
    _afterSourceChange : function (e) {
        var src     = e.subAttrName.replace(/source\./, EMPTY),
            before = e.prevVal,
            after  = e.newVal;

        // Don't update the console for new sources
        if (!src || before[src] !== undefined) {
            this.refreshConsole();

            this._filterBuffer();
        }

        if (src && !e.fromUI) {
            this._uiSetCheckbox(SOURCE, src, after);
        }
    },

    /**
     * Flushes the Console's print buffer of any entries that have a category
     * or source that is currently being excluded.
     *
     * @method _filterBuffer
     * @protected
     */
    _filterBuffer : function () {
        var cats = this.get(CATEGORY),
            srcs = this.get(SOURCE),
            buffer = this.get(HOST).buffer,
            start = null,
            i;

        for (i = buffer.length - 1; i >= 0; --i) {
            if (!cats[buffer[i].category] || !srcs[buffer[i].source]) {
                start = start || i;
            } else if (start) {
                buffer.splice(i,(start - i));
                start = null;
            }
        }
        if (start) {
            buffer.splice(0,start + 1);
        }
    },

    /**
     * Repopulates the Console with entries appropriate to the current filter
     * settings.
     *
     * @method refreshConsole
     */
    refreshConsole : function () {
        var debug = Y.config.debug,
            entries = this._entries,
            print   = [],
            p_i     = 0,
            host, body, limit, cats, srcs, i, e;

        Y.config.debug = false;

        host  = this.get(HOST);
        body  = host.get('contentBox').query(C_BODY);
        limit = host.get('consoleLimit');
        cats  = this.get(CATEGORY);
        srcs  = this.get(SOURCE);

        if (body) {
            // Capture from bottom up.  Entry order reversed.
            for (i = entries.length - 1; i >= 0 && p_i < limit; --i) {
                e = entries[i];
                if (cats[e.category] && srcs[e.source]) {
                    print[p_i++] = e;
                }
            }

            body.setStyle(DISPLAY,NONE);

            body.set('innerHTML',EMPTY);

            // Print in reverse order from reverse ordered array (top down)
            for (i = print.length - 1; i >= 0; --i) {
                host.printLogEntry(print[i]);
            }

            body.setStyle(DISPLAY,EMPTY);
        }

        Y.config.debug = debug;
    },

    /**
     * Updates the checked property of a filter checkbox of the specified type.
     * If no checkbox is found for the input params, one is created.
     *
     * @method _uiSetCheckbox
     * @param type {String} 'category' or 'source'
     * @param item {String} the name of the filter (e.g. 'info', 'event')
     * @param checked {Boolean} value to set the checkbox's checked property
     * @protected
     */
    _uiSetCheckbox : function (type, item, checked) {
        if (type && item) {
            var container = type === CATEGORY ?
                                this._categories :
                                this._sources,
                sel      = SEL_CHECK + getCN(CONSOLE,FILTER,item),
                checkbox = container.query(sel),
                host;
                
            if (!checkbox) {
                host = this.get(HOST);

                this._createCheckbox(container, item);

                checkbox = container.query(sel);

                host._uiSetHeight(host.get('height'));
            }
            
            checkbox.set(CHECKED, checked);
        }
    },

    /**
     * Passes checkbox clicks on to the category attribute.
     *
     * @metho _onCategoryCheckboxClick
     * @param e {Event} the DOM event
     */
    _onCategoryCheckboxClick : function (e) {
        var t = e.target, cat;

        if (t.hasClass(ConsoleFilters.CHROME_CLASSES.filter)) {
            cat = t.get('value');
            if (cat && cat in this.get(CATEGORY)) {
                this.set(CATEGORY_DOT + cat, t.get(CHECKED), { fromUI: true });
            }
        }
    },

    /**
     * Passes checkbox clicks on to the source attribute.
     *
     * @metho _onSourceCheckboxClick
     * @param e {Event} the DOM event
     */
    _onSourceCheckboxClick : function (e) {
        var t = e.target, src;

        if (t.hasClass(ConsoleFilters.CHROME_CLASSES.filter)) {
            src = t.get('value');
            if (src && src in this.get(SOURCE)) {
                this.set(SOURCE_DOT + src, t.get(CHECKED), { fromUI: true });
            }
        }
    },

    /**
     * Hides any number of categories from the UI.  Convenience method for
     * myConsole.filter.set('category.foo', false); set('category.bar', false);
     * and so on.
     *
     * @method hideCategory
     * @param cat* {String} 1..n categories to filter out of the UI
     */
    hideCategory : function (cat, multiple) {
        if (multiple) {
            Y.Array.each(arguments, arguments.callee, this);
        } else {
            this.set(CATEGORY_DOT + cat, false);
        }
    },

    /**
     * Shows any number of categories in the UI.  Convenience method for
     * myConsole.filter.set('category.foo', true); set('category.bar', true);
     * and so on.
     *
     * @method showCategory
     * @param cat* {String} 1..n categories to allow to display in the UI
     */
    showCategory : function (cat, multiple) {
        if (multiple) {
            Y.Array.each(arguments, arguments.callee, this);
        } else {
            this.set(CATEGORY_DOT + cat, true);
        }
    },

    /**
     * Hides any number of sources from the UI.  Convenience method for
     * myConsole.filter.set('source.foo', false); set('source.bar', false);
     * and so on.
     *
     * @method hideSource
     * @param src* {String} 1..n sources to filter out of the UI
     */
    hideSource : function (src, multiple) {
        if (multiple) {
            Y.Array.each(arguments, arguments.callee, this);
        } else {
            this.set(CATEGORY_DOT + src, false);
        }
    },

    /**
     * Shows any number of sources in the UI.  Convenience method for
     * myConsole.filter.set('category.foo', true); set('category.bar', true);
     * and so on.
     *
     * @method showSource
     * @param cat* {String} 1..n sources to allow to display in the UI
     */
    showSource : function (src, multiple) {
        if (multiple) {
            Y.Array.each(arguments, arguments.callee, this);
        } else {
            this.set(CATEGORY_DOT + src, true);
        }
    },

    /**
     * Creates a checkbox and label from the ConsoleFilters.FILTER_TEMPLATE for
     * the provided type and name.  The checkbox and label are appended to the
     * container node passes as the first arg.
     *
     * @method _createCheckbox
     * @param container {Node} the parentNode of the new checkbox and label
     * @param name {String} the identifier of the filter
     */
    _createCheckbox : function (container, name) {
        var info = Y.merge(ConsoleFilters.CHROME_CLASSES, {
                        filter_name  : name,
                        filter_class : getCN(CONSOLE, FILTER, name)
                   }),
            node = Y.Node.create(
                        Y.substitute(ConsoleFilters.FILTER_TEMPLATE, info));

        container.appendChild(node);
    },

    /**
     * Validates category updates are objects and the subattribute is not too
     * deep.
     *
     * @method _validateCategory
     * @param cat {String} the new category:visibility map
     * @param v {String} the subattribute path updated
     * return Boolean
     */
    _validateCategory : function (cat, v) {
        return Y.Lang.isObject(v,true) && cat.split(/\./).length < 3;
    },

    /**
     * Validates source updates are objects and the subattribute is not too
     * deep.
     *
     * @method _validateSource
     * @param cat {String} the new source:visibility map
     * @param v {String} the subattribute path updated
     * return Boolean
     */
    _validateSource : function (src, v) {
        return Y.Lang.isObject(v,true) && src.split(/\./).length < 3;
    }

});

Y.namespace('Plugin').ConsoleFilters = ConsoleFilters;
