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
var event = require('blear.core.event');
var attribute = require('blear.core.attribute');
var hashbang = require('blear.core.hashbang');
var Events = require('blear.classes.events');

var win = window;
var doc = win.document;
var history = win.history;
var reHashbang = /^#!/;
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
     * 路由改变之后
     * @param route
     * @param done
     */
    onChange: function (route, done) {
        done(true);
    }
};
var ROUTE_METHODS = ['redirect', 'rewrite', 'rewriteQuery'];
var Route = Events.extend({
    className: 'Route',
    constructor: function (router, meta, state) {
        var the = this;

        Route.parent(the);
        meta.data = {};
        meta.state = state;
        the.router = router;
        the.rewriteList = [];
        object.assign(the, meta);

        // 注入 router 方法
        array.each(ROUTE_METHODS, function (index, method) {
            the[method] = function () {
                the.router[method].apply(the.router, arguments);
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

        object.assign(the.data, data);

        return the;
    }
});
var _rewrite = Route.sole();

/**
 * 重写
 * @param meta
 */
Route.prototype[_rewrite] = function (meta) {
    var the = this;

    the.rewriteList.push({
        path: the.path,
        pathname: the.pathname,
        query: the.query
    });
    object.assign(the, meta);
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
        the[_initPopStateEvent]();
        the[_initPushStateEvent]();
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
     * spa.otherwise('/user/:userId', function(resolved){
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

            the[_replaceState](resolveRet.path);
            currentRoute[_rewrite](hashbang.parse());
            the.emit('rewriteHistory', the.history[current]);
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
            var url = hashbang.setQuery(key, val);

            the[_replaceState](url);
            currentRoute[_rewrite](hashbang.parse());
            the.emit('rewriteHistory', the.history[the[_current]]);
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
    var timer = time.nextTick(function () {
        the[_parseState](history.state || the[_getNextState]());
    });

    // init event
    the[_onPopState] = function (ev) {
        // webkit 浏览器会主动触发一次 popSatte，并且它的优先级比 nextTick 高
        // 所以，可以借此机会清除定时器
        clearTimeout(timer);
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
    var options = the[_options];
    var ruler = null;
    var matches = null;
    var meta = hashbang.parse();
    var path = meta.path;
    state.timeStamp = state.timeStamp || date.now();
    var route = new Route(the, meta, state);
    var matchesList = [];
    var routeList = [];
    var pipeList = [];

    array.each(the[_matchList], function (index, item) {
        switch (item.type) {
            case 'string':
                matches = url.matchPath(path, item.rule, {
                    ignoreCase: options.ignoreCase,
                    strict: options.strict
                });
                break;

            case 'regexp':
                matches = path.match(item.rule);
                break;
        }

        if (matches && item.pipe) {
            matchesList.push(matches);
            pipeList.push(item);
            routeList.push(new Route(the, meta, state));
            matches = null;
        }

        if (matches) {
            ruler = item;
            return false;
        }
    });


    var nextExecute = function () {
        if (pipePath) {
            var fullPath = route.resolve(pipePath);
            the[_lastRoute] = route;
            return the[_pushState](fullPath);
        }

        the[_executeRoute](route, matches, ruler);
    };

    if (ruler) {
        var pipePath;

        howdo.each(pipeList, function (index, item, next) {
            if (pipePath) {
                return next();
            }

            var route = routeList[index];
            var matches = matchesList[index];

            route.id = ruler.id;
            route.rule = ruler.rule;
            route.params = typeis.Boolean(matches) ? {} : matches || {};
            item.fn(route, function (path) {
                pipePath = path;
                next();
            });
        }).follow(nextExecute);
    } else {
        ruler = the[_notMatch];
        time.nextTick(nextExecute);
    }

    route.id = ruler && ruler.id;
    route.rule = ruler && ruler.rule;
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

        if (reHashbang.test(href)) {
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

    if (the[_processing]) {
        return false;
    }

    var current = the[_current];
    var currentRoute = the.history[current];
    var state = currentRoute.state;

    history.replaceState(state, '', url);
};


/**
 * 执行路由
 * @param route {Object} 路由
 * @param matches {Object|null} 匹配结果
 * @param ruler {Object} 规则
 */
pro[_executeRoute] = function (route, matches, ruler) {
    var the = this;
    var options = the[_options];

    // if (!ruler) {
    //     the[_processing] = true;
    //     the.emit('beforeChange', route, true);
    //     return options.onChange(route, function () {
    //         the[_processing] = false;
    //         the[_lastRoute] = route;
    //         the[_current]++;
    //         the.emit('afterChange', route, true);
    //     });
    // }

    // 先进入历史
    route.matched = Boolean(matches);
    route.controller = ruler && ruler.controller;
    route.done = ruler && ruler.done;

    if (the[_processing]) {
        the[_dropChange]();
        return;
    }

    the[_processing] = true;

    if (the[_lastRoute]) {
        // 防止循环引用链过长导致内存泄露
        the[_lastRoute].prev = null;
        the[_lastRoute].next = route;
        route.data = the[_lastRoute].data;
    }

    route.prev = the[_lastRoute];
    // 防止循环引用链过长导致内存泄露
    route.next = null;
    the[_pushHistory](route);

    /**
     * load 之后执行
     */
    var afterLoad = function (callback) {
        the.emit('beforeLoad', route);
        ruler.fn(function (controller) {
            route.done = ruler.done = true;
            route.controller = ruler.controller = controller;
            the.emit('afterLoad', route);
            callback();
        });
    };

    /**
     * 保存现场
     */
    var spotSaving = function () {
        the.emit('beforeChange', route);
        options.onChange(route, function (changed) {
            the[_processing] = false;
            the.emit('afterChange', route, changed);

            if (!changed && the[_current] > -1) {
                the[_dropChange]();
            } else {
                the[_lastRoute] = route;
                the[_current]++;
            }
        });
    };

    if (!ruler || ruler.done) {
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
    var the = this;
    var current = the[_current];
    var currentRoute = the.history[current];
    var from = currentRoute.path;

    return {
        path: hashbang.set(url.resolve(from, to))
    };
};


/**
 * 放弃当前及以后历史的 url 变化
 */
pro[_dropChange] = function () {
    var the = this;
    var current = the[_current];
    var currentRoute = the.history[current];

    the.history.splice(current + 1);
    the.emit('dropChange', hashbang.toString());
    the[_replaceState](hashbang.set(currentRoute.path));
};


Router.defaults = defaults;
module.exports = Router;
