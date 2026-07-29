/* Kinomad — canonical routing.
   ────────────────────────────────────────────────────────────────────────────
   The pages link to each other by design-tool filename ("Kinomad Works.dc.html")
   because that is what opens in a design tool and in a plain file:// checkout.
   Those are not the URLs the site should ship.

   This script holds the one canonical route table and, WHEN THE PAGE IS SERVED
   FROM A REAL HOST, rewrites every internal link to the clean URL. On a filename
   URL (design tool, local checkout) it does nothing at all, so both worlds work
   from a single source.

   nginx serves both forms, so if this script fails to load the links still
   resolve — they are just ugly. Nothing depends on it for correctness.

   When the backend renders project pages server-side, delete the rewriting and
   author the clean hrefs directly. Keep the table.                            */
(function () {
  'use strict';

  /* filename → clean path. The public URL contract, in one place. */
  var ROUTES = {
    'Kinomad Landing.dc.html': '/',
    'Kinomad Works.dc.html': '/works',
    'Kinomad Website Page.dc.html': '/website',
    'Kinomad Brand Page.dc.html': '/brand',
    'Kinomad Motion Page.dc.html': '/motion',
    'Kinomad Privacy.dc.html': '/privacy',
    'Kinomad 404.dc.html': '/404',
    'Kinomad CRM.dc.html': '/admin',
    'Kinomad CRM Sign In.dc.html': '/admin/login',
  };

  /* Detail pages carry ?project=<slug>. Deployed, that becomes a path segment:
     "Kinomad Brand Page.dc.html?project=aurelia" → "/brand/aurelia". The type
     prefix is what lets nginx pick the right template with no backend; once the
     API renders per-slug pages these can collapse to /works/<slug> with 301s. */
  var TYPED = { '/website': 1, '/brand': 1, '/motion': 1 };

  /* Deployed = the URL is not a .dc.html file. */
  function deployed() {
    return !/\.dc\.html$/i.test(location.pathname) && location.protocol !== 'file:';
  }

  /* "Kinomad Works.dc.html#studio" → "/works#studio" */
  function clean(href) {
    if (!href) return href;
    if (/^(https?:|mailto:|tel:|#|\/|data:)/i.test(href)) return href;

    var hash = '', query = '';
    var i = href.indexOf('#');
    if (i >= 0) { hash = href.slice(i); href = href.slice(0, i); }
    i = href.indexOf('?');
    if (i >= 0) { query = href.slice(i + 1); href = href.slice(0, i); }

    var file = href.replace(/^\.\//, '');
    var base = ROUTES[decodeURIComponent(file)];
    if (!base) return null;

    if (query && TYPED[base]) {
      var m = /(?:^|&)project=([^&]*)/.exec(query);
      if (m && m[1]) {
        var slug = decodeURIComponent(m[1]);
        var rest = query.replace(/(?:^|&)project=[^&]*/, '').replace(/^&/, '');
        return base + '/' + encodeURIComponent(slug) + (rest ? '?' + rest : '') + hash;
      }
    }
    return base + (query ? '?' + query : '') + hash;
  }

  /* Resolve a target for a scripted navigation. Safe in both worlds. */
  function href(file, slug) {
    if (!deployed()) return file + (slug ? '?project=' + encodeURIComponent(slug) : '');
    return clean(file + (slug ? '?project=' + encodeURIComponent(slug) : '')) || file;
  }
  function go(file, slug) { location.href = href(file, slug); }

  /* Deployed detail pages read the slug from the path, not the query string. */
  function slug() {
    var q = new URLSearchParams(location.search).get('project');
    if (q) return q;
    var m = /^\/(?:website|brand|motion)\/([^/?#]+)/.exec(location.pathname);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function rewrite(root) {
    var links = (root || document).querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.dataset.kmRouted) continue;
      var to = clean(a.getAttribute('href'));
      if (to) { a.setAttribute('href', to); a.dataset.kmRouted = '1'; }
    }
  }

  function canonical() {
    var base = ROUTES[decodeURIComponent(location.pathname.split('/').pop())];
    var path = base || location.pathname;
    var tag = document.querySelector('link[rel="canonical"]');
    if (!tag) { tag = document.createElement('link'); tag.rel = 'canonical'; document.head.appendChild(tag); }
    tag.href = location.origin + path;
  }

  function start() {
    if (!deployed()) return;
    canonical();
    rewrite(document);
    /* The pages re-render as their components update, so keep watching. */
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes && muts[i].addedNodes.length) { rewrite(document); return; }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  window.KMROUTES = { routes: ROUTES, clean: clean, href: href, go: go, slug: slug, deployed: deployed, rewrite: rewrite };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
