(function(){
    var host='pdf-table-extraction-api.p.rapidapi.com',path='/extract',rapidUrl="https://rapidapi.com/precisionsolutionstech/api/pdf-table-extraction-api";

    function buildQueryParamEntries() {
        var entries = [];
        var of = document.getElementById('param-output-format');
        if (of && of.value) entries.push(['outputFormat', of.value]);
        var pg = document.getElementById('param-pages');
        if (pg && pg.value && pg.value.trim() !== '') entries.push(['pages', pg.value.trim()]);
        var st = document.getElementById('param-strategy');
        if (st && st.value) entries.push(['strategy', st.value]);
        var mt = document.getElementById('param-merge-tables');
        if (mt && mt.checked) entries.push(['mergeTablesAcrossPages', 'true']);
        var cf = document.getElementById('param-confidence');
        if (cf && !cf.checked) entries.push(['confidenceScores', 'false']);
        return entries;
    }

    function buildQueryString() {
        var e = buildQueryParamEntries();
        if (!e.length) return '';
        return '?' + e.map(function (pair) {
            return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1]);
        }).join('&');
    }

    function fullUrl() {
        return 'https://' + host + path + buildQueryString();
    }

    function outputFormatValue() {
        var of = document.getElementById('param-output-format');
        return (of && of.value) || 'json';
    }

    function escapeShellSingleQuoted(s) {
        return s.replace(/'/g, "'\\''");
    }

    function pythonParamsLiteral() {
        var e = buildQueryParamEntries();
        if (!e.length) return '{}';
        return '{\n' + e.map(function (pair) {
            var k = String(pair[0]).replace(/'/g, "\\'");
            var v = String(pair[1]).replace(/'/g, "\\'");
            return "    '" + k + "': '" + v + "'";
        }).join(',\n') + '\n}';
    }

    function generateCode(lang) {
        var url = fullUrl();
        var key = 'YOUR_RAPIDAPI_KEY';
        var fmt = outputFormatValue();
        if (lang === 'curl') {
            var curl = "curl --request POST \\\n  --url '" + escapeShellSingleQuoted(url) + "' \\\n  --header 'X-RapidAPI-Host: " + host + "' \\\n  --header 'X-RapidAPI-Key: " + key + "' \\\n  --form 'file=@document.pdf'";
            return curl;
        }
        var urlJson = JSON.stringify(url);
        var hdr = "    'X-RapidAPI-Key': '" + key + "',\n    'X-RapidAPI-Host': '" + host + "'";
        var formBlock = 'const formData = new FormData();\nformData.append(\'file\', fileInput.files[0]);\nconst res = await fetch(' + urlJson + ', {\n  method: \'POST\',\n  headers: {\n' + hdr + '\n  },\n  body: formData\n});\n';
        if (lang === 'javascript') {
            if (fmt === 'json') return formBlock + 'const data = await res.json();\nconsole.log(data);';
            var ext = fmt === 'xlsx' ? 'xlsx' : 'zip';
            return formBlock + 'const blob = await res.blob();\n// save response as tables.' + ext;
        }
        if (lang === 'typescript') {
            if (fmt === 'json') return formBlock + 'const data: unknown = await res.json();\nconsole.log(data);';
            var extTs = fmt === 'xlsx' ? 'xlsx' : 'zip';
            return formBlock + 'const blob: Blob = await res.blob();\n// save response as tables.' + extTs;
        }
        if (lang === 'python') {
            var py = 'import requests\n\nurl = ' + JSON.stringify(url) + '\nheaders = {\n    \'X-RapidAPI-Key\': \'' + key + '\',\n    \'X-RapidAPI-Host\': \'' + host + '\'\n}\nparams = ' + pythonParamsLiteral() + '\nwith open(\'document.pdf\', \'rb\') as f:\n    r = requests.post(url, files={\'file\': f}, headers=headers, params=params)\n';
            if (fmt === 'json') return py + 'print(r.json())';
            if (fmt === 'xlsx') return py + 'with open(\'tables.xlsx\', \'wb\') as out:\n    out.write(r.content)';
            return py + 'with open(\'tables.zip\', \'wb\') as out:\n    out.write(r.content)';
        }
        if (lang === 'java') {
            var urlJava = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            var java = '// OkHttp 4+ — e.g. implementation("com.squareup.okhttp3:okhttp:4.12.0")\nimport okhttp3.*;\nimport java.io.File;\n\nString url = "' + urlJava + '";\nRequestBody fileBody = RequestBody.create(new File("document.pdf"), MediaType.parse("application/pdf"));\nMultipartBody body = new MultipartBody.Builder()\n    .setType(MultipartBody.FORM)\n    .addFormDataPart("file", "document.pdf", fileBody)\n    .build();\nRequest request = new Request.Builder()\n    .url(url)\n    .addHeader("X-RapidAPI-Key", "' + key + '")\n    .addHeader("X-RapidAPI-Host", "' + host + '")\n    .post(body)\n    .build();\ntry (Response response = new OkHttpClient().newCall(request).execute()) {\n    // outputFormat=json → parse JSON; xlsx/csv → binary body (Excel or ZIP)\n}\n';
            return java;
        }
        return '';
    }

    function refreshCode() {
        var el = document.getElementById('generated-code');
        var sel = document.getElementById('code-lang');
        if (el && sel) el.textContent = generateCode(sel.value);
    }

    document.querySelectorAll('[data-rapid-docs]').forEach(function(a){ a.href = rapidUrl; });
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

    ['param-output-format','param-strategy','param-merge-tables','param-confidence'].forEach(function(id){
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', refreshCode);
    });
    var pgEl = document.getElementById('param-pages');
    if (pgEl) { pgEl.addEventListener('input', refreshCode); pgEl.addEventListener('change', refreshCode); }

    document.querySelectorAll('.faq-q').forEach(function(btn){
        btn.addEventListener('click',function(){ var expanded=this.getAttribute('aria-expanded')==='true'; this.setAttribute('aria-expanded',!expanded); var panel=document.getElementById(this.getAttribute('aria-controls')); if(panel) panel.classList.toggle('show',!expanded); });
    });
    document.getElementById('postman-download').addEventListener('click',function(){
        var hdrs = [{ key: 'X-RapidAPI-Key', value: 'YOUR_RAPIDAPI_KEY' }, { key: 'X-RapidAPI-Host', value: host }];
        var coll = { info: { name: "PDF Table Extraction API", schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [{ name: 'POST /extract', request: { method: 'POST', header: hdrs, url: fullUrl(), body: { mode: 'formdata', formdata: [{ key: 'file', type: 'file', src: '' }] } } }] };
        var blob = new Blob([JSON.stringify(coll,null,2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pdf-table-extraction-postman-collection.json'; a.click(); URL.revokeObjectURL(a.href);
    });
    var runBtn=document.getElementById('run-btn'),keyInput=document.getElementById('api-key'),resultDiv=document.getElementById('play-result');
    runBtn.addEventListener('click',function(){
        var key=(keyInput.value||'').trim();
        if(!key){ resultDiv.style.display='block'; resultDiv.className='result error'; resultDiv.textContent='Please enter your RapidAPI key.'; return; }
        var fileInput=document.getElementById('file-input');
        if(!fileInput.files||!fileInput.files[0]){resultDiv.style.display='block';resultDiv.className='result error';resultDiv.textContent='Please select a PDF file.';return;}
        var url = fullUrl();
        var outputFormat=outputFormatValue();
        runBtn.disabled=true;resultDiv.style.display='block';resultDiv.className='result';resultDiv.textContent='Uploading…';
        var formData=new FormData();formData.append('file',fileInput.files[0]);
        fetch(url,{method:'POST',headers:{'X-RapidAPI-Key':key,'X-RapidAPI-Host':host},body:formData})
        .then(function(r){
            var ct=(r.headers.get('Content-Type')||'').toLowerCase();
            var isJson=ct.indexOf('application/json')>=0;
            if(!r.ok&&isJson) return r.json().then(function(j){ return { error: true, data: j }; });
            if(!r.ok) return r.text().then(function(t){ return { error: true, text: t }; });
            if(outputFormat==='json') return r.text().then(function(t){ try{ return { json: true, data: JSON.parse(t) }; } catch(_){ return { json: false, text: t }; } });
            return r.blob().then(function(b){ return { binary: true, blob: b, size: b.size, ext: outputFormat==='xlsx'?'xlsx':'zip' }; });
        })
        .then(function(o){
            if(o.error){ resultDiv.className='result error'; resultDiv.textContent=o.data?JSON.stringify(o.data,null,2):o.text; return; }
            resultDiv.className='result success';
            if(o.json){ resultDiv.textContent=JSON.stringify(o.data,null,2); }
            else if(o.text!==undefined){ resultDiv.textContent=o.text; }
            else if(o.binary){
                resultDiv.textContent='';
                resultDiv.appendChild(document.createTextNode('File received ('+o.size+' bytes). '));
                var a=document.createElement('a'); a.href=URL.createObjectURL(o.blob); a.download='tables.'+o.ext; a.textContent='Download tables.'+o.ext; resultDiv.appendChild(a);
            }
        })
        .catch(function(e){resultDiv.className='result error';resultDiv.textContent='Request failed: '+e.message;})
        .finally(function(){runBtn.disabled=false;});
    });
    refreshCode();
})();
