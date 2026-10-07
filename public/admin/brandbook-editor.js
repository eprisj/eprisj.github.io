const API = 'https://api.eprisjournal.com/content';
const PW_KEY = 'epris_admin_pw_saved';
const GROUPS = [
  ['page','Страница'],
  ['intro','Введение'],['identity','Идентичность'],['rules','Правила'],['components','Компоненты'],
  ['dodont','Так / не так'],['imagery','Фотография'],['voice','Голос'],['motionRules','Движение'],
  ['a11y','Доступность'],['refs','Ориентиры']
];
const LABEL = {title:'Заголовок',body:'Текст',name:'Название',anatomy:'Анатомия',spec:'Спецификация',dont:'Не делать',topic:'Тема',good:'Так',bad:'Не так',note:'Пояснение',group:'Группа',url:'URL',why:'Почему',take:'Что берём',kicker:'Надзаголовок',headline:'Главный заголовок',description:'Описание страницы'};
const PUBLIC_ID = {components:'elements',motionRules:'motion',a11y:'contrast'};
const PAGE_DEFAULTS = {kicker:'Epris Journal · Brand Book · MMXXVI',headline:'How EPRIS looks, reads and moves',description:'A practical guide to how EPRIS looks, reads and moves: colour, typography, imagery, voice and interface.'};
let content = null, state = null, draft = null, hidden = [], active = 'page', dirty = false, saving = false;
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
  draft=clone(state.draft||state.published||defaults);
  draft.page={...PAGE_DEFAULTS,...(draft.page||{})};
  draft.sectionLabels={...(draft.sectionLabels||{})};
  hidden=clone(state.draftHiddenSections||state.hiddenSections||[]); dirty=false; render();
}

function render(){
  const comments=(state.comments||[]).filter(c=>c.section===active&&!c.resolved);
  root.innerHTML=`<header class="bbx-head"><div class="bbx-head-copy"><p class="bbx-kicker">EPRIS · /brandbook</p><h1>Редактор бренд-бука</h1><p>Страница, разделы, пункты и редакционные заметки — в одном месте.</p></div><div class="bbx-actions"><span class="bbx-state" aria-live="polite">${dirty?'Есть несохранённые правки':state.publishedAt?'Опубликовано':'Базовая версия'}</span><a class="bbx-btn" href="../brandbook/" target="_blank" rel="noreferrer">Предпросмотр ↗</a><button class="bbx-btn" data-save>Сохранить</button><button class="bbx-btn primary" data-publish>Опубликовать</button></div></header>
  <div class="bbx-layout"><nav>${GROUPS.map(([id,label],i)=>`<button data-group="${id}" class="${id===active?'active':''}"><span>${String(i+1).padStart(2,'0')}</span>${label}${(state.comments||[]).some(c=>c.section===id&&!c.resolved)?'<i>•</i>':''}</button>`).join('')}</nav><main>${fields()}</main><aside><p class="bbx-kicker">Внутренние комментарии · ${comments.length}</p><textarea data-comment rows="4" placeholder="Заметка для редакции…"></textarea><button class="bbx-btn wide" data-add-comment>Добавить</button><div class="bbx-comments">${comments.map(c=>`<article><p>${esc(c.text)}</p><small>${esc(c.author||'Редакция')} · ${new Date(c.createdAt).toLocaleDateString('ru')}</small><button data-resolve="${esc(c.id)}">Закрыть</button></article>`).join('')}</div></aside></div>`;
  bind();
}

function fields(){
  const value=draft[active]; const title=GROUPS.find(x=>x[0]===active)?.[1]||active;
  if(active==='page') return `<div class="bbx-section-head"><div><p class="bbx-kicker">Общие настройки</p><h2>Страница</h2></div></div><div class="bbx-list bbx-page-fields">${Object.entries(draft.page).map(([key,val])=>`<label class="bbx-field">${LABEL[key]||key}<textarea data-page-key="${key}" rows="${key==='description'?4:2}">${esc(val)}</textarea></label>`).join('')}</div>`;
  const visibility=active==='intro'?'':`<label class="bbx-visible"><input type="checkbox" data-visible ${hidden.includes(active)?'':'checked'}> Показывать на сайте</label>`;
  const sectionTitle=draft.sectionLabels[active]||title;
  const head=`<div class="bbx-section-head"><div><p class="bbx-kicker">Раздел</p><input class="bbx-title-input" data-section-title value="${esc(sectionTitle)}" aria-label="Название раздела"></div>${visibility}</div>`;
  if(typeof value==='string') return `${head}<label class="bbx-field">Текст первого экрана<textarea data-string rows="8">${esc(value)}</textarea></label>`;
  const rows=Array.isArray(value)?value:[];
  return `${head}<div class="bbx-list">${rows.map((row,index)=>rowCard(row,index)).join('')}<button class="bbx-btn bbx-add" data-add>+ Добавить пункт</button></div>`;
}

