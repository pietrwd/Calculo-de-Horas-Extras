const DAYS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

// ---------- Dados iniciais (a partir da planilha enviada) ----------
let state = {
  currentMonth: 'Agosto 2026',
  months: {
    'Agosto 2026': {
      employees: [
        {id:'wagner',    name:'Wagner Hugo Brizante',        rate:47.06, rateSpecial:50.00},
        {id:'carlos',    name:'Carlos Alberto da Silva',     rate:28.80, rateSpecial:28.80},
        {id:'celso',     name:'Celso José da Silva',         rate:47.06, rateSpecial:50.00},
        {id:'danilo',    name:'Danilo Benedito Zerlotti',    rate:48.00, rateSpecial:48.00},
        {id:'jean',      name:'Jean Cleber Antunes da Silva',rate:60.00, rateSpecial:60.00},
        {id:'henrique',  name:'Henrique Martins Rosa',       rate:60.00, rateSpecial:60.00},
      ],
      weeks: [
        { label:'31/07 a 02/08', entries:{
            wagner:{ 'Sábado':{hours:5, note:'06h às 11h'} },
            jean:{   'Sábado':{hours:5, note:'07h às 12h'} },
        }},
        { label:'03/08 a 09/08', entries:{
            wagner:{ 'Terça':{hours:1,note:'17h às 18h'}, 'Quarta':{hours:1,note:'17h às 18h'}, 'Quinta':{hours:1,note:'17h às 18h'} },
            carlos:{ 'Segunda':{hours:3,note:'17h às 20h'} },
        }},
        { label:'10/08 a 16/08', entries:{
            carlos:{ 'Terça':{hours:2,note:'17h às 19h'} },
            celso:{  'Terça':{hours:1,note:'17h às 18h'}, 'Quarta':{hours:1,note:'17h às 18h'}, 'Quinta':{hours:1,note:'17h às 18h'} },
            jean:{   'Quarta':{hours:1,note:'17h às 18h'}, 'Sábado':{hours:4.5,note:'08h às 12h30'} },
        }},
        { label:'17/08 a 23/08', entries:{
            jean:{ 'Segunda':{hours:1,note:'17h às 18h'} },
        }},
        { label:'24/08 a 30/08', entries:{} },
      ]
    }
  }
};

let ctxEdit = null; // {weekIdx, empId, day}
let chartEmp=null, chartWeek=null;

// ---------- Persistência via API (backend Node.js + PostgreSQL) ----------
const DEFAULT_LOGO = document.querySelector('.auth-visual img.brand-logo') ? document.querySelector('.auth-visual img.brand-logo').src : null;
let companyLogo = null;

async function loadPersisted(){
  try{
    const data = await window.AjoferAPI.apiFetch('/api/dashboard');
    if(data && data.state && data.state.months && data.state.currentMonth){
      state = data.state;
    }
    if(data && data.logo){
      companyLogo = data.logo;
    }
  }catch(e){
    toast(e.message || 'Não foi possível carregar os dados do servidor. Mostrando dados locais.');
  }
}

function applyLogo(){
  const mark = document.getElementById('brandMark');
  const src = companyLogo || DEFAULT_LOGO;
  mark.innerHTML = src ? `<img src="${src}" alt="Logotipo da empresa">` : '⏱';
}

async function saveChanges(){
  try{
    await window.AjoferAPI.apiFetch('/api/dashboard', {
      method: 'PUT',
      body: JSON.stringify({ state, logo: companyLogo }),
    });
    toast('Alterações salvas no servidor');
  }catch(e){
    toast(e.message || 'Não foi possível salvar — verifique sua conexão');
  }
}
document.getElementById('btnSave').addEventListener('click', saveChanges);

document.getElementById('logoInput').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){ toast('Selecione um arquivo de imagem'); return; }
  const reader = new FileReader();
  reader.onload = async (ev)=>{
    companyLogo = ev.target.result;
    applyLogo();
    await saveChanges();
    toast('Logotipo atualizado e salvo no servidor');
  };
  reader.readAsDataURL(file);
  e.target.value='';
});

