'use strict';

const {
  removeChilds
} = require('doming');

const {
  mount
} = require('kabanery');

const {
  parse
} = require('url');

const SINGLE_JUMP_PREFIX = 'single://';

const CONTAINER_ID = 'pager';

const queryPager = (map = [], index) => {
  index = initDefaultPage(map, index);

  return (url) => {
    const urlObject = parse(url, true);
    const pageName = urlObject.query['page'] || index;

    return map[pageName];
  };
};

const restPager = (map = [], index) => {
  index = initDefaultPage(map, index);

  return (url) => {
    const pathname = url.split(/.*:\/\//)[1];
    const pageName = pathname.split('/')[1] || index;

    return map[pageName];
  };
};

const initDefaultPage = (map = [], index) => {
  if (index === null || index === undefined) {
    for (const name in map) {
      index = name;
      break;
    }
  }
  return index;
};

const renderPage = (render, pageEnv, title, containerId) => {
  return Promise.resolve(render(pageEnv, title)).then((pageNode) => {
    // TODO pager is the default container, make it configurable
    const pager = document.getElementById(containerId);
    // unload old page
    removeChilds(pager);
    // add new page
    mount(pageNode, pager);
    pager.style = 'display:block;';
    document.title = title;

    // hash location
    if (window.location.hash) {
      const item = document.getElementById(window.location.hash.substring(1));
      if (item) {
        window.scrollTo(0, item.offsetTop);
      }
    }
  });
};

/**
 * pager: (url) => {title, render}
 */
const router = (pager, pageEnv, {
  onSwitchPageStart,
  onSwitchPageFinished,
  containerId = CONTAINER_ID
} = {}) => {
  let listenFlag = false;

  /**
   * only entrance for switching pages
   */
  const switchPage = (render, pageEnv, title) => {
    onSwitchPageStart && onSwitchPageStart(render, pageEnv, title);
    let ret = switchBetweenPages(render, pageEnv, title);

    Promise.resolve(ret).then((data) => {
      onSwitchPageFinished && onSwitchPageFinished(null, data);
    }).catch((err) => {
      onSwitchPageFinished && onSwitchPageFinished(err);
    });

    return ret;
  };

  const switchBetweenPages = (render, pageEnv, title) => {
    let ret = renderPage(render, pageEnv, title, containerId);

    if (!listenFlag) {
      listenPageSwitch();
      listenFlag = true;
    }

    return ret;
  };

  const forward = (url, {
    keepLocation
  } = {}) => {
    if (!window.history.pushState) {
      window.location.href = url;
      return;
    }
    let {
      render,
      title = '',
      transitionData = {}
    } = pager(url);

    if (url !== window.location.href) {
      window.history.pushState(transitionData, title, url);
    }
    if (!keepLocation) {
      window.scrollTo(0, 0);
    }
    return switchPage(render, pageEnv, title);
  };

  const redirect = (url) => {
    if (!window.history.pushState) {
      window.location.href = url;
      window.location.replace(url);
      return;
    }
    const {
      render,
      title = '',
      transitionData = {}
    } = pager(url);

    if (url !== window.location.href) {
      window.history.replaceState(transitionData, title, url);
    }
    return switchPage(render, pageEnv);
  };

  const listenPageSwitch = () => {
    window.onpopstate = () => {
      forward(window.location.href);
    };

    document.addEventListener('click', (e) => {
      // hack kabanery, TODO fix this hack
      setTimeout(() => {
        let target = e.target;
        // hack kabanery, TODO fix this hack
        if (e.__stopPropagation) return;

        while (target) {
          if (target.getAttribute) { // document does not have getAttribute method
            let url = (target.getAttribute('href') || '').trim();
            // matched
            if (url.indexOf(SINGLE_JUMP_PREFIX) === 0) {
              e.preventDefault();
              e.stopPropagation();

              forward(url.substring(SINGLE_JUMP_PREFIX.length).trim());
              break;
            }
          }
          target = target.parentNode;
        }
      });
    });
  };

  return {
    forward,
    redirect,
    reload: () => {
      return forward(window.location.href, {
        keepLocation: true
      });
    }
  };
};

module.exports = {
  router,
  queryPager,
  restPager
};