function rowCard(row,index){
  const controls=`<div class="bbx-row-head"><b>Пункт ${String(index+1).padStart(2,'0')}</b><div><button data-move="up" data-index="${index}" aria-label="Поднять пункт">↑</button><button data-move="down" data-index="${index}" aria-label="Опустить пункт">↓</button><button data-duplicate="${index}">Дублировать</button><button class="danger" data-remove="${index}">Удалить</button></div></div>`;
  if(typeof row==='string') return `<article>${controls}<label class="bbx-field">Текст<textarea data-row-string="${index}" rows="3">${esc(row)}</textarea></label></article>`;
  return `<article>${controls}${Object.entries(row||{}).map(([key,val])=>`<label class="bbx-field">${LABEL[key]||key}<textarea data-row="${index}" data-key="${key}" data-array="${Array.isArray(val)?'1':'0'}" rows="${Array.isArray(val)||String(val).length>100?4:2}">${esc(Array.isArray(val)?val.join('\n'):val)}</textarea></label>`).join('')}</article>`;
}

function mark(){dirty=true; document.querySelector('.bbx-state').textContent='Есть правки';}
function bind(){
  root.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{active=b.dataset.group;render()});
  root.querySelector('[data-save]').onclick=()=>persist(false); root.querySelector('[data-publish]').onclick=()=>persist(true);
  root.querySelectorAll('[data-page-key]').forEach(el=>el.oninput=()=>{draft.page[el.dataset.pageKey]=el.value;mark()});
  root.querySelector('[data-section-title]')?.addEventListener('input',e=>{draft.sectionLabels[active]=e.target.value;mark()});
  root.querySelector('[data-string]')?.addEventListener('input',e=>{draft[active]=e.target.value;mark()});
  root.querySelectorAll('[data-row]').forEach(el=>el.oninput=()=>{const i=+el.dataset.row;draft[active][i][el.dataset.key]=el.dataset.array==='1'?el.value.split('\n').filter(Boolean):el.value;mark()});
  root.querySelectorAll('[data-row-string]').forEach(el=>el.oninput=()=>{draft[active][+el.dataset.rowString]=el.value;mark()});
  root.querySelector('[data-visible]')?.addEventListener('change',e=>{hidden=e.target.checked?hidden.filter(x=>x!==active):[...new Set([...hidden,active])];mark()});
  root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{draft[active].splice(+b.dataset.remove,1);mark();render()});
  root.querySelectorAll('[data-duplicate]').forEach(b=>b.onclick=()=>{const i=+b.dataset.duplicate;draft[active].splice(i+1,0,clone(draft[active][i]));mark();render()});
  root.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const i=+b.dataset.index,j=b.dataset.move==='up'?i-1:i+1;if(j<0||j>=draft[active].length)return;[draft[active][i],draft[active][j]]=[draft[active][j],draft[active][i]];mark();render()});
  root.querySelector('[data-add]')?.addEventListener('click',()=>{const template=(window.EPRIS_BRANDBOOK?.defaults?.[active]||[])[0];if(template===undefined)return;draft[active].push(typeof template==='string'?'':Object.fromEntries(Object.keys(template).map(k=>[k,Array.isArray(template[k])?[]:''])));mark();render()});
  root.querySelector('[data-add-comment]').onclick=()=>{const el=root.querySelector('[data-comment]');if(!el.value.trim())return;state.comments=[...(state.comments||[]),{id:crypto.randomUUID(),section:active,text:el.value.trim(),author:'EPRIS Editorial',createdAt:new Date().toISOString()}];mark();render()};
  root.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=()=>{state.comments=state.comments.map(c=>c.id===b.dataset.resolve?{...c,resolved:true}:c);mark();render()});
}

async function persist(publish){
  if(saving)return;
  const pw=password(); if(!pw)return toast('Сессия истекла — войдите снова.',true);
  saving=true; root.querySelectorAll('[data-save],[data-publish]').forEach(b=>b.disabled=true);
  const now=new Date().toISOString(); state={...state,version:(state.version||0)+1,draft:clone(draft),draftHiddenSections:clone(hidden),comments:state.comments||[],updatedAt:now};
  if(publish){state.published=clone(draft);state.hiddenSections=hidden.map(id=>PUBLIC_ID[id]||id);state.publishedAt=now;}
  content.brandbook=state;
  const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Password':pw},body:JSON.stringify(content)});
  const result=await response.json().catch(()=>({}));
  saving=false;
  if(!response.ok||!result.ok){render();return toast(result.error||'Ошибка сохранения',true)}
  dirty=false; render(); toast(publish?'Бренд-бук опубликован.':'Черновик сохранён.');
}

document.querySelector('[data-tab="brandbook"]')?.addEventListener('click',()=>setTimeout(()=>load().catch(e=>{root.innerHTML=`<div class="brandbook-loading error">${esc(e.message)}</div>`}),30));