function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toast._tm);
  toast._tm=setTimeout(()=>t.classList.remove('show'), 2200);
}
function fmtMoney(v){ return 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtHours(v){
  if(v % 1 === 0) return v + 'h';
  return v.toString().replace('.',',') + 'h';
}
function currentData(){ return state.months[state.currentMonth]; }
function findEmployee(id){ return currentData().employees.find(e=>e.id===id); }

function entryCost(emp, day, entry){
  const isSpecial = entry.holiday || day==='Domingo';
  const rate = isSpecial ? emp.rateSpecial : emp.rate;
  return entry.hours * rate;
}

// ---------- Render: seletor de mês ----------
function renderMonthSelect(){
  const sel=document.getElementById('monthSelect');
  sel.innerHTML='';
  Object.keys(state.months).forEach(m=>{
    const opt=document.createElement('option');
    opt.value=m; opt.textContent=m;
    if(m===state.currentMonth) opt.selected=true;
    sel.appendChild(opt);
  });
}

// ---------- Render: filtro de colaborador ----------
function renderEmployeeFilter(){
  const sel=document.getElementById('employeeFilter');
  const prev=sel.value;
  sel.innerHTML='<option value="">Todos os colaboradores</option>';
  currentData().employees.forEach(e=>{
    const opt=document.createElement('option');
    opt.value=e.id; opt.textContent=e.name;
    sel.appendChild(opt);
  });
  sel.value = prev && currentData().employees.some(e=>e.id===prev) ? prev : '';
}

// ---------- Render: cartões de semana ----------
function renderWeeks(){
  const wrap=document.getElementById('weeksWrap');
  wrap.innerHTML='';
  const data=currentData();
  const filterId=document.getElementById('employeeFilter').value;

  data.weeks.forEach((week, wIdx)=>{
    const employeesToShow = filterId ? data.employees.filter(e=>e.id===filterId) : data.employees;

    let weekHours=0, weekCost=0;
    employeesToShow.forEach(e=>{
      DAYS.forEach(d=>{
        const entry = week.entries[e.id] && week.entries[e.id][d];
        if(entry){ weekHours += entry.hours; weekCost += entryCost(e,d,entry); }
      });
    });

    const card=document.createElement('div');
    card.className='punch-card';
    card.innerHTML = `
      <div class="punch-head">
        <div class="punch-title"><span class="num">SEMANA ${String(wIdx+1).padStart(2,'0')}</span>${week.label}</div>
        <div class="punch-total"><b>${fmtHours(weekHours)}</b> · ${fmtMoney(weekCost)}
          <span class="row-remove" data-remove-week="${wIdx}" title="Remover semana" style="margin-left:10px;">✕</span>
        </div>
      </div>
      <div class="table-scroll">
        <table class="week-table">
          <thead>
            <tr>
              <th class="name-cell">Colaborador</th>
              ${DAYS.map(d=>`<th>${d.slice(0,3)}</th>`).join('')}
              <th>Total</th>
              <th>Custo</th>
            </tr>
          </thead>
          <tbody>
            ${employeesToShow.map(e=>{
              let empHours=0, empCost=0;
              const cells = DAYS.map(d=>{
                const entry = week.entries[e.id] && week.entries[e.id][d];
                if(entry){
                  empHours+=entry.hours; empCost+=entryCost(e,d,entry);
                  const holiday = entry.holiday || d==='Domingo';
                  return `<td class="day-cell" data-week="${wIdx}" data-emp="${e.id}" data-day="${d}">
                            <span class="day-hours ${holiday?'holiday':''}">${fmtHours(entry.hours)}</span>
                            ${entry.note?`<span class="day-note">${entry.note}</span>`:''}
                          </td>`;
                }
                return `<td class="day-cell" data-week="${wIdx}" data-emp="${e.id}" data-day="${d}">
                          <span class="day-hours empty">—</span>
                        </td>`;
              }).join('');
              return `<tr>
                <td class="name-cell">${e.name}</td>
                ${cells}
                <td class="row-total">${fmtHours(empHours)}</td>
                <td class="row-cost">${fmtMoney(empCost)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll('.day-cell').forEach(td=>{
    td.addEventListener('click', ()=>openCellModal(+td.dataset.week, td.dataset.emp, td.dataset.day));
  });
  wrap.querySelectorAll('[data-remove-week]').forEach(el=>{
    el.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const idx=+el.dataset.removeWeek;
      if(confirm('Remover esta semana e todos os lançamentos dela?')){
        currentData().weeks.splice(idx,1);
        renderAll();
        toast('Semana removida');
      }
    });
  });
}

// ---------- Render: cartões de colaboradores ----------
function renderEmployees(){
  const grid=document.getElementById('employeeGrid');
  grid.innerHTML='';
  const data=currentData();
  data.employees.forEach(e=>{
    let totalHours=0, totalCost=0;
    data.weeks.forEach(w=>{
      DAYS.forEach(d=>{
        const entry = w.entries[e.id] && w.entries[e.id][d];
        if(entry){ totalHours+=entry.hours; totalCost+=entryCost(e,d,entry); }
      });
    });
    const card=document.createElement('div');
    card.className='employee-card';
    card.innerHTML=`
      <span class="emp-remove" data-remove-emp="${e.id}" title="Remover colaborador">✕</span>
      <div class="emp-name">${e.name}</div>
      <div class="emp-rates">Normal: <b>${fmtMoney(e.rate)}</b>/h<br>Domingo/feriado: <b>${fmtMoney(e.rateSpecial)}</b>/h</div>
      <div class="emp-total">Acumulado no mês: <b>${fmtHours(totalHours)}</b> · ${fmtMoney(totalCost)}</div>
    `;
    grid.appendChild(card);
  });
  grid.querySelectorAll('[data-remove-emp]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id=el.dataset.removeEmp;
      if(confirm('Remover este colaborador e todos os lançamentos dele no mês?')){
        const d=currentData();
        d.employees=d.employees.filter(e=>e.id!==id);
        d.weeks.forEach(w=>{ delete w.entries[id]; });
        renderAll();
        toast('Colaborador removido');
      }
    });
  });
}

