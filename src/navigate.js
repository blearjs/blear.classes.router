/**
 * 文件描述
 * @author ydr.me
 * @create 2018-03-07 16:22
 * @update 2018-03-07 16:22
 */


'use strict';

var hashbang = require('blear.core.hashbang');
var url = require('blear.utils.url');

var MODE_OF_HASH = 'hash';
var MODE_OF_PATH = 'path';

module.exports = function (mode, split) {
    var isHashMode = mode === MODE_OF_HASH;
    return {
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
         * @param to
         * @returns {String}
         */
        rewrite: function (to) {
            return rewrite(
                isHashMode ?
                    hashbang.set(url.resolve(hashbang.get(), to), split) :
                    url.resolve(getUrl(), to)
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


function redirect(to) {
    location.href = to;
    return to;
}

function rewrite(to) {
    location.replace(to);
    return to;
}


