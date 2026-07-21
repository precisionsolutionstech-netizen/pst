(function(){
    var host='html-to-markdown-converter1.p.rapidapi.com',path='/health',body="{\n  \"html\": \"<h1>Hello</h1><p>World <strong>bold</strong></p>\",\n  \"mode\": \"readable\",\n  \"includeMetadata\": false\n}",fileUpload=false,rapidUrl="https://rapidapi.com/precisionsolutionstech/api/html-to-markdown-converter1";
    document.querySelectorAll('[data-rapid-docs]').forEach(function(a){ a.href = rapidUrl; });
    document.getElementById('toggle-req').addEventListener('click',function(e){ e.preventDefault(); var d=document.getElementById('request-schema'); d.classList.toggle('show'); this.setAttribute('aria-expanded',d.classList.contains('show')); });
    document.getElementById('toggle-res').addEventListener('click',function(e){ e.preventDefault(); var d=document.getElementById('response-schema'); d.classList.toggle('show'); this.setAttribute('aria-expanded',d.classList.contains('show')); });
    var toggleErrors=document.getElementById('toggle-errors');if(toggleErrors){ toggleErrors.addEventListener('click',function(e){ e.preventDefault(); var d=document.getElementById('error-codes'); d.classList.toggle('show'); this.setAttribute('aria-expanded',d.classList.contains('show')); }); }
    document.querySelectorAll('.lang-tabs button').forEach(function(btn){
        btn.addEventListener('click',function(){
            document.querySelectorAll('.lang-tabs button').forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
            document.querySelectorAll('.code-block').forEach(function(b){ b.classList.remove('active'); });
            this.classList.add('active'); this.setAttribute('aria-selected','true');
            var el=document.getElementById('snippet-'+this.getAttribute('data-lang')); if(el) el.classList.add('active');
        });
    });
    document.querySelectorAll('.copy-btn').forEach(function(btn){
        btn.addEventListener('click',function(){
            var id=this.getAttribute('data-copy'),block=document.getElementById(id),pre=block?block.querySelector('pre code'):null,btn=this;
            if(pre) navigator.clipboard.writeText(pre.textContent).then(function(){ var t=btn.textContent; btn.textContent='Copied!'; setTimeout(function(){ btn.textContent=t; },1500); });
        });
    });
    
    document.querySelectorAll('.faq-q').forEach(function(btn){
        btn.addEventListener('click',function(){ var expanded=this.getAttribute('aria-expanded')==='true'; this.setAttribute('aria-expanded',!expanded); var panel=document.getElementById(this.getAttribute('aria-controls')); if(panel) panel.classList.toggle('show',!expanded); });
    });
    document.getElementById('postman-download').addEventListener('click',function(){
        var coll = { info: { name: "HTML to Markdown Converter API", schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [{ name: 'Request', request: { method: 'POST', header: [{ key: 'Content-Type', value: 'application/json' }, { key: 'x-rapidapi-key', value: 'YOUR_RAPIDAPI_KEY' }, { key: 'x-rapidapi-host', value: host }], url: 'https://'+host+path } } ] };
        if(!fileUpload){ coll.item[0].request.body = { mode: 'raw', raw: typeof body==='string'?body:JSON.stringify(body) }; }
        else { coll.item[0].request.header = [{ key: 'X-RapidAPI-Key', value: 'YOUR_RAPIDAPI_KEY' }, { key: 'X-RapidAPI-Host', value: host }]; coll.item[0].request.url = 'https://'+host+path+'?outputFormat=json'; coll.item[0].request.body = { mode: 'formdata', formdata: [{ key: 'file', type: 'file', src: '' }] }; }
        var blob = new Blob([JSON.stringify(coll,null,2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'html-to-markdown-postman-collection.json'; a.click(); URL.revokeObjectURL(a.href);
    });
    var runBtn=document.getElementById('run-btn'),keyInput=document.getElementById('api-key'),resultDiv=document.getElementById('play-result');
    runBtn.addEventListener('click',function(){
        var key=(keyInput.value||'').trim();
        if(!key){ resultDiv.style.display='block'; resultDiv.className='result error'; resultDiv.textContent='Please enter your RapidAPI key.'; return; }
        
    var bodyStr=document.getElementById('body-json').value.trim(),body;
    try{body=JSON.parse(bodyStr);}catch(e){resultDiv.style.display='block';resultDiv.className='result error';resultDiv.textContent='Invalid JSON: '+e.message;return;}
    runBtn.disabled=true;resultDiv.style.display='block';resultDiv.className='result';resultDiv.textContent='Loading…';
    fetch('https://'+host+path,{method:'POST',headers:{'Content-Type':'application/json','x-rapidapi-key':key,'x-rapidapi-host':host},body:JSON.stringify(body)})
    .then(function(r){return r.text().then(function(t){return{status:r.status,body:t};});})
    .then(function(o){resultDiv.className='result '+(o.status>=200&&o.status<300?'success':'error');try{resultDiv.textContent=JSON.stringify(JSON.parse(o.body),null,2);}catch(_){resultDiv.textContent=o.status+'\n'+o.body;}})
    .catch(function(e){resultDiv.className='result error';resultDiv.textContent='Request failed: '+e.message;})
    .finally(function(){runBtn.disabled=false;});
    });
})();