// ---------- Render: hero / KPIs ----------
function renderHero(){
  const data=currentData();
  let totalHours=0, totalCost=0, holidayHours=0, entryCount=0;
  const perEmployee={};
  data.employees.forEach(e=>perEmployee[e.id]=0);

  data.weeks.forEach(w=>{
    data.employees.forEach(e=>{
      DAYS.forEach(d=>{
        const entry = w.entries[e.id] && w.entries[e.id][d];
        if(entry){
          totalHours+=entry.hours;
          totalCost+=entryCost(e,d,entry);
          entryCount++;
          perEmployee[e.id]+=entry.hours;
          if(entry.holiday || d==='Domingo') holidayHours+=entry.hours;
        }
      });
    });
  });

  let topId=null, topHours=-1;
  Object.entries(perEmployee).forEach(([id,h])=>{ if(h>topHours){topHours=h; topId=id;} });
  const topEmp = topId ? findEmployee(topId) : null;

  document.getElementById('heroMonthLabel').textContent=state.currentMonth;
  document.getElementById('heroTotalHours').innerHTML = totalHours.toString().replace('.',',') + '<span>h</span>';
  document.getElementById('heroWeekCount').textContent = data.weeks.length;
  document.getElementById('heroEntryCount').textContent = entryCount;
  document.getElementById('heroTotalCost').textContent = fmtMoney(totalCost);
  document.getElementById('heroTopEmployee').textContent = topEmp && topHours>0 ? topEmp.name : '—';
  document.getElementById('heroTopHours').textContent = topEmp && topHours>0 ? fmtHours(topHours)+' acumuladas' : 'sem lançamentos ainda';
  document.getElementById('heroHolidayHours').textContent = fmtHours(holidayHours);

  return {perEmployee, data};
}

