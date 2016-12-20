/**
 * classes/Router
 * 路由系统，可以精细控制每个路由的进入和离开
 * 兼容：history API，ie11（含）+
 * @see http://caniuse.com/#search=pushstate
 *
 * @ref https://github.com/sdc-alibaba/SUI-Mobile/blob/dev/js/router.js
 *
 * @author ydr.me
 * @create 2016-04-26 14:15
 */


'use strict';

var object = require('blear.utils.object');
var array = require('blear.utils.array');
var typeis = require('blear.utils.typeis');
var url = require('blear.utils.url');
var time = require('blear.utils.time');
var number = require('blear.utils.number');
var path = require('blear.utils.path');
var date = require('blear.utils.date');
var howdo = require('blear.utils.howdo');
var utilHashbang = require('blear.utils.hashbang');
var event = require('blear.core.event');
var attribute = require('blear.core.attribute');
var hashbang = require('blear.core.hashbang');
var Events = require('blear.classes.events');

var win = window;
var doc = win.document;
var navigatorHistory = win.history;
var routeId = 0;
var historyId = 0;
var MAX_LENGTH = 10;
var PUSH_SATET = 1;
var REPLACE_SATET = 2;
var POPUP_SATET = 3;
var defaults = {
    /**
     * 监听的元素，只会处理 #! 开始的 url
     * @type String|HTMLElement
     */
    el: 'a',

    /**
     * 是否忽略大小写，默认 false
     * @type Boolean
     */
    ignoreCase: false,

    /**
     * 是否严格模式，默认 false，即默认忽略末尾“/”
     * @type Boolean
     */
    strict: false,

    /**
     * hashbang 分隔符
     * @type String
     */
    split: ''
};
var ROUTE_METHODS = ['resolve', 'redirect', 'rewrite', 'rewriteQuery'];
var Route = Events.extend({
    className: 'Route',
    constructor: function (router, meta, state, isPipe) {
        var the = this;

        Route.parent(the);
        object.assign(the, meta);
        the.data = {};
        the.nextData = {};
        the.state = state;
        the.router = router;
        the.location = location.href;

        var lastRoute = router[_lastRoute];

        if (lastRoute) {
            // 防止循环引用链过长导致内存泄露
            lastRoute.prev = null;
            lastRoute.next = the;
            // 数据传递
            the.data = lastRoute.nextData;
            lastRoute.nextData = null;
        }

        the.prev = lastRoute;
        the.next = null;


        // 注入 router 方法
        var injectMethods = isPipe ? ROUTE_METHODS.slice(0, 1) : ROUTE_METHODS;
        array.each(injectMethods, function (index, method) {
            the[method] = function () {
                var ret = the.router[method].apply(the.router, arguments);

                if (ret !== the.router) {
                    return ret;
                }
            };
        });
    },

    /**
     * 向下一个路由发送数据
     * @param data
     * @returns {Route}
     */
    send: function (data) {
        var the = this;

        object.assign(the.nextData, data);

        return the;
    }
});


/**
 * 路由系统
 * @class Router
 * @extends EventEmitter
 */
