(function(){
    var host='advanced-qr-code-generator-api1.p.rapidapi.com',path='/generate',rapidUrl="https://rapidapi.com/precisionsolutionstech/api/advanced-qr-code-generator-api1";

    function fullUrl() { return 'https://' + host + path; }

    function getBodyForCode() {
        var t = document.getElementById('body-json').value.trim();
        if (!t) return { ok: false, error: 'Request body is empty' };
        try {
            var obj = JSON.parse(t);
            return { ok: true, obj: obj, compact: JSON.stringify(obj) };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    function postmanRawBody() {
        var br = getBodyForCode();
        if (br.ok) return JSON.stringify(br.obj, null, 2);
        return document.getElementById('body-json').value.trim();
    }

    function escapeShellSingleQuoted(s) {
        return s.replace(/'/g, "'\\''");
    }

    function escapePythonTripleDouble(s) {
        return s.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
    }

    function escapeJavaString(s) {
        return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    }

    function generateCode(lang) {
        var br = getBodyForCode();
        if (!br.ok) {
            return '// Invalid JSON in playground — fix Request body (JSON), then click Refresh code.\n// ' + br.error;
        }
        var compact = br.compact;
        var url = fullUrl();
        var key = 'YOUR_RAPIDAPI_KEY';
        if (lang === 'curl') {
            return "curl --request POST \\\n  --url '" + escapeShellSingleQuoted(url) + "' \\\n  --header 'Content-Type: application/json' \\\n  --header 'x-rapidapi-host: " + host + "' \\\n  --header 'x-rapidapi-key: " + key + "' \\\n  --data '" + escapeShellSingleQuoted(compact) + "'";
        }
        var hdr = "    'Content-Type': 'application/json',\n    'x-rapidapi-key': '" + key + "',\n    'x-rapidapi-host': '" + host + "'";
        var bodyLit = JSON.stringify(compact);
        if (lang === 'javascript') {
            return "const res = await fetch(" + JSON.stringify(url) + ", {\n  method: 'POST',\n  headers: {\n" + hdr + "\n  },\n  body: " + bodyLit + "\n});\nconst data = await res.json();\nconsole.log(data);";
        }
        if (lang === 'typescript') {
            return "const res = await fetch(" + JSON.stringify(url) + ", {\n  method: 'POST',\n  headers: {\n" + hdr + "\n  },\n  body: " + bodyLit + "\n});\nconst data: unknown = await res.json();\nconsole.log(data);";
        }
        if (lang === 'python') {
            return "import json\nimport requests\n\nurl = " + JSON.stringify(url) + "\nheaders = {\n    'Content-Type': 'application/json',\n    'x-rapidapi-key': '" + key + "',\n    'x-rapidapi-host': '" + host + "'\n}\npayload_str = \"\"\"\n" + escapePythonTripleDouble(compact) + "\n\"\"\"\nbody = json.loads(payload_str.strip())\nr = requests.post(url, headers=headers, json=body)\nprint(r.json())";
        }
        if (lang === 'java') {
            var urlJava = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return "import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\n\nString url = \"" + urlJava + "\";\nString json = \"" + escapeJavaString(compact) + "\";\nHttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create(url))\n    .header(\"Content-Type\", \"application/json\")\n    .header(\"x-rapidapi-key\", \"" + key + "\")\n    .header(\"x-rapidapi-host\", \"" + host + "\")\n    .POST(HttpRequest.BodyPublishers.ofString(json))\n    .build();\nHttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());";
        }
        return '';
    }

    function refreshCode() {
        var el = document.getElementById('generated-code');
        var sel = document.getElementById('code-lang');
        if (el && sel) el.textContent = generateCode(sel.value);
    }

    document.getElementById('toggle-req').addEventListener('click',function(e){ e.preventDefault(); var d=document.getElementById('request-schema'); d.classList.toggle('show'); this.setAttribute('aria-expanded',d.classList.contains('show')); });
    document.getElementById('toggle-res').addEventListener('click',function(e){ e.preventDefault(); var d=document.getElementById('response-schema'); d.classList.toggle('show'); this.setAttribute('aria-expanded',d.classList.contains('show')); });
    var toggleErrors=document.getElementById('toggle-errors');if(toggleErrors){ toggleErrors.addEventListener('click',function(e){ e.preventDefault(); var d=document.getElementById('error-codes'); d.classList.toggle('show'); this.setAttribute('aria-expanded',d.classList.contains('show')); }); }

    document.getElementById('code-lang').addEventListener('change', refreshCode);
    document.getElementById('refresh-code-btn').addEventListener('click', refreshCode);
    document.getElementById('copy-code-btn').addEventListener('click', function () {
        var btn = document.getElementById('copy-code-btn');
        var t = document.getElementById('generated-code').textContent;
        navigator.clipboard.writeText(t).then(function () {
            var o = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = o; }, 1500);
        });
    });
    document.getElementById('body-json').addEventListener('input', refreshCode);
    document.getElementById('body-json').addEventListener('change', refreshCode);

    document.querySelectorAll('.faq-q').forEach(function(btn){
        btn.addEventListener('click',function(){ var expanded=this.getAttribute('aria-expanded')==='true'; this.setAttribute('aria-expanded',!expanded); var panel=document.getElementById(this.getAttribute('aria-controls')); if(panel) panel.classList.toggle('show',!expanded); });
    });
    document.getElementById('postman-download').addEventListener('click',function(){
        var hdrs = [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'x-rapidapi-key', value: 'YOUR_RAPIDAPI_KEY' },
            { key: 'x-rapidapi-host', value: host }
        ];
        var coll = { info: { name: "QR Code Generator API", schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [{ name: 'POST /generate', request: { method: 'POST', header: hdrs, url: fullUrl(), body: { mode: 'raw', raw: postmanRawBody() } } }] };
        var blob = new Blob([JSON.stringify(coll,null,2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qr-code-generator-postman-collection.json'; a.click(); URL.revokeObjectURL(a.href);
    });
    var runBtn=document.getElementById('run-btn'),keyInput=document.getElementById('api-key'),resultDiv=document.getElementById('play-result');
    runBtn.addEventListener('click',function(){
        var key=(keyInput.value||'').trim();
        if(!key){ resultDiv.style.display='block'; resultDiv.className='result error'; resultDiv.textContent='Please enter your RapidAPI key.'; return; }
        var bodyStr=document.getElementById('body-json').value.trim(),body;
        try{body=JSON.parse(bodyStr);}catch(e){resultDiv.style.display='block';resultDiv.className='result error';resultDiv.textContent='Invalid JSON: '+e.message;return;}
        runBtn.disabled=true;resultDiv.style.display='block';resultDiv.className='result';resultDiv.textContent='Loading…';
        fetch(fullUrl(),{method:'POST',headers:{'Content-Type':'application/json','x-rapidapi-key':key,'x-rapidapi-host':host},body:JSON.stringify(body)})
        .then(function(r){return r.text().then(function(t){return{status:r.status,body:t};});})
        .then(function(o){resultDiv.className='result '+(o.status>=200&&o.status<300?'success':'error');try{resultDiv.textContent=JSON.stringify(JSON.parse(o.body),null,2);}catch(_){resultDiv.textContent=o.status+'\n'+o.body;}})
        .catch(function(e){resultDiv.className='result error';resultDiv.textContent='Request failed: '+e.message;})
        .finally(function(){runBtn.disabled=false;});
    });
    refreshCode();
})();
