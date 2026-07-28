/* Kinomad prototype API.
   Stands in for the service described in BACKEND-GUIDE.md: same routes, same shapes,
   same failure codes (401 / 404 / 409 / 422 / 503). Backed by localStorage, with
   simulated latency and an injectable failure flag so the UI's loading, error and
   retry states are real rather than decorative. */
(function () {
  var K = {
    session: 'kinomad-session',
    projects: 'kinomad-projects',
    avail: 'kinomad-availability',
    bookings: 'kinomad-bookings',
  };

  function read(k, d) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (_) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return (p || 'id') + '-' + Math.random().toString(36).slice(2, 8); }
  function now() { return Date.now(); }

  var flags = { fail: false, latency: 380 };

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms == null ? flags.latency + Math.random() * 240 : ms); }); }
  function fail(status, message, extra) {
    var e = new Error(message); e.status = status;
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }
  function net() {
    return wait().then(function () {
      if (flags.fail) throw fail(503, 'Network request failed — the studio API did not respond.');
    });
  }
  function auth() {
    return net().then(function () {
      var s = read(K.session, null);
      if (!s || s.exp < now()) throw fail(401, 'Session expired. Sign in again.');
      return s;
    });
  }

  /* ---------- timezone ---------- */
  var ZONES = [
    'Asia/Dubai', 'Asia/Riyadh', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
    'Europe/London', 'Europe/Lisbon', 'Europe/Berlin', 'Europe/Paris', 'Europe/Warsaw', 'Europe/Athens',
    'Europe/Istanbul', 'Europe/Moscow', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo',
    'Australia/Sydney', 'Pacific/Auckland', 'UTC',
  ];
  function part(zone, type, style) {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: style }).formatToParts(new Date());
      for (var i = 0; i < p.length; i++) if (p[i].type === 'timeZoneName') return p[i].value;
    } catch (_) {}
    return '';
  }
  function city(zone) { return String(zone).split('/').pop().replace(/_/g, ' '); }
  function tzOffsetLabel(zone) {
    var v = part(zone, null, 'shortOffset') || part(zone, null, 'short') || 'UTC';
    return v.replace('GMT', 'UTC').replace(/^UTC$/, 'UTC+0');
  }
  function tzAbbr(zone) {
    var v = part(zone, null, 'short') || '';
    return /^GMT|^UTC|[+-]/.test(v) ? '' : v;
  }
  /* "GST (UTC+4) · Dubai" — derived, never typed by hand */
  function tzLabel(zone) {
    var ab = tzAbbr(zone), off = tzOffsetLabel(zone);
    return (ab ? ab + ' (' + off + ')' : off) + ' · ' + city(zone);
  }
  /* minutes offset of a zone at a given instant */
  function tzOffsetMin(zone, at) {
    try {
      var d = at || new Date();
      var s = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d);
      var m = s.match(/(\d+)\/(\d+)\/(\d+),?\s+(\d+):(\d+):(\d+)/);
      if (!m) return 0;
      var asUTC = Date.UTC(+m[3], +m[1] - 1, +m[2], +m[4] % 24, +m[5], +m[6]);
      return Math.round((asUTC - d.getTime()) / 60000);
    } catch (_) { return 0; }
  }

  /* ---------- availability ---------- */
  function defaultAvail() {
    return {
      types: [{ name: 'Intro call', min: 30 }, { name: 'Project deep-dive', min: 60 }],
      tz: 'Asia/Dubai',
      days: [true, true, true, true, true, false, false],
      start: '10:00', end: '18:00',
      interval: 30, buffer: 15, notice: 12,
      blocked: [],
    };
  }
  function normaliseAvail(a) {
    var d = defaultAvail(), o = Object.assign({}, d, a || {});
    if (/[()]| /.test(o.tz || '')) o.tz = 'Asia/Dubai';         // migrate old free-text label
    o.blocked = (o.blocked || []).map(function (b) {
      return typeof b === 'string' ? { from: b, to: b } : { from: b.from || '', to: b.to || b.from || '' };
    }).filter(function (b) { return b.from; });
    o.buffer = Number(o.buffer) || 0;
    return o;
  }
  function loadAvail() { return normaliseAvail(read(K.avail, null)); }

  function blockedOn(avail, iso) {
    return (avail.blocked || []).some(function (b) {
      var to = b.to || b.from;
      return iso >= b.from && iso <= to;
    });
  }

  /* Slot grid — the same computation the server must own. */
  function slotsFor(avail, iso, minutes) {
    var a = normaliseAvail(avail);
    var dt = new Date(iso + 'T00:00:00');
    var dow = (dt.getDay() + 6) % 7;
    if (!a.days[dow] || blockedOn(a, iso)) return [];
    var toMin = function (t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var s0 = toMin(a.start), e0 = toMin(a.end), step = Number(a.interval) || 30;
    var dur = (Number(minutes) || 30) + (Number(a.buffer) || 0);
    var out = [];
    for (var t = s0; t + dur <= e0; t += step) out.push(pad(Math.floor(t / 60)) + ':' + pad(t % 60));
    return out;
  }

  /* ---------- projects ---------- */
  function slugify(s) {
    return String(s || '').toLowerCase().trim()
      .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function uniqueSlug(base, all, selfId) {
    var s = base || 'project', n = 1, c = s;
    while (all.some(function (p) { return p.slug === c && p.id !== selfId; })) { n++; c = s + '-' + n; }
    return c;
  }
  function blankProject(type) {
    return {
      id: uid('draft'), slug: '', type: type || 'website', state: 'draft',
      name: '', year: '', industry: '', meta: '', statement: '', background: '', concept: '',
      hosting: 'external', liveUrl: '', fill: '#5B79A6',
      bundle: { status: 'none', name: '', message: '', url: '' },
      assets: {}, credits: [{ who: '', role: '' }], shots: [],
      position: 0, createdAt: now(), updatedAt: now(), publishedAt: 0,
    };
  }
  function allProjects() { return read(K.projects, []); }
  function saveProjects(list) { write(K.projects, list); }

  function requirements(p) {
    var need = [
      { key: 'name', label: 'Project name', ok: !!p.name },
      { key: 'year', label: 'Year', ok: /^\d{4}$/.test(String(p.year || '')) },
      { key: 'industry', label: 'Industry', ok: !!p.industry },
      { key: 'meta', label: p.type === 'website' ? 'Category' : p.type === 'brand' ? 'Deliverable' : 'Format', ok: !!p.meta },
      { key: 'statement', label: 'Statement', ok: !!p.statement },
      { key: 'copy', label: 'Background & concept', ok: !!p.background && !!p.concept },
      { key: 'credits', label: 'At least one credit', ok: (p.credits || []).some(function (c) { return c.who && c.role; }) },
    ];
    var shots = (p.shots || []).filter(function (s) { return s.img; });
    if (p.type === 'website') {
      if (p.hosting === 'hosted') need.push({ key: 'bundle', label: 'Site bundle unpacked', ok: (p.bundle || {}).status === 'ready' });
      else need.push({ key: 'liveUrl', label: 'Live website URL', ok: /^https?:\/\/\S+\.\S+/.test(p.liveUrl || '') });
      need.push({ key: 'hero', label: 'Hero image', ok: !!(p.assets || {}).hero });
    }
    if (p.type === 'brand') {
      need.push({ key: 'hero', label: 'Hero image', ok: !!(p.assets || {}).hero });
      need.push({ key: 'shots', label: 'At least one shot', ok: shots.length >= 1 });
    }
    if (p.type === 'three') {
      var reel = !!(p.assets || {}).reel;
      need.push({ key: 'shots', label: reel ? 'Shots (optional with a reel)' : 'At least one shot', ok: reel || shots.length >= 1 });
      need.push({ key: 'poster', label: reel ? 'Poster frame' : 'Poster frame (reel only)', ok: !!(p.assets || {}).poster || !reel });
      need.push({ key: 'card', label: 'Card image', ok: !!(p.assets || {}).card });
    }
    return need;
  }

  var projects = {
    list: function () {
      return auth().then(function () {
        var l = allProjects().slice().sort(function (a, b) { return (a.position - b.position) || (b.updatedAt - a.updatedAt); });
        return clone(l);
      });
    },
    get: function (id) {
      return auth().then(function () {
        var p = allProjects().filter(function (x) { return x.id === id; })[0];
        if (!p) throw fail(404, 'That project no longer exists.');
        return clone(p);
      });
    },
    create: function (body) {
      return auth().then(function () {
        var list = allProjects();
        var p = Object.assign(blankProject((body || {}).type), body || {});
        p.position = list.filter(function (x) { return x.type === p.type; }).length;
        list.push(p); saveProjects(list);
        return clone(p);
      });
    },
    patch: function (id, body) {
      return auth().then(function () {
        var list = allProjects(), i = -1;
        list.forEach(function (p, j) { if (p.id === id) i = j; });
        if (i < 0) throw fail(404, 'That project no longer exists.');
        var p = Object.assign({}, list[i], body, { updatedAt: now() });
        // slug is derived once, then frozen — it is in the public URL
        if (!p.slug && p.name) p.slug = uniqueSlug(slugify(p.name), list, p.id);
        list[i] = p; saveProjects(list);
        return clone(p);
      });
    },
    remove: function (id) {
      return auth().then(function () {
        saveProjects(allProjects().filter(function (p) { return p.id !== id; }));
        return true;
      });
    },
    publish: function (id) {
      return auth().then(function () {
        var list = allProjects(), i = -1;
        list.forEach(function (p, j) { if (p.id === id) i = j; });
        if (i < 0) throw fail(404, 'That project no longer exists.');
        var missing = requirements(list[i]).filter(function (n) { return !n.ok; })
          .map(function (n) { return { key: n.key, label: n.label }; });
        if (missing.length) throw fail(422, 'This project is not ready to publish.', { missing: missing });
        list[i] = Object.assign({}, list[i], { state: 'published', publishedAt: now(), updatedAt: now() });
        saveProjects(list);
        return clone(list[i]);
      });
    },
    unpublish: function (id) {
      return auth().then(function () {
        var list = allProjects();
        list = list.map(function (p) { return p.id === id ? Object.assign({}, p, { state: 'draft', updatedAt: now() }) : p; });
        saveProjects(list);
        return clone(list.filter(function (p) { return p.id === id; })[0]);
      });
    },
    reorder: function (type, ids) {
      return auth().then(function () {
        var list = allProjects().map(function (p) {
          var i = ids.indexOf(p.id);
          return (p.type === type && i >= 0) ? Object.assign({}, p, { position: i }) : p;
        });
        saveProjects(list);
        return true;
      });
    },
    requirements: requirements,
  };

  /* ---------- assets ---------- */
  function imageMeta(file) {
    return new Promise(function (res) {
      if (!file || !/^image\//.test(file.type)) return res({ width: 0, height: 0, url: '' });
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { res({ width: img.naturalWidth, height: img.naturalHeight, url: url }); };
      img.onerror = function () { res({ width: 0, height: 0, url: '' }); };
      img.src = url;
    });
  }
  function ticker(onProgress, ms) {
    return new Promise(function (res) {
      var t0 = performance.now();
      (function step() {
        var p = Math.min(1, (performance.now() - t0) / ms);
        if (onProgress) onProgress(p);
        if (p < 1) requestAnimationFrame(step); else res();
      })();
    });
  }

  var assets = {
    upload: function (projectId, file, onProgress) {
      return ticker(onProgress, 700 + Math.random() * 700).then(function () {
        if (flags.fail) throw fail(503, 'Upload failed — connection lost at ' + Math.round(60 + Math.random() * 30) + '%.');
        return imageMeta(file);
      }).then(function (m) {
        return { assetId: uid('as'), name: file.name, kind: /^video\//.test(file.type) ? 'video' : 'image', width: m.width, height: m.height, url: m.url, bytes: file.size };
      });
    },
  };

  /* ---------- bundle ---------- */
  var bundle = {
    upload: function (projectId, file, onProgress) {
      return ticker(onProgress, 1100 + Math.random() * 900).then(function () {
        if (flags.fail) throw fail(503, 'Upload failed — the bundle did not reach the server.');
        return { bundleId: uid('bn'), name: file.name, status: 'unpacking' };
      });
    },
    /* poll: resolves 'ready' with a demo URL, or 'error' with the reason */
    status: function (projectId, slug) {
      return wait(900).then(function () {
        if (flags.fail) return { status: 'error', message: 'Unpack failed: no index.html at the archive root.' };
        return { status: 'ready', url: 'https://demo.kinomadstudio.com/' + (slug || projectId) };
      });
    },
  };

  /* ---------- bookings ---------- */
  function loadBookings() {
    var l = read(K.bookings, null);
    if (l) return l;
    var a = loadAvail();
    var d = new Date(); var seeded = [];
    for (var i = 1; i <= 21 && seeded.length < 2; i++) {
      var t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      var iso = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
      var s = slotsFor(a, iso, 30);
      if (s.length > 4) {
        seeded.push({ id: uid('bk'), typeName: 'Intro call', startsAt: iso + 'T' + s[1], name: 'Marta Vieira', email: 'marta@northbound.co', note: 'Rebrand for a boutique hotel group, six properties.', status: 'new', at: now() - 6e6 });
        seeded.push({ id: uid('bk'), typeName: 'Project deep-dive', startsAt: iso + 'T' + s[4], name: 'Idris Kamau', email: 'idris@fold.studio', note: 'Product film plus site refresh.', status: 'confirmed', at: now() - 2e6 });
      }
    }
    write(K.bookings, seeded);
    return seeded;
  }

  var bookings = {
    list: function () {
      return auth().then(function () {
        return clone(loadBookings().slice().sort(function (a, b) { return String(a.startsAt).localeCompare(String(b.startsAt)); }));
      });
    },
    setStatus: function (id, status) {
      return auth().then(function () {
        var l = loadBookings().map(function (b) { return b.id === id ? Object.assign({}, b, { status: status }) : b; });
        write(K.bookings, l);
        return clone(l.filter(function (b) { return b.id === id; })[0]);
      });
    },
    remove: function (id) {
      return auth().then(function () {
        write(K.bookings, loadBookings().filter(function (b) { return b.id !== id; }));
        return true;
      });
    },
    /* public: taken slots for a date, in studio-local HH:MM */
    busy: function (dateIso) {
      return net().then(function () {
        return loadBookings()
          .filter(function (b) { return b.status !== 'cancelled' && String(b.startsAt).slice(0, 10) === dateIso; })
          .map(function (b) { return String(b.startsAt).slice(11, 16); });
      });
    },
    /* public: server recomputes the grid and rejects a taken slot with 409 */
    create: function (payload) {
      return net().then(function () {
        var a = loadAvail();
        var date = String(payload.startsAt).slice(0, 10), hm = String(payload.startsAt).slice(11, 16);
        var type = (a.types || []).filter(function (t) { return t.name === payload.typeName; })[0] || a.types[0];
        var grid = slotsFor(a, date, type ? type.min : 30);
        if (grid.indexOf(hm) < 0) throw fail(422, 'That time is outside the studio’s working hours.');
        var l = loadBookings();
        if (l.some(function (b) { return b.status !== 'cancelled' && b.startsAt === payload.startsAt; })) {
          throw fail(409, 'That slot was just taken by someone else.');
        }
        var rec = Object.assign({ id: uid('bk'), status: 'new', at: now() }, payload);
        l.push(rec); write(K.bookings, l);
        return clone(rec);
      });
    },
  };

  /* ---------- session ---------- */
  var session = {
    current: function () { var s = read(K.session, null); return (s && s.exp > now()) ? s : null; },
    login: function (email, password) {
      return wait(700).then(function () {
        if (flags.fail) throw fail(503, 'Could not reach the studio API. Check your connection.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) throw fail(400, 'Enter a valid email address.');
        if (!password || password.length < 4) throw fail(401, 'Email or password not recognised.');
        var s = { email: email, name: email.split('@')[0], token: uid('sess'), exp: now() + 1000 * 60 * 60 * 12 };
        write(K.session, s);
        return s;
      });
    },
    logout: function () { try { localStorage.removeItem(K.session); } catch (_) {} return Promise.resolve(true); },
  };

  var availability = {
    get: function () { return net().then(loadAvail); },
    save: function (cfg) {
      return auth().then(function () {
        var a = normaliseAvail(cfg);
        a.types = (a.types || []).filter(function (t) { return String(t.name).trim(); })
          .map(function (t) { return { name: String(t.name).trim(), min: Number(t.min) || 30 }; });
        if (!a.types.length) a.types = [{ name: 'Intro call', min: 30 }];
        write(K.avail, a);
        return a;
      });
    },
  };

  window.KMAPI = {
    flags: flags, zones: ZONES,
    tzLabel: tzLabel, tzOffsetLabel: tzOffsetLabel, tzCity: city, tzOffsetMin: tzOffsetMin,
    defaultAvail: defaultAvail, normaliseAvail: normaliseAvail, loadAvail: loadAvail,
    slotsFor: slotsFor, blockedOn: blockedOn, slugify: slugify,
    session: session, projects: projects, assets: assets, bundle: bundle,
    availability: availability, bookings: bookings,
  };
})();
