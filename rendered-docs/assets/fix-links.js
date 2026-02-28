
(()=>{
(() => {
  if (!self.sessionStorage) {
    const sessionStorageMap = new Map();
    const sessionStore = {
      getItem(key) {
        return sessionStorageMap.get(String(key));
      },
      setItem(key, value) {
        sessionStorageMap.set(String(key), String(value));
      },
      removeItem(key) {
        sessionStorageMap.delete(String(key));
      },
      clear() {
        sessionStorageMap.clear();
      },
      key(index) {
        return [...sessionStorageMap.keys()][index];
      }
    };
    Object.defineProperty(sessionStore, 'length', {
      get() {
        return sessionStorageMap.size;
      }
    });
    self.sessionStorage = sessionStore;
  }
})();
(() => {
  (function SharedWorkerStorageScript() {
    const instanceOf = (x, y) => {
      try {
        return x instanceof y;
      } catch {
        return false;
      }
    };
    if (instanceOf(self, self.SharedWorkerGlobalScope) || instanceOf(self, self.DedicatedWorkerGlobalScope)) {
      (() => {
        const store = new Map();
        onconnect = (event) => {
          const port = [...event?.ports ?? []]?.shift?.();
          (port ?? self).onmessage = (e) => {
            const { requestId, type, key, value } = e?.data ?? {};
            const respond = {
              SET: () => port.postMessage({
                requestId, type: 'SET_RESULT',
                success: store.set(key, value)
              }),
              GET: () => port.postMessage({
                requestId,
                type: 'GET_RESULT',
                key,
                value: store.get(key)
              }),
              DELETE: () => port.postMessage({
                requestId,
                type: 'DELETE_RESULT',
                key,
                value: store.delete(key)
              })
            };
            respond[type]();
          };
        };
        onconnect();
      })();
    } else {
      (() => {
        const sharedWorker = new (self.SharedWorker ?? self.Worker)(`data:text/javascript,(${encodeURIComponent(SharedWorkerStorageScript)})();`);
        sharedWorker?.port?.start?.();
        class SharedWorkerStorage {
          constructor(port) {
            this.port = port;
            this.pendingRequests = new Map();
            this.port.onmessage = (e) => this.onMessage(e);
          }
          onMessage(e) {
            const { requestId, type, key, value, success } = e.data;
            this.pendingRequests.get(requestId)?.({ type, key, value, success });
            this.pendingRequests.delete(requestId);
          }
          generateId() {
            return self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
          }
          setItem(key, value) {
            sessionStorage.setItem(`~tempStorage~${key}`, value);
            return new Promise((resolve) => {
              const requestId = this.generateId();
              this.pendingRequests.set(requestId, resolve);
              const tid = setTimeout(resolve, 100);
              try {
                this.port.postMessage({ requestId, type: 'SET', key, value });
              } catch (e) {
                resolve(null);
                clearTimeout(tid);
                console.warn(e, ...arguments)
              }
            });
          }
          getItem(key) {
            return new Promise((resolve) => {
              const tid = setTimeout(resolve, 100);
              const requestId = this.generateId();
              this.pendingRequests.set(requestId, (msg) => {
                let value = msg.value;
                if (value == null) {
                  value = sessionStorage.getItem(`~tempStorage~${key}`);
                } else {
                  sessionStorage.setItem(`~tempStorage~${key}`, value);
                }
                if (value != null) {
                  tempStorage.setItem(key, value);
                }
                resolve(value);
              });
              try {
                this.port.postMessage({ requestId, type: 'GET', key });
              } catch (e) {
                resolve(null);
                clearTimeout(tid);
                console.warn(e, ...arguments)
              }
            });
          }
          removeItem(key) {
            return new Promise((resolve) => {
              sessionStorage.removeItem(`~tempStorage~${key}`);
              const requestId = this.generateId();
              this.pendingRequests.set(requestId, (msg) => resolve(msg.value));
              const tid = setTimeout(resolve, 100);
              try {
                this.port.postMessage({ requestId, type: 'DELETE', key });
              } catch (e) {
                resolve(null);
                clearTimeout(tid);
                console.warn(e, ...arguments)
              }
            });
          }
        }
        self.tempStorage = new SharedWorkerStorage(sharedWorker.port ?? sharedWorker);
      })();
    }
  })();
})();

const clickListenerAttached = new WeakSet();

function attachClickListener(link) {

  if (clickListenerAttached.has(link)) return;

  clickListenerAttached.add(link);

  link.addEventListener('click', async function(event) {
try{
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target === '_blank' ||
      link.hasAttribute('download')
    ) return;

    const url = new URL(link.href, location.href);
    if(url.origin !== location.origin)return;
    if (
      url.origin === location.origin &&
      url.pathname === location.pathname &&
      url.search === location.search
    ) return;

    event.preventDefault();

    const valid = await getValidNavigationURL(url.href);

    if (valid && !valid.endsWith('null')) {
      window.top.location.href = valid;
    }else{
      window.top.location.href = link.href;
    }
}catch(e){
alert(e);
}
  });

}


function installPerLinkClickHandling(root = document) {

  function attachAll() {

    for (const link of root.querySelectorAll('a[href]')) {
      if(!link.dataset.fixed){
        link.dataset.fixed = true;
        attachClickListener(link);
      }
    }

  }

  attachAll();

  const observer = new MutationObserver(mutations => {

    for (const mutation of mutations) {

      for (const node of mutation.addedNodes) {

        if (node.nodeType !== 1) continue;

        if (node.matches?.('a[href]')) {
          if(!node.dataset.fixed){
        node.dataset.fixed = true;
        attachClickListener(node);
      }
        }

        node.querySelectorAll?.('a[href]')
          .forEach(link=>{
            if(!link.dataset.fixed){
        link.dataset.fixed = true;
        attachClickListener(link);
      }
          });

      }

    }

  });

  observer.observe(root, {
    childList: true,
    subtree: true
  });

}
const URL_CACHE_PREFIX = 'urlExists:';

async function getCachedURLResult(url) {

  if (foundURLResultMemo.has(url)) {
    return foundURLResultMemo.get(url);
  }

  let stored;

  try {
    stored = await tempStorage.getItem(URL_CACHE_PREFIX + url);
  } catch {
    stored = null;
  }

  if (stored === 'true') {
    foundURLResultMemo.set(url, true);
    return true;
  }

  if (stored === 'false') {
    foundURLResultMemo.set(url, false);
    return false;
  }

  return undefined;
}

function setCachedURLResult(url, result) {

  foundURLResultMemo.set(url, result);

  // fire and forget — do NOT await
  tempStorage
    .setItem(URL_CACHE_PREFIX + url, result ? 'true' : 'false')
    .catch?.(() => {});
}


const foundURLPromiseMemo = new Map();
const foundURLResultMemo = new Map();

function foundURL(url) {

  if (foundURLPromiseMemo.has(url)) {
    return foundURLPromiseMemo.get(url);
  }

  const promise = (async () => {

    const cached = await getCachedURLResult(url);

    if (cached !== undefined) {
      return cached;
    }

    const controller = new AbortController();

    try {

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        cache: 'force-cache',
        redirect: 'follow'
      });

      controller.abort();

      const ok = response.status !== 404;

      setCachedURLResult(url, ok);

      return ok;

    } catch {

      controller.abort();

      setCachedURLResult(url, false);

      return false;
    }

  })();

  foundURLPromiseMemo.set(url, promise);

  return promise;
}

