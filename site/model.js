export function totalScore(record, subjects) {
  if (!record || subjects.some(s => !Number.isFinite(record.scores?.[s.id]))) return null;
  return subjects.reduce((n, s) => n + record.scores[s.id], 0);
}

export function validateData(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.subjects) || !data.subjects.length || !Array.isArray(data.records)) throw new Error('成绩资料格式不正确');
  const ids = new Set();
  for (const s of data.subjects) {
    if (!s.id || ids.has(s.id) || typeof s.name !== 'string' || !Number.isInteger(s.max) || s.max <= 0 || !Number.isFinite(s.lossWeight) || s.lossWeight <= 0) throw new Error('科目资料不完整');
    ids.add(s.id);
  }
  const recordIds = new Set();
  for (const r of data.records) {
    if (!r.id || recordIds.has(r.id) || typeof r.label !== 'string' || !['estimate', 'official'].includes(r.status)) throw new Error('考试记录格式不正确');
    recordIds.add(r.id);
    for (const s of data.subjects) {
      const score = r.scores?.[s.id];
      if (score != null && (!Number.isInteger(score) || score < 0 || score > s.max)) throw new Error(`${s.name}分数超出范围`);
    }
    if (r.review?.prediction != null) {
      for (const s of data.subjects) {
        const score = r.review.prediction[s.id];
        if (score != null && (!Number.isInteger(score) || score < 0 || score > s.max)) throw new Error(`${s.name}预测分数超出范围`);
      }
    }
  }
  return data;
}

// 按扣分权重分配整数分数。科目固定后，剩余科目重新分配；不修改输入。
export function allocateTargets(target, subjects, fixed = {}) {
  const maxTotal = subjects.reduce((n, s) => n + s.max, 0);
  if (!Number.isInteger(target) || target < 0 || target > maxTotal) return {ok: false, reason: '目标总分超出范围'};
  const result = {}, free = [];
  let fixedTotal = 0;
  for (const s of subjects) {
    if (Object.hasOwn(fixed, s.id)) {
      const v = fixed[s.id];
      if (!Number.isInteger(v) || v < 0 || v > s.max) return {ok: false, reason: `${s.name}固定分数超出范围`};
      result[s.id] = v; fixedTotal += v;
    } else free.push(s);
  }
  const remaining = target - fixedTotal;
  const freeMax = free.reduce((n, s) => n + s.max, 0);
  if (remaining < 0 || remaining > freeMax) return {ok: false, reason: '固定分数与目标总分不相容'};
  if (!free.length) return {ok: true, scores: result};
  let losses = freeMax - remaining, active = [...free];
  const raw = {};
  while (active.length) {
    const weight = active.reduce((n, s) => n + s.lossWeight, 0);
    const saturated = active.filter(s => losses * s.lossWeight / weight >= s.max);
    if (!saturated.length) {
      for (const s of active) raw[s.id] = s.max - losses * s.lossWeight / weight;
      break;
    }
    for (const s of saturated) {raw[s.id] = 0; losses -= s.max;}
    active = active.filter(s => !saturated.includes(s));
  }
  for (const s of free) result[s.id] = Math.floor(raw[s.id] + 1e-9);
  const toAdd = remaining - free.reduce((n, s) => n + result[s.id], 0);
  const priority = {physics: 2, chemistry: 2, chinese: -1};
  const ranked = [...free].sort((a, b) => (raw[b.id] - result[b.id]) - (raw[a.id] - result[a.id]) || (priority[b.id] || 0) - (priority[a.id] || 0));
  for (let i = 0; i < toAdd; i++) result[ranked[i].id]++;
  return {ok: true, scores: result};
}
