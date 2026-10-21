(function () {
    if (window.nxUrlap) return;

    var TEL_HREF = 'tel:+36702742138', TEL = '+36 70 274 2138';
    var HATAR = 1200, IDOKORLAT_MS = 15000;
    var LINK = /https?:\/\/|\bwww\./i;
    var LINK_HIBA = 'Linket sajnos nem tudunk fogadni (a robotok miatt). Írd le a gép nevét szövegesen, és minden más maradhat.';

    function hossz(v) { return v.length + (v.match(/\n/g) || []).length; }
    function vag(uz) {
        if (!uz) return;
        for (var i = 0; i < 4 && hossz(uz.value) > HATAR; i++) {
            uz.value = uz.value.slice(0, uz.value.length - (hossz(uz.value) - HATAR));
        }
    }

    function hiba(u, szoveg) {
        if (!u) return;
        u.className = 'urlap-uzenet urlap-hiba';
        u.textContent = '';
        u.appendChild(document.createTextNode(String(szoveg || 'Nem sikerült elküldeni.') + ' Hívj: '));
        var a = document.createElement('a');
        a.href = TEL_HREF;
        a.textContent = TEL;
        u.appendChild(a);
    }

    function post(url, fd) {
        var ac = typeof AbortController === 'function' ? new AbortController() : null;
        var t = ac ? setTimeout(function () { ac.abort(); }, IDOKORLAT_MS) : null;
        return fetch(url, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' }, signal: ac ? ac.signal : undefined })
            .then(function (r) { return r.json(); })
            .then(function (d) { if (t) clearTimeout(t); return d; },
                  function (e) { if (t) clearTimeout(t); throw e; });
    }
    function hibaSzoveg(e) {
        return e && e.name === 'AbortError'
            ? 'Nem jött válasz időben, nem tudjuk, megérkezett-e.'
            : 'Nem sikerült elküldeni.';
    }

    function telepitesre(f) {
        var svc = f.querySelector('input[name="service"]:checked');
        return !!(svc && (svc.dataset.kulcs === 'telepites' || /telep/i.test(svc.value || '')));
    }
    function alapElotag(f) {
        var e = '';
        try { e = typeof window.nxUzenetElotag === 'function' ? String(window.nxUzenetElotag() || '') : ''; } catch (err) {}
        if (!telepitesre(f)) return e;
        var sorok = e ? e.split('\n') : [];
        try {
            var g = sessionStorage.getItem('nx-kert-gep'), m = sessionStorage.getItem('nx-meretezes');
            if (g && e.indexOf('Kért gép: ') === -1) sorok.unshift('Kért gép: ' + g);
            if (m && e.indexOf('Kalkulátor: ') === -1 && e.indexOf(m) === -1) sorok.push(m);
        } catch (err) {}
        return sorok.join('\n');
    }

    function rejt(el) { el.style.display = 'none'; }
    function rejtettSzoveg(el) {
        el.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0';
    }

    function siker(f, u) {
        try {
            var svc = f.querySelector('[name="service"]:checked');
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'nx_lead_submit', nx_service: svc ? svc.value : '' });
            if (typeof fbq !== 'undefined') fbq('track', 'Lead');
            if (typeof gtag !== 'undefined') gtag('event', 'generate_lead', { event_category: 'contact', event_label: 'ajanlat-urlap' });
        } catch (err) {}

        var doboz = document.createElement('div');
        doboz.className = 'urlap-kesz';
        var h = document.createElement('h3');
        h.textContent = 'Megkaptuk.';
        var p = document.createElement('p');
        p.appendChild(document.createTextNode('Ha épp nem tudjuk felvenni, visszahívunk. Sürgős esetben hívj: '));
        var a = document.createElement('a');
        a.className = 'gomb-tel-sor';
        a.href = TEL_HREF;
        a.textContent = TEL;
        p.appendChild(a);
        doboz.appendChild(h);
        doboz.appendChild(p);

        Array.prototype.slice.call(f.children).forEach(function (c) {
            if (u && c.contains(u)) {
                Array.prototype.slice.call(c.children).forEach(function (d) { if (d !== u) rejt(d); });
                c.style.border = '0'; c.style.padding = '0'; c.style.margin = '0';
            } else rejt(c);
        });
        f.insertBefore(doboz, f.firstChild);
        if (u) {
            rejtettSzoveg(u);
            u.className = 'urlap-uzenet';
            u.textContent = 'Megkaptuk. Ha épp nem tudjuk felvenni, visszahívunk.';
        }
    }

    function bekot(f, o) {
        o = o || {};
        var u = o.u || f.querySelector('.urlap-uzenet');
        var gomb = f.querySelector('button[type=submit]');
        var felirat = gomb ? gomb.textContent : '';
        function nemMent() {
            try { f.dispatchEvent(new CustomEvent('nx-kuldes-hiba')); } catch (err) {}
            if (gomb) { gomb.disabled = false; gomb.textContent = felirat; }
            f.removeAttribute('aria-busy');
        }

        f.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!f.checkValidity()) { f.reportValidity(); return; }
            var uz = f.querySelector('textarea[name="message"]');
            if (uz && LINK.test(uz.value)) {
                u.className = 'urlap-uzenet urlap-hiba';
                u.textContent = LINK_HIBA;
                uz.focus();
                nemMent();
                return;
            }
            try {
                var cim = f.querySelector('input[name="address"]');
                if (cim && cim.value.trim() && uz && uz.value.indexOf(cim.value.trim()) === -1) {
                    uz.value = 'Cím: ' + cim.value.trim() + (uz.value ? '\n' + uz.value : '');
                }
                var elotag = String((o.elotag ? o.elotag(f) : alapElotag(f)) || '');
                if (elotag && uz) {
                    var uj = elotag.replace(/https?:\/\/\S+/gi, '').replace(/\bwww\.\S+/gi, '')
                        .split('\n').map(function (s) { return s.trim(); })
                        .filter(function (s) { return s && uz.value.indexOf(s) === -1; });
                    if (uj.length) uz.value = uj.join('\n') + (uz.value ? '\n' + uz.value : '');
                }
                vag(uz);
            } catch (err) {}

            if (gomb) gomb.disabled = true;
            f.setAttribute('aria-busy', 'true');
            u.className = 'urlap-uzenet';
            u.textContent = 'Küldöm...';
            post(f.action, new FormData(f)).then(function (d) {
                if (d && d.ok) { f.removeAttribute('aria-busy'); siker(f, u); }
                else { hiba(u, d && d.error ? d.error : ''); nemMent(); }
            }, function (err) { hiba(u, hibaSzoveg(err)); nemMent(); });
        });
    }

    window.nxUrlap = { bekot: bekot, post: post, hiba: hiba, hibaSzoveg: hibaSzoveg, hossz: hossz, vag: vag, HATAR: HATAR };
})();
