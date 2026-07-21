(function () {
    var host = 'api-fault-analysis-engine.p.rapidapi.com';
    var SINGLE = {
        gateway_502: {
            statusCode: 502,
            method: 'POST',
            url: 'https://api.example.com/users',
            duration: 12,
            responseHeaders: { 'x-envoy-upstream-service-time': '10' },
            proxyType: 'envoy',
            direction: 'incoming'
        },
        rate_429: {
            statusCode: 429,
            method: 'GET',
            responseHeaders: { 'retry-after': '60' },
            retryAttemptCount: 4
        },
        auth_401: {
            statusCode: 401,
            method: 'GET',
            url: 'https://api.partner.com/v1/data',
            requestHeaders: { authorization: '' }
        }
    };
    var SINGLE_LABELS = [
        ['gateway_502', '502 — Envoy / gateway headers'],
        ['rate_429', '429 — Retry-After + retry count'],
        ['auth_401', '401 — missing/empty Authorization']
    ];
    var BATCH_SAMPLE = [
        {
            statusCode: 502,
            method: 'POST',
            duration: 12,
            responseHeaders: { 'x-envoy-upstream-service-time': '10' }
        },
        {
            statusCode: 429,
            method: 'GET',
            responseHeaders: { 'retry-after': '60' }
        },
        {
            statusCode: 504,
            method: 'GET',
            duration: 30000,
            responseHeaders: { 'x-envoy-upstream-service-time': '30000' }
        }
    ];

    var endpointSel = document.getElementById('pg-endpoint');
    var sampleSelect = document.getElementById('pg-sample');
    var bodyTextarea = document.getElementById('body-json');

    function isBatch() { return endpointSel.value === 'batch'; }

    function rebuildSamples() {
        sampleSelect.innerHTML = '';
        if (isBatch()) {
            var o = document.createElement('option');
            o.value = 'batch_default';
            o.textContent = 'Three events (502, 429, 504)';
            sampleSelect.appendChild(o);
        } else {
            SINGLE_LABELS.forEach(function (pair) {
                var opt = document.createElement('option');
                opt.value = pair[0];
                opt.textContent = pair[1];
                sampleSelect.appendChild(opt);
            });
        }
        applySample();
    }

    function applySample() {
        if (isBatch()) {
            bodyTextarea.value = JSON.stringify(BATCH_SAMPLE, null, 2);
        } else {
            var key = sampleSelect.value;
            var obj = SINGLE[key];
            bodyTextarea.value = obj ? JSON.stringify(obj, null, 2) : '{}';
        }
        refreshCode();
    }

    endpointSel.addEventListener('change', rebuildSamples);
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
    bindToggle('toggle-req', 'request-fields');
    bindToggle('toggle-res', 'response-fields');
    bindToggle('toggle-batch', 'batch-response');
    bindToggle('toggle-err', 'api-errors');

    function parseJson() {
        var s = bodyTextarea.value.trim();
        try { return { ok: true, value: JSON.parse(s) }; }
        catch (e) { return { ok: false, error: e.message }; }
    }

    function validateForRequest(parsed) {
        if (!parsed.ok) return parsed;
        var v = parsed.value;
        if (isBatch()) {
            if (!Array.isArray(v)) return { ok: false, error: 'Batch mode requires a JSON array.' };
            if (v.length === 0) return { ok: false, error: 'Array must not be empty.' };
            return { ok: true, body: v };
        }
        if (Array.isArray(v)) return { ok: false, error: 'Single /analyze expects a JSON object, not an array.' };
        if (!v || typeof v !== 'object') return { ok: false, error: 'Body must be a JSON object.' };
        return { ok: true, body: v };
    }

    function path() { return isBatch() ? '/analyze/batch' : '/analyze'; }

    function generateCode(lang) {
        var key = 'YOUR_RAPIDAPI_KEY';
        var parsed = parseJson();
        var v = validateForRequest(parsed);
        if (!v.ok) return '// Fix JSON: ' + v.error;
        var bodyStr = JSON.stringify(v.body);
        var url = 'https://' + host + path();
        if (lang === 'curl') {
            return 'curl --request POST \\\n  --url \'' + url + '\' \\\n  --header \'Content-Type: application/json\' \\\n  --header \'x-rapidapi-key: ' + key + '\' \\\n  --header \'x-rapidapi-host: ' + host + '\' \\\n  --data \'' + bodyStr.replace(/\\/g, '\\\\').replace(/'/g, "'\\''") + '\'';
        }
        if (lang === 'javascript') {
            return 'const res = await fetch(\'' + url + '\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + JSON.stringify(bodyStr) + '\n});\nconst data = await res.json();\nconsole.log(data);';
        }
        if (lang === 'typescript') {
            return 'const res = await fetch(\'' + url + '\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + JSON.stringify(bodyStr) + '\n});\nconst data: unknown = await res.json();\nconsole.log(data);';
        }
        if (lang === 'python') {
            var esc = bodyStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return 'import http.client\n\nconn = http.client.HTTPSConnection("' + host + '")\npayload = "' + esc + '"\nheaders = {\n    "Content-Type": "application/json",\n    "x-rapidapi-key": "' + key + '",\n    "x-rapidapi-host": "' + host + '"\n}\nconn.request("POST", "' + path() + '", payload, headers)\nres = conn.getresponse()\nprint(res.read().decode())';
        }
        if (lang === 'java') {
            var j = bodyStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            return 'HttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create("' + url + '"))\n    .header("Content-Type", "application/json")\n    .header("x-rapidapi-key", "' + key + '")\n    .header("x-rapidapi-host", "' + host + '")\n    .method("POST", HttpRequest.BodyPublishers.ofString("' + j + '"))\n    .build();\nHttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());';
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
        var parsed = parseJson();
        var v = validateForRequest(parsed);
        if (!v.ok) { alert(v.error); return; }
        var coll = {
            info: { name: 'HTTP Error Root Trigger Analyzer API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
            item: [{
                name: isBatch() ? 'POST /analyze/batch' : 'POST /analyze',
                request: {
                    method: 'POST',
                    header: [
                        { key: 'Content-Type', value: 'application/json' },
                        { key: 'x-rapidapi-key', value: 'YOUR_RAPIDAPI_KEY' },
                        { key: 'x-rapidapi-host', value: host }
                    ],
                    body: { mode: 'raw', raw: JSON.stringify(v.body) },
                    url: 'https://' + host + path()
                }
            }]
        };
        var blob = new Blob([JSON.stringify(coll, null, 2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'http-error-root-trigger-analyzer-postman-collection.json'; a.click(); URL.revokeObjectURL(a.href);
    });

    var runBtn = document.getElementById('run-btn'), keyInput = document.getElementById('api-key'), resultDiv = document.getElementById('play-result');
    runBtn.addEventListener('click', function () {
        var key = (keyInput.value || '').trim();
        if (!key) { resultDiv.style.display = 'block'; resultDiv.className = 'result error'; resultDiv.textContent = 'Please enter your RapidAPI key.'; return; }
        var parsed = parseJson();
        if (!parsed.ok) { resultDiv.style.display = 'block'; resultDiv.className = 'result error'; resultDiv.textContent = 'Invalid JSON: ' + parsed.error; return; }
        var v = validateForRequest(parsed);
        if (!v.ok) { resultDiv.style.display = 'block'; resultDiv.className = 'result error'; resultDiv.textContent = v.error; return; }
        runBtn.disabled = true; resultDiv.style.display = 'block'; resultDiv.className = 'result'; resultDiv.textContent = 'Loading…';
        fetch('https://' + host + path(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-rapidapi-key': key, 'x-rapidapi-host': host }, body: JSON.stringify(v.body) })
            .then(function (r) { return r.text().then(function (t) { return { status: r.status, body: t }; }); })
            .then(function (o) {
                resultDiv.className = 'result ' + (o.status >= 200 && o.status < 300 ? 'success' : 'error');
                try { resultDiv.textContent = JSON.stringify(JSON.parse(o.body), null, 2); } catch (_) { resultDiv.textContent = o.status + '\n' + o.body; }
            })
            .catch(function (e) { resultDiv.className = 'result error'; resultDiv.textContent = 'Request failed: ' + e.message; })
            .finally(function () { runBtn.disabled = false; });
    });

    rebuildSamples();
})();
