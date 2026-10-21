(function () {
    var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
    function getCookie(n) { var m = document.cookie.match('(^|;)\\s*' + n + '\\s*=\\s*([^;]+)'); return m ? decodeURIComponent(m.pop()) : ''; }

    var qs = new URLSearchParams(location.search), fromUrl = {}, hasUrl = false;
    KEYS.forEach(function (k) { var v = qs.get(k); if (v) { fromUrl[k] = v.slice(0, 200); hasUrl = true; } });

    var attr = {}, stored = getCookie('nx_attr');
    if (stored) { try { attr = JSON.parse(stored) || {}; } catch (e) { attr = {}; } }
    else if (hasUrl) { attr = fromUrl; }

    var extRef = '';
    try {
        if (document.referrer && new URL(document.referrer).hostname !== location.hostname) extRef = document.referrer.slice(0, 300);
    } catch (e) {   }

    function fill() {
        KEYS.forEach(function (k) { var el = document.getElementById(k); if (el) el.value = attr[k] || ''; });
        var ref = document.getElementById('referrer');
        if (ref) ref.value = extRef || (document.referrer || '').slice(0, 300);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
    else fill();

    window.nxAttr = attr;
    window.nxAttrReferrer = extRef;
})();
