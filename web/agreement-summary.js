const targets = {
  en: ['agreementAi', 'agreementRepeat', 'agreementPeople'],
  zh: ['agreementAiZh', 'agreementRepeatZh', 'agreementPeopleZh'],
};
const percent = value => Math.round(value * 100);
const number = value => value === null ? '—' : value.toFixed(2);
const reading = (value, locale) => {
  if (value === null) return locale === 'zh' ? '无法计算' : 'unavailable';
  const index = value < 0 ? 0 : value <= .20 ? 1 : value <= .40 ? 2 : value <= .60 ? 3 : value <= .80 ? 4 : 5;
  return (locale === 'zh'
    ? ['低于碰巧一致', '轻微', '一般', '中等', '较高', '很高']
    : ['below chance', 'slight', 'fair', 'moderate', 'substantial', 'very high'])[index];
};

async function showAgreement() {
  const response = await fetch('agreement_stats.json?v=20261013-v1');
  if (!response.ok) throw new Error('Agreement snapshot unavailable');
  const data = await response.json();
  const calibration = Object.values(data.ai.calibration);
  const repeat = calibration.map(item => percent(item.repeatRate));
  const swapped = calibration.map(item => percent(item.swappedRate));
  const human = data.human;
  const date = human.asOf;
  const values = {
    en: [
      `Six AI judges: Fleiss’ κ ${number(data.ai.fleiss.kappa)} across ${data.ai.fleiss.nPairs.toLocaleString('en-US')} evaluated pairs — moderate agreement.`,
      `Asked again on the same pair, each judge kept the same artwork ${Math.min(...repeat)}–${Math.max(...repeat)}% of the time. After left and right were swapped, that fell to ${Math.min(...swapped)}–${Math.max(...swapped)}%.`,
      `Saved visitor choices: Cohen’s κ ${number(human.comparisons.aiJudges.kappa)} (${reading(human.comparisons.aiJudges.kappa, 'en')}; 95% interval ${number(human.comparisons.aiJudges.interval95.lower)}–${number(human.comparisons.aiJudges.interval95.upper)}) with the weighted AI preference and ${number(human.comparisons.featureModel.kappa)} (${reading(human.comparisons.featureModel.kappa, 'en')}; 95% interval ${number(human.comparisons.featureModel.interval95.lower)}–${number(human.comparisons.featureModel.interval95.upper)}) with the feature model (${human.choices} non-skip choices, snapshot ${date}). These are preliminary and do not count distinct people.`,
    ],
    zh: [
      `六位 AI 裁判：在 ${data.ai.fleiss.nPairs.toLocaleString('zh-CN')} 组已评测画对上，Fleiss’ κ 为 ${number(data.ai.fleiss.kappa)}，按常用读法属于中等一致。`,
      `同一位裁判再选一次，${Math.min(...repeat)}–${Math.max(...repeat)}% 仍选同一幅；左右位置对调后，保留原选择的比例降为 ${Math.min(...swapped)}–${Math.max(...swapped)}%。`,
      `已保存的访客选择：与加权 AI 偏好的 Cohen’s κ 为 ${number(human.comparisons.aiJudges.kappa)}（${reading(human.comparisons.aiJudges.kappa, 'zh')}；95% 区间 ${number(human.comparisons.aiJudges.interval95.lower)}–${number(human.comparisons.aiJudges.interval95.upper)}），与特征模型为 ${number(human.comparisons.featureModel.kappa)}（${reading(human.comparisons.featureModel.kappa, 'zh')}；95% 区间 ${number(human.comparisons.featureModel.interval95.lower)}–${number(human.comparisons.featureModel.interval95.upper)}）。本快照基于 ${human.choices} 次非跳过选择，截于 ${date}；样本尚小，记录数不等于独立人数。`,
    ],
  };
  for (const locale of Object.keys(targets)) {
    targets[locale].forEach((id, index) => {
      document.getElementById(id).textContent = values[locale][index];
    });
  }
}

showAgreement().catch(() => {
  document.getElementById('agreementAi').textContent = 'The agreement snapshot is temporarily unavailable.';
  document.getElementById('agreementAiZh').textContent = '一致性统计快照暂时无法加载。';
});