// ---------- Render: gráficos ----------
function renderCharts(heroData){
  const {perEmployee, data} = heroData;
  const empLabels = data.employees.map(e=>e.name.split(' ')[0]);
  const empValues = data.employees.map(e=>perEmployee[e.id]||0);

  const weekLabels = data.weeks.map((w,i)=>'S'+(i+1));
  const weekValues = data.weeks.map(w=>{
    let h=0;
    data.employees.forEach(e=>{
      DAYS.forEach(d=>{
        const entry=w.entries[e.id] && w.entries[e.id][d];
        if(entry) h+=entry.hours;
      });
    });
    return h;
  });

  const gridColor='rgba(28,37,48,0.08)';
  const textColor='#6B7684';

  if(chartEmp) chartEmp.destroy();
  chartEmp = new Chart(document.getElementById('chartByEmployee'), {
    type:'bar',
    data:{ labels:empLabels, datasets:[{
      label:'Horas extras', data:empValues,
      backgroundColor:'#379DF6', borderRadius:5, maxBarThickness:36
    }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{color:textColor, font:{family:'Inter'}}, grid:{display:false} },
        y:{ ticks:{color:textColor, font:{family:"IBM Plex Mono"}}, grid:{color:gridColor}, beginAtZero:true }
      }
    }
  });

  if(chartWeek) chartWeek.destroy();
  chartWeek = new Chart(document.getElementById('chartByWeek'), {
    type:'line',
    data:{ labels:weekLabels, datasets:[{
      label:'Horas', data:weekValues,
      borderColor:'#E3B24A', backgroundColor:'rgba(250,221,143,0.35)',
      fill:true, tension:.35, pointBackgroundColor:'#E3B24A', pointRadius:4
    }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{color:textColor, font:{family:'Inter'}}, grid:{display:false} },
        y:{ ticks:{color:textColor, font:{family:"IBM Plex Mono"}}, grid:{color:gridColor}, beginAtZero:true }
      }
    }
  });
}

function renderAll(){
  renderMonthSelect();
  renderEmployeeFilter();
  renderWeeks();
  renderEmployees();
  const heroData=renderHero();
  renderCharts(heroData);
}

// ---------- Modal: célula (lançar/editar horas) ----------
function openCellModal(weekIdx, empId, day){
  ctxEdit={weekIdx, empId, day};
  const week=currentData().weeks[weekIdx];
  const emp=findEmployee(empId);
  const entry = week.entries[empId] && week.entries[empId][day];

  document.getElementById('cellModalTitle').textContent = `${emp.name.split(' ')[0]} — ${day}`;
  document.getElementById('cellHours').value = entry ? entry.hours : '';
  document.getElementById('cellNote').value = entry ? (entry.note||'') : '';
  document.getElementById('cellHoliday').checked = entry ? !!entry.holiday : false;
  document.getElementById('cellHoliday').disabled = (day==='Domingo');
  document.getElementById('overlayCell').classList.add('show');
}
document.getElementById('cellCancel').addEventListener('click', ()=>document.getElementById('overlayCell').classList.remove('show'));
document.getElementById('cellSave').addEventListener('click', ()=>{
  const hours=parseFloat(document.getElementById('cellHours').value);
  if(isNaN(hours) || hours<=0){ toast('Informe um número de horas válido'); return; }
  const note=document.getElementById('cellNote').value.trim();
  const holiday=document.getElementById('cellHoliday').checked;
  const week=currentData().weeks[ctxEdit.weekIdx];
  if(!week.entries[ctxEdit.empId]) week.entries[ctxEdit.empId]={};
  week.entries[ctxEdit.empId][ctxEdit.day]={hours, note, holiday};
  document.getElementById('overlayCell').classList.remove('show');
  renderAll();
  toast('Lançamento salvo');
});
document.getElementById('cellRemove').addEventListener('click', ()=>{
  const week=currentData().weeks[ctxEdit.weekIdx];
  if(week.entries[ctxEdit.empId]) delete week.entries[ctxEdit.empId][ctxEdit.day];
  document.getElementById('overlayCell').classList.remove('show');
  renderAll();
  toast('Lançamento removido');
});

// ---------- Modal: novo colaborador ----------
document.getElementById('btnNewEmployee').addEventListener('click', ()=>{
  document.getElementById('empName').value='';
  document.getElementById('empRate').value='';
  document.getElementById('empRateSpecial').value='';
  document.getElementById('overlayEmployee').classList.add('show');
});
document.getElementById('empCancel').addEventListener('click', ()=>document.getElementById('overlayEmployee').classList.remove('show'));
document.getElementById('empSave').addEventListener('click', ()=>{
  const name=document.getElementById('empName').value.trim();
  const rate=parseFloat(document.getElementById('empRate').value);
  const rateSpecial=parseFloat(document.getElementById('empRateSpecial').value) || rate;
  if(!name || isNaN(rate)){ toast('Preencha nome e valor da hora'); return; }
  const id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-') + '-' + Date.now().toString(36);
  currentData().employees.push({id, name, rate, rateSpecial});
  document.getElementById('overlayEmployee').classList.remove('show');
  renderAll();
  toast('Colaborador adicionado');
});

