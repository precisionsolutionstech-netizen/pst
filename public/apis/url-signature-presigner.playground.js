(function () {
    var host = 'url-signature-presigner-api.p.rapidapi.com';

    var SIGN_ABS = {
        url: 'https://example.com/files/report.pdf',
        expiration: 1893456000,
        secret: 'your-secret-key',
        method: 'GET',
        allowedIps: ['192.168.1.100'],
        maxPayloadSize: 10485760
    };

    var SIGN_TTL = {
        url: 'https://example.com/files/report.pdf',
        expires_in_seconds: 300,
        secret: 'your-secret-key',
        method: 'GET',
        allowedIps: ['192.168.1.100']
    };

    var VERIFY_TEMPLATE = {
        signedUrl: 'https://example.com/files/report.pdf?exp=1738108800&v=v1-sha256&sig=REPLACE_WITH_REAL_SIG&c=eyJtZXRob2QiOiJHRVQiLCJhbGxvd2VkSXBzIjpbIjE5Mi4xNjguMS4xMDAiXSwibWF4UGF5bG9hZFNpemUiOjEwNDg1NzYwfQ',
        secret: 'your-secret-key',
        method: 'GET',
        clientIp: '192.168.1.100',
        payloadSize: 1024
    };

    var SAMPLES = {
        sign_abs: { path: '/sign', body: SIGN_ABS, label: 'POST /sign — absolute expiration' },
        sign_ttl: { path: '/sign', body: SIGN_TTL, label: 'POST /sign — expires_in_seconds (TTL)' },
        verify: { path: '/verify', body: VERIFY_TEMPLATE, label: 'POST /verify — template (paste signed_url from /sign)' }
    };

    var SAMPLE_ORDER = ['sign_abs', 'sign_ttl', 'verify'];

    var currentPath = '/sign';
    var sampleSelect = document.getElementById('pg-sample');
    var bodyTextarea = document.getElementById('body-json');
    var urlDisplay = document.getElementById('pg-url-display');

    SAMPLE_ORDER.forEach(function (key) {
        var o = document.createElement('option');
        o.value = key;
        o.textContent = SAMPLES[key].label;
        sampleSelect.appendChild(o);
    });

    function applySample() {
        var s = SAMPLES[sampleSelect.value];
        if (!s) return;
        currentPath = s.path;
        bodyTextarea.value = JSON.stringify(s.body, null, 2);
        urlDisplay.textContent = 'https://' + host + currentPath;
        refreshCode();
    }

    sampleSelect.addEventListener('change', applySample);
    bodyTextarea.addEventListener('input', function () { setTimeout(refreshCode, 150); });

    function bindToggle(btnId, panelId) {
        var btn = document.getElementById(btnId);
        if (!btn) return;
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var d = document.getElementById(panelId);
            if (!d) return;
            d.classList.toggle('show');
            btn.setAttribute('aria-expanded', d.classList.contains('show'));
        });
    }
    bindToggle('toggle-sign-req', 'sign-req');
    bindToggle('toggle-sign-res', 'sign-res');
    bindToggle('toggle-verify-req', 'verify-req');
    bindToggle('toggle-errors', 'error-codes');

    function parseBody() {
        var bodyStr = bodyTextarea.value.trim();
        try { return { ok: true, body: JSON.parse(bodyStr) }; }
        catch (e) { return { ok: false, error: e.message }; }
    }

    function inferPath() {
        var p = parseBody();
        if (!p.ok) return currentPath;
        if (p.body && typeof p.body.signedUrl === 'string') return '/verify';
        return '/sign';
    }

    function generateCode(lang) {
        var key = 'YOUR_RAPIDAPI_KEY';
        var path = inferPath();
        var parsed = parseBody();
        if (!parsed.ok) return '// Fix JSON: ' + parsed.error;
        var bodyStr = JSON.stringify(parsed.body);
        var url = 'https://' + host + path;
        if (lang === 'curl') {
            return 'curl --request POST \\\n  --url \'' + url.replace(/'/g, "'\\''") + '\' \\\n  --header \'Content-Type: application/json\' \\\n  --header \'x-rapidapi-key: ' + key + '\' \\\n  --header \'x-rapidapi-host: ' + host + '\' \\\n  --data \'' + bodyStr.replace(/\\/g, '\\\\').replace(/'/g, "'\\''") + '\'';
        }
        if (lang === 'javascript') {
            return 'const res = await fetch(' + JSON.stringify(url) + ', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + JSON.stringify(bodyStr) + '\n});\nconst data = await res.json();\nconsole.log(data);';
        }
        if (lang === 'typescript') {
            return 'const res = await fetch(' + JSON.stringify(url) + ', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + JSON.stringify(bodyStr) + '\n});\nconst data: unknown = await res.json();\nconsole.log(data);';
        }
        if (lang === 'python') {
            var esc = bodyStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return 'import http.client\n\nconn = http.client.HTTPSConnection("' + host + '")\npayload = "' + esc + '"\nheaders = {\n    "Content-Type": "application/json",\n    "x-rapidapi-key": "' + key + '",\n    "x-rapidapi-host": "' + host + '"\n}\nconn.request("POST", "' + path + '", payload, headers)\nres = conn.getresponse()\nprint(res.read().decode())';
        }
        if (lang === 'java') {
            var j = bodyStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            var urlEsc = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return 'HttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create("' + urlEsc + '"))\n    .header("Content-Type", "application/json")\n    .header("x-rapidapi-key", "' + key + '")\n    .header("x-rapidapi-host", "' + host + '")\n    .method("POST", HttpRequest.BodyPublishers.ofString("' + j + '"))\n    .build();\nHttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());';
        }
        return '';
    }

    function refreshCode() {
        var el = document.getElementById('generated-code');
        if (el) el.textContent = generateCode(document.getElementById('code-lang').value);
    }

    document.getElementById('code-lang').addEventListener('change', refreshCode);
    document.getElementById('refresh-code-btn').addEventListener('click', refreshCode);
    document.getElementById('copy-code-btn').addEventListener('click', function () {
        var t = document.getElementById('generated-code').textContent;
        var btn = document.getElementById('copy-code-btn');
        navigator.clipboard.writeText(t).then(function () {
            var o = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(function () { btn.textContent = o; }, 1500);
        });
    });

    document.querySelectorAll('.faq-q').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !expanded);
            var panel = document.getElementById(this.getAttribute('aria-controls'));
            if (panel) panel.classList.toggle('show', !expanded);
        });
    });

    document.getElementById('postman-download').addEventListener('click', function () {
        var parsed = parseBody();
        if (!parsed.ok) { alert('Fix JSON in the playground first.'); return; }
        var path = inferPath();
        var url = 'https://' + host + path;
        var coll = {
            info: { name: 'URL Signature Presigner API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
            item: [{
                name: 'POST ' + path,
                request: {
                    method: 'POST',
                    header: [
                        { key: 'Content-Type', value: 'application/json' },
                        { key: 'x-rapidapi-key', value: 'YOUR_RAPIDAPI_KEY' },
                        { key: 'x-rapidapi-host', value: host }
                    ],
                    body: { mode: 'raw', raw: JSON.stringify(parsed.body) },
                    url: url
                }
            }]
        };
        var blob = new Blob([JSON.stringify(coll, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'url-signature-presigner-postman-collection.json';
        a.click();
        URL.revokeObjectURL(a.href);
    });

    var runBtn = document.getElementById('run-btn');
    var keyInput = document.getElementById('api-key');
    var resultDiv = document.getElementById('play-result');
    runBtn.addEventListener('click', function () {
        var key = (keyInput.value || '').trim();
        if (!key) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'result error';
            resultDiv.textContent = 'Please enter your RapidAPI key.';
            return;
        }
        var parsed = parseBody();
        if (!parsed.ok) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'result error';
            resultDiv.textContent = 'Invalid JSON: ' + parsed.error;
            return;
        }
        var path = inferPath();
        urlDisplay.textContent = 'https://' + host + path;
        runBtn.disabled = true;
        resultDiv.style.display = 'block';
        resultDiv.className = 'result';
        resultDiv.textContent = 'Loading…';
        fetch('https://' + host + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-rapidapi-key': key, 'x-rapidapi-host': host },
            body: JSON.stringify(parsed.body)
        })
            .then(function (r) { return r.text().then(function (t) { return { status: r.status, body: t }; }); })
            .then(function (o) {
                resultDiv.className = 'result ' + (o.status >= 200 && o.status < 300 ? 'success' : 'error');
                try { resultDiv.textContent = JSON.stringify(JSON.parse(o.body), null, 2); }
                catch (_) { resultDiv.textContent = o.status + '\n' + o.body; }
            })
            .catch(function (e) { resultDiv.className = 'result error'; resultDiv.textContent = 'Request failed: ' + e.message; })
            .finally(function () { runBtn.disabled = false; });
    });

    applySample();
})();
