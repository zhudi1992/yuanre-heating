const WARN_RULES = [
  {
    key: 'dailyGas', label: '日耗气量',
    min: 10, max: 5000,
    unit: 'm³',
  },
  {
    key: 'dailyElectricity', label: '日耗电量',
    min: 5, max: 2000,
    unit: 'kWh',
  },
  {
    key: 'dailyWater', label: '日耗水量',
    min: 1, max: 100,
    unit: 't',
  },
  {
    key: 'heatingArea', label: '供暖面积',
    min: 100, max: 100000,
    unit: 'm²',
  },
];

export function validateEntry(entry, allCommunities) {
  const warnings = [];

  for (const rule of WARN_RULES) {
    const val = Number(entry[rule.key]);
    if (isNaN(val) || val === 0) {
      warnings.push({ field: rule.key, type: 'error', msg: `${rule.label} 不能为空或零` });
      continue;
    }
    if (val < rule.min) {
      warnings.push({ field: rule.key, type: 'warn', msg: `${rule.label} (${val} ${rule.unit}) 低于合理范围下限 ${rule.min}` });
    }
    if (val > rule.max) {
      warnings.push({ field: rule.key, type: 'warn', msg: `${rule.label} (${val} ${rule.unit}) 超过合理范围上限 ${rule.max}` });
    }
  }

  if (allCommunities && allCommunities.length > 1) {
    const area = Number(entry.heatingArea);
    if (area > 0) {
      const gasPerArea = Number(entry.dailyGas) / area;
      const elecPerArea = Number(entry.dailyElectricity) / area;
      const waterPerArea = Number(entry.dailyWater) / area;

      const others = allCommunities.filter(c => c.id !== Number(entry.id));
      const stats = {
        gas: { values: others.map(c => c.dailyGas / c.heatingArea) },
        elec: { values: others.map(c => c.dailyElectricity / c.heatingArea) },
        water: { values: others.map(c => c.dailyWater / c.heatingArea) },
      };

      for (const [key, label, val, statKey] of [
        ['单位面积耗气量', '单位面积耗气量', gasPerArea, 'gas'],
        ['单位面积耗电量', '单位面积耗电量', elecPerArea, 'elec'],
        ['单位面积耗水量', '单位面积耗水量', waterPerArea, 'water'],
      ]) {
        const arr = stats[statKey].values;
        if (arr.length < 3) continue;
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
        if (std > 0) {
          const z = Math.abs(val - mean) / std;
          if (z > 2.5) {
            warnings.push({
              field: key,
              type: 'error',
              msg: `${label} (${val.toFixed(4)}) 偏离同类小区均值 (${mean.toFixed(4)}) 超过 2.5 倍标准差，请核实`,
            });
          } else if (z > 1.5) {
            warnings.push({
              field: key,
              type: 'warn',
              msg: `${label} (${val.toFixed(4)}) 偏离同类小区均值 (${mean.toFixed(4)}) 较大`,
            });
          }
        }
      }
    }
  }

  return warnings;
}

export function validateBatch(entries, allCommunities) {
  return entries.map((entry, i) => ({
    row: i + 1,
    name: entry.name,
    warnings: validateEntry(entry, allCommunities),
  }));
}