// ---------- Modal: nova semana ----------
document.getElementById('btnNewWeek').addEventListener('click', ()=>{
  document.getElementById('weekLabel').value='';
  document.getElementById('overlayWeek').classList.add('show');
});
document.getElementById('weekCancel').addEventListener('click', ()=>document.getElementById('overlayWeek').classList.remove('show'));
document.getElementById('weekSave').addEventListener('click', ()=>{
  const label=document.getElementById('weekLabel').value.trim();
  if(!label){ toast('Informe o período da semana'); return; }
  currentData().weeks.push({label, entries:{}});
  document.getElementById('overlayWeek').classList.remove('show');
  renderAll();
  toast('Semana adicionada');
});

// ---------- Modal: novo mês ----------
document.getElementById('btnNewMonth').addEventListener('click', ()=>{
  document.getElementById('monthName').value='';
  document.getElementById('monthCopyEmployees').checked=true;
  document.getElementById('overlayMonth').classList.add('show');
});
document.getElementById('monthCancel').addEventListener('click', ()=>document.getElementById('overlayMonth').classList.remove('show'));
document.getElementById('monthSave').addEventListener('click', ()=>{
  const name=document.getElementById('monthName').value.trim();
  if(!name){ toast('Informe o nome do mês'); return; }
  if(state.months[name]){ toast('Já existe um mês com esse nome'); return; }
  const copy=document.getElementById('monthCopyEmployees').checked;
  state.months[name]={
    employees: copy ? currentData().employees.map(e=>({...e})) : [],
    weeks: []
  };
  state.currentMonth=name;
  document.getElementById('overlayMonth').classList.remove('show');
  renderAll();
  toast('Mês "'+name+'" criado');
});

// ---------- Seletor de mês / filtro ----------
document.getElementById('monthSelect').addEventListener('change', (e)=>{
  state.currentMonth=e.target.value;
  renderAll();
});
document.getElementById('employeeFilter').addEventListener('change', renderWeeks);

// ---------- Fechar modal clicando fora ----------
document.querySelectorAll('.overlay').forEach(ov=>{
  ov.addEventListener('click', (e)=>{ if(e.target===ov) ov.classList.remove('show'); });
});