var Router = Events.extend({
    className: 'Router',
    constructor: function (options) {
        var the = this;

        the[_options] = options = object.assign(true, {}, defaults, options);
        Router.parent(the, options);

        // 匹配列表
        the[_matchList] = [];
        // 未匹配列表
        the[_notFoundMatcher] = null;
        // 上一次匹配结果
        the[_lastRoute] = null;
        // 上一次是否匹配到
        the[_lastMatches] = null;
        // 上一个路由
        the[_lastRuler] = null;
        // 是否正在处理中
        the[_processing] = false;
        // 是否已启动
        the[_started] = false;
        // 历史记录
        the[_historyIndex] = 0;
        the[_current] = -1;
        the.history = [];
    },


    /**
     * 开始启动监听
     * @returns {Router}
     */
    start: function () {
        var the = this;

        the[_initPopStateEvent]();
        the[_initPushStateEvent]();
        the[_notFoundMatcher] = the[_notFoundMatcher] || the[_getUndefinedMatcher]();
        the[_parseState](PUSH_SATET);

        return the;
    },


    /**
     * 匹配路由
     * @param [rule] {String|RegExp} 路由规则
     * @param fn {Function} 准备回调
     * @returns {Router}
     *
     * @example
     * spa.match('/user/:userId', function(resolved){
         *    require.async('page/user.js', resolved);
         * });
     */
    match: function (rule, fn) {
        var the = this;
        var async = false;
        var pipe = false;
        var controller = null;

        if (!fn) {
            fn = rule;
            rule = /^.*$/;
        }

        switch (fn.length) {
            // 同步
            // router.match(function () {
            //    //
            // });
            case 0:
                controller = fn();
                break;

            // 异步控制器
            // router.match(function (resolve) {
            //     resolve();
            // });
            case 1:
                async = true;
                break;

            // 异步中间件
            // router.match(function (route, next) {
            //     next();
            // });
            case 2:
                async = true;
                pipe = true;
                break;
        }

        the[_matchList].push({
            done: !async,
            id: routeId++,
            controller: controller,
            rule: rule,
            type: typeis(rule),
            async: async,
            pipe: pipe,
            fn: fn
        });

        return the;
    },

    /**
     * 不匹配路由
     * @param fn {Function} 准备回调
     * @returns {Router}
     *
     * @example
     * router.otherwise('/user/:userId', function(resolved){
     *    require.async('page/user.js', resolved);
     * });
     */
    otherwise: function (fn) {
        var the = this;

        /* istanbul ignore next */
        if (the[_notFoundMatcher]) {
            throw new SyntaxError('`Router#otherwise`只允许调用一次');
        }

        var async = true;
        var controller = null;

        if (!fn.length) {
            async = false;
            controller = fn();
        }

        the[_notFoundMatcher] = {
            done: !async,
            id: routeId++,
            controller: controller,
            rule: null,
            type: null,
            async: async,
            fn: fn
        };

        return the;
    },


    /**
     * 跳转，会产生历史记录，会触发回调，如果是步进值，则以当前点为准向前查找
     * @param to {String} 路径
     * @returns {Router}
     */
    redirect: function (to) {
        var the = this;

        time.nextTick(function () {
            var toRet = the[_resolvePath](to);
            the[_pushURL](toRet.path);
        });

        return the;
    },


    /**
     * 重写，尽量替换当前历史记录，不会触发任何回调
     * @param to {String} 路径
     * @returns {Router}
     */
    rewrite: function (to) {
        var the = this;

        time.nextTick(function () {
            var current = the[_current];
            var currentRoute = the.history[current];
            var resolveRet = the[_resolvePath](to);

            the[_replaceURL](resolveRet.path);
        });

        return the;
    },


    /**
     * 重写 query 参数，尽量替换当前历史记录，不会触发任何回调
     * @param key {String|Object} query 键名、键值对、字符串
     * @param [val] {String|Array|Number|Boolean} query 键值
     * @returns {Router}
     */
    rewriteQuery: function (key, val) {
        var the = this;

        time.nextTick(function () {
            var current = the[_current];
            var currentRoute = the.history[current];
            var url = hashbang.setQuery(key, val, the[_options].split);

            the[_replaceURL](url);
        });

        return the;
    },


    /**
     * 解决路径
     * @param to
     * @returns {*}
     */
    resolve: function (to) {
        return this[_resolvePath](to).path;
    },


    /**
     * 私有方法
     * @param route {Object} 路由
     * @param next {Function} 下一步
     * @private
     */
    _change: function (route, next) {
        next(true);
    },


    /**
     * 销毁实例
     */
    destroy: function () {
        var the = this;

        event.un(win, 'hashchange', the[_onPopState]);
        Route.superInvoke('destroy', the);
    }
});
var _options = Router.sole();
var _matchList = Router.sole();
var _notFoundMatcher = Router.sole();
var _getUndefinedMatcher = Router.sole();
var _initPopStateEvent = Router.sole();
var _initPushStateEvent = Router.sole();
var _getNextState = Router.sole();
var _onPopState = Router.sole();
var _pushURL = Router.sole();
var _replaceURL = Router.sole();
var _parseState = Router.sole();
var _lastRoute = Router.sole();
var _lastMatches = Router.sole();
var _lastRuler = Router.sole();
var _executeRoute = Router.sole();
var _processing = Router.sole();
var _historyIndex = Router.sole();
var _current = Router.sole();
var _resolvePath = Router.sole();
var _dropChange = Router.sole();
var _started = Router.sole();
var pro = Router.prototype;


/**
 * 获取下一个 state
 * @returns {{id: number, timeStamp: number}}
 */
pro[_getNextState] = function () {
    return {
        id: historyId++,
        timeStamp: date.now()
    };
};


/**
 * 初始化 popstate
 */
pro[_initPopStateEvent] = function () {
    var the = this;

    // init event
    the[_onPopState] = function (ev) {
        the[_parseState](POPUP_SATET);
    };

    // 这里使用 popstate 是因为 popstate 在 hashchange 之前，
    // 并且可以将 state 保存在浏览器的记录里，
    // 这样就可以区分一个路由是前进还是后退了
    event.on(win, 'popstate', the[_onPopState]);
};


/**
 * 解析当前状态
 * @param stateType
 */
