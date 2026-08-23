/* Product Intelligence AI - intelligent feature layer
   Works with the existing FastAPI endpoints and keeps existing page JS intact. */
(function(){
  const API=((window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://127.0.0.1:8000" : "https://productintelligence-lzcn.onrender.com");
  const state={products:[],dashboard:null};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const val=(p,...keys)=>{for(const k of keys){if(p&&p[k]!==undefined&&p[k]!==null&&String(p[k]).trim()!==''&&String(p[k])!=='Not Available')return p[k]}return ''};
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  function score(p){
    const conf=num(val(p,'confidence','score','quality_score'));
    const fields=['name','brand','model','category','power','voltage'];
    const present=fields.filter(k=>val(p,k)).length;
    const completeness=present/fields.length*100;
    let s=Math.round(conf*.65+completeness*.35);
    if(!conf && !completeness) s=0;
    return Math.max(0,Math.min(100,s));
  }
  function severity(p){const s=score(p); return s<50?'Critical':s<80?'Warning':'Suggestion';}
  function statusClass(s){return s==='Critical'?'pi-bad':s==='Warning'?'pi-warn':'pi-good'}
  function toast(msg){const el=document.createElement('div');el.className='pi-toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2800)}
  async function fetchProducts(){try{const r=await fetch(API+'/products');if(r.ok){const d=await r.json();state.products=Array.isArray(d)?d:[];window.PI_PRODUCTS=state.products;return state.products}}catch(e){}return []}
  async function fetchDashboard(){try{const r=await fetch(API+'/dashboard');if(r.ok){state.dashboard=await r.json();return state.dashboard}}catch(e){}return null}
  function injectStyleLinks(){if(!document.querySelector('link[href*="intelligence.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='css/intelligence.css';document.head.appendChild(l)}}
  function injectGlobalTools(){
    if(localStorage.getItem('piGeminiEnabled') === 'false') return;
    if(!document.querySelector('.pi-floating')){
      const wrap=document.createElement('div');
      wrap.className='pi-floating';
      wrap.innerHTML=`
        <div class="pi-assistant" id="piAssistant">
          <div class="pi-panel-head">
            <div>
              <div class="pi-panel-title">Gemini AI Assistant</div>
              <div class="pi-muted">Ask about your current dataset</div>
            </div>
            <button class="pi-icon-btn" id="piClose" type="button">×</button>
          </div>
          <div class="pi-chat" id="piChat">
            <div class="pi-msg ai">Hi! I can explain quality, issues, categories, duplicates and validation trends from your loaded products.</div>
          </div>
          <form class="pi-chat-form" id="piChatForm">
            <input id="piChatInput" placeholder="e.g. Which category has most issues?" autocomplete="off">
            <button type="submit">Ask</button>
          </form>
        </div>
        <div class="pi-global-controls">
          <button class="pi-theme-btn" id="piThemeBtn" type="button" title="Switch theme" aria-label="Switch theme">☀️</button>
          <button class="pi-fab" id="piFab" type="button" title="Open Gemini AI" aria-label="Open Gemini AI">✦</button>
        </div>`;
      document.body.appendChild(wrap);

      const assistant=document.getElementById('piAssistant');
      document.getElementById('piFab').onclick=()=>assistant.classList.toggle('show');
      document.getElementById('piClose').onclick=()=>assistant.classList.remove('show');
      document.getElementById('piChatForm').onsubmit=e=>{
        e.preventDefault();
        const input=document.getElementById('piChatInput');
        const q=input.value.trim();
        if(!q)return;
        addChat(q,'user');
        input.value='';
        setTimeout(()=>addChat(answer(q),'ai'),180);
      };

      document.getElementById('piThemeBtn').onclick=()=>{
        const light=document.body.classList.contains('pi-light');
        setTheme(light?'dark':'light');
      };
    }

    setTheme(localStorage.getItem('piTheme')||'dark');
  }

  function setTheme(theme){
    const isLight=theme==='light';
    document.body.classList.toggle('pi-light',isLight);
    document.body.classList.toggle('pi-dark',!isLight);
    localStorage.setItem('piTheme',isLight?'light':'dark');
    const btn=document.getElementById('piThemeBtn');
    if(btn){
      btn.textContent=isLight?'🌙':'☀️';
      btn.title=isLight?'Switch to dark theme':'Switch to light theme';
      btn.setAttribute('aria-label',btn.title);
    }
  }

  function addChat(text,type){const c=document.getElementById('piChat');if(!c)return;const d=document.createElement('div');d.className='pi-msg '+type;d.textContent=text;c.appendChild(d);c.scrollTop=c.scrollHeight}
  function answer(q){
    const ps=state.products||[];const ql=q.toLowerCase();
    if(!ps.length)return'No product data is loaded yet. Upload a dataset and I can analyze it.';
    const scores=ps.map(score);const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);const critical=ps.filter(p=>severity(p)==='Critical').length;const warning=ps.filter(p=>severity(p)==='Warning').length;
    if(/duplicate/.test(ql)){const seen=new Map(),dups=[];ps.forEach(p=>{const n=String(val(p,'name')).toLowerCase().replace(/[^a-z0-9]/g,'');if(n){if(seen.has(n))dups.push(n);else seen.set(n,1)}});return dups.length?`${dups.length} possible duplicate name group(s) detected.`:'I did not find obvious duplicate product names.'}
    if(/categor|category/.test(ql)){const m={};ps.forEach(p=>{const c=val(p,'category')||'Uncategorized';m[c]=(m[c]||[]).concat([score(p)])});const top=Object.entries(m).map(([k,v])=>[k,Math.round(v.reduce((a,b)=>a+b,0)/v.length)]).sort((a,b)=>a[1]-b[1])[0];return top?`${top[0]} currently has the lowest average product health at ${top[1]}%.`:'No category information is available.'}
    if(/critical|issue|problem|invalid/.test(ql))return`I found ${critical} critical products and ${warning} warning-level products. Average product health is ${avg}%.`;
    if(/score|quality|health/.test(ql))return`Average product health is ${avg}%. ${Math.round(ps.length*avg/100)} products are estimated to be in healthy shape.`;
    if(/how many|total|products/.test(ql))return`There are ${ps.length} products loaded. ${critical} are critical, ${warning} need review, and ${ps.length-critical-warning} are healthy.`;
    if(/improve|recommend|suggest/.test(ql))return`Start with the ${critical} critical products, then enrich missing names, categories, models and descriptions. Re-run validation after fixes to measure improvement.`;
    return`I can answer questions about ${ps.length} products, quality scores, categories, critical issues, duplicates and recommendations. Try “Which category has most issues?”`;
  }
  function page(){return location.pathname.split('/').pop()||'index.html'}
  function panel(title,sub,body,cls='pi-span-6'){const d=document.createElement('div');d.className='pi-panel '+cls;d.innerHTML=`<div class="pi-panel-head"><div><h3 class="pi-panel-title">${title}</h3><div class="pi-muted">${sub}</div></div></div>${body}`;return d}
  async function dashboardEnhance(){
    const host=document.querySelector('.dashboard-container');if(!host||document.getElementById('piDashboardFeatures'))return;const [d,ps]=await Promise.all([fetchDashboard(),fetchProducts()]);
    const scores=ps.map(score),avg=ps.length?Math.round(scores.reduce((a,b)=>a+b,0)/ps.length):0,critical=ps.filter(p=>severity(p)==='Critical').length,warning=ps.filter(p=>severity(p)==='Warning').length;
    const cats={};ps.forEach(p=>{const c=val(p,'category')||'Uncategorized';(cats[c]??=[]).push(score(p))});const catRows=Object.entries(cats).sort((a,b)=>b[1].length-a[1].length).slice(0,6);
    const missingNames=ps.filter(p=>!val(p,'name')).length, missingCategory=ps.filter(p=>!val(p,'category')).length;
    const insights=[];if(critical)insights.push(['Priority','Priority queue',`${critical} products need immediate attention.`]);if(warning)insights.push(['Review','Review queue',`${warning} products should be reviewed before publishing.`]);if(missingNames)insights.push(['Data','Data completeness',`${missingNames} products are missing a usable product name.`]);if(missingCategory)insights.push(['Category','Categorization',`${missingCategory} products need a category.`]);if(!insights.length)insights.push(['Good','Excellent dataset','No major issues were detected by the client-side intelligence layer.']);
    const wrap=document.createElement('section');wrap.id='piDashboardFeatures';wrap.className='pi-feature-grid';
    wrap.appendChild(panel('AI Insights','Live observations from your uploaded product data',insights.map(i=>`<div class="pi-insight"><span class="pi-insight-icon">${i[0]}</span><div><strong>${i[1]}</strong><p>${i[2]}</p></div></div>`).join(''),'pi-span-8'));
    wrap.appendChild(panel('Product Health','Composite score using confidence + data completeness',`<div class="pi-health"><div class="pi-score-ring" style="--score:${avg}"><span>${avg}%</span></div><div><h3>${avg>=90?'Excellent':avg>=75?'Good':avg>=50?'Needs work':'Critical'}</h3><p>${ps.length} products analyzed. This score is an additional frontend intelligence indicator.</p><div class="pi-action-row" style="margin-top:12px"><button class="pi-action" onclick="location.href='products.html'">Explore products</button><button class="pi-action" onclick="location.href='validation.html'">Validate now</button></div></div></div>`,'pi-span-4'));
    wrap.appendChild(panel('Category Intelligence','Lowest health categories appear first',`<div class="pi-bars">${catRows.length?catRows.map(([c,arr])=>{const s=Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);return `<div class="pi-bar-row"><span>${esc(c).slice(0,16)}</span><div class="pi-track"><span style="width:${s}%"></span></div><b>${s}%</b></div>`}).join(''):'<div class="pi-muted">No categories available.</div>'}</div>`,'pi-span-8'));
    wrap.appendChild(panel('Smart Actions','Jump straight to the highest-value workflows',`<div class="pi-action-row"><button class="pi-action" onclick="location.href='products.html'">Smart Search</button><button class="pi-action" onclick="location.href='reports.html'">Executive Report</button><button class="pi-action" onclick="location.href='upload.html'">Analyze Dataset</button><button class="pi-action" onclick="document.getElementById('piFab')?.click()">Ask AI</button></div><p style="margin-top:14px">${d?.dataset_name?`Current dataset: <b>${esc(d.dataset_name)}</b>`:'Upload a dataset to unlock full intelligence.'}</p>`,'pi-span-4'));
    const badgePanel=panel('Quality Badges','Milestones from your current dataset',`<div class="pi-action-row"><span class="pi-badge ${ps.length>=100?'pi-good':'pi-info'}">${ps.length>=100?'100+ Products':'Dataset Loaded'}</span><span class="pi-badge ${avg>=90?'pi-good':'pi-warn'}">${avg>=90?'90%+ Quality':'Quality Journey'}</span><span class="pi-badge ${critical===0?'pi-good':'pi-bad'}">${critical===0?'Zero Critical':'Fix Criticals'}</span></div>`,'pi-span-4');
    wrap.appendChild(badgePanel);
    const projected=Math.min(100,avg+Math.min(25,critical*4+warning*2));
    wrap.appendChild(panel('Quality Lift Simulator','Heuristic forecast — not a machine-learning prediction',`<div class="pi-health"><div><div class="pi-muted">Current</div><h2 style="margin:3px 0">${avg}%</h2></div><div style="font-size:25px">→</div><div><div class="pi-muted">Projected after fixes</div><h2 style="margin:3px 0">${projected}%</h2></div></div><p style="margin-top:10px">Fixing high-priority completeness issues could lift the quality score by roughly ${projected-avg} points.</p>`,'pi-span-8'));
    host.appendChild(wrap);
  }
  async function productsEnhance(){
    const page=document.querySelector('.products-page');if(!page||document.getElementById('piProductsFeatures'))return;const ps=await fetchProducts();
    const section=document.createElement('section');section.id='piProductsFeatures';section.className='pi-feature-grid';
    const smart=panel('Smart Product Search','Use natural language or simple filters',`<div class="pi-command"><input id="piSmartSearch" placeholder="Try: products below 60%, critical products, food category..."><button id="piSmartSearchBtn">Search</button></div><div id="piSmartResults" class="pi-result-list"></div>`,'pi-span-8');
    const scores=ps.map(score),avg=ps.length?Math.round(scores.reduce((a,b)=>a+b,0)/ps.length):0;const critical=ps.filter(p=>severity(p)==='Critical').length;const warning=ps.filter(p=>severity(p)==='Warning').length;
    const quality=panel('Quality Snapshot','Live client-side intelligence',`<div class="pi-executive"><div class="pi-exec-card"><small>Health</small><b>${avg}%</b></div><div class="pi-exec-card"><small>Critical</small><b>${critical}</b></div><div class="pi-exec-card"><small>Review</small><b>${warning}</b></div><div class="pi-exec-card"><small>Products</small><b>${ps.length}</b></div></div><div class="pi-action-row" style="margin-top:14px"><button class="pi-action" id="piCompareStart">Compare products</button><button class="pi-action" onclick="location.href='reports.html'">Executive report</button></div>`,'pi-span-4');
    section.appendChild(smart);section.appendChild(quality);page.prepend(section);
    document.getElementById('piSmartSearchBtn').onclick=()=>smartSearch(document.getElementById('piSmartSearch').value);
    document.getElementById('piSmartSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();smartSearch(e.target.value)}});
    document.getElementById('piCompareStart').onclick=()=>openComparePicker(ps);
  }
  function smartSearch(q){
    q=q.toLowerCase().trim();const out=document.getElementById('piSmartResults');if(!out)return;if(!q){out.innerHTML='<div class="pi-muted">Type a query to search intelligently.</div>';return}
    let res=state.products.slice();const n=q.match(/(?:below|under|less than)\s*(\d+)/);if(n)res=res.filter(p=>score(p)<Number(n[1]));if(/critical/.test(q))res=res.filter(p=>severity(p)==='Critical');else if(/warning|review/.test(q))res=res.filter(p=>severity(p)==='Warning');const cats=[...new Set(state.products.map(p=>String(val(p,'category')).toLowerCase()).filter(Boolean))];const cat=cats.find(c=>q.includes(c));if(cat)res=res.filter(p=>String(val(p,'category')).toLowerCase()===cat);const words=q.split(/\s+/).filter(w=>w.length>2&&!['products','product','show','find','with','below','under','less','than','critical','warning','review'].includes(w));if(words.length)res=res.filter(p=>words.some(w=>JSON.stringify(p).toLowerCase().includes(w)));res=res.slice(0,12);out.innerHTML=res.length?res.map(p=>`<div class="pi-result"><a href="product-details.html?id=${encodeURIComponent(val(p,'id','row_number'))}">${esc(val(p,'name')||'Unnamed Product')}</a><span class="pi-badge ${statusClass(severity(p))}">${score(p)}% · ${severity(p)}</span></div>`).join(''):'<div class="pi-muted">No matching products found.</div>';
  }
  function openComparePicker(ps){
    const backdrop=document.createElement('div');backdrop.className='pi-modal-backdrop show';backdrop.innerHTML=`<div class="pi-modal"><div class="pi-panel-head"><div><h2 style="margin:0">Compare Products</h2><div class="pi-muted">Select two products to compare quality and completeness.</div></div><button class="pi-icon-btn" data-close>×</button></div><div id="piCompareOptions" style="display:grid;gap:8px;max-height:50vh;overflow:auto">${ps.slice(0,100).map((p,i)=>`<label class="pi-result"><span><input type="checkbox" value="${i}"> ${esc(val(p,'name')||`Product ${i+1}`)}</span><span>${score(p)}%</span></label>`).join('')}</div><div class="pi-action-row" style="margin-top:15px"><button class="pi-action" id="piCompareNow">Compare selected</button></div><div id="piCompareOutput" style="margin-top:16px"></div></div>`;document.body.appendChild(backdrop);backdrop.querySelector('[data-close]').onclick=()=>backdrop.remove();backdrop.onclick=e=>{if(e.target===backdrop)backdrop.remove()};backdrop.querySelector('#piCompareNow').onclick=()=>{const ids=[...backdrop.querySelectorAll('input:checked')].map(x=>Number(x.value));if(ids.length!==2){toast('Select exactly two products.');return}renderComparison(backdrop,ps[ids[0]],ps[ids[1]])};
  }
  function renderComparison(backdrop,a,b){const fields=['name','brand','model','category','power','voltage','confidence'];backdrop.querySelector('#piCompareOutput').innerHTML=`<div class="pi-compare-grid">${[a,b].map(p=>`<div class="pi-compare-card"><h3>${esc(val(p,'name')||'Unnamed')}</h3><div class="pi-score-ring" style="--score:${score(p)}"><span>${score(p)}%</span></div>${fields.map(k=>`<div class="pi-compare-row"><span>${k}</span><b>${esc(val(p,k)||'Missing')}</b></div>`).join('')}</div>`).join('')}</div><div class="pi-panel" style="margin-top:14px"><b>Recommendation:</b> ${score(a)>=score(b)?esc(val(a,'name')||'Product A'):esc(val(b,'name')||'Product B')} currently has the stronger product health score.</div>`}
  async function detailEnhance(){
    const host=document.getElementById('productDetails');
    if(!host||document.getElementById('piDetailFeatures'))return;
    const ps=await fetchProducts();
    const id=new URLSearchParams(location.search).get('id');
    const p=ps.find(x=>String(val(x,'id','row_number'))===String(id));
    if(!p)return;
    const s=score(p);
    const missing=['name','brand','model','category','power','voltage'].filter(k=>!val(p,k));
    const section=document.createElement('section');
    section.id='piDetailFeatures';section.className='pi-feature-grid';
    const fixes=missing.length?missing.map(k=>'<div class="pi-fix-item"><strong>Missing '+esc(k)+'</strong><p>Add a reliable '+esc(k)+' value to improve product completeness.</p><button class="pi-action" data-fix="'+esc(k)+'">Generate suggestion</button></div>').join(''):'<div class="pi-insight"><span>Good</span><div><strong>Great profile</strong><p>No major completeness gaps were found in the standard product fields.</p></div></div>';
    section.innerHTML='<div class="pi-panel pi-span-4"><div class="pi-health"><div class="pi-score-ring" style="--score:'+s+'"><span>'+s+'%</span></div><div><h3>Product Health</h3><p>'+ (s>=80?'Strong product profile.':'This product has data quality gaps.') +'</p></div></div></div><div class="pi-panel pi-span-8"><div class="pi-panel-head"><div><h3 class="pi-panel-title">AI Fix Suggestions</h3><div class="pi-muted">Actionable recommendations before publishing</div></div><span class="pi-badge '+statusClass(severity(p))+'">'+severity(p)+'</span></div><div class="pi-fix">'+fixes+'<div id="piFixHint" class="pi-muted"></div></div></div>';
    section.querySelectorAll('[data-fix]').forEach(b=>b.onclick=()=>{document.getElementById('piFixHint').textContent='Suggested '+b.dataset.fix+': review your source catalog and add the official '+b.dataset.fix+' value.';toast('AI suggestion generated for '+b.dataset.fix+'.')});
    const projected=Math.min(100,s+missing.length*8);
    const lift=document.createElement('div');lift.className='pi-panel pi-span-12';lift.innerHTML='<div class="pi-panel-head"><div><h3 class="pi-panel-title">Before vs After</h3><div class="pi-muted">Estimated quality lift if missing fields are completed</div></div></div><div class="pi-executive"><div class="pi-exec-card"><small>Current health</small><b>'+s+'%</b></div><div class="pi-exec-card"><small>Issues</small><b>'+missing.length+'</b></div><div class="pi-exec-card"><small>Projected</small><b>'+projected+'%</b></div><div class="pi-exec-card"><small>Potential lift</small><b>+'+(projected-s)+'</b></div></div>';
    section.appendChild(lift);
    host.prepend(section);
  }
  async function validationEnhance(){const page=document.querySelector('.validation-container');if(!page||document.getElementById('piValidationFeatures'))return;const ps=await fetchProducts();const section=document.createElement('section');section.id='piValidationFeatures';section.className='pi-feature-grid';const critical=ps.filter(p=>severity(p)==='Critical').length,warning=ps.filter(p=>severity(p)==='Warning').length;section.appendChild(panel('Validation Triage','Prioritize the products that need human review',`<div class="pi-executive"><div class="pi-exec-card"><small>Critical</small><b>${critical}</b></div><div class="pi-exec-card"><small>Warning</small><b>${warning}</b></div><div class="pi-exec-card"><small>Healthy</small><b>${Math.max(0,ps.length-critical-warning)}</b></div><div class="pi-exec-card"><small>Total</small><b>${ps.length}</b></div></div><p style="margin-top:12px">Critical products should be fixed first. Use the AI assistant for dataset-level questions.</p>`,'pi-span-12'));page.prepend(section)}
  async function reportsEnhance(){const page=document.querySelector('.reports-page');if(!page||document.getElementById('piReportFeatures'))return;const ps=await fetchProducts();const scores=ps.map(score),avg=ps.length?Math.round(scores.reduce((a,b)=>a+b,0)/ps.length):0,critical=ps.filter(p=>severity(p)==='Critical').length,warning=ps.filter(p=>severity(p)==='Warning').length;const section=document.createElement('section');section.id='piReportFeatures';section.className='pi-feature-grid';section.appendChild(panel('Executive Intelligence','A manager-friendly snapshot generated from your dataset',`<div class="pi-executive"><div class="pi-exec-card"><small>Overall health</small><b>${avg}%</b></div><div class="pi-exec-card"><small>Critical</small><b>${critical}</b></div><div class="pi-exec-card"><small>Warnings</small><b>${warning}</b></div><div class="pi-exec-card"><small>Healthy</small><b>${Math.max(0,ps.length-critical-warning)}</b></div></div><div class="pi-insight" style="margin-top:14px"><span>Note</span><div><strong>Executive recommendation</strong><p>${critical?`Focus on ${critical} critical products first, then re-run validation to measure the quality lift.`:'The dataset is in a healthy state. Continue monitoring quality as new products are added.'}</p></div></div>`,'pi-span-12'));document.getElementById('overallReport')?.insertAdjacentElement('afterend',section)}
  function uploadEnhance(){const page=document.querySelector('.upload-card');if(!page||document.getElementById('piUploadFeature'))return;const d=document.createElement('div');d.id='piUploadFeature';d.className='pi-panel';d.style.marginTop='18px';d.innerHTML='<div class="pi-panel-head"><div><h3 class="pi-panel-title">Dataset Intelligence</h3><div class="pi-muted">After upload, ProductIQ automatically analyzes completeness, quality and issue priority.</div></div><span class="pi-badge pi-info">AUTO ANALYSIS</span></div><div class="pi-action-row"><span class="pi-badge pi-good">Quality score</span><span class="pi-badge pi-warn">Missing fields</span><span class="pi-badge pi-bad">Critical issues</span><span class="pi-badge pi-info">Duplicate signals</span></div>';page.parentElement.appendChild(d)}
  function init(){injectStyleLinks();injectGlobalTools();const p=page();if(p==='dashboard.html')dashboardEnhance();if(p==='products.html')productsEnhance();if(p==='product-details.html')detailEnhance();if(p==='validation.html')validationEnhance();if(p==='reports.html')reportsEnhance();if(p==='upload.html')uploadEnhance();}
  document.addEventListener('DOMContentLoaded',init);window.PI_INTELLIGENCE={fetchProducts,score,severity,answer};
})();
