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
var history = win.history;
var routeId = 0;
var MAX_LENGTH = 10;
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
        meta.data = {};
        meta.nextData = {};
        meta.state = state;
        the.router = router;
        object.assign(the, meta);

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
var _rewrite = Route.sole();


/**
 * 重写并生成一个新的 route
 * @param meta
 */
Route.prototype[_rewrite] = function (meta) {
    var the = this;
    var router = the.router;

    router[_lastRoute] = the;
    var newRoute = new Route(router, meta, the.state);

    newRoute.id = the.id;
    newRoute.view = the.view;
    newRoute.matched = the.matched;
    newRoute.data = the.data;
    newRoute.nextData = the.nextData;

    return newRoute;
};


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
        the[_notMatch] = null;
        // 上一次匹配结果
        the[_lastRoute] = null;
        // 上一次是否匹配到
        the[_lastMatches] = null;
        // 上一个路由
        the[_lastRuler] = null;
        // 是否正在处理中
        the[_processing] = false;
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
        the[_parseState](history.state || the[_getNextState]());

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
        if (the[_notMatch]) {
            throw new TypeError('`otherwise`只允许调用一次');
        }

        var async = true;
        var controller = null;

        if (!fn.length) {
            async = false;
            controller = fn();
        }

        the[_notMatch] = {
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
            the[_pushState](toRet.path);
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

            currentRoute = the.history[current] = currentRoute[_rewrite](hashbang.parse());
            the[_replaceState](resolveRet.path);
            the.emit('rewriteHistory', currentRoute);
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

            currentRoute = the.history[current] = currentRoute[_rewrite](hashbang.parse());
            the[_replaceState](url);
            the.emit('rewriteHistory', currentRoute);
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
        Router.parent.destroy(the);
    }
});
var _options = Router.sole();
var _matchList = Router.sole();
var _notMatch = Router.sole();
var _initPopStateEvent = Router.sole();
var _initPushStateEvent = Router.sole();
var _getNextState = Router.sole();
var _onPopState = Router.sole();
var _pushState = Router.sole();
var _replaceState = Router.sole();
var _parseState = Router.sole();
var _lastRoute = Router.sole();
var _lastMatches = Router.sole();
var _lastRuler = Router.sole();
var _executeRoute = Router.sole();
var _processing = Router.sole();
var _historyIndex = Router.sole();
var _current = Router.sole();
var _pushHistory = Router.sole();
var _resolvePath = Router.sole();
var _dropChange = Router.sole();
var pro = Router.prototype;


/**
 * 获取下一个 state
 * @returns {{timeStamp: number}}
 */
pro[_getNextState] = function () {
    return {
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
        the[_parseState](ev.state || the[_getNextState]());
    };

    // 这里使用 popstate 是因为 popstate 在 hashchange 之前，
    // 并且可以将 state 保存在浏览器的记录里，
    // 这样就可以区分一个路由是前进还是后退了
    event.on(win, 'popstate', the[_onPopState]);
};


/**
 * 解析当前状态
 * @param state
 */
pro[_parseState] = function (state) {
    var the = this;

    if (the[_processing]) {
        the[_dropChange]();
        return;
    }

    var options = the[_options];
    var foundMatcher = null;
    var matches = null;
    var matched = false;
    var meta = hashbang.parse();
    var path = meta.path;
    state.timeStamp = state.timeStamp || date.now();
    var route = new Route(the, meta, state);
    var matchesList = [];
    var pipeMatcherList = [];

    the[_current]++;
    the[_processing] = true;

    array.each(the[_matchList], function (index, matcher) {
        switch (matcher.type) {
            case 'string':
                matches = url.matchPath(path, matcher.rule, {
                    ignoreCase: options.ignoreCase,
                    strict: options.strict
                });
                break;

            case 'regexp':
                matches = path.match(matcher.rule);
                break;
        }

        if (matches && matcher.pipe) {
            matchesList.push(matches);
            pipeMatcherList.push(matcher);
            matches = null;
        }

        if (matches) {
            foundMatcher = matcher;
            matched = true;
            return false;
        }
    });

    var excuteFoundMatcher = function () {
        if (pipePath) {
            var fullPath = route.resolve(pipePath);
            the[_lastRoute] = route;
            the[_processing] = false;
            return the[_pushState](fullPath);
        }

        the[_executeRoute](route, matched, foundMatcher);
    };

    if (foundMatcher) {
        var pipePath;
        howdo.each(pipeMatcherList, function (index, matcher, next) {
            var route = new Route(the, meta, state, true);
            var matches = matchesList[index];

            route.id = foundMatcher.id;
            route.rule = foundMatcher.rule;
            route.params = typeis.Boolean(matches) ? {} : matches || {};
            matcher.fn(route, function (path) {
                pipePath = path || pipePath;
                next();
            });
        }).follow(excuteFoundMatcher);
    } else {
        foundMatcher = the[_notMatch];
        time.nextTick(excuteFoundMatcher);
    }

    route.id = foundMatcher && foundMatcher.id;
    route.rule = foundMatcher && foundMatcher.rule;
    route.params = typeis.Boolean(matches) ? {} : matches || {};
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
            the[_pushState](href);
            return false;
        }
    });
};


/**
 * 新增状态
 * @param _url
 */
pro[_pushState] = function (_url) {
    var the = this;

    if (the[_processing]) {
        return false;
    }

    var toURL = url.resolve(location.href, _url);

    if (toURL === location.href) {
        the.emit('repeat', toURL);
        return;
    }

    var state = the[_getNextState]();

    history.pushState(state, '', _url);
    the[_parseState](state);
};


/**
 * 替换当前状态
 * @param url
 */
pro[_replaceState] = function (url) {
    var the = this;
    var current = the[_current];
    var currentRoute = the.history[current];
    var state = currentRoute.state;

    history.replaceState(state, '', url);
    the[_onPopState](state);
};


/**
 * 执行路由
 * @param route {Object} 路由
 * @param matched {Boolean} 是否已被匹配到
 * @param matcher {Object} 规则
 */
pro[_executeRoute] = function (route, matched, matcher) {
    var the = this;

    // 先进入历史
    route.matched = matched;
    route.controller = matcher && matcher.controller;
    route.done = matcher && matcher.done;

    if (the[_lastRoute]) {
        // 防止循环引用链过长导致内存泄露
        the[_lastRoute].prev = null;
        the[_lastRoute].next = route;
        // 数据传递
        route.data = the[_lastRoute].nextData;
        the[_lastRoute].nextData = null;
    }

    // route.prev = the[_lastRoute];
    // // 防止循环引用链过长导致内存泄露
    // route.next = null;
    the[_pushHistory](route);

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
 * 加入历史栈
 * @param route
 */
pro[_pushHistory] = function (route) {
    var the = this;

    route.index = the[_historyIndex]++;
    the.history.push(route);

    if (the.history.length > MAX_LENGTH) {
        the.emit('dropHistory', the.history.shift());
        the[_current]--;
    }

    the.emit('pushHistory', route);
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
    the[_current]--;
    var current = the[_current];
    var currentRoute = the.history[current];

    if (!currentRoute) {
        return;
    }

    the.history.splice(current + 1);
    the.emit('dropChange', hashbang.get());
    the[_replaceState](hashbang.set(currentRoute.path, the[_options].split));
};


Router.defaults = defaults;
module.exports = Router;
