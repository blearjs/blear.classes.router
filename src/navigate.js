/**
 * 文件描述
 * @author ydr.me
 * @create 2018-03-07 16:22
 * @update 2018-03-07 16:22
 */


'use strict';

var hashbang = require('blear.core.hashbang');
var event = require('blear.core.event');
var time = require('blear.utils.time');
var url = require('blear.utils.url');

var MODE_OF_HASH = 'hash';
var MODE_OF_PATH = 'path';
var nextTick = time.nextTick;

module.exports = function (mode, split) {
    var isHashMode = mode === MODE_OF_HASH;
    return {
        /**
         * 解析当前路由
         * @returns {{href, base, protocol, host, hostname, port, pathname, search, hash, hashstring, querystring, query, origin, statical}}
         */
        parse: function () {
              return isHashMode ? hashbang.parse() : url.parse(location.href);
        },
        /**
         * 解决新路径
         * @param to
         * @returns {String}
         */
        resolve: function (to) {
            return isHashMode ?
                hashbang.set(url.resolve(hashbang.get(), to), split) :
                url.resolve(getUrl(), to);
        },

        /**
         * 跳转到新地址
         * @param to
         * @returns {String}
         */
        redirect: function (to) {
            return redirect(
                isHashMode ?
                    hashbang.set(url.resolve(hashbang.get(), to), split) :
                    url.resolve(getUrl(), to)
            );
        },

        /**
         * 重写为新地址
         * @param to {String} 地址
         * @param [ignore=false] {Boolean} 是否忽略控制器变化
         * @returns {String}
         */
        rewrite: function (to, ignore) {
            return rewrite(
                isHashMode ?
                    hashbang.set(url.resolve(hashbang.get(), to), split) :
                    url.resolve(getUrl(), to),
                ignore
            );
        },

        /**
         * 设置 query
         * @param key
         * @param [val]
         * @returns {String}
         */
        setQuery: function (key, val) {
            return rewrite(
                isHashMode ?
                    hashbang.setQuery(key, val, split) :
                    url.setQuery(getUrl(), key, val)
            );
        },

        /**
         * 移除 query
         * @param key
         * @returns {String}
         */
        removeQuery: function (key) {
            return rewrite(
                isHashMode ?
                    hashbang.removeQuery(key, split) :
                    url.removeQuery(getUrl(), key)
            );
        }
    };
};


// ==================================================

/**
 * 获取当前 url
 * @returns {string}
 */
function getUrl() {
    return location.href;
}

/**
 * 跳转 url
 * @param to
 * @returns {*}
 */
function redirect(to) {
    nextTick(function () {
        // location.href = to;
        history.pushState(null, null, to);
        emit();
    });
    return to;
}

/**
 * 重写 url
 * @param to
 * @param ignore
 * @returns {*}
 */
function rewrite(to, ignore) {
    nextTick(function () {
        // location.replace(to);
        history.replaceState(ignore ? history.state : null, null, to);
        emit();
    });
    return to;
}

/**
 * 触发 popstate 事件
 */
function emit() {
    event.emit(window, 'popstate');
}


