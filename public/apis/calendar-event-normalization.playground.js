(function () {
    var host = 'calendar-event-normalization.p.rapidapi.com';
    var SAMPLES = {
        google: {
            inputs: [{
                calendarId: 'google',
                payload: {
                    items: [{
                        id: 'evt1',
                        summary: 'Team standup',
                        start: { dateTime: '2025-02-03T10:00:00-05:00' },
                        end: { dateTime: '2025-02-03T10:30:00-05:00' }
                    }]
                }
            }]
        },
        outlook: {
            inputs: [{
                calendarId: 'outlook',
                payload: {
                    value: [{
                        id: 'AA',
                        subject: '1:1 with Alex',
                        start: { dateTime: '2025-03-15T10:00:00.0000000', timeZone: 'America/Los_Angeles' },
                        end: { dateTime: '2025-03-15T10:30:00.0000000', timeZone: 'America/Los_Angeles' }
                    }]
                }
            }]
        },
        multi: {
            inputs: [
                {
                    calendarId: 'google',
                    payload: {
                        items: [{
                            id: 'g1',
                            summary: 'Sprint planning',
                            start: { dateTime: '2025-04-01T09:00:00-04:00' },
                            end: { dateTime: '2025-04-01T10:00:00-04:00' }
                        }]
                    }
                },
                {
                    calendarId: 'outlook',
                    payload: {
                        value: [{
                            id: 'o1',
                            subject: 'Customer call',
                            start: { dateTime: '2025-04-01T14:00:00.0000000', timeZone: 'UTC' },
                            end: { dateTime: '2025-04-01T14:30:00.0000000', timeZone: 'UTC' }
                        }]
                    }
                }
            ]
        }
    };
    var SAMPLE_LABELS = [
        ['google', 'Google Calendar — items[]'],
        ['outlook', 'Outlook / Graph — value[]'],
        ['multi', 'Google + Outlook in one request']
    ];
    var ICAL_SAMPLE = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//demo//EN\r\nBEGIN:VEVENT\r\nUID:1@test\r\nDTSTART:20250203T150000Z\r\nDTEND:20250203T153000Z\r\nSUMMARY:Team sync\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';

    var endpointSel = document.getElementById('pg-endpoint');
    var sampleSelect = document.getElementById('pg-sample');
    var sampleRow = document.getElementById('pg-sample-row');
    var bodyTextarea = document.getElementById('body-json');

    SAMPLE_LABELS.forEach(function (pair) {
        var o = document.createElement('option');
        o.value = pair[0];
        o.textContent = pair[1];
        sampleSelect.appendChild(o);
    });

    function isIcal() { return endpointSel.value === 'ical'; }

    function applySample() {
        if (isIcal()) {
            bodyTextarea.value = ICAL_SAMPLE;
        } else {
            var obj = SAMPLES[sampleSelect.value];
            bodyTextarea.value = obj ? JSON.stringify(obj, null, 2) : '{}';
        }
        refreshCode();
    }

    sampleSelect.addEventListener('change', applySample);
    bodyTextarea.addEventListener('input', function () { setTimeout(refreshCode, 150); });
    endpointSel.addEventListener('change', function () {
        sampleRow.style.display = isIcal() ? 'none' : 'block';
        applySample();
    });

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
    bindSchemaToggle('toggle-ical', 'ical-schema');
    bindSchemaToggle('toggle-res', 'response-schema');
    bindSchemaToggle('toggle-req-err', 'request-errors');
    bindSchemaToggle('toggle-src-err', 'per-source-errors');

    function parseJsonBody() {
        var bodyStr = bodyTextarea.value.trim();
        try { return { ok: true, body: JSON.parse(bodyStr) }; }
        catch (e) { return { ok: false, error: e.message }; }
    }

    function icalPath() { return '/normalize/ical?calendarId=ical'; }
    function jsonPath() { return '/normalize'; }

    function generateCode(lang) {
        var key = 'YOUR_RAPIDAPI_KEY';
        if (isIcal()) {
            var raw = bodyTextarea.value;
            var path = icalPath();
            var url = 'https://' + host + path;
            if (lang === 'curl') {
                return '# Save the playground body as cal.ics, then:\ncurl --request POST \\\n  --url \'' + url + '\' \\\n  --header \'Content-Type: text/plain\' \\\n  --header \'x-rapidapi-key: ' + key + '\' \\\n  --header \'x-rapidapi-host: ' + host + '\' \\\n  --data-binary @cal.ics';
            }
            var rawJs = JSON.stringify(raw);
            if (lang === 'javascript') {
                return 'const res = await fetch(\'' + url + '\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'text/plain\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + rawJs + '\n});\nconst data = await res.json();\nconsole.log(data);';
            }
            if (lang === 'typescript') {
                return 'const res = await fetch(\'' + url + '\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'text/plain\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + rawJs + '\n});\nconst data: unknown = await res.json();\nconsole.log(data);';
            }
            if (lang === 'python') {
                return '# Save the playground body as cal.ics, then:\nimport http.client\n\nwith open("cal.ics", encoding="utf-8") as f:\n    ics = f.read()\nconn = http.client.HTTPSConnection("' + host + '")\nheaders = {\n    "Content-Type": "text/plain",\n    "x-rapidapi-key": "' + key + '",\n    "x-rapidapi-host": "' + host + '"\n}\nconn.request("POST", "' + path + '", ics, headers)\nres = conn.getresponse()\nprint(res.read().decode())';
            }
            if (lang === 'java') {
                var j = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
                return 'HttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create("' + url + '"))\n    .header("Content-Type", "text/plain")\n    .header("x-rapidapi-key", "' + key + '")\n    .header("x-rapidapi-host", "' + host + '")\n    .method("POST", HttpRequest.BodyPublishers.ofString("' + j + '"))\n    .build();\nHttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());';
            }
            return '';
        }
        var parsed = parseJsonBody();
        if (!parsed.ok) return '// Fix JSON in playground: ' + parsed.error;
        var bodyStr = JSON.stringify(parsed.body);
        var path = jsonPath();
        var url = 'https://' + host + path;
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
            return 'import http.client\n\nconn = http.client.HTTPSConnection("' + host + '")\npayload = "' + esc + '"\nheaders = {\n    "Content-Type": "application/json",\n    "x-rapidapi-key": "' + key + '",\n    "x-rapidapi-host": "' + host + '"\n}\nconn.request("POST", "' + path + '", payload, headers)\nres = conn.getresponse()\nprint(res.read().decode())';
        }
        if (lang === 'java') {
            var jj = bodyStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            return 'HttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create("' + url + '"))\n    .header("Content-Type", "application/json")\n    .header("x-rapidapi-key", "' + key + '")\n    .header("x-rapidapi-host", "' + host + '")\n    .method("POST", HttpRequest.BodyPublishers.ofString("' + jj + '"))\n    .build();\nHttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());';
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
        var item;
        if (isIcal()) {
            item = {
                name: 'POST /normalize/ical',
                request: {
                    method: 'POST',
                    header: [
                        { key: 'Content-Type', value: 'text/plain' },
                        { key: 'x-rapidapi-key', value: 'YOUR_RAPIDAPI_KEY' },
                        { key: 'x-rapidapi-host', value: host }
                    ],
                    body: { mode: 'raw', raw: bodyTextarea.value },
                    url: 'https://' + host + icalPath()
                }
            };
        } else {
            var parsed = parseJsonBody();
            if (!parsed.ok) { alert('Fix JSON in the playground before downloading.'); return; }
            item = {
                name: 'POST /normalize',
                request: {
                    method: 'POST',
                    header: [
                        { key: 'Content-Type', value: 'application/json' },
                        { key: 'x-rapidapi-key', value: 'YOUR_RAPIDAPI_KEY' },
                        { key: 'x-rapidapi-host', value: host }
                    ],
                    body: { mode: 'raw', raw: JSON.stringify(parsed.body) },
                    url: 'https://' + host + jsonPath()
                }
            };
        }
        var coll = { info: { name: 'Calendar Event Normalization API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [item] };
        var blob = new Blob([JSON.stringify(coll, null, 2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'calendar-event-normalization-postman-collection.json'; a.click(); URL.revokeObjectURL(a.href);
    });

    var runBtn = document.getElementById('run-btn'), keyInput = document.getElementById('api-key'), resultDiv = document.getElementById('play-result');
    runBtn.addEventListener('click', function () {
        var key = (keyInput.value || '').trim();
        if (!key) { resultDiv.style.display = 'block'; resultDiv.className = 'result error'; resultDiv.textContent = 'Please enter your RapidAPI key.'; return; }
        var url, headers, body;
        if (isIcal()) {
            url = 'https://' + host + icalPath();
            headers = { 'Content-Type': 'text/plain', 'x-rapidapi-key': key, 'x-rapidapi-host': host };
            body = bodyTextarea.value;
        } else {
            var parsed = parseJsonBody();
            if (!parsed.ok) { resultDiv.style.display = 'block'; resultDiv.className = 'result error'; resultDiv.textContent = 'Invalid JSON: ' + parsed.error; return; }
            url = 'https://' + host + jsonPath();
            headers = { 'Content-Type': 'application/json', 'x-rapidapi-key': key, 'x-rapidapi-host': host };
            body = JSON.stringify(parsed.body);
        }
        runBtn.disabled = true; resultDiv.style.display = 'block'; resultDiv.className = 'result'; resultDiv.textContent = 'Loading…';
        fetch(url, { method: 'POST', headers: headers, body: body })
            .then(function (r) { return r.text().then(function (t) { return { status: r.status, body: t }; }); })
            .then(function (o) {
                resultDiv.className = 'result ' + (o.status >= 200 && o.status < 300 ? 'success' : 'error');
                try { resultDiv.textContent = JSON.stringify(JSON.parse(o.body), null, 2); } catch (_) { resultDiv.textContent = o.status + '\n' + o.body; }
            })
            .catch(function (e) { resultDiv.className = 'result error'; resultDiv.textContent = 'Request failed: ' + e.message; })
            .finally(function () { runBtn.disabled = false; });
    });

    sampleRow.style.display = 'block';
    applySample();
})();
