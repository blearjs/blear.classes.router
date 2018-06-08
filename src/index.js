/**
 * 路由
 * @author ydr.me
 * @create 2016-05-19 18:18
 * @update 2018-03-05 10:19
 * @update 2018-03-05 10:19
 * @update 2018年03月07日15:55:10
 * @update 2018年03月23日16:54:20
 */


'use strict';

var Events = require('blear.classes.events');
var access = require('blear.utils.access');
var array = require('blear.utils.array');
var object = require('blear.utils.object');
var qs = require('blear.utils.querystring');
var plan = require('blear.utils.plan');
var typeis = require('blear.utils.typeis');
var event = require('blear.core.event');

var Route = require('./route');
var navigate = require('./navigate');

var win = window;
var nativeHistory = win.history;
var STATE_TYPE_IS_PUSH = 0;
var STATE_TYPE_IS_REPLACE = 1;
var STATE_TYPE_IS_POP = 2;
var MODE_OF_HASH = 'hash';
var MODE_OF_PATH = 'path';
var anonymousRE = /.*/;
var defaults = {
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
    split: '',

    /**
     * 路由模式，取值：hash、path
     * @type string
     */
    mode: MODE_OF_HASH
};
var Router = Events.extend({
    className: 'Router',
    constructor: function (options) {
        var the = this;

        Router.parent(the);
        the[_options] = object.assign(true, {}, defaults, options);
        the[_namedDirectorList] = [];
        the[_routeMap] = {};
        the[_anonymousDirector] = the[_previousRoute] = null;
        // 是否正在解析状态，如果此时有新路由进入，则放弃该路由
        the[_parsingLocation]
            // 是否正在加载导航器
            = the[_loadingDirector]
            = the[_destroyed]
            = false;
        // 是否解析到终点
        the[_parsedFinal]
            = true;
        the[_navigator] = navigate(the[_options].mode, the[_options].split);
    },

    /**
     * 中间路由匹配
     * @param [path]
     * @param loader
     * @returns {Router}
     */
    match: function (path, loader) {
        var args = access.args(arguments);
        var the = this;
        var path2 = args[0];
        var loader2 = args[1];

        if (args.length === 1) {
            loader2 = args[0];
            path2 = null;
        }

        the[_namedDirectorList].push(wrapDirector(path2, loader2));
        return the;
    },

    /**
     * 终点路由匹配
     * @param [path]
     * @param loader
     * @returns {Router}
     */
    get: function (path, loader) {
        var args = access.args(arguments);
        var the = this;

        if (args.length === 1) {
            the[_anonymousDirector] = wrapDirector(anonymousRE, args[0], true);
        } else {
            the[_namedDirectorList].push(wrapDirector(path, loader, true));
        }

        return the;
    },

    /**
     * 解决新路径
     * @param to
     * @returns {String}
     */
    resolve: function (to) {
        return this[_navigator].resolve(to);
    },

    /**
     * 跳转到新地址
     * @param to
     * @returns {String}
     */
    redirect: function (to) {
        return this[_navigator].redirect(to);
    },

    /**
     * 重写为新地址
     * @param to {String} 地址
     * @param [ignore=false] {Boolean} 是否忽略控制器变化
     * @returns {String}
     */
    rewrite: function (to, ignore) {
        return this[_navigator].rewrite(to, ignore);
    },

    /**
     * 设置 query
     * @param key
     * @param [val]
     * @returns {String}
     */
    setQuery: function (key, val) {
        return this[_navigator].setQuery(key, val);
    },

    /**
     * 移除 query
     * @param key
     * @returns {String}
     */
    removeQuery: function (key) {
        return this[_navigator].removeQuery(key);
    },

    /**
     * 路由开始
     * @returns {Router}
     */
    start: function () {
        var the = this;

        the[_initAnonymousDirector]();
        the[_initPopstateEvent]();
        the[_parseStateByStateType](STATE_TYPE_IS_PUSH);

        return the;
    },

    /**
     * 销毁
     */
    destroy: function () {
        var the = this;

        object.each(the[_routeMap], function (key, route) {
            route.destroy();
        });
        the[_options]
            = the[_namedDirectorList]
            = the[_anonymousDirector]
            = the[_previousRoute]
            = the[_previousNavi]
            = the[_routeMap]
            = null;
        event.un(win, 'popstate', the[_onWindowPopstate]);
        the[_destroyed] = true;
        Router.invoke('destroy', the);
    }
});
var prop = Router.prototype;
var sole = Router.sole;
var _options = sole();
var _namedDirectorList = sole();
var _anonymousDirector = sole();
var _previousRoute = sole();
var _previousNavi = sole();
var _initAnonymousDirector = sole();
var _routeMap = sole();
var _getRoute = sole();
var _initPopstateEvent = sole();
var _onWindowPopstate = sole();
var _parseStateByStateType = sole();
var _parsingLocation = sole();
var _parsedFinal = sole();
var _destroyed = sole();
var _navigator = sole();
var _execDirector = sole();
var _loadingDirector = sole();
var _afterChange = sole();

prop[_initAnonymousDirector] = function () {
    var the = this;

    the[_anonymousDirector] = the[_anonymousDirector] || wrapDirector(anonymousRE, function () {
        // ignore
    }, true);
    the[_namedDirectorList].push(the[_anonymousDirector]);
};

prop[_getRoute] = function (key) {
    var the = this;
    var options = the[_options];

    return the[_routeMap][key] || (the[_routeMap][key] = new Route(the[_navigator], options.strict, options.ignoreCase));
};

