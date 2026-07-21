(function(){
    var host = 'universal-data-format-converter.p.rapidapi.com';
    var path = '/convert';
    var INPUT_FORMATS = ['json','xml','csv','tsv','excel','yaml','ndjson','sql-insert','html-table','html','markdown','env','query-string','base64'];
    var OUTPUT_FORMATS = ['json','xml','csv','tsv','excel','yaml','ndjson','sql-insert','html-table','html','markdown','env','query-string','base64','pdf'];
    var DATA_LABELS = {
        'json':'Paste JSON object or array',
        'xml':'Paste XML',
        'csv':'Paste CSV',
        'tsv':'Paste TSV',
        'excel':'Paste base64-encoded .xlsx (or use JSON body with data as base64 string)',
        'yaml':'Paste YAML',
        'ndjson':'Paste NDJSON (one JSON object per line)',
        'sql-insert':'Paste SQL INSERT statement(s)',
        'html-table':'Paste HTML with <table>',
        'html':'Paste full HTML document (page → markdown)',
        'markdown':'Paste Markdown (.md content → html or pdf)',
        'env':'Paste ENV (KEY=value)',
        'query-string':'Paste query string (e.g. a=1&b=2)',
        'base64':'Paste base64-encoded data'
    };
    var fromSelect = document.getElementById('from-format');
    var toSelect = document.getElementById('to-format');
    var playData = document.getElementById('play-data');
    var playDataLabel = document.getElementById('play-data-label');
    var inputOptBody = document.getElementById('input-options-body');
    var outputOptBody = document.getElementById('output-options-body');
    var inputPanel = document.getElementById('input-options-panel');
    var outputPanel = document.getElementById('output-options-panel');

    INPUT_FORMATS.forEach(function(f){
        var o = document.createElement('option'); o.value = f; o.textContent = f; fromSelect.appendChild(o);
    });
    OUTPUT_FORMATS.forEach(function(f){
        var o = document.createElement('option'); o.value = f; o.textContent = f; toSelect.appendChild(o);
    });
    var toFormatFile = document.getElementById('to-format-file');
    OUTPUT_FORMATS.forEach(function(f){
        var o = document.createElement('option'); o.value = f; o.textContent = f; toFormatFile.appendChild(o);
    });

    function isFileMode(){ return document.getElementById('input-mode-file').checked; }

    var FORMAT_EXT = { pdf: 'pdf', excel: 'xlsx', html: 'html', 'html-table': 'html', csv: 'csv', tsv: 'tsv', xml: 'xml', yaml: 'yaml', json: 'json', ndjson: 'ndjson', markdown: 'md', env: 'env' };
    var BINARY_FORMATS = { pdf: true, excel: true };

    function formatAccept(to){
        if(to === 'json') return 'application/json';
        if(to === 'pdf' || to === 'excel') return 'application/octet-stream';
        if(to === 'html' || to === 'html-table') return 'text/html';
        return 'text/plain';
    }
    function shouldDownloadResponse(r, to, wantDownload){
        if(BINARY_FORMATS[to]) return true;
        if(wantDownload) return true;
        var cd = r.headers.get('content-disposition') || '';
        return cd.indexOf('attachment') >= 0;
    }
    function parseFilenameFromDisposition(cd){
        if(!cd) return null;
        var m = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
        return m ? m[1].replace(/"/g, '') : null;
    }
    function getDownloadExt(to){ return FORMAT_EXT[to] || 'bin'; }
    function handleConvertResponse(r, to, wantDownload){
        var ct = r.headers.get('content-type') || '';
        if(shouldDownloadResponse(r, to, wantDownload)){
            return r.arrayBuffer().then(function(buf){
                if(!r.ok){
                    try{ var txt = new TextDecoder().decode(buf); var j = JSON.parse(txt); return { ok: false, data: JSON.stringify(j, null, 2) }; }catch(_){ return { ok: false, data: r.status + ' ' + r.statusText }; }
                }
                var blobType = ct.split(';')[0].trim() || (to === 'pdf' ? 'application/pdf' : to === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/octet-stream');
                var blob = new Blob([buf], { type: blobType });
                var url = URL.createObjectURL(blob);
                var filename = parseFilenameFromDisposition(r.headers.get('content-disposition') || '') || ('output.' + getDownloadExt(to));
                var a = document.createElement('a'); a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
                return { ok: true, data: 'File downloaded: ' + filename };
            });
        }
        if(ct.includes('application/json')) return r.json().then(function(j){ return { ok: r.ok, data: JSON.stringify(j, null, 2) }; });
        return r.text().then(function(t){ return { ok: r.ok, data: r.status + '\n' + (t.length > 2000 ? t.slice(0,2000) + '...[truncated]' : t) }; });
    }
    document.getElementById('input-mode-paste').addEventListener('change', function(){
        document.getElementById('paste-mode-fields').style.display = '';
        document.getElementById('file-mode-fields').style.display = 'none';
        updatePlayground(); refreshCode();
    });
    document.getElementById('input-mode-file').addEventListener('change', function(){
        document.getElementById('paste-mode-fields').style.display = 'none';
        document.getElementById('file-mode-fields').style.display = 'block';
        refreshCode();
    });

    function buildOptRows(prefix, formatKey, container){
        container.innerHTML = '';
        var schema = window.UDCF_OPTIONS_SCHEMA;
        if(!schema) return;
        var opts = (prefix === 'input' ? schema.input : schema.output)[formatKey];
        if(!opts || opts.length === 0){ container.innerHTML = '<p class="opt-desc">No options for this format.</p>'; return; }
        opts.forEach(function(opt){
            var row = document.createElement('div'); row.className = 'opt-row';
            var id = prefix + '-' + formatKey + '-' + opt.key;
            var input = '';
            if(opt.type === 'boolean'){
                input = '<input type="checkbox" id="'+id+'" data-opt-key="'+opt.key+'" '+(opt.default === true ? 'checked' : '')+'>';
            } else if(opt.type === 'number'){
                input = '<input type="number" id="'+id+'" data-opt-key="'+opt.key+'" value="'+(opt.default !== undefined ? String(opt.default) : '')+'" style="max-width:120px">';
            } else if(opt.enum){
                input = '<select id="'+id+'" data-opt-key="'+opt.key+'">';
                opt.enum.forEach(function(e){ input += '<option value="'+e+'"'+(e === opt.default ? ' selected' : '')+'>'+e+'</option>'; });
                input += '</select>';
            } else {
                var val = (opt.default !== undefined && opt.default !== null) ? String(opt.default) : '';
                input = '<input type="text" id="'+id+'" data-opt-key="'+opt.key+'" value="'+val.replace(/"/g,'&quot;')+'" placeholder="'+(opt.required ? 'required' : '')+'" style="max-width:200px">';
            }
            row.innerHTML = '<label for="'+id+'">'+opt.key+(opt.required ? ' *' : '')+'</label><div>'+input+'</div><span style="font-size:0.85rem;color:var(--muted)">default: '+(opt.default !== undefined ? JSON.stringify(opt.default) : '—')+'</span>'+(opt.desc ? '<div class="opt-desc">'+opt.desc+'</div>' : '');
            container.appendChild(row);
        });
    }

    function collectOptions(prefix, formatKey){
        var schema = window.UDCF_OPTIONS_SCHEMA;
        if(!schema) return {};
        var opts = (prefix === 'input' ? schema.input : schema.output)[formatKey];
        if(!opts || opts.length === 0) return {};
        var out = {};
        opts.forEach(function(opt){
            var id = prefix + '-' + formatKey + '-' + opt.key;
            var el = document.getElementById(id);
            if(!el) return;
            var val;
            if(opt.type === 'boolean') val = el.checked;
            else if(opt.type === 'number') val = el.value === '' ? undefined : Number(el.value);
            else val = el.value === '' ? undefined : el.value;
            if(val !== undefined && val !== '' && val !== opt.default) out[opt.key] = val;
        });
        return out;
    }

    function outputFormatOptionKey(from, to){
        if(to === 'pdf' && from === 'markdown') return 'documentPdf';
        return to;
    }

    function updatePlayground(){
        var from = fromSelect.value, to = toSelect.value;
        playDataLabel.textContent = 'Request data';
        playData.placeholder = DATA_LABELS[from] || 'Paste data';
        playData.value = (window.UDCF_SAMPLES && window.UDCF_SAMPLES[from]) ? (typeof window.UDCF_SAMPLES[from] === 'string' ? window.UDCF_SAMPLES[from] : JSON.stringify(window.UDCF_SAMPLES[from], null, 2)) : '';
        buildOptRows('input', from, inputOptBody);
        buildOptRows('output', outputFormatOptionKey(from, to), outputOptBody);
    }

    fromSelect.addEventListener('change', updatePlayground);
    toSelect.addEventListener('change', updatePlayground);
    updatePlayground();

    inputPanel.querySelector('h4').addEventListener('click', function(){ inputPanel.classList.toggle('collapsed'); });
    outputPanel.querySelector('h4').addEventListener('click', function(){ outputPanel.classList.toggle('collapsed'); });

    function formatToOptionKey(f){
        return (window.UDCF_FORMAT_TO_OPTION_KEY || function(x){ return x; })(f) || f;
    }
    function getPlaygroundRequest(){
        var from = fromSelect.value, to = toSelect.value;
        var dataRaw = playData.value.trim();
        var data;
        if(from === 'json'){
            try{ data = dataRaw ? JSON.parse(dataRaw) : { name: 'John', age: 30 }; } catch(e){ return { error: 'Invalid JSON: ' + e.message }; }
        } else data = dataRaw || ((window.UDCF_SAMPLES && window.UDCF_SAMPLES[from]) ? (typeof window.UDCF_SAMPLES[from] === 'string' ? window.UDCF_SAMPLES[from] : JSON.stringify(window.UDCF_SAMPLES[from])) : '');
        var inputOpts = collectOptions('input', from);
        var outputOpts = collectOptions('output', outputFormatOptionKey(from, to));
        var options = {};
        if(Object.keys(inputOpts).length){ options.input = {}; options.input[formatToOptionKey(from)] = inputOpts; }
        if(Object.keys(outputOpts).length){ options.output = {}; options.output[formatToOptionKey(outputFormatOptionKey(from, to))] = outputOpts; }
        if(!options.input || !Object.keys(options.input).length) delete options.input;
        if(!options.output || !Object.keys(options.output).length) delete options.output;
        return { from: from, to: to, data: data, options: Object.keys(options).length ? options : undefined };
    }

    document.getElementById('run-btn').addEventListener('click', function(){
        var key = (document.getElementById('api-key').value || '').trim();
        if(!key){ document.getElementById('play-result').style.display='block'; document.getElementById('play-result').className='result error'; document.getElementById('play-result').textContent='Please enter your RapidAPI key.'; return; }
        document.getElementById('run-btn').disabled = true;
        document.getElementById('play-result').style.display = 'block';
        document.getElementById('play-result').className = 'result';
        document.getElementById('play-result').textContent = 'Loading…';

        if(isFileMode()){
            var fileInput = document.getElementById('play-file');
            if(!fileInput.files || fileInput.files.length === 0){ document.getElementById('play-result').className = 'result error'; document.getElementById('play-result').textContent = 'Please select a file.'; document.getElementById('run-btn').disabled = false; return; }
            var toF = document.getElementById('to-format-file').value;
            var form = new FormData();
            form.append('file', fileInput.files[0]);
            form.append('to', toF);
            var optStr = (document.getElementById('play-options-json').value || '').trim();
            if(optStr){ try{ JSON.parse(optStr); form.append('options', optStr); } catch(e){ document.getElementById('play-result').className = 'result error'; document.getElementById('play-result').textContent = 'Invalid options JSON: ' + e.message; document.getElementById('run-btn').disabled = false; return; } }
            var wantDownload = document.getElementById('play-download').checked;
            if(wantDownload) form.append('download', '1');
            fetch('https://'+host+path, {
                method: 'POST',
                headers: { 'Accept': formatAccept(toF), 'x-rapidapi-key': key, 'x-rapidapi-host': host },
                body: form
            }).then(function(r){
                return handleConvertResponse(r, toF, wantDownload);
            }).then(function(o){
                document.getElementById('play-result').className = 'result ' + (o.ok ? 'success' : 'error');
                document.getElementById('play-result').textContent = o.data;
            }).catch(function(e){
                document.getElementById('play-result').className = 'result error';
                document.getElementById('play-result').textContent = 'Request failed: ' + e.message;
            }).finally(function(){ document.getElementById('run-btn').disabled = false; });
            return;
        }

        var req = getPlaygroundRequest();
        if(req.error){ document.getElementById('play-result').style.display='block'; document.getElementById('play-result').className='result error'; document.getElementById('play-result').textContent=req.error; document.getElementById('run-btn').disabled = false; return; }
        var body = JSON.stringify({ from: req.from, to: req.to, data: req.data, options: req.options || {} });
        fetch('https://'+host+path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': formatAccept(req.to), 'x-rapidapi-key': key, 'x-rapidapi-host': host },
            body: body
        }).then(function(r){
            return handleConvertResponse(r, req.to, false);
        }).then(function(o){
            document.getElementById('play-result').className = 'result ' + (o.ok ? 'success' : 'error');
            document.getElementById('play-result').textContent = o.data;
        }).catch(function(e){
            document.getElementById('play-result').className = 'result error';
            document.getElementById('play-result').textContent = 'Request failed: ' + e.message;
        }).finally(function(){ document.getElementById('run-btn').disabled = false; });
    });

    function generateCode(lang){
        var key = 'YOUR_RAPIDAPI_KEY';
        if(isFileMode()){
            var toF = document.getElementById('to-format-file').value;
            var accept = formatAccept(toF);
            var optStr = (document.getElementById('play-options-json').value || '').trim();
            var download = document.getElementById('play-download').checked;
            if(lang === 'curl'){
                var curl = 'curl --request POST \\\n  --url \'https://'+host+path+'\' \\\n  --header \'Accept: '+accept+'\' \\\n  --header \'x-rapidapi-key: '+key+'\' \\\n  --header \'x-rapidapi-host: '+host+'\' \\\n  -F \'file=@yourfile.xlsx\' \\\n  -F \'to='+toF+'\'';
                if(download) curl += ' \\\n  -F \'download=1\'';
                if(optStr) curl += ' \\\n  -F \'options=\''+optStr.replace(/'/g,"'\\\\''")+'\'';
                return curl;
            }
            if(lang === 'javascript'){
                var j = 'const form = new FormData();\nform.append(\'file\', fileInput.files[0]);\nform.append(\'to\', \''+toF+'\');\n';
                if(download) j += 'form.append(\'download\', \'1\');\n';
                if(optStr) j += 'form.append(\'options\', \''+optStr.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+'\');\n';
                j += 'const res = await fetch(\'https://'+host+path+'\', {\n  method: \'POST\',\n  headers: { \'Accept\': \''+accept+'\', \'x-rapidapi-key\': \''+key+'\', \'x-rapidapi-host\': \''+host+'\' },\n  body: form\n});\nconst result = '+(toF === 'json' ? 'await res.json()' : toF === 'pdf' || toF === 'excel' ? 'await res.arrayBuffer()' : 'await res.text()')+';\nconsole.log(result);';
                return j;
            }
            if(lang === 'typescript'){
                var cast = toF === 'json' ? ' as Record<string, unknown>' : toF === 'pdf' || toF === 'excel' ? ': ArrayBuffer' : ': string';
                var t = 'const form = new FormData();\nform.append(\'file\', fileInput.files[0]);\nform.append(\'to\', \''+toF+'\');\n';
                if(download) t += 'form.append(\'download\', \'1\');\n';
                if(optStr) t += 'form.append(\'options\', \''+optStr.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+'\');\n';
                t += 'const res = await fetch(\'https://'+host+path+'\', {\n  method: \'POST\',\n  headers: { \'Accept\': \''+accept+'\', \'x-rapidapi-key\': \''+key+'\', \'x-rapidapi-host\': \''+host+'\' },\n  body: form\n});\nconst result'+cast+' = '+(toF === 'json' ? 'await res.json()' : toF === 'pdf' || toF === 'excel' ? 'await res.arrayBuffer()' : 'await res.text()')+';\nconsole.log(result);';
                return t;
            }
            if(lang === 'python'){
                var dataPy = 'data = {"to": "'+toF+'"}\n';
                if(download) dataPy += 'data["download"] = "1"\n';
                var py = 'import requests\n\nurl = "https://'+host+path+'"\nheaders = {"Accept": "'+accept+'", "x-rapidapi-key": "'+key+'", "x-rapidapi-host": "'+host+'"}\nfiles = {"file": open("yourfile.xlsx", "rb")}\n'+dataPy+'res = requests.post(url, headers=headers, files=files, data=data)\nprint(res.text if res.ok else res.json())';
                return py;
            }
            if(lang === 'java'){
                var boundary = '----FormBoundary' + String(Math.random()).slice(2, 12);
                var ja = '// Java 11+. Replace path with your file.\n';
                ja += 'import java.io.ByteArrayOutputStream;\nimport java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\nimport java.nio.charset.StandardCharsets;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\nimport java.nio.file.Paths;\n\n';
                ja += 'Path filePath = Paths.get("yourfile.xlsx");\n';
                ja += 'String boundary = "'+boundary+'";\n';
                ja += 'String to = "'+toF+'";\n';
                ja += 'byte[] fileBytes = Files.readAllBytes(filePath);\n';
                ja += 'ByteArrayOutputStream out = new ByteArrayOutputStream();\n';
                ja += 'String nl = "\\r\\n";\n';
                ja += 'out.write(("--" + boundary + nl + "Content-Disposition: form-data; name=\\"file\\"; filename=\\"\" + filePath.getFileName() + "\\"" + nl + "Content-Type: application/octet-stream" + nl + nl).getBytes(StandardCharsets.UTF_8));\n';
                ja += 'out.write(fileBytes);\n';
                ja += 'out.write((nl + "--" + boundary + nl + "Content-Disposition: form-data; name=\\"to\\"" + nl + nl + to + nl).getBytes(StandardCharsets.UTF_8));\n';
                if(download) ja += 'out.write(("--" + boundary + nl + "Content-Disposition: form-data; name=\\"download\\"" + nl + nl + "1" + nl).getBytes(StandardCharsets.UTF_8));\n';
                ja += 'out.write(("--" + boundary + "--" + nl).getBytes(StandardCharsets.UTF_8));\n';
                ja += 'HttpRequest request = HttpRequest.newBuilder()\n';
                ja += '    .uri(URI.create("https://'+host+path+'"))\n';
                ja += '    .header("Content-Type", "multipart/form-data; boundary=" + boundary)\n';
                ja += '    .header("Accept", "'+accept+'")\n';
                ja += '    .header("x-rapidapi-key", "'+key+'")\n';
                ja += '    .header("x-rapidapi-host", "'+host+'")\n';
                ja += '    .POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray()))\n';
                ja += '    .build();\n';
                ja += 'HttpResponse<byte[]> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofByteArray());\n';
                ja += 'System.out.println(response.statusCode());\n';
                ja += 'System.out.println(new String(response.body(), StandardCharsets.UTF_8));';
                return ja;
            }
            return '';
        }
        var req = getPlaygroundRequest();
        if(req.error) return '// ' + req.error;
        var bodyStr = JSON.stringify({ from: req.from, to: req.to, data: req.data, options: req.options || {} });
        var accept = formatAccept(req.to);
        var bodyEscaped = bodyStr.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n');
        var handlers = { json: 'await res.json()', text: 'await res.text()', binary: 'await res.arrayBuffer()' };
        var handler = req.to === 'json' ? 'json' : (req.to === 'pdf' || req.to === 'excel') ? 'binary' : 'text';
        if(lang === 'curl'){
            return 'curl --request POST \\\n  --url \'https://'+host+path+'\' \\\n  --header \'Content-Type: application/json\' \\\n  --header \'Accept: '+accept+'\' \\\n  --header \'x-rapidapi-key: '+key+'\' \\\n  --header \'x-rapidapi-host: '+host+'\' \\\n  --data \''+bodyStr.replace(/'/g,"'\\\\''")+'\'';
        }
        if(lang === 'javascript'){
            return 'const res = await fetch(\'https://'+host+path+'\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'Accept\': \''+accept+'\',\n    \'x-rapidapi-key\': \''+key+'\',\n    \'x-rapidapi-host\': \''+host+'\'\n  },\n  body: JSON.stringify('+JSON.stringify({ from: req.from, to: req.to, data: req.data, options: req.options })+')\n});\nconst result = '+handlers[handler]+';\nconsole.log(result);';
        }
        if(lang === 'typescript'){
            var cast = handler === 'json' ? ' as Record<string, unknown>' : handler === 'text' ? ': string' : ': ArrayBuffer';
            return 'const res = await fetch(\'https://'+host+path+'\', {\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': \'application/json\',\n    \'Accept\': \''+accept+'\',\n    \'x-rapidapi-key\': \''+key+'\',\n    \'x-rapidapi-host\': \''+host+'\'\n  },\n  body: JSON.stringify('+JSON.stringify({ from: req.from, to: req.to, data: req.data, options: req.options })+')\n});\nconst result'+cast+' = '+handlers[handler]+';\nconsole.log(result);';
        }
        if(lang === 'python'){
            var pl = JSON.stringify({ from: req.from, to: req.to, data: req.data, options: req.options || {} });
            var pyPayload = pl.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r');
            return 'import http.client\nimport json\n\nconn = http.client.HTTPSConnection("'+host+'")\npayload = "'+pyPayload+'"\nheaders = {\n    "Content-Type": "application/json",\n    "Accept": "'+accept+'",\n    "x-rapidapi-key": "'+key+'",\n    "x-rapidapi-host": "'+host+'"\n}\nconn.request("POST", "'+path+'", payload, headers)\nres = conn.getresponse()\ndata = res.read()\nprint(data.decode())';
        }
        if(lang === 'java'){
            var bodyJava = bodyStr.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n');
            return 'HttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create("https://'+host+path+'"))\n    .header("Content-Type", "application/json")\n    .header("Accept", "'+accept+'")\n    .header("x-rapidapi-key", "'+key+'")\n    .header("x-rapidapi-host", "'+host+'")\n    .method("POST", HttpRequest.BodyPublishers.ofString("'+bodyJava+'"))\n    .build();\nHttpResponse<String> response = HttpClient.newHttpClient()\n    .send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());';
        }
        return '';
    }

    function refreshCode(){ document.getElementById('generated-code').textContent = generateCode(document.getElementById('code-lang').value); }
    document.getElementById('code-lang').addEventListener('change', refreshCode);
    document.getElementById('refresh-code-btn').addEventListener('click', refreshCode);
    fromSelect.addEventListener('change', refreshCode);
    toSelect.addEventListener('change', refreshCode);
    document.getElementById('copy-code-btn').addEventListener('click', function(){
        navigator.clipboard.writeText(document.getElementById('generated-code').textContent).then(function(){ var b = document.getElementById('copy-code-btn'); var t = b.textContent; b.textContent='Copied!'; setTimeout(function(){ b.textContent=t; }, 1500); });
    });
    document.getElementById('input-options-body').addEventListener('change', refreshCode);
    document.getElementById('output-options-body').addEventListener('change', refreshCode);
    playData.addEventListener('input', function(){ setTimeout(refreshCode, 100); });
    document.getElementById('to-format-file').addEventListener('change', refreshCode);
    document.getElementById('play-download').addEventListener('change', refreshCode);
    document.getElementById('play-options-json').addEventListener('input', function(){ setTimeout(refreshCode, 100); });

    document.querySelectorAll('.schema-toggle').forEach(function(btn){
        btn.addEventListener('click', function(e){
            e.preventDefault();
            var id = this.getAttribute('data-target') || (this.getAttribute('href') || '').slice(1);
            if (!id) return;
            var d = document.getElementById(id);
            if (!d) return;
            d.classList.toggle('show');
            var open = d.classList.contains('show');
            this.setAttribute('aria-expanded', open);
            d.setAttribute('aria-hidden', !open);
        });
    });
    document.querySelectorAll('.faq-q').forEach(function(btn){
        btn.addEventListener('click', function(){ var expanded = this.getAttribute('aria-expanded')==='true'; this.setAttribute('aria-expanded', !expanded); var panel = document.getElementById(this.getAttribute('aria-controls')); if(panel) panel.classList.toggle('show', !expanded); });
    });

    refreshCode();
})();
