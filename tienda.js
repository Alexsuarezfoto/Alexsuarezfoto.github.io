/* Tienda de fotos: sesiones.html (listado y galería de cada sesión) y pedido.html (carrito, datos y pago).
   Qué hace, en corto:
   - Lee sesiones/sesiones.json (precios, modo de pago y lista de sesiones) y sesiones/ID/fotos.json (medidas de cada foto).
   - Las fotos elegidas se guardan en el navegador del visitante (localStorage, clave "carrito"): es lo mínimo necesario para que
     funcione el carrito. No se guarda nada personal ahí.
   - Precio = según cuántas fotos hay en el pedido (tramos). Si una sesión tiene "completa", nunca se paga más que ese precio.
   - Pago: en modo "demo" no se cobra ni se envía nada. En modo "enlace" el pedido te llega por correo (Web3Forms, el mismo que el
     formulario de contacto) y el comprador pasa a la página de pago de Stripe o PayPal. En esta web NO se carga ningún script de pago.
     En modo "manual" el pedido te llega igual por correo, pero no hay redirección: la web muestra al cliente tu número de Bizum
     (constante BIZUM, arriba), el importe y el código del pedido como concepto; tú envías las fotos cuando veas el Bizum.
   - "fotosBase" (en sesiones.json > config): carpeta o dirección donde están las fotos, si no están junto a la web (p. ej. "fotos/").
   Todo está escrito sin dependencias, para que funcione también en los navegadores internos (Instagram, etc.). */
