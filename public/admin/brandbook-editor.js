const API = 'https://api.eprisjournal.com/content';
const PW_KEY = 'epris_admin_pw_saved';
const GROUPS = [
  ['intro','Введение'],['identity','Идентичность'],['rules','Правила'],['components','Компоненты'],
  ['dodont','Так / не так'],['imagery','Фотография'],['voice','Голос'],['motionRules','Движение'],
  ['a11y','Доступность'],['refs','Ориентиры']
];
const LABEL = {title:'Заголовок',body:'Текст',name:'Название',anatomy:'Анатомия',spec:'Спецификация',dont:'Не делать',topic:'Тема',good:'Так',bad:'Не так',note:'Пояснение',group:'Группа',url:'URL',why:'Почему',take:'Что берём'};
const PUBLIC_ID = {components:'elements',motionRules:'motion',a11y:'contrast'};
let content = null, state = null, draft = null, hidden = [], active = 'intro', dirty = false;
const root = document.getElementById('brandbookEditor');
const clone = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function password(){ try { const value=localStorage.getItem(PW_KEY); return value?atob(value):''; } catch { return ''; } }
function toast(text,error=false){ const el=document.createElement('div'); el.className='bbx-toast'+(error?' error':''); el.textContent=text; document.body.append(el); setTimeout(()=>el.remove(),2800); }

async function load(){
  root.innerHTML='<div class="brandbook-loading">Загружаем бренд-бук…</div>';
  const response=await fetch(API,{cache:'no-store'}); if(!response.ok) throw new Error('Не удалось загрузить контент');
  content=await response.json(); state=content.brandbook||{};
  const defaults=window.EPRIS_BRANDBOOK?.defaults||{};
  draft=clone(state.draft||state.published||defaults); hidden=clone(state.draftHiddenSections||state.hiddenSections||[]); dirty=false; render();
}

function render(){
  const comments=(state.comments||[]).filter(c=>c.section===active&&!c.resolved);
  root.innerHTML=`<header class="bbx-head"><div><p class="bbx-kicker">EPRIS · editorial workspace · /brandbook</p><h1>Бренд-бук</h1><p>Детальная система цвета, шрифта, кадра, голоса и интерфейса. Черновик и публичная версия разделены.</p></div><span class="bbx-state">${dirty?'Есть правки':state.publishedAt?'Опубликовано':'Базовая версия'}</span><a class="bbx-btn" href="../brandbook/" target="_blank" rel="noreferrer">На сайте ↗</a><button class="bbx-btn" data-save>Сохранить черновик</button><button class="bbx-btn primary" data-publish>Опубликовать</button></header>
  <div class="bbx-layout"><nav>${GROUPS.map(([id,label],i)=>`<button data-group="${id}" class="${id===active?'active':''}"><span>${String(i+1).padStart(2,'0')}</span>${label}${(state.comments||[]).some(c=>c.section===id&&!c.resolved)?'<i>•</i>':''}</button>`).join('')}</nav><main>${fields()}</main><aside><p class="bbx-kicker">Внутренние комментарии · ${comments.length}</p><textarea data-comment rows="4" placeholder="Заметка для редакции…"></textarea><button class="bbx-btn wide" data-add-comment>Добавить</button><div class="bbx-comments">${comments.map(c=>`<article><p>${esc(c.text)}</p><small>${esc(c.author||'Редакция')} · ${new Date(c.createdAt).toLocaleDateString('ru')}</small><button data-resolve="${esc(c.id)}">Закрыть</button></article>`).join('')}</div></aside></div>`;
  bind();
}

function fields(){
  const value=draft[active]; const title=GROUPS.find(x=>x[0]===active)?.[1]||active;
  const visibility=active==='intro'?'':`<label class="bbx-visible"><input type="checkbox" data-visible ${hidden.includes(active)?'':'checked'}> Показывать на сайте</label>`;
  if(typeof value==='string') return `<div class="bbx-section-head"><h2>${title}</h2>${visibility}</div><label class="bbx-field">Текст первого экрана<textarea data-string rows="8">${esc(value)}</textarea></label>`;
  return `<div class="bbx-section-head"><h2>${title}</h2>${visibility}</div><div class="bbx-list">${(value||[]).map((row,index)=>`<article><div class="bbx-row-head"><b>${String(index+1).padStart(2,'0')}</b><button data-remove="${index}">Удалить</button></div>${Object.entries(row).map(([key,val])=>`<label class="bbx-field">${LABEL[key]||key}<textarea data-row="${index}" data-key="${key}" data-array="${Array.isArray(val)?'1':'0'}" rows="${Array.isArray(val)||String(val).length>100?4:2}">${esc(Array.isArray(val)?val.join('\n'):val)}</textarea></label>`).join('')}</article>`).join('')}<button class="bbx-btn" data-add>+ Добавить пункт</button></div>`;
}

function mark(){dirty=true; document.querySelector('.bbx-state').textContent='Есть правки';}
function bind(){
  root.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{active=b.dataset.group;render()});
  root.querySelector('[data-save]').onclick=()=>persist(false); root.querySelector('[data-publish]').onclick=()=>persist(true);
  root.querySelector('[data-string]')?.addEventListener('input',e=>{draft[active]=e.target.value;mark()});
  root.querySelectorAll('[data-row]').forEach(el=>el.oninput=()=>{const i=+el.dataset.row;draft[active][i][el.dataset.key]=el.dataset.array==='1'?el.value.split('\n').filter(Boolean):el.value;mark()});
  root.querySelector('[data-visible]')?.addEventListener('change',e=>{hidden=e.target.checked?hidden.filter(x=>x!==active):[...new Set([...hidden,active])];mark()});
  root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{draft[active].splice(+b.dataset.remove,1);mark();render()});
  root.querySelector('[data-add]')?.addEventListener('click',()=>{const template=(window.EPRIS_BRANDBOOK?.defaults?.[active]||[])[0];if(!template)return;draft[active].push(Object.fromEntries(Object.keys(template).map(k=>[k,Array.isArray(template[k])?[]:''])));mark();render()});
  root.querySelector('[data-add-comment]').onclick=()=>{const el=root.querySelector('[data-comment]');if(!el.value.trim())return;state.comments=[...(state.comments||[]),{id:crypto.randomUUID(),section:active,text:el.value.trim(),author:'EPRIS Editorial',createdAt:new Date().toISOString()}];mark();render()};
  root.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=()=>{state.comments=state.comments.map(c=>c.id===b.dataset.resolve?{...c,resolved:true}:c);mark();render()});
}

async function persist(publish){
  const pw=password(); if(!pw)return toast('Сессия истекла — войдите снова.',true);
  const now=new Date().toISOString(); state={...state,version:(state.version||0)+1,draft:clone(draft),draftHiddenSections:clone(hidden),comments:state.comments||[],updatedAt:now};
  if(publish){state.published=clone(draft);state.hiddenSections=hidden.map(id=>PUBLIC_ID[id]||id);state.publishedAt=now;}
  content.brandbook=state;
  const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Password':pw},body:JSON.stringify(content)});
  const result=await response.json().catch(()=>({})); if(!response.ok||!result.ok)return toast(result.error||'Ошибка сохранения',true);
  dirty=false; render(); toast(publish?'Бренд-бук опубликован.':'Черновик сохранён.');
}

document.querySelector('[data-tab="brandbook"]')?.addEventListener('click',()=>setTimeout(()=>load().catch(e=>{root.innerHTML=`<div class="brandbook-loading error">${esc(e.message)}</div>`}),30));
