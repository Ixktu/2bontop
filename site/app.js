import {totalScore, validateData, allocateTargets} from './model.js';

const $ = id => document.getElementById(id);
const fmt = n => n == null ? '—' : String(n);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = v => v ? v.replaceAll('-', '.') : '日期待补充';
let data, selectedRecord, chartSubject = 'total';

function renderTable(headers, rows, className = '') {
  return `<div class="table-wrap"><table class="${className}"><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(cells => `<tr>${cells.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function maxTotal() {return data.subjects.reduce((n, s) => n + s.max, 0);}
function current() {return data.records.find(r => r.id === selectedRecord) || data.records.at(-1);}
function status(record) {return record.status === 'estimate' ? '估分' : '正式成绩';}
function recordMeta(record) {return record.examDate ? `考试日期 ${date(record.examDate)}` : `记录于 ${date(record.recordedAt)}`;}
function section(title, body, attrs = '') {return `<section class="section" ${attrs}><h2>${title}</h2>${body}</section>`;}

function renderScores() {
  const record = current();
  if (!record) {$('scores').innerHTML = '<h1>成绩</h1><p class="empty">暂无成绩记录。</p>'; return;}
  const total = totalScore(record, data.subjects), full = maxTotal();
  const rows = data.subjects.map(s => {
    const value = record.scores[s.id];
    return [`<span class="subject-name">${esc(s.name)}</span>`, `${fmt(value)}<span class="score-max">/ ${s.max}</span>`, fmt(value == null ? null : s.max - value), `<div class="progress" aria-label="得分率 ${value == null ? '未知' : (100 * value / s.max).toFixed(1)+'%'}"><span style="width:${value == null ? 0 : value / s.max * 100}%"></span></div>`];
  });
  const options = [{id:'total',name:'总分'}, ...data.subjects].map(s => `<option value="${esc(s.id)}" ${s.id === chartSubject ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const records = [...data.records].reverse().map(r => [`<button class="record-button" data-record="${esc(r.id)}">${esc(r.label)}</button><span class="record-status">${status(r)}</span>`, `<span class="date-label">${esc(date(r.examDate || r.recordedAt))}${r.examDate ? '' : ' 记录'}</span>`, `${fmt(totalScore(r, data.subjects))}<span class="score-max">/ ${full}</span>`]);
  $('scores').innerHTML = `<div class="section-line"><h1>成绩</h1><span class="small">${esc(recordMeta(record))}</span></div>
    <div class="hero"><div><p class="total-label">${esc(record.label)}<span class="badge">${status(record)}</span></p><div class="total-line"><strong class="total">${fmt(total)}</strong><span class="denominator">/ ${full}</span></div></div>
    <dl class="summary-stats"><div><dt>${record.status === 'estimate' ? '预计失分' : '失分'}</dt><dd>${fmt(total == null ? null : full - total)}</dd></div><div><dt>成绩记录</dt><dd>${data.records.length}<span class="score-max">次</span></dd></div><div><dt>目标总分</dt><dd class="${data.goals?.targetTotal == null ? 'text-value' : ''}">${data.goals?.targetTotal == null ? '待确定' : esc(data.goals.targetTotal)}</dd></div><div><dt>成绩状态</dt><dd class="text-value">${status(record)}</dd></div></dl></div>
    ${section('各科成绩', renderTable(['科目','分数',record.status === 'estimate' ? '预计失分' : '失分','得分率'], rows))}
    <div class="grid-two"><section class="section"><div class="section-header"><h2>成绩变化</h2><select id="chart-subject" aria-label="趋势科目">${options}</select></div><div id="chart" class="chart"></div><p id="chart-note" class="chart-note"></p></section>
    ${section('考试记录', renderTable(['记录','日期','总分'], records, 'record-table'))}</div>`;
  $('chart-subject').addEventListener('change', e => {chartSubject = e.target.value; renderChart();});
  $('scores').querySelectorAll('[data-record]').forEach(button => button.addEventListener('click', () => {selectedRecord = button.dataset.record; renderAll();}));
  renderChart();
}

function renderChart() {
  const subject = data.subjects.find(s => s.id === chartSubject);
  const records = data.records.map(r => ({record:r, value:subject ? r.scores[subject.id] : totalScore(r, data.subjects)})).filter(x => Number.isFinite(x.value));
  const max = subject?.max || maxTotal(), width = Math.max(240, Math.round($('chart').getBoundingClientRect().width || 620)), height = 250, left = 38, right = 20, top = 25, bottom = 42;
  const w = width - left - right, h = height - top - bottom;
  const points = records.map((r, i) => ({...r, x:left + (records.length === 1 ? w / 2 : i * w / (records.length - 1)), y:top + (1 - r.value / max) * h}));
  const axes = [0,.5,1].map(n => `<line class="axis" x1="${left}" y1="${top+(1-n)*h}" x2="${width-right}" y2="${top+(1-n)*h}"/><text x="${left-9}" y="${top+(1-n)*h+4}" text-anchor="end">${max*n}</text>`).join('');
  const segments = points.length > 1 ? `<polyline class="series" points="${points.map(p=>`${p.x},${p.y}`).join(' ')}"/>` : '';
  const dots = points.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="4"><title>${esc(p.record.label)}：${p.value}${p.record.status === 'estimate' ? '（估分）' : ''}</title></circle><text x="${p.x}" y="${p.y-13}" text-anchor="middle">${p.value}${p.record.status === 'estimate' ? '*' : ''}</text>${points.length <= 6 || i === 0 || i === points.length-1 ? `<text x="${p.x}" y="${height-10}" text-anchor="middle">${esc((p.record.examDate || p.record.recordedAt || '').slice(5).replace('-', '.'))}</text>` : ''}`).join('');
  $('chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(subject?.name || '总分')}成绩变化，共${points.length}条有效记录">${axes}${segments}${dots}</svg>`;
  $('chart-note').textContent = points.length === 1 ? '仅 1 次记录，暂不连线。* 为估分。' : points.length ? '* 为估分；横轴按记录顺序排列。' : '暂无该科成绩。';
}

function renderGoals() {
  const goals = data.goals || {}, record = current(), target = goals.targetTotal;
  const plan = target == null ? null : allocateTargets(target, data.subjects, goals.fixedScores || {});
  const rows = data.subjects.map(s => {
    const p = plan?.ok ? plan.scores[s.id] : null, current = record?.scores[s.id];
    const gap = p != null && current != null ? p-current : null;
    return [`<span class="subject-name">${esc(s.name)}</span>`, fmt(current), fmt(p), gap == null ? '—' : gap > 0 ? `+${gap}` : String(gap)];
  });
  const bands = Array.isArray(data.schoolBands) ? data.schoolBands.filter(b => b.school === goals.school) : [];
  const total = record ? totalScore(record, data.subjects) : null;
  $('goals').innerHTML = `<div class="section-line"><h1>目标</h1></div><div class="hero"><div><p class="total-label">目标总分</p><div class="total-line"><strong class="total">${target == null ? '—' : esc(target)}</strong><span class="denominator">/ ${maxTotal()}</span></div></div>
    <div><p class="plan-heading">${esc(goals.school || '学校待确定')}</p><div class="plan-meta"><p class="small">班型：${esc(goals.className || '待确定')}</p><p class="small">目标差距：${target == null || total == null ? '—' : Math.max(0,target-total)+' 分'}</p></div>${target == null ? '<p class="empty">目标总分尚未确定。</p>' : plan.ok ? '' : `<p class="empty">${esc(plan.reason)}</p>`}</div></div>
    ${section('各科目标',renderTable(['科目','当前','目标','差额'],rows))}
    ${section('班型参考',bands.length ? renderTable(['学校','班型','参考总分','资料年份'],bands.map(b=>[esc(b.school),esc(b.name),fmt(b.minScore),esc(b.year || '待核实')])) : '<p class="empty">班型参考表尚未导入。</p>')}`;
}

function renderReview() {
  const record = current();
  if (!record) {$('review').innerHTML = '<h1>复盘</h1><p class="empty">暂无考试记录。</p>'; return;}
  const review = record.review || {};
  const options = [...data.records].reverse().map(r=>`<option value="${esc(r.id)}" ${r.id === record.id ? 'selected':''}>${esc(r.label)}</option>`).join('');
  const losses = data.subjects.filter(s=>record.scores[s.id] != null).map(s=>({...s,loss:s.max-record.scores[s.id]})).sort((a,b)=>b.loss-a.loss);
  const maxLoss = Math.max(1,...losses.map(s=>s.loss));
  const lossList = `<ul class="loss-list">${losses.map(s=>`<li><span>${esc(s.name)}</span><span class="loss-track"><span style="width:${s.loss/maxLoss*100}%"></span></span><span class="number">${s.loss}</span></li>`).join('')}</ul>`;
  const body = text => text ? `<p class="review-copy">${esc(text)}</p>` : '<p class="empty">待试卷发放后补充。</p>';
  const predictionRows = data.subjects.map(s=>[`<span class="subject-name">${esc(s.name)}</span>`,fmt(record.scores[s.id]),fmt(review.prediction?.[s.id])]);
  $('review').innerHTML = `<div class="section-header"><h1>复盘</h1><select id="review-record" aria-label="复盘记录">${options}</select></div><div class="review-meta"><h2 class="review-heading">${esc(record.label)}<span class="badge">${status(record)}</span></h2><p class="small">${esc(recordMeta(record))}</p></div>
    <div class="grid-two">${section('考后总结',body(review.summary))}${section(record.status === 'estimate' ? '预计失分分布' : '失分分布',lossList)}</div>
    ${section('得失分析',body(review.lossAnalysis))}${section('下次调整',body(review.nextSteps))}
    ${section('下次预测',review.prediction ? renderTable(['科目','本次','预测'],predictionRows) : '<p class="empty">暂未预测。</p>')}`;
  $('review-record').addEventListener('change', e=>{selectedRecord=e.target.value;renderAll();});
}

function selectTab() {
  const tab = ['scores','goals','review'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'scores';
  document.querySelectorAll('[data-tab]').forEach(a=>{if(a.dataset.tab===tab)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  for (const id of ['scores','goals','review']) $(id).hidden=id!==tab;
  if (tab === 'scores' && $('chart')) renderChart();
}
function renderAll() {renderScores();renderGoals();renderReview();selectTab();}

try {
  const response = await fetch(new URL('./data/study.json',import.meta.url),{cache:'no-cache'});
  if(!response.ok)throw new Error('成绩资料暂时无法读取');
  data=validateData(await response.json());
  selectedRecord=data.records.at(-1)?.id;
  $('loading').hidden=true;
  $('updated').textContent=`更新 ${date(data.updatedAt)}`;
  $('updated').dateTime=data.updatedAt;
  renderAll();
  addEventListener('hashchange',selectTab);
  addEventListener('resize',()=>{if (!$('scores').hidden && $('chart')) renderChart();});
} catch(error) {
  $('loading').textContent=`页面未能加载。${error.message}，请稍后刷新。`;
  $('loading').setAttribute('role','alert');
}
