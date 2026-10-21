(function () {
    var URLAP_HORGONY = '#ajanlatkeres';
    document.addEventListener('click', function (e) {
        var link = e.target.closest('a');
        if (!link) return;

        var href = link.getAttribute('href') || '';
        var label = (link.textContent || '').trim().slice(0, 60);
        var category = null;

        if (href.indexOf('tel:') === 0) {
            category = 'phone';
        } else if (href === URLAP_HORGONY || href.slice(-URLAP_HORGONY.length) === URLAP_HORGONY) {
            category = 'form-jump';
        }
        if (!category) return;

        var forras = link.getAttribute('data-cta-forras') || '';

        if (typeof gtag !== 'undefined') {
            gtag('event', 'cta_click', {
                event_category: category,
                event_label: label,
                event_forras: forras || undefined
            });
        }
        if (typeof fbq !== 'undefined' && category === 'phone') {
            fbq('trackCustom', 'PhoneClick', { source: label });
        }
    });
})();

(function () {
    document.addEventListener('click', function (e) {
        var link = e.target.closest('[data-suti-beallitasok]');
        if (!link) return;
        e.preventDefault();
        if (typeof window.silktideConsentManager === 'undefined') return;
        var inst = window.silktideConsentManager.getInstance();
        if (inst) inst.toggleModal(true);
    });
})();

(function () {
    var gomb = document.querySelector('[data-hivo-gomb]');
    if (!gomb) return;

    function backdropLathato() {
        var bd = document.getElementById('stcm-backdrop');
        return !!bd && getComputedStyle(bd).display !== 'none';
    }
    var lablecLathato = false;
    var lablec = [...document.querySelectorAll('footer')].find(function (f) { return !f.closest('#stcm-wrapper'); });
    if (lablec && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (bejegyzesek) {
            lablecLathato = bejegyzesek[0].isIntersecting;
            frissit();
        }).observe(lablec);
    }
    var eredmeny = document.getElementById('eredmeny');
    var kalkKepen = false;
    var kalkBurok = eredmeny && (eredmeny.closest('.kalk') || eredmeny.parentElement);
    function kalkulatorLepesbenVanE() {
        return !!eredmeny && !eredmeny.classList.contains('aktiv') && kalkKepen;
    }
    function frissit() {
        gomb.dataset.frissitesSzam = String((+gomb.dataset.frissitesSzam || 0) + 1);
        gomb.classList.toggle('lathato', !backdropLathato() && !lablecLathato && !kalkulatorLepesbenVanE());
    }
    if (eredmeny && 'MutationObserver' in window) {
        new MutationObserver(frissit).observe(eredmeny, { attributes: true, attributeFilter: ['class'] });
    }
    if (kalkBurok && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (bejegyzesek) {
            kalkKepen = bejegyzesek[0].isIntersecting;
            frissit();
        }).observe(kalkBurok);
    }

    frissit();

    function csatol() {
        var bd = document.getElementById('stcm-backdrop');
        if (!bd) return;
        frissit();
        new MutationObserver(frissit).observe(bd, { attributes: true, attributeFilter: ['style'] });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', csatol, { once: true });
    else csatol();

    document.addEventListener('click', function (e) {
        if (e.target.closest('.stcm-accept-all, .stcm-reject-all, .stcm-modal-save, .stcm-modal-reject-all, .stcm-modal-close, [data-suti-beallitasok]')) {
            setTimeout(frissit, 50);
        }
    });
})();