(function () {
  'use strict';

  var CATALOG = 'sesiones/sesiones.json';
  var K_CART = 'carrito', K_LAST = 'ultimoPedido', K_LANG = 'idioma';
  var MAIL = 'fotoalex.raw@gmail.com', WA = '34639762752', BIZUM = '639 762 752';
  var W3F = { url: 'https://api.web3forms.com/submit', key: '7febc7c0-d3ac-42be-8892-b76277c08562', wait: 25000 };
  var PAY_OK = /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com|(www\.)?paypal\.com|(www\.)?paypal\.me)\//i;
  var PAGE = document.body.getAttribute('data-page');
  var root = document.documentElement;

  /* ---------- Textos ---------- */
  var STR = {
    es: {
      title_sesiones: 'Sesiones · Alex Suárez', title_pedido: 'Tu pedido · Alex Suárez',
      cart: 'Carrito', sessions: 'Sesiones', allSessions: 'Todas las sesiones', sample: 'Ejemplo',
      h1List: 'Sesiones', leadList: 'Encuentra la sesión en la que saliste, elige tus fotos y recíbelas en alta resolución y sin marca de agua.',
      how1: 'Elige tu sesión', how1t: 'Busca el día y el lugar en el que saliste.',
      how2: 'Selecciona tus fotos', how2t: 'Pulsa el círculo de cada foto para añadirla al carrito.',
      how3: 'Paga y recíbelas', how3t: 'Te las envío por correo, sin marca de agua y a tamaño completo.',
      emptyT: 'Aún no hay sesiones publicadas', emptyP: 'Vuelve pronto. Si estuve fotografiándote y quieres tus fotos, escríbeme.', emptyBtn: 'Escríbeme',
      notFound: 'No encuentro esa sesión', notFoundP: 'Puede que el enlace esté mal o que la sesión ya no esté disponible.',
      loadErr: 'No se han podido cargar las sesiones', loadErrP: 'Comprueba tu conexión e inténtalo de nuevo.', retry: 'Reintentar',
      photo1: '1 foto', photoN: '{n} fotos', priceTitle: 'Precio por foto, IVA incluido',
      tier: '{a} · {p}', tierRange: '{a}–{b} fotos', tierRange1: '{a} foto', tierMore: '{a} o más fotos', sessionFull: 'Toda la sesión · {p}',
      selectAll: 'Seleccionar todas', clearAll: 'Quitar todas', selected: '{n} elegidas',
      add: 'Añadir al carrito', remove: 'Quitar del carrito', addX: 'Añadir {c} al carrito', removeX: 'Quitar {c} del carrito', open: 'Ver {c} en grande',
      barSum: '{t}', barSub: '{n} · IVA incluido', barGo: 'Ver pedido', barClear: 'Vaciar',
      prev: 'Anterior', next: 'Siguiente', close: 'Cerrar', viewer: 'Visor de fotos', lbHint: 'Las fotos que recibas no llevan marca de agua.',
      h1Order: 'Tu pedido', emptyOrder: 'Tu carrito está vacío', emptyOrderP: 'Elige tus fotos en una sesión y vuelve aquí para terminar el pedido.', goSessions: 'Ver sesiones',
      session: 'Sesión', removeGroup: 'Quitar todas', removeOne: 'Quitar {c}',
      summary: 'Resumen', lineEach: '{n} × {u}', lineFull: 'Toda la sesión «{s}» ({n} fotos)', totalLbl: 'Total (IVA incluido)',
      hintNext: 'Con {m} fotos pagas {u} por foto.', hintFull: 'En esta sesión ya pagas el precio de sesión completa: te envío todas las fotos de la sesión.',
      demo: 'Modo demostración: no se cobra nada ni se envía ningún pedido. Sirve para probar cómo funcionará la tienda.',
      errName: 'Escribe tu nombre.', errEmail: 'Escribe un correo válido.', errEmail2: 'Los dos correos tienen que ser iguales.',
      errTerms: 'Para continuar, acepta las condiciones y la política de privacidad.', errDigital: 'Necesito tu confirmación para enviarte las fotos en cuanto se confirme el pago.',
      sending: 'Enviando tu pedido…', fail: 'No hemos podido registrar tu pedido, así que no te llevo al pago. Inténtalo de nuevo o escríbeme a', unsure: 'No hemos podido confirmar que el pedido se haya registrado, así que no te llevo al pago. Inténtalo de nuevo o escríbeme a',
      noPay: 'La tienda aún no está abierta para pagos. Escríbeme y lo resolvemos.', redirecting: 'Pedido registrado. Te llevo a la página de pago…', or: ' o por ',
      payBtn: 'Pedido con obligación de pago',
      demoT: 'Pedido de prueba', demoP: 'Esto es una demostración: no se ha cobrado nada ni se ha enviado ningún pedido. Así se verá el último paso cuando la tienda esté abierta.',
      paidT: 'Gracias por tu pedido', paidP: 'Si has completado el pago, recibirás las fotos por correo electrónico en un máximo de {h} horas. Si no las ves, mira la carpeta de spam o escríbeme a',
      goPay: 'Ir a la página de pago', back: 'Volver a las sesiones', refLbl: 'Pedido',
      factsWhat: 'Qué recibes', factsWhatT: 'Las fotos que elijas, en alta resolución (JPG) y sin marca de agua.',
      factsWhen: 'Cuándo', factsWhenT: 'Por correo electrónico, en un máximo de {h} horas desde que se confirme el pago.',
      factsUse: 'Uso', factsUseT: 'Personal y no comercial. Si necesitas otro uso, escríbeme antes.',
      factsPay: 'Pago', factsPayT: 'Con {m} en la página segura de {p}. Yo no veo ni guardo los datos de tu tarjeta.', payM0: 'tarjeta, Apple Pay o Google Pay', payM1: 'tarjeta, Apple Pay, Google Pay o Bizum',
      waLead: '¿Prefieres hablarlo por WhatsApp?', waBtn: 'Escríbeme por WhatsApp', waCart: 'Hola Alex, quiero estas fotos: {c}.', waMany: 'Hola Alex, quiero {n} fotos de tu web (te paso los números a continuación).', waDone: 'Hola Alex, acabo de hacer el pedido {r} en tu web.',
      factsPayM: 'Por Bizum al 639 762 752. Al enviar el pedido verás el importe exacto y el concepto que tienes que poner. En esta web no se cobra nada.', paySmallM: 'Después de enviar el pedido pagas por Bizum.',
      manualT: 'Pedido recibido', manualP: 'Haz ahora el pago por Bizum con los datos de abajo. En cuanto lo vea, te envío las fotos por correo a {e} en un máximo de {h} horas. Si no te llegan, mira la carpeta de spam o escríbeme a',
      bizumTo: 'Bizum al', bizumAmt: 'Importe', bizumConcept: 'Concepto', bizumCopy: 'Copiar número', bizumCopied: 'Número copiado', bizumAlt: 'Si no puedes pagar por Bizum, escríbeme por WhatsApp y vemos otra forma.',
      factsWith: 'Desistimiento', factsWithT: 'Al pedir la entrega inmediata de contenido digital pierdes el derecho de desistimiento (14 días). Está explicado en las condiciones de venta.'
    },
    en: {
      title_sesiones: 'Sessions · Alex Suárez', title_pedido: 'Your order · Alex Suárez',
      cart: 'Cart', sessions: 'Sessions', allSessions: 'All sessions', sample: 'Sample',
      h1List: 'Sessions', leadList: 'Find the session you were in, choose your photos and get them in full resolution, without a watermark.',
      how1: 'Pick your session', how1t: 'Look for the day and place where you were shot.',
      how2: 'Select your photos', how2t: 'Tap the circle on each photo to add it to your cart.',
      how3: 'Pay and receive them', how3t: 'I email them to you at full size and without a watermark.',
      emptyT: 'No sessions published yet', emptyP: 'Check back soon. If I photographed you and you want your photos, write to me.', emptyBtn: 'Write to me',
      notFound: 'I can’t find that session', notFoundP: 'The link may be wrong or the session may no longer be available.',
      loadErr: 'The sessions could not be loaded', loadErrP: 'Check your connection and try again.', retry: 'Try again',
      photo1: '1 photo', photoN: '{n} photos', priceTitle: 'Price per photo, VAT included',
      tier: '{a} · {p}', tierRange: '{a}–{b} photos', tierRange1: '{a} photo', tierMore: '{a} or more photos', sessionFull: 'Whole session · {p}',
      selectAll: 'Select all', clearAll: 'Remove all', selected: '{n} selected',
      add: 'Add to cart', remove: 'Remove from cart', addX: 'Add {c} to cart', removeX: 'Remove {c} from cart', open: 'View {c} larger',
      barSum: '{t}', barSub: '{n} · VAT included', barGo: 'View order', barClear: 'Clear',
      prev: 'Previous', next: 'Next', close: 'Close', viewer: 'Photo viewer', lbHint: 'The photos you receive have no watermark.',
      h1Order: 'Your order', emptyOrder: 'Your cart is empty', emptyOrderP: 'Choose your photos in a session and come back here to finish your order.', goSessions: 'See sessions',
      session: 'Session', removeGroup: 'Remove all', removeOne: 'Remove {c}',
      summary: 'Summary', lineEach: '{n} × {u}', lineFull: 'Whole session “{s}” ({n} photos)', totalLbl: 'Total (VAT included)',
      hintNext: 'With {m} photos you pay {u} per photo.', hintFull: 'You already pay the whole-session price for this session: I send you every photo from it.',
      demo: 'Demo mode: nothing is charged and no order is sent. It is only for trying out how the shop will work.',
      errName: 'Please enter your name.', errEmail: 'Please enter a valid email address.', errEmail2: 'The two email addresses must match.',
      errTerms: 'To continue, please accept the terms of sale and the privacy policy.', errDigital: 'I need your confirmation to send you the photos as soon as the payment is confirmed.',
      sending: 'Sending your order…', fail: 'We could not register your order, so I am not taking you to payment. Try again or write to me at', unsure: 'We could not confirm that your order was registered, so I am not taking you to payment. Try again or write to me at',
      noPay: 'The shop is not open for payments yet. Write to me and we will sort it out.', redirecting: 'Order registered. Taking you to the payment page…', or: ' or on ',
      payBtn: 'Order with obligation to pay',
      demoT: 'Test order', demoP: 'This is a demo: nothing has been charged and no order has been sent. This is how the last step will look when the shop is open.',
      paidT: 'Thank you for your order', paidP: 'If you completed the payment, you will receive the photos by email within {h} hours at most. If you do not see them, check your spam folder or write to me at',
      goPay: 'Go to the payment page', back: 'Back to sessions', refLbl: 'Order',
      factsWhat: 'What you get', factsWhatT: 'The photos you choose, in full resolution (JPG) and without a watermark.',
      factsWhen: 'When', factsWhenT: 'By email, within {h} hours at most from the moment the payment is confirmed.',
      factsUse: 'Use', factsUseT: 'Personal and non-commercial. If you need another use, write to me first.',
      factsPay: 'Payment', factsPayT: 'By {m} on {p}’s secure page. I never see or store your card details.', payM0: 'card, Apple Pay or Google Pay', payM1: 'card, Apple Pay, Google Pay or Bizum',
      waLead: 'Prefer to talk it over on WhatsApp?', waBtn: 'Message me on WhatsApp', waCart: 'Hi Alex, I would like these photos: {c}.', waMany: 'Hi Alex, I would like {n} photos from your website (I will send you the numbers next).', waDone: 'Hi Alex, I have just placed order {r} on your website.',
      factsPayM: 'By Bizum to 639 762 752. When you send the order you will see the exact amount and the reference to include. Nothing is charged on this website.', paySmallM: 'After you send the order you pay by Bizum.',
      manualT: 'Order received', manualP: 'Now make the payment by Bizum using the details below. As soon as I see it, I will email the photos to {e} within {h} hours at most. If they do not arrive, check your spam folder or write to me at',
      bizumTo: 'Bizum to', bizumAmt: 'Amount', bizumConcept: 'Reference', bizumCopy: 'Copy number', bizumCopied: 'Number copied', bizumAlt: 'Cannot use Bizum? Message me on WhatsApp and we will find another way.',
      factsWith: 'Right of withdrawal', factsWithT: 'By asking for immediate delivery of digital content you lose the right of withdrawal (14 days). It is explained in the terms of sale.'
    }
  };
  var lang = 'es';
  function T(k, o) {
    var s = (STR[lang] && STR[lang][k]) || STR.es[k] || k;
    if (o) for (var p in o) if (Object.prototype.hasOwnProperty.call(o, p)) s = s.split('{' + p + '}').join(o[p]);
    return s;
  }
  function savedLang() { try { return localStorage.getItem(K_LANG); } catch (e) { return null; } }
  function firstLang() {
    var q = (location.search.match(/[?&]lang=(es|en)\b/) || [])[1]; if (q) return q;
    var s = savedLang(); if (s === 'es' || s === 'en') return s;
    return /^en\b/i.test(navigator.language || '') ? 'en' : 'es';
  }

  /* ---------- Utilidades ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag), k;
    if (attrs) for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null && attrs[k] !== false) {
      if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    if (kids) (kids.push ? kids : [kids]).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function pad(n) { return n < 1000 ? ('000' + n).slice(-3) : String(n); }
  function cents(x) { return Math.round(Number(x) * 100); }
  var nf = {};
  function money(c, short) {
    var loc = lang === 'en' ? 'en-IE' : 'es-ES', key = loc + (short ? 's' : 'l');
    if (!nf[key]) { try { nf[key] = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', minimumFractionDigits: short ? 0 : 2, maximumFractionDigits: 2 }); } catch (e) { nf[key] = null; } }
    var v = c / 100;
    if (short && c % 100 !== 0) { try { return new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' }).format(v); } catch (e) {} }
    return nf[key] ? nf[key].format(v) : v.toFixed(2) + ' €';
  }
  function photosText(n) { return n === 1 ? T('photo1') : T('photoN', { n: n }); }
  function dateText(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); if (!m) return '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    try { return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return iso; }
  }
  function titleOf(s) { return (s.titulo && (s.titulo[lang] || s.titulo.es)) || s.id; }
  function codeOf(s, n) { return s.codigo + '-' + pad(n); }
  function loadJSON(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }); }
  function track(name, data) { try { if (window.umami && window.umami.track) window.umami.track(name, data); } catch (e) {} }
  function svgIcon(path) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', path); s.appendChild(p); return s; }

  /* ---------- Carrito (localStorage; si el navegador no lo permite, en memoria) ---------- */
  var mem = [];
  var cart = {
    list: function () {
      var a;
      try { a = JSON.parse(localStorage.getItem(K_CART) || '[]'); } catch (e) { a = mem; }
      return (a && a.push ? a : []).filter(function (x) { return /^[a-z0-9-]+:\d{1,5}$/.test(x); });
    },
    save: function (a) {
      mem = a;
      try { if (a.length) localStorage.setItem(K_CART, JSON.stringify(a)); else localStorage.removeItem(K_CART); } catch (e) {}
      var ev; try { ev = new Event('cartchange'); } catch (e2) { ev = document.createEvent('Event'); ev.initEvent('cartchange', true, true); }
      document.dispatchEvent(ev);
    },
    key: function (id, n) { return id + ':' + n; },
    has: function (id, n) { return cart.list().indexOf(cart.key(id, n)) > -1; },
    add: function (id, n) { var a = cart.list(), k = cart.key(id, n); if (a.indexOf(k) < 0) { a.push(k); cart.save(a); } },
    del: function (id, n) { var k = cart.key(id, n); cart.save(cart.list().filter(function (x) { return x !== k; })); },
    toggle: function (id, n) { if (cart.has(id, n)) { cart.del(id, n); return false; } cart.add(id, n); return true; },
    addMany: function (id, ns) { var a = cart.list(); ns.forEach(function (n) { var k = cart.key(id, n); if (a.indexOf(k) < 0) a.push(k); }); cart.save(a); },
    delSession: function (id) { cart.save(cart.list().filter(function (x) { return x.split(':')[0] !== id; })); },
    clear: function () { cart.save([]); }
  };
  /* Lista del carrito ya comprobada contra el catálogo: [{s: sesión, n: número}] sin fotos que ya no existan */
  function cartItems(cat) {
    var by = {}; cat.sesiones.forEach(function (s) { by[s.id] = s; });
    var raw = cart.list(), ok = raw.filter(function (x) {
      var p = x.split(':'), s = by[p[0]], n = +p[1]; return s && n >= 1 && n <= s.fotos;
    });
    if (ok.length !== raw.length) cart.save(ok);
    return ok.map(function (x) { var p = x.split(':'); return { s: by[p[0]], n: +p[1] }; });
  }

  /* ---------- Precio ---------- */
  function tiers(cat) {
    var t = (cat.config && cat.config.tramos || []).map(function (x) { return { min: +x.min, c: cents(x.precio) }; }).filter(function (x) { return x.min >= 1 && x.c >= 0; });
    if (!t.length) t = [{ min: 1, c: 1000 }];
    t.sort(function (a, b) { return a.min - b.min; });
    if (t[0].min !== 1) t.unshift({ min: 1, c: t[0].c });
    return t;
  }
  function unitCents(count, t) { var c = t[0].c; t.forEach(function (x) { if (count >= x.min) c = x.c; }); return c; }
  /* Devuelve {count, unit, lines:[{s, n, cost, full}], total, next:{m, c}|null}. Todo en céntimos. */
  function quote(items, cat) {
    var t = tiers(cat), count = items.length, out = { count: count, unit: 0, lines: [], total: 0, next: null, anyFull: false };
    if (!count) return out;
    out.unit = unitCents(count, t);
    var order = [], by = {};
    items.forEach(function (it) { if (!by[it.s.id]) { by[it.s.id] = { s: it.s, n: 0 }; order.push(by[it.s.id]); } by[it.s.id].n++; });
    order.forEach(function (g) {
      var cost = g.n * out.unit, full = false, cap = g.s.completa && g.s.completa.precio != null ? cents(g.s.completa.precio) : null;
      if (cap != null && cost >= cap) { cost = cap; full = true; out.anyFull = true; }
      out.lines.push({ s: g.s, n: g.n, cost: cost, full: full });
      out.total += cost;
    });
    for (var i = 0; i < t.length; i++) if (t[i].min > count) { if (t[i].c < out.unit) out.next = { m: t[i].min, c: t[i].c }; break; }
    return out;
  }

  /* ---------- Estado de la página ---------- */
  var cat = null, view = null;
  /* Dónde están las fotos: normalmente en esta misma web; si en sesiones.json > config > fotosBase hay una ruta (ej. "fotos/"), se cargan de ahí. */
  function fp(path) { var b = cat && cat.config && cat.config.fotosBase; return (typeof b === 'string' ? b : '') + path; }

  /* ---------- Idioma ---------- */
  var ATTRS = ['aria-label', 'alt', 'placeholder', 'title'];
  function applyStatic(scope) {
    var en = lang === 'en', sel = '[data-en]' + ATTRS.map(function (a) { return ',[data-en-' + a + ']'; }).join('');
    Array.prototype.forEach.call((scope || document).querySelectorAll(sel), function (e) {
      if (e.hasAttribute('data-en')) { if (!e.hasAttribute('data-es')) e.setAttribute('data-es', e.innerHTML); e.innerHTML = en ? e.getAttribute('data-en') : e.getAttribute('data-es'); }
      ATTRS.forEach(function (a) {
        var k = 'data-en-' + a; if (!e.hasAttribute(k)) return;
        if (!e.hasAttribute('data-es-' + a)) e.setAttribute('data-es-' + a, e.getAttribute(a) || '');
        e.setAttribute(a, en ? e.getAttribute(k) : e.getAttribute('data-es-' + a));
      });
    });
  }
  function setLang(l, remember) {
    if (l !== 'es' && l !== 'en') return;
    lang = l; root.lang = l; applyStatic();
    Array.prototype.forEach.call(document.querySelectorAll('.lang button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lang') === l ? 'true' : 'false'); });
    if (remember) { try { localStorage.setItem(K_LANG, l); } catch (e) {} }
    document.title = T('title_' + PAGE);
    if (view) view();
    refreshCartUI();
  }

  /* ---------- Cabecera y barra de pedido ---------- */
  function refreshCartUI() {
    var n = cat ? cartItems(cat).length : cart.list().length;
    var b = $('cart-n'); if (b) { b.textContent = n; b.hidden = !n; }
    var cb = $('cart-btn'); if (cb) cb.setAttribute('aria-label', T('cart') + (n ? ' (' + photosText(n) + ')' : ''));
    var bar = $('cartbar');
    if (bar) {
      var q = cat ? quote(cartItems(cat), cat) : { count: 0, total: 0 };
      bar.hidden = !q.count; document.body.classList.toggle('has-cartbar', !!q.count);
      if (q.count) {
        $('cb-sum').textContent = T('barSum', { t: money(q.total) });
        $('cb-sub').textContent = T('barSub', { n: photosText(q.count) });
        $('cb-go').textContent = T('barGo'); $('cb-clear').textContent = T('barClear');
      }
    }
  }

  /* ================= SESIONES ================= */
  var lb = { open: false, idx: 0, ses: null, dims: [], opener: null };

  function msgBlock(h, p, btnText, href, onClick) {
    var box = el('div', { 'class': 'empty' }, [el('h2', { text: h }), el('p', { text: p })]);
    if (btnText) { var b = el(href ? 'a' : 'button', { 'class': 'btn solid', text: btnText, href: href || null, type: href ? null : 'button' }); if (onClick) b.addEventListener('click', onClick); box.appendChild(b); }
    return box;
  }
  function tierChips(cat, ses) {
    var t = tiers(cat), ul = el('ul', { 'class': 'prices', 'aria-label': T('priceTitle') });
    t.forEach(function (x, i) {
      var next = t[i + 1], range;
      if (!next) range = T('tierMore', { a: x.min });
      else if (next.min - 1 === x.min) range = photosText(x.min);
      else range = T('tierRange', { a: x.min, b: next.min - 1 });
      ul.appendChild(el('li', null, [range + ' · ', el('b', { text: money(x.c, true) })]));
    });
    if (ses && ses.completa && ses.completa.precio != null) ul.appendChild(el('li', null, [el('b', { text: T('sessionFull', { p: money(cents(ses.completa.precio), true) }) })]));
    return ul;
  }

  function viewList() {
    var v = $('view'); clear(v);
    var list = cat.sesiones.filter(function (s) { return s.listada !== false; });
    v.appendChild(el('div', { 'class': 'shop-head' }, [el('h1', { text: T('h1List') }), el('p', { 'class': 'lead', text: T('leadList') }), tierChips(cat)]));
    var how = el('ol', { 'class': 'how' });
    [1, 2, 3].forEach(function (i) { how.appendChild(el('li', null, [el('b', { text: T('how' + i) }), T('how' + i + 't')])); });
    v.appendChild(how);
    if (!list.length) {
      v.appendChild(msgBlock(T('emptyT'), T('emptyP'), T('emptyBtn'), 'index.html#contacto'));
      return;
    }
    var grid = el('div', { 'class': 'ses-grid' });
    list.forEach(function (s) {
      var cover = s.portada || 1, a = el('a', { 'class': 'ses', href: 'sesiones.html?s=' + encodeURIComponent(s.id) });
      var pic = el('div', { 'class': 'pic' }, [el('img', { src: fp('sesiones/' + s.id + '/t-' + pad(cover) + '.jpg'), alt: '', loading: 'lazy', decoding: 'async', width: 640, height: 480 })]);
      if (s.demo) pic.appendChild(el('span', { 'class': 'chip', text: T('sample') }));
      a.appendChild(pic);
      a.appendChild(el('h3', { text: titleOf(s) }));
      a.appendChild(el('p', { text: [dateText(s.fecha), s.lugar, photosText(s.fotos)].filter(Boolean).join(' · ') }));
      grid.appendChild(a);
    });
    v.appendChild(grid);
  }

  function setSelButton(b, on, code) {
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', T(on ? 'removeX' : 'addX', { c: code }));
  }
  function viewSession(ses, dims) {
    var v = $('view'); clear(v);
    document.title = titleOf(ses) + ' · Alex Suárez';
    v.appendChild(el('a', { 'class': 'crumb', href: 'sesiones.html' }, ['← ' + T('allSessions')]));
    var meta = el('div', { 'class': 'meta' }, [dateText(ses.fecha), ses.lugar, photosText(ses.fotos)].filter(Boolean).map(function (x) { return el('span', { text: x }); }));
    v.appendChild(el('div', { 'class': 'shop-head' }, [el('h1', { text: titleOf(ses) }), meta, tierChips(cat, ses)]));

    var tools = el('div', { 'class': 'tools' });
    var all = el('button', { 'class': 'btn sm', type: 'button' });
    var count = el('span', { 'class': 'muted', 'aria-live': 'polite' });
    tools.appendChild(all); tools.appendChild(count);
    v.appendChild(tools);

    var grid = el('div', { 'class': 'gal' }), btns = [], figs = [];
    for (var n = 1; n <= ses.fotos; n++) (function (n) {
      var code = codeOf(ses, n), d = dims[n - 1] || [640, 480];
      var fig = el('figure', { 'class': 'ph' });
      var ratio = d[1] ? d[0] / d[1] : 1.5;
      fig.style.flexGrow = String(Math.round(ratio * 100)); fig.style.setProperty('--r', String(ratio));
      var open =el('button', { 'class': 'ph-open', type: 'button', 'aria-label': T('open', { c: code }) }, [el('img', { src: fp('sesiones/' + ses.id + '/t-' + pad(n) + '.jpg'), alt: code, width: d[0], height: d[1], loading: n > 8 ? 'lazy' : 'eager', decoding: 'async' })]);
      var sel = el('button', { 'class': 'ph-sel', type: 'button' }, [el('i', null, [])]);
      var ic = sel.firstChild; ic.appendChild(svgIcon('M12 5v14M5 12h14')); ic.firstChild.setAttribute('class', 'plus'); var tk = svgIcon('M5 12.5l4.5 4.5L19 7.5'); tk.setAttribute('class', 'tick'); ic.appendChild(tk);
      setSelButton(sel, cart.has(ses.id, n), code);
      fig.classList.toggle('is-sel', cart.has(ses.id, n));
      fig.appendChild(open); fig.appendChild(sel); fig.appendChild(el('span', { 'class': 'ph-code', text: code }));
      open.addEventListener('click', function () { openLB(ses, dims, n - 1, open); });
      sel.addEventListener('click', function () {
        var on = cart.toggle(ses.id, n); if (on) track('Foto añadida', { sesion: ses.id });
      });
      grid.appendChild(fig); btns.push(sel); figs.push(fig);
    })(n);
    v.appendChild(grid);

    function sync() {
      var chosen = 0;
      btns.forEach(function (b, i) { var on = cart.has(ses.id, i + 1); if (on) chosen++; setSelButton(b, on, codeOf(ses, i + 1)); figs[i].classList.toggle('is-sel', on); });
      all.textContent = chosen === ses.fotos ? T('clearAll') : T('selectAll');
      count.textContent = chosen ? T('selected', { n: chosen }) : '';
      if (lb.open && lb.ses === ses) updateLB();
    }
    all.addEventListener('click', function () {
      var ns = []; for (var i = 1; i <= ses.fotos; i++) ns.push(i);
      if (all.textContent === T('clearAll')) cart.delSession(ses.id); else { cart.addMany(ses.id, ns); track('Sesión completa elegida', { sesion: ses.id }); }
    });
    sync();
    viewSession.sync = sync;
  }

  /* Visor */
  function openLB(ses, dims, i, opener) {
    lb.open = true; lb.ses = ses; lb.dims = dims; lb.idx = i; lb.opener = opener || null;
    $('lb').hidden = false; root.style.overflow = 'hidden';
    updateLB(); try { $('lb-close').focus(); } catch (e) {}
  }
  function closeLB() {
    if (!lb.open) return; lb.open = false; $('lb').hidden = true; root.style.overflow = '';
    try { if (lb.opener) lb.opener.focus(); } catch (e) {}
  }
  function stepLB(d) { var n = lb.ses.fotos; lb.idx = (lb.idx + d + n) % n; updateLB(); }
  function updateLB() {
    var ses = lb.ses, n = lb.idx + 1, code = codeOf(ses, n), img = $('lb-img');
    img.style.opacity = '.35';
    img.onload = function () { img.style.opacity = '1'; };
    img.onerror = function () { img.style.opacity = '1'; };
    img.src = fp('sesiones/' + ses.id + '/p-' + pad(n) + '.jpg'); img.alt = code;
    $('lb-code').textContent = code + ' · ' + n + '/' + ses.fotos;
    var on = cart.has(ses.id, n), b = $('lb-toggle');
    b.textContent = on ? T('remove') : T('add'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('lb-hint').textContent = T('lbHint');
    $('lb-prev').setAttribute('aria-label', T('prev')); $('lb-next').setAttribute('aria-label', T('next')); $('lb-close').textContent = T('close') + ' ×';
    $('lb').setAttribute('aria-label', T('viewer'));
    [lb.idx + 1, lb.idx - 1].forEach(function (j) { var k = ((j % ses.fotos) + ses.fotos) % ses.fotos + 1; var p = new Image(); p.src = fp('sesiones/' + ses.id + '/p-' + pad(k) + '.jpg'); });
  }
  function initLB() {
    var box = $('lb'); if (!box) return;
    $('lb-close').addEventListener('click', closeLB);
    $('lb-prev').addEventListener('click', function () { stepLB(-1); });
    $('lb-next').addEventListener('click', function () { stepLB(1); });
    $('lb-toggle').addEventListener('click', function () {
      var on = cart.toggle(lb.ses.id, lb.idx + 1); if (on) track('Foto añadida', { sesion: lb.ses.id });
    });
    box.addEventListener('click', function (e) { if (e.target === box || e.target === $('lb-stage')) closeLB(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.open) return;
      if (e.key === 'Escape') { e.preventDefault(); closeLB(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLB(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepLB(1); }
      else if (e.key === 'Tab') {
        var f = [$('lb-close'), $('lb-prev'), $('lb-next'), $('lb-toggle')], i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    var x0 = null, st = $('lb-stage');
    st.addEventListener('touchstart', function (e) { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    st.addEventListener('touchend', function (e) {
      if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) stepLB(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  function pageSesiones() {
    var id = (location.search.match(/[?&]s=([a-z0-9-]+)/i) || [])[1];
    initLB();
    $('cb-go').addEventListener('click', function () { track('Pedido abierto'); location.href = 'pedido.html'; });
    $('cb-clear').addEventListener('click', function () { cart.clear(); });
    document.addEventListener('cartchange', function () { refreshCartUI(); if (viewSession.sync && id) viewSession.sync(); });
    window.addEventListener('storage', function (e) { if (e.key === K_CART) { refreshCartUI(); if (viewSession.sync && id) viewSession.sync(); } });
    if (!id) { view = viewList; viewList(); refreshCartUI(); return; }
    var ses = null; cat.sesiones.forEach(function (s) { if (s.id === id) ses = s; });
    if (!ses) { view = function () { var v = $('view'); clear(v); v.appendChild(msgBlock(T('notFound'), T('notFoundP'), T('allSessions'), 'sesiones.html')); }; view(); return; }
    loadJSON(fp('sesiones/' + ses.id + '/fotos.json')).catch(function () { return []; }).then(function (dims) {
      view = function () { viewSession(ses, dims); };
      view(); refreshCartUI(); track('Sesión abierta', { sesion: ses.id });
    });
  }

  /* ================= PEDIDO ================= */
  var order = { busy: false };
  function payCfg() { return (cat.config && cat.config.pago) || { modo: 'demo' }; }
  function hours() { return (cat.config && cat.config.entregaHoras) || 24; }

  function newRef() {
    var d = new Date(), pad2 = function (n) { return ('0' + n).slice(-2); }, A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = '';
    var buf; try { buf = new Uint8Array(4); (window.crypto || window.msCrypto).getRandomValues(buf); } catch (e) { buf = [Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256]; }
    for (var i = 0; i < 4; i++) r += A.charAt(Math.floor(buf[i]) % A.length);
    return 'AS-' + String(d.getFullYear()).slice(2) + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + r;
  }
  function fillTemplate(tpl, ref, totalC) {
    return tpl.split('{ref}').join(encodeURIComponent(ref)).split('{totalCents}').join(String(totalC))
      .split('{total}').join((totalC / 100).toFixed(2)).split('{lang}').join(lang);
  }
  function waUrl(text) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); }
  function waCartText(items) {
    var codes = items.map(function (it) { return codeOf(it.s, it.n); }).sort();
    var t = T('waCart', { c: codes.join(', ') });
    return t.length > 900 ? T('waMany', { n: codes.length }) : t;
  }
  function payUrl(ref, totalC) {
    var p = payCfg(), tpl = String(p.enlace || '');
    if (!tpl) return '';
    var u = fillTemplate(tpl, ref, totalC);
    return PAY_OK.test(u) ? u : '';
  }

  function renderOrder() {
    var items = cartItems(cat), q = quote(items, cat), p = payCfg();
    var demo = $('demo-note'); demo.hidden = p.modo !== 'demo'; demo.textContent = T('demo');
    $('view-done').hidden = true;
    var empty = !items.length;
    $('view-empty').hidden = !empty; $('view-order').hidden = empty;
    if (empty) {
      var ve = $('view-empty'); clear(ve);
      ve.appendChild(el('h1', { text: T('h1Order') }));
      ve.appendChild(el('div', { 'class': 'empty', style: 'margin-top:24px' }, [el('h2', { text: T('emptyOrder') }), el('p', { text: T('emptyOrderP') }), el('a', { 'class': 'btn solid', href: 'sesiones.html', text: T('goSessions') })]));
      return;
    }
    $('o-title').textContent = T('h1Order');
    var gbox = $('order-groups'); clear(gbox);
    var seen = [], groups = {};
    items.forEach(function (it) { if (!groups[it.s.id]) { groups[it.s.id] = { s: it.s, ns: [] }; seen.push(it.s.id); } groups[it.s.id].ns.push(it.n); });
    seen.forEach(function (sid) {
      var g = groups[sid], s = g.s;
      var head = el('div', { 'class': 'group-head' }, [el('h2', { text: titleOf(s) + ' · ' + photosText(g.ns.length) })]);
      var rm = el('button', { 'class': 'link', type: 'button', text: T('removeGroup') });
      rm.addEventListener('click', function () { cart.delSession(sid); });
      head.appendChild(rm);
      var ul = el('ul', { 'class': 'items' });
      g.ns.sort(function (a, b) { return a - b; }).forEach(function (n) {
        var code = codeOf(s, n), li = el('li', { 'class': 'item' });
        li.appendChild(el('img', { src: fp('sesiones/' + s.id + '/t-' + pad(n) + '.jpg'), alt: code, width: 160, height: 160, loading: 'lazy', decoding: 'async' }));
        li.appendChild(el('span', { 'class': 'ph-code', text: code }));
        var b = el('button', { 'class': 'rm', type: 'button', 'aria-label': T('removeOne', { c: code }), text: '×' });
        b.addEventListener('click', function () { cart.del(s.id, n); });
        li.appendChild(b); ul.appendChild(li);
      });
      gbox.appendChild(el('div', { 'class': 'group' }, [head, ul]));
    });
    $('o-sum-title').textContent = T('summary');
    var lines = $('lines'); clear(lines);
    q.lines.forEach(function (l) {
      var left = l.full ? T('lineFull', { s: titleOf(l.s), n: l.s.fotos }) : T('lineEach', { n: photosText(l.n), u: money(q.unit) });
      lines.appendChild(el('li', null, [el('span', { text: left }), el('span', { text: money(l.cost) })]));
    });
    $('total-lbl').textContent = T('totalLbl'); $('total-val').textContent = money(q.total);
    var hint = $('tier-hint');
    hint.textContent = q.anyFull ? T('hintFull') : (q.next ? T('hintNext', { m: q.next.m, u: money(q.next.c) }) : '');
    hint.hidden = !hint.textContent;
    var facts = $('facts'); clear(facts);
    [['factsWhat', 'factsWhatT'], ['factsWhen', 'factsWhenT'], ['factsUse', 'factsUseT'], ['factsPay', p.modo === 'manual' ? 'factsPayM' : 'factsPayT'], ['factsWith', 'factsWithT']].forEach(function (k) {
      facts.appendChild(el('li', null, [el('b', { text: T(k[0]) + ': ' }), T(k[1], { h: hours(), p: p.proveedor || 'Stripe', m: T(p.bizumStripe ? 'payM1' : 'payM0') })]));
    });
    $('pay').textContent = T('payBtn');
    var wl = $('wa-link');
    if (wl) { $('wa-lead').textContent = T('waLead'); wl.textContent = T('waBtn'); wl.setAttribute('href', waUrl(waCartText(items))); }
    $('pay-small').textContent = p.modo === 'demo' ? '' : (p.modo === 'manual' ? T('paySmallM') : T('factsPayT', { p: p.proveedor || 'Stripe', m: T(p.bizumStripe ? 'payM1' : 'payM0') }));
  }

  function copyText(s, done) {
    function legacy() {
      try {
        var t = document.createElement('textarea'); t.value = s; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select(); var ok = document.execCommand('copy'); document.body.removeChild(t); if (ok) done();
      } catch (e2) {}
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s).then(done, legacy); return; }
    } catch (e) {}
    legacy();
  }

  function showDone(kind, ref, email, total) {
    $('view-empty').hidden = true; $('view-order').hidden = true; $('demo-note').hidden = kind !== 'demo';
    var d = $('view-done'); d.hidden = false; clear(d);
    var p = payCfg(), box = el('div', { 'class': 'done' });
    box.appendChild(el('h1', { text: T(kind === 'demo' ? 'demoT' : (kind === 'manual' ? 'manualT' : 'paidT')) }));
    if (kind === 'demo') box.appendChild(el('p', { text: T('demoP') }));
    else if (kind === 'manual') {
      var pm = el('p', { text: T('manualP', { h: hours(), e: email || '' }) + ' ' });
      pm.appendChild(el('a', { href: 'mailto:' + MAIL, text: MAIL })); pm.appendChild(document.createTextNode('.'));
      box.appendChild(pm);
      if (total != null) {
        var bz = el('dl', { 'class': 'bizum' });
        [[T('bizumTo'), BIZUM], [T('bizumAmt'), money(total)], [T('bizumConcept'), ref || '']].forEach(function (r) {
          bz.appendChild(el('div', null, [el('dt', { text: r[0] }), el('dd', { text: r[1] })]));
        });
        box.appendChild(bz);
        box.appendChild(el('p', { 'class': 'bizum-alt', text: T('bizumAlt') }));
      }
    } else {
      var para = el('p', { text: T('paidP', { h: hours() }) + ' ' });
      para.appendChild(el('a', { href: 'mailto:' + MAIL, text: MAIL })); para.appendChild(document.createTextNode('.'));
      box.appendChild(para);
    }
    if (ref && !(kind === 'manual' && total != null)) box.appendChild(el('div', { 'class': 'ref', text: T('refLbl') + ' ' + ref }));
    var acts = el('div', { 'class': 'done-actions' });
    if (kind === 'manual' && total != null) {
      var cb = el('button', { 'class': 'btn', type: 'button', text: T('bizumCopy') });
      cb.addEventListener('click', function () {
        track('Clic copiar Bizum');
        copyText(BIZUM.replace(/\s/g, ''), function () { cb.textContent = T('bizumCopied'); setTimeout(function () { cb.textContent = T('bizumCopy'); }, 2000); });
      });
      acts.appendChild(cb);
    }
    if (kind !== 'demo') acts.appendChild(el('a', { 'class': 'btn', href: waUrl(T('waDone', { r: ref || '' })), target: '_blank', rel: 'noopener', 'data-wa': '1', text: T('waBtn') }));
    acts.appendChild(el('a', { 'class': 'btn solid', href: 'sesiones.html', text: T('back') }));
    box.appendChild(acts);
    d.appendChild(box);
    try { d.setAttribute('tabindex', '-1'); d.focus({ preventScroll: true }); } catch (e) {}
    window.scrollTo(0, 0);
  }

  function buildMessage(ref, q, items, name, email, consentAt) {
    var p = payCfg(), L = [];
    L.push('PEDIDO ' + ref);
    L.push('Total: ' + (q.total / 100).toFixed(2).replace('.', ',') + ' EUR (IVA incluido)');
    if (p.modo === 'manual') L.push('Pago: PENDIENTE  →  el cliente debe pagar por Bizum a tu número (' + BIZUM + ') con el concepto ' + ref + '. Envía las fotos cuando veas el Bizum con exactamente este total. Si no puede usar Bizum, responde a este correo o escríbele por WhatsApp.');
    else L.push('Pago: PENDIENTE DE COMPROBAR en ' + (p.proveedor || 'Stripe') + '  →  busca un cobro con la referencia ' + ref + ' por exactamente este total antes de enviar las fotos. Si no aparece cobrado, el cliente no ha pagado: no envíes nada.');
    L.push('Cliente: ' + name + ' <' + email + '>');
    L.push('Idioma de la web: ' + lang);
    L.push('');
    q.lines.forEach(function (l) {
      var codes = items.filter(function (it) { return it.s.id === l.s.id; }).map(function (it) { return codeOf(l.s, it.n); }).sort();
      L.push('SESIÓN: ' + titleOf(l.s) + ' (' + l.s.codigo + ') — ' + l.n + ' foto(s) — ' + (l.cost / 100).toFixed(2).replace('.', ',') + ' EUR' + (l.full ? '  [PRECIO DE SESIÓN COMPLETA: enviar TODAS las fotos de la sesión]' : ''));
      L.push('  ' + codes.join(', '));
    });
    L.push('');
    L.push('Consentimientos aceptados (' + consentAt + '): condiciones de venta y política de privacidad (versión ' + ((cat.config && cat.config.version) || '') + '); entrega inmediata del contenido digital con pérdida del derecho de desistimiento.');
    return L.join('\n');
  }

  function pageOrder() {
    view = renderOrder;
    document.addEventListener('cartchange', function () { if (!$('view-done').hidden) return; renderOrder(); refreshCartUI(); });
    window.addEventListener('storage', function (e) { if (e.key === K_CART && $('view-done').hidden) { renderOrder(); refreshCartUI(); } });

    var paid = /[?&]pagado=1\b/.test(location.search);
    if (paid) {
      var last = null; try { last = JSON.parse(localStorage.getItem(K_LAST) || 'null'); } catch (e) {}
      showDone('paid', last && last.ref); cart.clear(); try { localStorage.removeItem(K_LAST); } catch (e2) {}
      view = function () { showDone('paid', last && last.ref); };
      refreshCartUI(); return;
    }
    renderOrder();

    var form = $('order-form'), status = $('status'), btn = $('pay');
    var F = { name: $('f-name'), email: $('f-email'), email2: $('f-email2'), terms: $('f-terms'), digital: $('f-digital') };
    var errs = {};
    Object.keys(F).forEach(function (k) {
      var pEl = el('p', { 'class': 'f-err', id: 'err-' + k, role: 'alert', hidden: true });
      var host = F[k].closest('.f-field') || F[k].closest('.check');
      host.parentNode.insertBefore(pEl, host.nextSibling); errs[k] = pEl;
      F[k].setAttribute('aria-describedby', pEl.id);
      F[k].addEventListener('input', function () { pEl.hidden = true; F[k].removeAttribute('aria-invalid'); });
      F[k].addEventListener('change', function () { pEl.hidden = true; F[k].removeAttribute('aria-invalid'); });
    });
    function bad(k, msg) { errs[k].textContent = T(msg); errs[k].hidden = false; F[k].setAttribute('aria-invalid', 'true'); return F[k]; }
    function say(text, isErr, withContact) {
      clear(status); status.textContent = text; status.classList.toggle('is-err', !!isErr);
      if (withContact) { status.appendChild(document.createTextNode(' ')); status.appendChild(el('a', { href: 'mailto:' + MAIL, text: MAIL })); status.appendChild(document.createTextNode(T('or'))); status.appendChild(el('a', { href: 'https://www.instagram.com/alexsuarez_11/', target: '_blank', rel: 'noopener', text: 'Instagram' })); status.appendChild(document.createTextNode('.')); }
      if (text) { try { status.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (order.busy) return;
      var items = cartItems(cat); if (!items.length) { renderOrder(); return; }
      var name = F.name.value.trim(), email = F.email.value.trim(), email2 = F.email2.value.trim();
      Object.keys(errs).forEach(function (k) { errs[k].hidden = true; F[k].removeAttribute('aria-invalid'); }); say('');
      var first = null, b;
      b = name.length < 2 ? bad('name', 'errName') : null; first = first || b;
      b = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? null : bad('email', 'errEmail'); first = first || b;
      b = (!b && email.toLowerCase() !== email2.toLowerCase()) ? bad('email2', 'errEmail2') : null; first = first || b;
      b = F.terms.checked ? null : bad('terms', 'errTerms'); first = first || b;
      b = F.digital.checked ? null : bad('digital', 'errDigital'); first = first || b;
      if (first) { try { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {} return; }
      var hp = $('f-hp'); if (hp && hp.value) { showDone('demo', ''); return; }

      var q = quote(items, cat), ref = newRef(), p = payCfg(), consentAt = new Date().toISOString();
      var manual = p.modo === 'manual';
      if (p.modo !== 'enlace' && !manual) { try { localStorage.setItem(K_LAST, JSON.stringify({ ref: ref })); } catch (x2) {} showDone('demo', ref); return; }
      var url = manual ? '' : payUrl(ref, q.total);
      if (!manual && !url) { say(T('noPay'), true, true); return; }

      order.busy = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
      var label = btn.textContent; btn.textContent = T('sending'); say(T('sending'));
      var finished = false, ctl = ('AbortController' in window) ? new AbortController() : null, guard = 0;
      function end() { order.busy = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = label; }
      guard = setTimeout(function () { if (finished) return; finished = true; try { if (ctl) ctl.abort(); } catch (x3) {} end(); say(T('unsure'), true, true); }, W3F.wait);
      var body = {
        access_key: W3F.key, subject: 'Pedido ' + ref + ' · ' + (q.total / 100).toFixed(2).replace('.', ',') + ' € · ' + name, from_name: 'Tienda alexsuarez.es',
        name: name, email: email, message: buildMessage(ref, q, items, name, email, consentAt)
      };
      fetch(W3F.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.success !== true) throw new Error('envio'); }); })
        .then(function () {
          if (finished) return; finished = true; clearTimeout(guard);
          track('Pedido iniciado', { fotos: q.count, total: Math.round(q.total / 100) });
          if (manual) {
            view = function () { showDone('manual', ref, email, q.total); };
            end(); showDone('manual', ref, email, q.total); cart.clear(); refreshCartUI(); return;
          }
          try { localStorage.setItem(K_LAST, JSON.stringify({ ref: ref })); } catch (x4) {}
          say(T('redirecting')); setTimeout(function () { location.assign(url); }, 400);
        })
        .catch(function () { if (finished) return; finished = true; clearTimeout(guard); end(); say(T('fail'), true, true); });
    });
  }

  document.addEventListener('click', function (e) { var t = e.target; if (t && t.closest && t.closest('a[href^="https://wa.me/"]')) track('Clic WhatsApp tienda'); });

  /* ---------- Arranque ---------- */
  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('.lang button'), function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang'), true); }); });
    lang = firstLang(); root.lang = lang; applyStatic();
    Array.prototype.forEach.call(document.querySelectorAll('.lang button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false'); });
    document.title = T('title_' + PAGE);
    loadJSON(CATALOG).then(function (c) {
      if (!c || !c.sesiones) throw new Error('catalogo'); cat = c;
      document.addEventListener('cartchange', refreshCartUI);
      if (PAGE === 'pedido') pageOrder(); else pageSesiones();
      refreshCartUI();
    }).catch(function () {
      var v = $('view') || $('view-empty');
      if (v) { v.hidden = false; clear(v); v.appendChild(msgBlock(T('loadErr'), T('loadErrP'), T('retry'), null, function () { location.reload(); })); }
      var o = $('view-order'); if (o) o.hidden = true;
    });
  }
  boot();
})();