function makeAltURL(url) {

  if (!url.includes('/variables/')) {
    if (!url.includes('/interfaces/')) {
      if (!url.includes('/modules/')) {
         return null
      }
      return url.replace('/modules/', '/interfaces/');
    }
    return url.replace('/interfaces/', '/variables/');
  }

  return url.replace('/variables/', '/interfaces/');
}

function getValidNavigationURL(url) {

  return (async () => {

    if (await foundURL(url)) {
      return url;
    }

    const alt = makeAltURL(url);

    if (alt && await foundURL(alt)) {
      return alt;
    }

    return null;

  })();
}

function installIntersectionPrevalidation(root = document, debounceMs = 50) {
  const pendingURLs = new Set();
  let debounceTimer = null;

  function flush() {

    debounceTimer = null;

    for (const url of pendingURLs) {
      //(async()=>{
        [...document.querySelectorAll('a')]
        .filter(x=>(x.href == url)).forEach(async(y)=>{
          const valid = await getValidNavigationURL(url);
          if(valid){
            y.href = valid;
          }
        });
      //})();
    }

    pendingURLs.clear();
  }

  function schedule(url) {

    pendingURLs.add(url);

    if (debounceTimer !== null) return;

    debounceTimer = setTimeout(flush, debounceMs);
  }

  const observer = new IntersectionObserver(entries => {

    for (const entry of entries) {

      if (!entry.isIntersecting) continue;

      const link = entry.target;

      observer.unobserve(link);

      const url = new URL(link.href, location.href);
      if(url.origin !== location.origin)return;
      if (
        url.origin === location.origin &&
        url.pathname === location.pathname &&
        url.search === location.search
      ) continue;

      schedule(url.href);
    }

  }, {
    rootMargin: '200px'
  });

  function observeAll() {

    for (const link of root.querySelectorAll('a[href]')) {
      observer.observe(link);
    }

  }

  observeAll();

  new MutationObserver(observeAll)
    .observe(root, { childList: true, subtree: true });

}
function installSmartNavigation(root = document) {

  installPerLinkClickHandling(root);

  //installHoverPrevalidation(root);

  //installIntersectionPrevalidation(root);

}

installSmartNavigation();

[...document.querySelectorAll('code')].forEach(x=>{
x.className = 'language-js';
});

  
(async () => {
    // Core (ES module build via esm.sh)
    const Prism = (await import('https://esm.sh/prismjs@1.29.0')).default;

    // Optional: theme CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css';
    document.head.appendChild(link);

    // Load languages you need (add more as needed)
    await Promise.all([
      import('https://esm.sh/prismjs@1.29.0/components/prism-markup'),
      import('https://esm.sh/prismjs@1.29.0/components/prism-css'),
      import('https://esm.sh/prismjs@1.29.0/components/prism-javascript'),
      // e.g. Python: import('https://esm.sh/prismjs@1.29.0/components/prism-python'),
    ]);
if(globalThis.hhh)return;
    // Highlight once DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        Prism.highlightAll()
        with(window.top){
          Prism.highlightAll();
        }
      });
      
    } else {
      Prism.highlightAll();
        with(window.top){
          Prism.highlightAll();
        }
    }
  globalThis.hhh ??= true;
  })();


})();

