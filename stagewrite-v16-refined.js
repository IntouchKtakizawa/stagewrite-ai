(function(){
'use strict';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)],APP=window.StageWriteApp;
if(!APP)return;

function makePanel(name,label,description){
  const panel=document.createElement('section');
  panel.className='workspace-panel';
  panel.dataset.workspacePanel=name;
  panel.id=`workspace-panel-${name}`;
  panel.setAttribute('role','tabpanel');
  panel.setAttribute('aria-labelledby',`workspace-tab-${name}`);
  panel.tabIndex=0;
  panel.hidden=name!=='compose';
  panel.innerHTML=`<div class="workspace-intro"><div><strong>${label}</strong><p>${description}</p></div></div>`;
  return panel;
}

const composeView=$('#composeView'),tabs=$('#workspaceTabs'),workgrid=composeView.querySelector('.workgrid'),stack=composeView.querySelector('.v13-stack'),transport=$('#transport');
const mainCard=workgrid?.querySelector(':scope > div > .card'),rightCards=workgrid?[...workgrid.querySelectorAll('.rightcol > .card')]:[],stackCards=stack?[...stack.children]:[];
const panels=document.createElement('div');
panels.className='workspace-panels';
const compose=makePanel('compose','Compose','Set the musical direction, generate, listen, then lock or edit the chords.');
const play=makePanel('play','Play','Use practical voicings, diagrams, practice playback and the metronome.');
const arrange=makePanel('arrange','Arrange','Build sections, drums and a balanced backing track.');
const learn=makePanel('learn','Learn','Understand the progression with transparent theory explanations and optional Beta assistance.');
if(mainCard)compose.appendChild(mainCard);
if(stackCards[0])play.appendChild(stackCards[0]);
if(rightCards[0])play.appendChild(rightCards[0]);
if(stackCards[1])arrange.appendChild(stackCards[1]);
if(stackCards[2])arrange.appendChild(stackCards[2]);
if(rightCards[1])learn.appendChild(rightCards[1]);
if(rightCards[2])learn.appendChild(rightCards[2]);
const assistantCard=document.createElement('section');
assistantCard.className='card';
assistantCard.innerHTML=`<div class="card-head"><h2>StageWrite Theory Assistant <span class="beta-label">Beta</span></h2><span class="version">LOCAL · OPTIONAL</span></div><div class="card-body"><p class="assistant-description">An experimental local music-theory assistant powered by StageWrite’s transparent theory engine. It is disabled by default, may be incomplete, and never sends your music to a cloud model.</p><div class="actions"><button class="primary" id="openTheoryAssistant">Open Theory Assistant</button><button class="ghost" id="openAssistantSettings">Assistant settings</button></div></div>`;
learn.appendChild(assistantCard);
[compose,play,arrange,learn].forEach(panel=>panels.appendChild(panel));
const quickActions=document.createElement('div');
quickActions.className='actions workspace-quick-actions';
quickActions.innerHTML='<button class="primary" id="workspaceSave">Save project</button><button class="ghost" id="workspaceExport">Export</button>';
compose.querySelector('.workspace-intro').appendChild(quickActions);
tabs.setAttribute('role','tablist');
$$('#workspaceTabs [data-workspace]').forEach(button=>{
  button.id=`workspace-tab-${button.dataset.workspace}`;
  button.setAttribute('role','tab');
  button.setAttribute('aria-controls',`workspace-panel-${button.dataset.workspace}`);
});
tabs.after(panels);
workgrid?.remove();stack?.remove();
composeView.appendChild(transport);

const workspaceNames=['compose','play','arrange','learn'];
function setWorkspace(name,{focus=false}={}){
  if(!workspaceNames.includes(name))name='compose';
  $$('#workspaceTabs [data-workspace]').forEach(button=>{const active=button.dataset.workspace===name;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1});
  $$('[data-workspace-panel]').forEach(panel=>{const active=panel.dataset.workspacePanel===name;panel.hidden=!active;panel.setAttribute('aria-hidden',String(!active))});
  try{sessionStorage.setItem('stagewrite-workspace',name)}catch{}
  if(focus)$('#workspace-tab-'+name)?.focus();
  scrollTo({top:0,behavior:document.documentElement.classList.contains('reduced-motion')?'auto':'smooth'});
}
tabs.addEventListener('click',event=>{const button=event.target.closest('[data-workspace]');if(button)setWorkspace(button.dataset.workspace)});
tabs.addEventListener('keydown',event=>{
  const button=event.target.closest('[data-workspace]');
  if(!button)return;
  const index=workspaceNames.indexOf(button.dataset.workspace);
  let nextIndex;
  if(event.key==='ArrowRight')nextIndex=(index+1)%workspaceNames.length;
  else if(event.key==='ArrowLeft')nextIndex=(index-1+workspaceNames.length)%workspaceNames.length;
  else if(event.key==='Home')nextIndex=0;
  else if(event.key==='End')nextIndex=workspaceNames.length-1;
  else return;
  event.preventDefault();
  setWorkspace(workspaceNames[nextIndex],{focus:true});
});
let savedWorkspace='compose';
try{savedWorkspace=sessionStorage.getItem('stagewrite-workspace')||'compose'}catch{}
setWorkspace(savedWorkspace);
$('#workspaceSave').onclick=()=>$('#saveBtn').click();
$('#workspaceExport').onclick=()=>$('#exportBtn').click();

