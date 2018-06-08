
'use strict';

module.exports = {
    a: 1,
    install: function (route) {
        console.log('loaded /');
        route.rewrite('/abc', true);
    }
};



