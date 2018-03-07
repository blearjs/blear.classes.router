/**
 * 路由
 * @author ydr.me
 * @create 2018-03-05 10:19
 * @update 2018-03-05 10:19
 */


'use strict';

var Events = require('blear.classes.events');
var access = require('blear.utils.access');
var array = require('blear.utils.array');
var object = require('blear.utils.object');
var qs = require('blear.utils.querystring');
var plan = require('blear.utils.plan');
var url = require('blear.utils.url');
var typeis = require('blear.utils.typeis');
var hashbang = require('blear.core.hashbang');
var event = require('blear.core.event');

var Route = require('./route');

var win = window;
var nativeHistory = win.history;
var STATE_TYPE_IS_PUSH = 0;
var STATE_TYPE_IS_REPLACE = 1;
var STATE_TYPE_IS_POP = 2;
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
    split: ''
};
var Router = Events.extend({
    className: 'Router',
    constructor: function (options) {
        var the = this;

        Router.parent(the);
        the[_options] = object.assign(true, {}, defaults, options);
        the[_namedDirectorList] = [];
        the[_anonymousDirector] = the[_previousRoute] = null;
        // 是否正在解析状态，如果此时有新路由进入，则放弃该路由
        the[_parsingState] = the[_destroyed] = false;
    },


    /**
     * 路由匹配
     * @param [path]
     * @param controller
     * @returns {Router}
     */
    match: function (path, controller) {
        var args = access.args(arguments);
        var the = this;
        var path2 = null;
        var ctrl2 = null;

        switch (args.length) {
            case 1:
                path2 = null;
                ctrl2 = args[0];
                break;

            case 2:
                path2 = args[0];
                ctrl2 = args[1];
        }

        the[_namedDirectorList].push(wrapDirector(path2, ctrl2));
        return the;
    },

    /**
     * 否则路由不匹配
     * @param controller
     * @returns {Router}
     */
    otherwise: function (controller) {
        var the = this;
        the[_anonymousDirector] = wrapDirector(null, controller);
        return the;
    },

    /**
     * 解决新路径
     * @param to
     * @returns {String}
     */
    resolve: function (to) {
        var the = this;
        var options = the[_options];

        return hashbang.set(url.resolve(hashbang.get(), to), options.split);
    },

    /**
     * 跳转到新地址
     * @param to
     * @returns {Router}
     */
    redirect: function (to) {
        var the = this;
        var options = the[_options];

        location.href = hashbang.set(url.resolve(hashbang.get(), to), options.split);
        return the;
    },

    /**
     * 重写为新地址
     * @param to
     * @returns {Router}
     */
    rewrite: function (to) {
        var the = this;
        var options = the[_options];

        location.replace(hashbang.set(url.resolve(hashbang.get(), to), options.split));
        return the;
    },

    /**
     * 设置 query
     * @param key
     * @param [val]
     * @returns {undefined}
     */
    setQuery: function (key, val) {
        var the = this;
        var options = the[_options];

        location.replace(hashbang.setQuery(key, val, options.split));
    },

    /**
     * 移除 query
     * @param key
     * @returns {undefined}
     */
    removeQuery: function (key) {
        var the = this;
        var options = the[_options];

        location.replace(hashbang.removeQuery(key, options.split));
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

        if (the[_previousRoute]) {
            the[_previousRoute].destroy();
        }

        the[_options] = the[_namedDirectorList] = the[_anonymousDirector] = the[_previousRoute] = null;
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
var _initAnonymousDirector = sole();
var _initPopstateEvent = sole();
var _onWindowPopstate = sole();
var _parseStateByStateType = sole();
var _parsingState = sole();
var _destroyed = sole();

prop[_initAnonymousDirector] = function () {
    var the = this;

    the[_anonymousDirector] = the[_anonymousDirector] || wrapDirector(null, function () {
        // ignore
    });
};

prop[_initPopstateEvent] = function () {
    var the = this;
    var options = the[_options];

    the[_parseStateByStateType] = function (stateType) {
        var previousRoute = the[_previousRoute];
        var previousState = previousRoute && previousRoute.state;

        // 如果正在解析
        if (the[_parsingState] && previousRoute) {
            nativeHistory.replaceState(previousState, null, previousRoute.location);
            return;
        }

        var route = new Route({
            split: options.split
        });

        // 如果路由没变化就不做任何处理
        if (isSameRoute(previousRoute, route)) {
            route.destroy();
            the.emit('repeat', previousRoute);
            return;
        }

        the.emit('beforeChange', route);
        the[_parsingState] = true;
        var state = getState();
        var pathname = route.pathname;
        var matchedNamedDirectorList = [];
        // 这里用时间戳来判断，而不用 id，原因是：
        // id 是一个固定起始值，会与历史记录重复导致方向判断错误
        // 而时间戳是一个自增值，不会与历史记录重复
        var direction = state && previousState &&
        state.timestamp && previousState.timestamp &&
        state.timestamp < previousState.timestamp ? 'backward' : 'forward';
        var location2 = location.href;

        if (stateType === STATE_TYPE_IS_REPLACE) {
            direction = 'replace';
        }

        route.assign({
            direction: direction,
            state: state,
            location: location2,
            controller: null
        });
        nativeHistory.replaceState(state, null, location2);

        if (the[_previousRoute]) {
            the[_previousRoute].destroy();
        }

        the[_previousRoute] = route;
        plan.each(the[_namedDirectorList], function (index, director, next) {
            // 如果此时路由监听已销毁，则不做任何后续处理
            if (the[_destroyed]) {
                return;
            }

            var directorPath = director.path;
            var matched = false;

            // 具名路径
            if (directorPath) {
                switch (typeis(directorPath)) {
                    case 'string':
                        matched = route.params = url.matchPath(pathname, directorPath, {
                            strict: options.strict,
                            ignoreCase: options.ignoreCase
                        });
                        break;

                    case 'regexp':
                        var matches = pathname.match(directorPath);

                        if (matches) {
                            matched = route.params = array.from(matches);
                        }
                        break;
                }

                if (matched) {
                    matchedNamedDirectorList.push(director);
                }
            }
            // 匿名路径
            else {
                matched = true;
            }

            // 未匹配到
            if (!matched) {
                return next();
            }

            director.ctrl.call(route, /*next*/function (toOrController) {
                switch (typeis(toOrController)) {
                    // 终点：替换当前 hashbang
                    case 'string':
                        toOrController = hashbang.set(url.resolve(pathname, toOrController), options.split);
                        nativeHistory.replaceState(state, null, toOrController);
                        next(true);
                        the[_parseStateByStateType](STATE_TYPE_IS_REPLACE);
                        break;

                    case 'undefined':
                        // 异步：过渡
                        if (director.async) {
                            next();
                        }
                        // 同步：终点
                        else {
                            next(true);
                        }
                        break;

                    // 加载的模块
                    default:
                        route.controller = toOrController;
                        next(true);
                        break;
                }
            });
        }).serial(function () {
            var end = function () {
                the.emit('afterChange', route);
                the[_parsingState] = false;
            };

            // 因为 plan 是异步的
            if (matchedNamedDirectorList.length) {
                end();
            } else {
                the[_anonymousDirector].ctrl.call(route, /*next*/function (controller) {
                    route.controller = controller;
                    end();
                });
            }
        });
    };

    event.on(win, 'popstate', the[_onWindowPopstate] = function (ev) {
        the[_parseStateByStateType](STATE_TYPE_IS_POP);
    });
};


Router.defaults = defaults;
module.exports = Router;

// ==================================================================

/**
 * 下一个 state
 * @returns {{timestamp: number}}
 */
function nextState() {
    return {
        timestamp: Date.now()
    };
}

/**
 * 获取当前 state
 * @returns {{id: number, timeStamp: number, timestamp: number}}
 */
function getState() {
    return nativeHistory.state || nextState();
}


/**
 * 包装控制器
 * @param path1
 * @param ctrl1
 * @returns {{ctrl: *, path: *, async: boolean}}
 */
function wrapDirector(path1, ctrl1) {
    var async = false;
    var ctrl2 = null;

    // 通过回调函数的参数个数来与判断路由回调类型
    // 异步控制器
    // router.match(path, function (resolve) {
    //     resolve(nextPath);
    // });
    if (ctrl1.length === 1) {
        async = true;
        ctrl2 = ctrl1;
    }
    // 默认是同步控制器
    // router.match(path, function () {
    //    do sth.
    // });
    else {
        ctrl2 = function (next) {
            next(ctrl1.call(this));
        }
    }

    return {
        ctrl: ctrl2,
        path: path1,
        async: async
    };
}

/**
 * 判断是否同一个 route
 * @param a
 * @param b
 * @returns {boolean}
 */
function isSameRoute(a, b) {
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
 * @returns {{}}
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