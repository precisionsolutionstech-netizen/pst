(function(){
    var host='event-listing-data-normalization.p.rapidapi.com',path='/normalize';
    var rapidUrl='https://rapidapi.com/precisionsolutionstech/api/event-listing-data-normalization';
    document.querySelectorAll('[data-rapid-docs]').forEach(function(a){ a.href = rapidUrl; });

    var SAMPLES = {
        eventbrite: {
            platform: 'eventbrite',
            payload: {
                id: 'eb-123',
                name: 'Dev Conference 2024',
                start_utc: '2024-07-15T09:00:00Z',
                end_utc: '2024-07-15T17:00:00Z',
                venue: { name: 'Convention Center', address: { city: 'Austin', region: 'TX', country: 'US' } },
                is_free: false,
                cost: { value: 99, currency: 'USD' }
            }
        },
        meetup: {
            platform: 'meetup',
            payload: {
                id: 'mu-1',
                name: 'Weekly Dev Meetup',
                start: '2024-06-01T18:00:00Z',
                end: '2024-06-01T20:00:00Z',
                type: 'meetup',
                recurrence: 'weekly'
            }
        },
        ticketmaster: {
            platform: 'ticketmaster',
            payload: {
                id: 'tm-1',
                name: 'Festival',
                start: '2024-06-01T10:00:00Z',
                end: '2024-06-03T22:00:00Z'
            }
        },
        mixed: {
            inputs: [
                { platform: 'eventbrite', data: [{ id: 'eb-1', name: 'Eventbrite Event', start_utc: '2024-07-01T10:00:00Z', end_utc: '2024-07-01T12:00:00Z', venue: { name: 'Venue' } }] },
                { platform: 'meetup', data: [{ id: 'mu-1', name: 'Meetup Event', dateTime: '2024-07-02T18:00:00Z', venue: { name: 'Space' } }] },
                { platform: 'cms', data: [{ id: 'cms-1', title: 'CMS Event', start: '2024-07-03T09:00:00Z' }] }
            ]
        },
        generic_partial: {
            platform: 'generic',
            payload: [
                { id: 'a', title: 'Valid A', start: '2024-06-01T10:00:00Z' },
                { invalid: true },
                { id: 'c', title: 'Valid C', start: '2024-06-03T10:00:00Z' }
            ]
        }
    };
    var SAMPLE_LABELS = [
        ['eventbrite', 'Eventbrite — paid conference'],
        ['meetup', 'Meetup — recurring meetup'],
        ['ticketmaster', 'Ticketmaster — multi-day event'],
        ['mixed', 'Mixed vendors — one batch (Eventbrite + Meetup + generic CMS)'],
        ['generic_partial', 'Generic — partial success (valid + invalid item)']
    ];

    var sampleSelect = document.getElementById('pg-sample');
    var bodyTextarea = document.getElementById('body-json');
    SAMPLE_LABELS.forEach(function(pair){
        var o = document.createElement('option');
        o.value = pair[0];
        o.textContent = pair[1];
        sampleSelect.appendChild(o);
    });
    function applySample(){
        var key = sampleSelect.value;
        var obj = SAMPLES[key];
        bodyTextarea.value = obj ? JSON.stringify(obj, null, 2) : '{}';
        refreshCode();
    }
    sampleSelect.addEventListener('change', applySample);
    applySample();
    bodyTextarea.addEventListener('input', function(){ setTimeout(refreshCode, 150); });

    function bindSchemaToggle(btnId, panelId){
        var btn = document.getElementById(btnId);
        if(!btn) return;
        btn.addEventListener('click', function(e){
            e.preventDefault();
            var d = document.getElementById(panelId);
            if(!d) return;
            d.classList.toggle('show');
            btn.setAttribute('aria-expanded', d.classList.contains('show'));
        });
    }
    bindSchemaToggle('toggle-req', 'request-schema');
    bindSchemaToggle('toggle-inputs', 'inputs-shapes');
    bindSchemaToggle('toggle-res', 'response-schema');
    bindSchemaToggle('toggle-api-err', 'api-errors');
    bindSchemaToggle('toggle-errors', 'error-codes');

    function parseBody(){
        var bodyStr = bodyTextarea.value.trim();
        try { return { ok: true, body: JSON.parse(bodyStr) }; }
        catch (e) { return { ok: false, error: e.message }; }
    }

    function generateCode(lang){
        var key = 'YOUR_RAPIDAPI_KEY';
        var parsed = parseBody();
        if(!parsed.ok) return '// Fix JSON in playground: ' + parsed.error;
        var bodyStr = JSON.stringify(parsed.body);
        if(lang === 'curl'){
            return 'curl --request POST \\\n  --url \'https://' + host + path + '\' \\\n  --header \'Content-Type: application/json\' \\\n  --header \'x-rapidapi-key: ' + key + '\' \\\n  --header \'x-rapidapi-host: ' + host + '\' \\\n  --data \'' + bodyStr.replace(/\\/g, '\\\\').replace(/'/g, "'\\''") + '\'';
        }
        if(lang === 'javascript'){
            return 'const res = await fetch(\'https://' + host + path + '\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + JSON.stringify(bodyStr) + '\n});\nconst data = await res.json();\nconsole.log(data);';
        }
        if(lang === 'typescript'){
            return 'const res = await fetch(\'https://' + host + path + '\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'x-rapidapi-key\': \'' + key + '\',\n    \'x-rapidapi-host\': \'' + host + '\'\n  },\n  body: ' + JSON.stringify(bodyStr) + '\n});\nconst data: unknown = await res.json();\nconsole.log(data);';
        }
        if(lang === 'python'){
            var esc = bodyStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return 'import http.client\n\nconn = http.client.HTTPSConnection("' + host + '")\npayload = "' + esc + '"\nheaders = {\n    "Content-Type": "application/json",\n    "x-rapidapi-key": "' + key + '",\n    "x-rapidapi-host": "' + host + '"\n}\nconn.request("POST", "' + path + '", payload, headers)\nres = conn.getresponse()\nprint(res.read().decode())';
        }
        if(lang === 'java'){
            var j = bodyStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            return 'HttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create("https://' + host + path + '"))\n    .header("Content-Type", "application/json")\n    .header("x-rapidapi-key", "' + key + '")\n    .header("x-rapidapi-host", "' + host + '")\n    .method("POST", HttpRequest.BodyPublishers.ofString("' + j + '"))\n    .build();\nHttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());';
        }
        return '';
    }

    function refreshCode(){
        var el = document.getElementById('generated-code');
        if(el) el.textContent = generateCode(document.getElementById('code-lang').value);
    }
    document.getElementById('code-lang').addEventListener('change', refreshCode);
    document.getElementById('refresh-code-btn').addEventListener('click', refreshCode);
    document.getElementById('copy-code-btn').addEventListener('click', function(){
        var t = document.getElementById('generated-code').textContent;
        var btn = document.getElementById('copy-code-btn');
        navigator.clipboard.writeText(t).then(function(){
            var o = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function(){ btn.textContent = o; }, 1500);
        });
    });

    document.querySelectorAll('.faq-q').forEach(function(btn){
        btn.addEventListener('click', function(){
            var expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !expanded);
            var panel = document.getElementById(this.getAttribute('aria-controls'));
            if(panel) panel.classList.toggle('show', !expanded);
        });
    });

    document.getElementById('postman-download').addEventListener('click', function(){
        var parsed = parseBody();
        if(!parsed.ok){ alert('Fix JSON in the playground before downloading.'); return; }
        var coll = { info: { name: 'Event Listing Normalization API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [{ name: 'POST /normalize', request: { method: 'POST', header: [{ key: 'Content-Type', value: 'application/json' }, { key: 'x-rapidapi-key', value: 'YOUR_RAPIDAPI_KEY' }, { key: 'x-rapidapi-host', value: host }], body: { mode: 'raw', raw: JSON.stringify(parsed.body) }, url: 'https://' + host + path } }] };
        var blob = new Blob([JSON.stringify(coll, null, 2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'event-listing-normalization-postman-collection.json'; a.click(); URL.revokeObjectURL(a.href);
    });

    var runBtn = document.getElementById('run-btn'), keyInput = document.getElementById('api-key'), resultDiv = document.getElementById('play-result');
    runBtn.addEventListener('click', function(){
        var key = (keyInput.value || '').trim();
        if(!key){ resultDiv.style.display = 'block'; resultDiv.className = 'result error'; resultDiv.textContent = 'Please enter your RapidAPI key.'; return; }
        var parsed = parseBody();
        if(!parsed.ok){ resultDiv.style.display = 'block'; resultDiv.className = 'result error'; resultDiv.textContent = 'Invalid JSON: ' + parsed.error; return; }
        runBtn.disabled = true; resultDiv.style.display = 'block'; resultDiv.className = 'result'; resultDiv.textContent = 'Loading…';
        fetch('https://' + host + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-rapidapi-key': key, 'x-rapidapi-host': host }, body: JSON.stringify(parsed.body) })
        .then(function(r){ return r.text().then(function(t){ return { status: r.status, body: t }; }); })
        .then(function(o){
            resultDiv.className = 'result ' + (o.status >= 200 && o.status < 300 ? 'success' : 'error');
            try { resultDiv.textContent = JSON.stringify(JSON.parse(o.body), null, 2); } catch (_) { resultDiv.textContent = o.status + '\n' + o.body; }
        })
        .catch(function(e){ resultDiv.className = 'result error'; resultDiv.textContent = 'Request failed: ' + e.message; })
        .finally(function(){ runBtn.disabled = false; });
    });
})();
