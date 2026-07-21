(function () {
    var host = 'api-error-status-normalization.p.rapidapi.com';
    var path = '/normalize';
    var SAMPLES = {
        rate_limit: {
            httpStatusCode: 429,
            responseBody: { error: 'rate_limit_exceeded', message: 'Too many requests. Retry after 60 seconds.' },
            headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' }
        },
        auth: { httpStatusCode: 401, responseBody: { message: 'Invalid API key provided.', type: 'invalid_request_error' } },
        validation: { httpStatusCode: 422, responseBody: { errors: [{ field: 'email', code: 'invalid_format' }] }, vendor: 'payments' },
        not_found: { httpStatusCode: 404, responseBody: { error: 'not_found', detail: 'No such resource' } },
        html_body: { httpStatusCode: 503, responseBody: '<html><body><h1>Service Unavailable</h1></body></html>' }
    };
    var SAMPLE_LABELS = [
        ['rate_limit', '429 — rate limit + Retry-After'],
        ['auth', '401 — invalid credentials JSON'],
        ['validation', '422 — field errors'],
        ['not_found', '404 — JSON not_found'],
        ['html_body', '503 — HTML error page string']
    ];
    var sampleSelect = document.getElementById('pg-sample');
    var bodyTextarea = document.getElementById('body-json');
    SAMPLE_LABELS.forEach(function (pair) {
        var o = document.createElement('option');
        o.value = pair[0];
        o.textContent = pair[1];
        sampleSelect.appendChild(o);
    });
    function applySample() {
        var obj = SAMPLES[sampleSelect.value];
        bodyTextarea.value = obj ? JSON.stringify(obj, null, 2) : '{}';
        refreshCode();
    }
    sampleSelect.addEventListener('change', applySample);
    bodyTextarea.addEventListener('input', function () { setTimeout(refreshCode, 150); });

    function bindSchemaToggle(btnId, panelId) {
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
    bindSchemaToggle('toggle-req', 'request-schema');
    bindSchemaToggle('toggle-res', 'response-schema');
    bindSchemaToggle('toggle-api-err', 'api-errors');

    function parseBody() {
        var bodyStr = bodyTextarea.value.trim();
        try { return { ok: true, body: JSON.parse(bodyStr) }; }
        catch (e) { return { ok: false, error: e.message }; }
    }

    function generateCode(lang) {
        var key = 'YOUR_RAPIDAPI_KEY';
        var parsed = parseBody();
        if (!parsed.ok) return '// Fix JSON in playground: ' + parsed.error;
        var bodyStr = JSON.stringify(parsed.body);
        if (lang === 'curl') {
            return 'curl --request POST \\\n  --url \'https://' + host + path + '\' \\\n  --header \'Content-Type: application/json\' \\\n  --header \'x-rapidapi-key: ' + key + '\' \\\n  --header \'x-rapidapi-host: ' + host + '\' \\\n  --data \'' + bodyStr.replace(/\\/g, '\\\\').replace(/'/g, "'\\''") + '\'';
        }
        if (lang === 'javascript') {
            return 'const res = await fetch(\'https://' + host + path + '\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + JSON.stringify(bodyStr) + '\n});\nconst data = await res.json();\nconsole.log(data);';
        }
        if (lang === 'typescript') {
            return 'const res = await fetch(\'https://' + host + path + '\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + JSON.stringify(bodyStr) + '\n});\nconst data: unknown = await res.json();\nconsole.log(data);';
        }
        if (lang === 'python') {
            var esc = bodyStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return 'import http.client\n\nconn = http.client.HTTPSConnection("' + host + '")\npayload = "' + esc + '"\nheaders = {\n    "Content-Type": "application/json",\n    "x-rapidapi-key": "' + key + '",\n    "x-rapidapi-host": "' + host + '"\n}\nconn.request("POST", "' + path + '", payload, headers)\nres = conn.getresponse()\nprint(res.read().decode())';
        }
        if (lang === 'java') {
            var j = bodyStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            return 'HttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create("https://' + host + path + '"))\n    .header("Content-Type", "application/json")\n    .header("x-rapidapi-key", "' + key + '")\n    .header("x-rapidapi-host", "' + host + '")\n    .method("POST", HttpRequest.BodyPublishers.ofString("' + j + '"))\n    .build();\nHttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());';
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
            var o = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = o; }, 1500);
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
        if (!parsed.ok) { alert('Fix JSON in the playground before downloading.'); return; }
        var coll = { info: { name: 'API Error & Status Normalization API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [{ name: 'POST /normalize', request: { method: 'POST', header: [{ key: 'Content-Type', value: 'application/json' }, { key: 'x-rapidapi-key', value: 'YOUR_RAPIDAPI_KEY' }, { key: 'x-rapidapi-host', value: host }], body: { mode: 'raw', raw: JSON.stringify(parsed.body) }, url: 'https://' + host + path } }] };
        var blob = new Blob([JSON.stringify(coll, null, 2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'api-error-status-normalization-postman-collection.json'; a.click(); URL.revokeObjectURL(a.href);
    });

    var runBtn = document.getElementById('run-btn'), keyInput = document.getElementById('api-key'), resultDiv = document.getElementById('play-result');
    runBtn.addEventListener('click', function () {
        var key = (keyInput.value || '').trim();
        if (!key) { resultDiv.style.display = 'block'; resultDiv.className = 'result error'; resultDiv.textContent = 'Please enter your RapidAPI key.'; return; }
        var parsed = parseBody();
        if (!parsed.ok) { resultDiv.style.display = 'block'; resultDiv.className = 'result error'; resultDiv.textContent = 'Invalid JSON: ' + parsed.error; return; }
        runBtn.disabled = true; resultDiv.style.display = 'block'; resultDiv.className = 'result'; resultDiv.textContent = 'Loading…';
        fetch('https://' + host + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-rapidapi-key': key, 'x-rapidapi-host': host }, body: JSON.stringify(parsed.body) })
            .then(function (r) { return r.text().then(function (t) { return { status: r.status, body: t }; }); })
            .then(function (o) {
                resultDiv.className = 'result ' + (o.status >= 200 && o.status < 300 ? 'success' : 'error');
                try { resultDiv.textContent = JSON.stringify(JSON.parse(o.body), null, 2); } catch (_) { resultDiv.textContent = o.status + '\n' + o.body; }
            })
            .catch(function (e) { resultDiv.className = 'result error'; resultDiv.textContent = 'Request failed: ' + e.message; })
            .finally(function () { runBtn.disabled = false; });
    });

    applySample();
})();