// ---------- Exportar Excel (relatório do mês, com aba por colaborador) ----------
function exportExcel(){
  const data = currentData();
  const monthName = state.currentMonth;
  const wb = XLSX.utils.book_new();

  // ---- Aba Resumo ----
  const resumoRows = [];
  resumoRows.push(['Relatório de Horas Extras']);
  resumoRows.push(['Mês', monthName]);
  resumoRows.push(['Gerado em', new Date().toLocaleString('pt-BR')]);
  resumoRows.push([]);
  resumoRows.push(['Colaborador','Valor Hora Normal (R$)','Valor Hora Domingo/Feriado (R$)','Total Horas','Horas Domingo/Feriado','Custo Total (R$)']);

  let grandHours=0, grandCost=0, grandHoliday=0;
  data.employees.forEach(e=>{
    let totalHours=0, totalCost=0, holidayHours=0;
    data.weeks.forEach(w=>{
      DAYS.forEach(d=>{
        const entry=w.entries[e.id] && w.entries[e.id][d];
        if(entry){
          totalHours+=entry.hours;
          totalCost+=entryCost(e,d,entry);
          if(entry.holiday || d==='Domingo') holidayHours+=entry.hours;
        }
      });
    });
    grandHours+=totalHours; grandCost+=totalCost; grandHoliday+=holidayHours;
    resumoRows.push([e.name, e.rate, e.rateSpecial, totalHours, holidayHours, Number(totalCost.toFixed(2))]);
  });
  resumoRows.push([]);
  resumoRows.push(['TOTAL GERAL','','', grandHours, grandHoliday, Number(grandCost.toFixed(2))]);

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
  wsResumo['!cols'] = [{wch:28},{wch:20},{wch:24},{wch:14},{wch:20},{wch:16}];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // ---- Aba Lançamentos (lista detalhada) ----
  const detRows = [['Semana','Período','Colaborador','Dia','Horas','Observação','Feriado/Domingo','Valor Hora Aplicado (R$)','Custo (R$)']];
  data.weeks.forEach((w,wIdx)=>{
    data.employees.forEach(e=>{
      DAYS.forEach(d=>{
        const entry = w.entries[e.id] && w.entries[e.id][d];
        if(entry){
          const holiday = entry.holiday || d==='Domingo';
          const rate = holiday ? e.rateSpecial : e.rate;
          detRows.push(['Semana '+(wIdx+1), w.label, e.name, d, entry.hours, entry.note||'', holiday?'Sim':'Não', rate, Number(entryCost(e,d,entry).toFixed(2))]);
        }
      });
    });
  });
  const wsDet = XLSX.utils.aoa_to_sheet(detRows);
  wsDet['!cols'] = [{wch:10},{wch:16},{wch:26},{wch:10},{wch:8},{wch:22},{wch:16},{wch:16},{wch:14}];
  XLSX.utils.book_append_sheet(wb, wsDet, 'Lançamentos');

  // ---- Uma aba por colaborador ----
  const usedNames = {};
  data.employees.forEach(e=>{
    const rows = [];
    rows.push([`Colaborador: ${e.name}`]);
    rows.push([`Valor hora normal: R$ ${e.rate.toFixed(2)}`, `Valor hora domingo/feriado: R$ ${e.rateSpecial.toFixed(2)}`]);
    rows.push([]);
    rows.push(['Semana','Período', ...DAYS, 'Total Horas','Custo (R$)']);

    let empTotalHours=0, empTotalCost=0;
    data.weeks.forEach((w,wIdx)=>{
      let weekHours=0, weekCost=0;
      const dayVals = DAYS.map(d=>{
        const entry = w.entries[e.id] && w.entries[e.id][d];
        if(entry){
          weekHours+=entry.hours; weekCost+=entryCost(e,d,entry);
          return entry.hours + (entry.note?` (${entry.note})`:'') + (entry.holiday||d==='Domingo' ? ' *' : '');
        }
        return '';
      });
      empTotalHours+=weekHours; empTotalCost+=weekCost;
      rows.push(['Semana '+(wIdx+1), w.label, ...dayVals, weekHours, Number(weekCost.toFixed(2))]);
    });

    rows.push([]);
    rows.push(['TOTAL','', ...Array(7).fill(''), empTotalHours, Number(empTotalCost.toFixed(2))]);
    rows.push([]);
    rows.push(['* Horas com adicional de domingo/feriado']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:10},{wch:16},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12},{wch:12}];

    let sheetName = e.name.replace(/[\\\/\?\*\[\]:]/g,'').slice(0,31) || 'Colaborador';
    if(usedNames[sheetName]){ usedNames[sheetName]++; sheetName = sheetName.slice(0,28)+'-'+usedNames[sheetName]; }
    else usedNames[sheetName]=1;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `Relatorio-Horas-Extras-${monthName.replace(/\s+/g,'-')}.xlsx`);
  toast('Relatório Excel exportado');
}
document.getElementById('btnExportExcel').addEventListener('click', exportExcel);

// ---------- Exportar / Importar ----------
document.getElementById('btnExport').addEventListener('click', ()=>{
  const blob=new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='horas-extras-'+state.currentMonth.replace(/\s+/g,'-').toLowerCase()+'.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Arquivo exportado');
});
document.getElementById('btnImport').addEventListener('click', ()=>document.getElementById('fileImport').click());
document.getElementById('fileImport').addEventListener('change', (e)=>{
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=(ev)=>{
    try{
      const imported=JSON.parse(ev.target.result);
      if(!imported.months || !imported.currentMonth) throw new Error('formato inválido');
      state=imported;
      renderAll();
      toast('Dados importados com sucesso');
    }catch(err){
      toast('Não foi possível ler este arquivo');
    }
  };
  reader.readAsText(file);
  e.target.value='';
});

// ---------- Init (chamado após o login, veja o script de autenticação) ----------
window.initAjoferDashboard = async function(){
  await loadPersisted();
  applyLogo();
  renderAll();
};
