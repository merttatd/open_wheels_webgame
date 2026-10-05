(() => {
const panel=document.createElement('details');panel.className='roster-panel';
panel.innerHTML='<summary>Kadro garajı · yedek takımlar ve pilotlar</summary><p>Takım veya pilot seç; kaydet ve uygula. Kadro sezon boyunca sabit kalır.</p><form id="roster-form"><div id="roster-rows"></div><div class="roster-actions"><button type="submit">Kadroyu kaydet ve uygula</button><button type="button" id="roster-reset">Orijinal kadroyu getir</button></div></form><p id="roster-status" role="status"></p><h3>Garajda bekleyen takımlar</h3><div class="reserve-list"></div>';
document.querySelector('.teams').after(panel);
const rows=panel.querySelector('#roster-rows');
function option(select,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}
function render(grid){rows.replaceChildren();grid.forEach((entry,index)=>{
 const row=document.createElement('div');row.className='roster-row';const img=document.createElement('img');img.alt='';const team=document.createElement('select');team.setAttribute('aria-label',`${index+1}. takım`);
 RaceRoster.catalog.forEach(t=>option(team,t.slug,`${t.name} · ${t.speed} km/sa`));team.value=entry.slug;
 const pilots=[0,1].map(seat=>{const select=document.createElement('select');select.setAttribute('aria-label',`${index+1}. takım, ${seat+1}. pilot`);RaceRoster.drivers.forEach(d=>option(select,d.code,`${d.name} · ${d.code}`));select.value=entry.pilots[seat];return select;});
 const preview=()=>{img.src=`assets/teams/${team.value}.svg`;};preview();team.addEventListener('change',()=>{const t=RaceRoster.catalog.find(t=>t.slug===team.value);pilots.forEach((p,i)=>p.value=t.drivers[i][0]);preview();});
 row.append(img,team,...pilots);rows.append(row);
});}
render(RaceRoster.grid);
const reserves=panel.querySelector('.reserve-list');RaceRoster.catalog.filter(t=>!RaceRoster.grid.some(row=>row.slug===t.slug)).forEach(t=>{const card=document.createElement('div');card.className='reserve-card';const img=document.createElement('img');img.src=`assets/teams/${t.slug}.svg`;img.alt='';const title=document.createElement('strong');title.textContent=t.name;const pilots=document.createElement('small');pilots.textContent=`${t.drivers.map(d=>d[1]).join(' / ')} · ${t.speed} km/sa`;card.append(img,title,pilots);reserves.append(card);});
const status=panel.querySelector('#roster-status');
panel.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const next=[...rows.children].map(row=>{const selects=row.querySelectorAll('select');return{slug:selects[0].value,pilots:[selects[1].value,selects[2].value]};});try{RaceRoster.save(next);location.reload();}catch(error){status.textContent=error.message;}});
panel.querySelector('#roster-reset').addEventListener('click',()=>{if(RaceRoster.locked)return;render(RaceRoster.defaults());status.textContent='Orijinal kadro hazır. Uygulamak için kaydet.';});
window.updateRosterLock=()=>{panel.querySelectorAll('select,button').forEach(el=>el.disabled=RaceRoster.locked);status.textContent=RaceRoster.locked?'Kadro sezon boyunca kilitli. Yeni sezonda değiştirebilirsin.':'';};
})();