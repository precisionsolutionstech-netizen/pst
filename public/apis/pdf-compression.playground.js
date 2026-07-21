(function(){
    var host='pdf-compression-api1.p.rapidapi.com',path='/optimize',fileUpload=true,rapidUrl="https://rapidapi.com/precisionsolutionstech/api/pdf-compression-api1";

    function buildQueryString() {
        var params = [];
        var m = document.getElementById('param-mode');
        if (m && m.value) params.push('mode=' + encodeURIComponent(m.value));
        if (m && m.value === 'lossless') {
            var ai = document.getElementById('param-allow-image');
            if (ai && ai.checked) params.push('allowImageCompression=true');
        }
        if (m && m.value === 'maxCompression') {
            var cl = document.getElementById('param-compression-level');
            if (cl && cl.value) params.push('compressionLevel=' + encodeURIComponent(cl.value));
        }
        var iq = document.getElementById('param-image-quality');
        if (iq && iq.value !== '') {
            var v = parseInt(iq.value, 10);
            if (!isNaN(v) && v >= 0 && v <= 100) params.push('imageQuality=' + v);
        }
        return params.length ? '?' + params.join('&') : '';
    }

    function fullUrl() {
        return 'https://' + host + path + buildQueryString();
    }

    function isMetadataOnly() {
        var el = document.getElementById('metadata-only');
        return !!(el && el.checked);
    }

    function escapeShellSingleQuoted(s) {
        return s.replace(/'/g, "'\\''");
    }

    function generateCode(lang) {
        var url = fullUrl();
        var meta = isMetadataOnly();
        var key = 'YOUR_RAPIDAPI_KEY';
        if (lang === 'curl') {
            var curl = "curl --request POST \\\n  --url '" + escapeShellSingleQuoted(url) + "' \\\n  --header 'X-RapidAPI-Host: " + host + "' \\\n  --header 'X-RapidAPI-Key: " + key + "'";
            if (meta) curl += " \\\n  --header 'Accept: application/json'";
            curl += " \\\n  --form 'file=@document.pdf'";
            curl += meta ? "\n# Response body is JSON (sizes). Omit Accept header and add --output optimized.pdf for the PDF binary." : " \\\n  --output optimized.pdf";
            return curl;
        }
        var urlJson = JSON.stringify(url);
        var hdr = "    'X-RapidAPI-Key': '" + key + "',\n    'X-RapidAPI-Host': '" + host + "'";
        if (meta) hdr += ",\n    'Accept': 'application/json'";
        if (lang === 'javascript') {
            var js = 'const url = ' + urlJson + ';\nconst formData = new FormData();\nformData.append(\'file\', fileInput.files[0]);\nconst res = await fetch(url, {\n  method: \'POST\',\n  headers: {\n' + hdr + '\n  },\n  body: formData\n});\n';
            return js + (meta ? 'const data = await res.json();\nconsole.log(data);' : 'const blob = await res.blob();\n// save as optimized.pdf');
        }
        if (lang === 'typescript') {
            var ts = 'const url = ' + urlJson + ';\nconst formData = new FormData();\nformData.append(\'file\', fileInput.files[0]);\nconst res = await fetch(url, {\n  method: \'POST\',\n  headers: {\n' + hdr + '\n  },\n  body: formData\n});\n';
            return ts + (meta ? 'const data: unknown = await res.json();\nconsole.log(data);' : 'const blob = await res.blob();\n// save as optimized.pdf');
        }
        if (lang === 'python') {
            var py = 'import requests\n\nurl = ' + JSON.stringify(url) + '\nheaders = {\n    \'X-RapidAPI-Key\': \'' + key + '\',\n    \'X-RapidAPI-Host\': \'' + host + '\'';
            if (meta) py += ',\n    \'Accept\': \'application/json\'';
            py += '\n}\nwith open(\'document.pdf\', \'rb\') as f:\n    r = requests.post(url, files={\'file\': f}, headers=headers)\n';
            return py + (meta ? 'print(r.json())' : 'with open(\'optimized.pdf\', \'wb\') as out:\n    out.write(r.content)');
        }
        if (lang === 'java') {
            var urlJava = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            var java = '// OkHttp 4+ — e.g. implementation("com.squareup.okhttp3:okhttp:4.12.0")\nimport okhttp3.*;\nimport java.io.File;\n\nString url = "' + urlJava + '";\nRequestBody fileBody = RequestBody.create(new File("document.pdf"), MediaType.parse("application/pdf"));\nMultipartBody body = new MultipartBody.Builder()\n    .setType(MultipartBody.FORM)\n    .addFormDataPart("file", "document.pdf", fileBody)\n    .build();\nRequest request = new Request.Builder()\n    .url(url)\n    .addHeader("X-RapidAPI-Key", "' + key + '")\n    .addHeader("X-RapidAPI-Host", "' + host + '")';
            if (meta) java += '\n    .addHeader("Accept", "application/json")';
            java += '\n    .post(body)\n    .build();\ntry (Response response = new OkHttpClient().newCall(request).execute()) {\n    // JSON metadata vs PDF bytes — inspect Content-Type\n}\n';
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

    document.querySelectorAll('.faq-q').forEach(function(btn){
        btn.addEventListener('click',function(){ var expanded=this.getAttribute('aria-expanded')==='true'; this.setAttribute('aria-expanded',!expanded); var panel=document.getElementById(this.getAttribute('aria-controls')); if(panel) panel.classList.toggle('show',!expanded); });
    });
    var modeEl=document.getElementById('param-mode'), allowImgLabel=document.getElementById('label-allow-image'), compLevelEl=document.getElementById('param-compression-level'), compLevelLabel=document.getElementById('label-compression-level');
    function updateParamVisibility(){ var m=modeEl.value; allowImgLabel.style.display=m==='lossless'?'block':'none'; compLevelLabel.style.display=compLevelEl.style.display=m==='maxCompression'?'block':'none'; refreshCode(); }
    if(modeEl){ modeEl.addEventListener('change',updateParamVisibility); updateParamVisibility(); }
    ['param-allow-image','param-compression-level','metadata-only'].forEach(function(id){
        var el=document.getElementById(id);
        if(el) el.addEventListener('change', refreshCode);
    });
    var iqEl=document.getElementById('param-image-quality');
    if(iqEl){ iqEl.addEventListener('input', refreshCode); iqEl.addEventListener('change', refreshCode); }

    document.getElementById('postman-download').addEventListener('click',function(){
        var hdrs = [{ key: 'X-RapidAPI-Key', value: 'YOUR_RAPIDAPI_KEY' }, { key: 'X-RapidAPI-Host', value: host }];
        if (isMetadataOnly()) hdrs.push({ key: 'Accept', value: 'application/json' });
        var coll = { info: { name: "PDF Compression API", schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [{ name: 'POST /optimize', request: { method: 'POST', header: hdrs, url: fullUrl(), body: { mode: 'formdata', formdata: [{ key: 'file', type: 'file', src: '' }] } } }] };
        var blob = new Blob([JSON.stringify(coll,null,2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pdf-compression-postman-collection.json'; a.click(); URL.revokeObjectURL(a.href);
    });
    var runBtn=document.getElementById('run-btn'),keyInput=document.getElementById('api-key'),resultDiv=document.getElementById('play-result');
    runBtn.addEventListener('click',function(){
        var key=(keyInput.value||'').trim();
        if(!key){ resultDiv.style.display='block'; resultDiv.className='result error'; resultDiv.textContent='Please enter your RapidAPI key.'; return; }
        var fileInput=document.getElementById('file-input');
        if(!fileInput.files||!fileInput.files[0]){resultDiv.style.display='block';resultDiv.className='result error';resultDiv.textContent='Please select a PDF file.';return;}
        runBtn.disabled=true;resultDiv.style.display='block';resultDiv.className='result';resultDiv.textContent='Uploading…';
        var formData=new FormData();formData.append('file',fileInput.files[0]);
        var meta=isMetadataOnly();
        var url=fullUrl();
        var headers={'X-RapidAPI-Key':key,'X-RapidAPI-Host':host};
        if(meta) headers['Accept']='application/json';
        fetch(url,{method:'POST',headers:headers,body:formData})
        .then(function(r){
            var ct=r.headers.get('Content-Type')||'';
            if(meta||ct.indexOf('application/json')>=0){ return r.json().then(function(j){ return { json: true, data: j }; }); }
            return r.blob().then(function(b){ return { json: false, blob: b, size: b.size }; });
        })
        .then(function(o){
            resultDiv.className='result success';
            if(o.json){ resultDiv.textContent=JSON.stringify(o.data,null,2); }
            else{
                resultDiv.textContent='';
                resultDiv.appendChild(document.createTextNode('PDF received ('+o.size+' bytes). '));
                var a=document.createElement('a'); a.href=URL.createObjectURL(o.blob); a.download='optimized.pdf'; a.textContent='Download optimized.pdf';
                resultDiv.appendChild(a);
            }
        })
        .catch(function(e){resultDiv.className='result error';resultDiv.textContent='Request failed: '+e.message;})
        .finally(function(){runBtn.disabled=false;});
    });
    refreshCode();
})();