pro[_parseState] = function (stateType) {
    var the = this;

    if (the[_processing]) {
        the[_dropChange]();
        return;
    }

    var now = date.now();
    var state = navigatorHistory.state || the[_getNextState]();
    var options = the[_options];
    var foundMatcher = null;
    var meta = hashbang.parse();
    var path = meta.path;
    var startMatches = null;
    var startRoute = new Route(the, meta, state);
    var endRoute = startRoute;
    var matchesList = [];
    var pipeMatcherList = [];
    var pipePath;

    the[_processing] = true;
    array.each(the[_matchList], function (index, matcher) {
        switch (matcher.type) {
            case 'string':
                startMatches = url.matchPath(path, matcher.rule, {
                    ignoreCase: options.ignoreCase,
                    strict: options.strict
                });
                break;

            case 'regexp':
                startMatches = path.match(matcher.rule);
                break;
        }

        if (startMatches && matcher.pipe) {
            matchesList.push(startMatches);
            pipeMatcherList.push(matcher);
            startMatches = null;
        }

        if (startMatches) {
            foundMatcher = matcher;
            return false;
        }
    });

    foundMatcher = foundMatcher || the[_notFoundMatcher];

    var excuteFoundMatcher = function () {
        if (pipePath) {
            the[_processing] = false;
            the[_lastRoute] = startRoute.prev;
            the[_replaceURL](startRoute.resolve(pipePath));
            return;
        }

        var history = the.history;

        switch (stateType) {
            case PUSH_SATET:
                the[_current]++;
                history.splice(the[_current], history.length - 1);
                history.push(startRoute);
                break;

            case REPLACE_SATET:
                var currentRoute = history[the[_current]];

                if (currentRoute) {
                    history[the[_current]] = startRoute;
                }
                // 初次进入的一些路径 replace
                // 比如首次进入首页，但是权限不足，改为进入列表页
                else {
                    the[_current]++;
                    history.push(startRoute);
                }
                break;

            case POPUP_SATET:
                var lastRoute = the[_lastRoute];
                var isNext = lastRoute.state.id < state.id;
                the[_current] += isNext ? 1 : -1;
                break;
        }

        // 重写 state
        navigatorHistory.replaceState(state, '', location.href);
        the[_executeRoute](startRoute, foundMatcher);
    };

    howdo.each(pipeMatcherList, function (index, matcher, next) {
        // 只做过渡使用，仅有 resolve 方法，无实际用途
        var route = endRoute = new Route(the, meta, state, true);
        var matches = matchesList[index];

        route.id = foundMatcher.id;
        route.rule = foundMatcher.rule;
        route.params = typeis.Boolean(matches) ? {} : matches || {};
        matcher.fn(route, function (path) {
            pipePath = path || pipePath;
            next();
        });
    }).follow(excuteFoundMatcher);

    startRoute.id = foundMatcher && foundMatcher.id;
    startRoute.rule = foundMatcher && foundMatcher.rule;
    startRoute.params = typeis.Boolean(startMatches) ? {} : startMatches || {};
};


/**
 * 初始化 pushstate
 */
pro[_initPushStateEvent] = function () {
    var the = this;
    var options = the[_options];

    event.on(doc, 'click', options.el, function (ev) {
        var el = this;
        var href = attribute.attr(el, 'href');

        if (utilHashbang.is(href, options.split)) {
            the[_pushURL](href);
            return false;
        }
    });
};


/**
 * 获取未定义的 matcher
 * @returns {{}}
 */
pro[_getUndefinedMatcher] = function () {
    return {
        done: true,
        id: routeId++,
        controller: null,
        rule: null,
        type: null,
        async: true,
        pipe: false,
        fn: null
    };
};


/**
 * 新增 URL
 * @param _url
 */
pro[_pushURL] = function (_url) {
    var the = this;

    if (the[_processing]) {
        return false;
    }

    var toURL = url.resolve(location.href, _url);

    if (toURL === location.href) {
        the.emit('repeat', toURL);
        return;
    }

    navigatorHistory.pushState(null, '', _url);
    the[_parseState](PUSH_SATET);
};


/**
 * 替换当前 URL
 * @param url
 */
pro[_replaceURL] = function (url) {
    var the = this;

    navigatorHistory.replaceState(null, '', url);
    the[_parseState](REPLACE_SATET);
};


/**
 * 执行路由
 * @param route {Object} 路由
 * @param matcher {Object} 规则
 */
pro[_executeRoute] = function (route, matcher) {
    var the = this;

    route.controller = matcher && matcher.controller;
    route.done = matcher && matcher.done;

    /**
     * load 之后执行
     */
    var afterLoad = function (callback) {
        the.emit('beforeLoad', route);
        matcher.fn(function (controller) {
            route.done = matcher.done = true;
            route.controller = matcher.controller = controller;
            the.emit('afterLoad', route);
            callback();
        });
    };

    /**
     * 保存现场
     */
    var spotSaving = function () {
        // the.emit('beforeLoad', route);
        // the.emit('afterLoad', route);
        the.emit('beforeChange', route);
        the._change(route, function (changed) {
            the[_processing] = false;
            the.emit('afterChange', route, changed);

            if (!changed && the[_current] > 0) {
                the[_dropChange]();
            } else {
                the[_lastRoute] = route;
            }
        });
    };

    if (!matcher || matcher.done) {
        spotSaving();
    } else {
        afterLoad(spotSaving);
    }
};

/**
 * 解决路径
 * @param to {String|Number}
 * @returns {null|Object}
 */
pro[_resolvePath] = function (to) {
    var meta = hashbang.parse();

    return {
        path: hashbang.set(url.resolve(meta.path, to), this[_options].split)
    };
};


/**
 * 放弃当前及以后历史的 url 变化
 */
pro[_dropChange] = function () {
    var the = this;
    var currentRoute = the.history[the[_current]];

    navigatorHistory.replaceState(currentRoute.state, '', currentRoute.location);
};


Router.defaults = defaults;
module.exports = Router;
