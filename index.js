'use strict';

let {
    removeChilds
} = require('doming');

let {
    mount
} = require('kabanery');

let querystring = require('querystring');

const SINGLE_JUMP_PREFIX = 'single://';

let queryPager = (map = [], index) => {
    index = initDefaultPage(map, index);

    return (url) => {
        let qs = querystring.parse(url.split('?')[1] || '');
        let pageName = qs.page || index;

        return map[pageName];
    };
};

let restPager = (map = [], index) => {
    index = initDefaultPage(map, index);

    return (url) => {
        let pathname = url.split(/.*\:\/\//)[1];
        let pageName = pathname.split('/')[1];
        pageName = pageName || index;

        return map[pageName];
    };
};

let initDefaultPage = (map = [], index) => {
    if (index === null || index === undefined) {
        for (let name in map) {
            index = name;
            break;
        }
    }
    return index;
};

let renderPage = (render, pageEnv, title) => {
    return Promise.resolve(render(pageEnv)).then((pageNode) => {
        // TODO pager is the default container, make it configurable
        let pager = document.getElementById('pager');
        // unload old page
        removeChilds(pager);
        // add new page
        mount(pageNode, pager);
        pager.style = 'display:block;';
        document.title = title;
    });
};

/**
 * pager: (url) => {title, render}
 */
let router = (pager, pageEnv) => {
    let listenFlag = false;

    let switchPage = (render, pageEnv, title) => {
        renderPage(render, pageEnv, title);

        if (!listenFlag) {
            listenPageSwitch();
            listenFlag = true;
        }
    };

    let forward = (url) => {
        if (!window.history.pushState) {
            window.location.href = url;
            return;
        }
        let {
            render, title = '', transitionData = {}
        } = pager(url);

        if (url !== window.location.href) {
            window.history.pushState(transitionData, title, url);
        }
        return switchPage(render, pageEnv, title);
    };

    let redirect = (url) => {
        if (!window.history.pushState) {
            window.location.href = url;
            window.location.replace(url);
            return;
        }
        let {
            render, title = '', transitionData = {}
        } = pager(url);

        if (url !== window.location.href) {
            window.history.replaceState(transitionData, title, url);
        }
        return switchPage(render, pageEnv);
    };

    let listenPageSwitch = () => {
        window.onpopstate = () => {
            forward(window.location.href);
        };

        document.addEventListener('click', (e) => {
            let target = e.target;

            // hack kabanery, TODO fix this hack
            if (e.__stopPropagation) return;

            while (target) {
                if (target.getAttribute) { // document does not have getAttribute method
                    let url = (target.getAttribute('href') || '').trim();
                    if (url.indexOf(SINGLE_JUMP_PREFIX) === 0) {
                        forward(url.substring(SINGLE_JUMP_PREFIX.length).trim());
                        break;
                    }
                }
                target = target.parentNode;
            }
        });
    };

    return {
        forward,
        redirect,
        reload: () => {
            return forward(window.location.href);
        }
    };
};

module.exports = {
    router,
    queryPager,
    restPager
};