prop[_initPopstateEvent] = function () {
    var the = this;
    var options = the[_options];

    the[_parseStateByStateType] = function (stateType) {
        // 如果正在解析
        if (the[_parsingLocation]) {
            return;
        }

        var prevNavi = the[_previousNavi];
        var thisNavi = the[_navigator].parse();

        // 如果路由没变化就不做任何处理
        if (isSameNavi(prevNavi, thisNavi)) {
            the.emit('repeat', prevNavi);
            return;
        }

        var state = getState();
        var route = the[_getRoute](state.timeStamp);
        var loc = location.href;

        // 将 navi 信息复制过去
        route.assign(thisNavi);
        the[_previousNavi] = thisNavi;

        // 终点路由解析，保证事件只触发一次
        if (the[_parsedFinal]) {
            the.emit('beforeChange', route, the[_previousRoute]);
        }

        // 历史路由，操作历史记录
        if (route.director) {
            return the[_afterChange](route);
        }

        the[_parsingLocation] = loc;
        route.assign({
            state: state,
            location: loc
        });
        nativeHistory.replaceState(state, null, loc);
        plan.each(the[_namedDirectorList], function (index, director, next) {
            // 如果此时路由监听已销毁，则不做任何后续处理
            if (the[_destroyed]) {
                return;
            }

            // 根据路由与导航进行匹配
            var matched = route.match(director.path);
            route.params = matched;

            // 未匹配到
            if (!matched) {
                return next();
            }

            the[_execDirector](route, director, next);
        }).serial(function () {
            the[_parsingLocation] = false;

            // 终点路由解析，保证事件只触发一次
            if (the[_parsedFinal]) {
                the[_afterChange](route);
            }
        });
    };

    event.on(win, 'popstate', the[_onWindowPopstate] = function (ev) {
        the[_parseStateByStateType](STATE_TYPE_IS_POP);
    });
};

prop[_execDirector] = function (route, director, callback) {
    var the = this;
    var execController = function (controller) {
        // 终点导航器
        if (director.final) {
            if (the[_loadingDirector]) {
                the[_loadingDirector] = false;
                the.emit('afterLoad');
            }

            director.loaded = true;
            route.director = director;
            route.controller = director.controller = controller;
            the[_parsedFinal] = true;
            callback(true);
        }
        // 中间导航器
        else {
            the[_parsedFinal] = false;

            if (typeis.String(controller)) {
                the[_navigator].rewrite(controller);
                callback(true);
            } else {
                callback();
            }
        }
    };

    route.path = director.path;
    object.assign(route.meta, director.meta);

    if (director.loaded) {
        execController(director.controller);
    } else {
        if (!the[_loadingDirector]) {
            the[_loadingDirector] = true;
            the.emit('beforeLoad');
        }

        director.loader.call(route, execController);
    }
};


prop[_afterChange] = function (route) {
    var the = this;
    var previousRoute = the[_previousRoute];
    var previousState = previousRoute && previousRoute.state;
    var state = route.state;
    // 这里用时间戳来判断，而不用 id，原因是：
    // id 是一个固定起始值，会与历史记录重复导致方向判断错误
    // 而时间戳是一个自增值，不会与历史记录重复
    var direction = state && previousState &&
    state.timeStamp && previousState.timeStamp &&
    state.timeStamp < previousState.timeStamp ? 'back' : 'forward';
    var pathname = route.pathname;

    if (previousRoute && previousRoute.pathname === pathname) {
        direction = 'replace';
    }

    if (previousRoute) {
        previousRoute.direction = direction;
    }

    route.direction = direction;
    the.emit('afterChange', route, the[_previousRoute]);
    the[_previousRoute] = route;
};

Router.defaults = defaults;
module.exports = Router;

// ==================================================================
/**
 * 下一个 state
 * @returns {{timeStamp: number}}
 */
function nextState() {
    return {
        timeStamp: Date.now()
    };
}

/**
 * 获取当前 state
 * @returns {{id: number, timeStamp: number, timeStamp: number}}
 */
function getState() {
    return nativeHistory.state || nextState();
}

var directorId = 0;

/**
 * 包装导航器
 * @param path1
 * @param loader1
 * @param [final=false]
 * @returns {{loader: *, loaded: boolean, path: *, async: boolean, final: boolean}}
 */
function wrapDirector(path1, loader1, final) {
    var async = false;
    var loader2 = null;
    var path2 = path1;
    var meta = null;

    if (typeis.Object(path2)) {
        path2 = path1.path;
        meta = path1.meta;
    }

    // 通过回调函数的参数个数来与判断路由回调类型
    // 异步控制器
    // router.match(path, function (resolve) {
    //     resolve(nextPath);
    // });
    if (loader1.length === 1) {
        async = true;
        loader2 = loader1;
    }
    // 默认是同步控制器
    // router.match(path, function () {
    //    do sth.
    // });
    else {
        loader2 = function (next) {
            next(loader1.call(this));
        }
    }

    return {
        id: directorId++,
        loader: loader2,
        loaded: false,
        final: final || false,
        path: path2,
        async: async,
        meta: meta
    };
}

/**
 * 判断是否同一个 route
 * @param a
 * @param b
 * @returns {boolean}
 */
function isSameNavi(a, b) {
    if (!a) {
        return false;
    }

    if (a.pathname !== b.pathname) {
        return false;
    }

    return dumpQuery(a.query) === dumpQuery(b.query);
}

/**
 * 抹平 query
 * @param query1
 * @returns {string}
 */
function dumpQuery(query1) {
    var query2 = {};
    // 保证 key 是一致的顺序
    var keys = object.keys(query1).sort();
    array.each(keys, function (index, key) {
        var val = query1[key];

        if (typeis.Array(val)) {
            // 保证数组是一致的顺序
            query2[key] = [].concat(val).sort();
        } else {
            query2[key] = val;
        }
    });
    return qs.stringify(query2);
}