const variations=$('#variations');
if(variations){const details=document.createElement('details');details.className='transform-menu';details.innerHTML='<summary>Transform</summary>';variations.before(details);details.appendChild(variations);variations.addEventListener('click',()=>details.open=false)}

const sectionTabs=$('#sectionTabs'),manager=document.createElement('div');
manager.className='section-manager';
sectionTabs.before(manager);manager.appendChild(sectionTabs);
const add=document.createElement('div');
add.className='add-section';
add.innerHTML='<select class="control" id="addSectionSelect" aria-label="Section to add"><option>Intro</option><option>Pre-Chorus</option><option>Post-Chorus</option><option>Bridge</option><option>Solo</option><option>Breakdown</option><option>Outro</option></select><button class="ghost" id="addSectionBtn">＋ Add section</button>';
manager.appendChild(add);
function visibleSections(){return APP.state.visibleSections||(APP.state.visibleSections=['Verse','Chorus'])}
function refreshSections(){const visible=visibleSections();$$('#sectionTabs [data-section]').forEach(button=>button.hidden=!visible.includes(button.dataset.section));const select=$('#addSectionSelect');if(select){[...select.options].forEach(option=>option.hidden=visible.includes(option.value));const next=[...select.options].find(option=>!option.hidden);if(next)select.value=next.value;add.hidden=!next}}
$('#addSectionBtn').onclick=()=>{const name=$('#addSectionSelect').value,list=visibleSections();if(!list.includes(name))list.push(name);APP.state.section=name;APP.state.length=APP.state.progressions[name].length;APP.render();refreshSections();APP.toast(name+' added')};
new MutationObserver(refreshSections).observe(sectionTabs,{childList:true});
refreshSections();

const previewLabels={Arrangement:'▶ Play arrangement',Piano:'Preview instrument · Piano',Guitar:'Preview instrument · Guitar',Bass:'Preview instrument · Bass',Ukulele:'Preview instrument · Ukulele',Drums:'Preview instrument · Drums'};
$$('#previewStrip [data-preview]').forEach(button=>button.textContent=previewLabels[button.dataset.preview]);
$('#showGuitarBtn').textContent='Open chord diagrams';
$('#transportPlay').setAttribute('aria-label','Play arrangement');
$('#transportPlay').title='Global Play';

const appearanceBody=$('#appearanceSettings .card-body'),buttonStyle=$('#settingButtonStyle')?.closest('.field'),colorGrid=$('#appearanceSettings .color-grid');
if(appearanceBody&&buttonStyle&&colorGrid){const advanced=document.createElement('details');advanced.className='advanced-appearance';advanced.innerHTML='<summary>Advanced appearance</summary><div class="advanced-appearance-body"></div>';colorGrid.before(advanced);advanced.querySelector('div').append(buttonStyle,colorGrid)}

const oldPreview=$('#assistantSettings .assistant-settings-preview');oldPreview?.remove();
const assistantTitle=$('#assistantSettings h2');if(assistantTitle)assistantTitle.innerHTML='StageWrite Theory Assistant <span class="beta-label">Beta</span>';
const assistantStatus=$('#assistantSettings .version');if(assistantStatus)assistantStatus.textContent='LOCAL · OPTIONAL';
const assistantSettingsBody=$('#assistantSettings .card-body');
if(assistantSettingsBody){assistantSettingsBody.insertAdjacentHTML('afterbegin','<p class="assistant-description">An experimental local music-theory assistant powered by StageWrite’s transparent theory engine.</p>');const note=assistantSettingsBody.querySelector('.settings-note');if(note)note.textContent='Disabled by default. Analysis stays in this browser and may be incomplete. StageWrite works fully without it.'}
const behaviour=$('#assistantBehaviour');if(behaviour){const current=behaviour.value;behaviour.innerHTML='<option>Quiet</option><option>Helpful</option><option>Teacher</option>';behaviour.value=current.includes('Silent')?'Quiet':current.includes('Teacher')||current.includes('Expert')?'Teacher':'Helpful'}
['assistantAppearance','assistantSize','assistantOpacity','assistantLocked','assistantLearning','assistantResetPosition'].forEach(id=>{const element=$('#'+id);(element?.closest('.field')||element?.closest('.setting-toggle')||element)?.remove()});
const companion=$('#assistantCompanion');if(companion){const clean=companion.cloneNode(true);clean.querySelector('.assistant-face').textContent='♫';companion.replaceWith(clean);clean.onclick=()=>{const panel=$('#assistantPanel');panel.hidden=!panel.hidden}};
const panelHead=$('#assistantPanel .assistant-head strong');if(panelHead)panelHead.innerHTML='StageWrite Theory Assistant <span class="beta-label">Beta</span>';
$('#openTheoryAssistant').onclick=()=>{if(document.documentElement.classList.contains('assistant-disabled')){APP.toast('Enable the Theory Assistant in Settings');$('#openAssistantSettings').click();return}$('#assistantCompanion')?.click()};
$('#openAssistantSettings').onclick=()=>{showView('settings');setTimeout(()=>$('#assistantSettings').scrollIntoView({behavior:'smooth'}),0)};

const tunerView=$('#tunerView'),tunerButton=$('#tunerBtn');
function syncTunerState(){const active=tunerButton.textContent.includes('Stop');tunerView.classList.toggle('tuner-active',active);tunerView.classList.toggle('tuner-inactive',!active)}
new MutationObserver(syncTunerState).observe(tunerButton,{childList:true,characterData:true,subtree:true});syncTunerState();

document.documentElement.dataset.release='1.6-refined';
})();
