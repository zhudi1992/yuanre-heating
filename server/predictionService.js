const BASE_TEMP = 18;

const STD_COEFFS = {
  gas: { value: 0.007, label: '耗气量', unit: 'm³/m²·HDD', uncertainty: 0.20 },
  electricity: { value: 0.003, label: '耗电量', unit: 'kWh/m²·HDD', uncertainty: 0.20 },
  water: { value: 0.00015, label: '耗水量', unit: 't/m²·HDD', uncertainty: 0.25 },
};

function calcUnitArea(item) {
  const area = Number(item.heatingArea);
  return {
    ...item,
    heatingArea: area,
    unitAreaGas: area > 0 ? Number((item.dailyGas / area).toFixed(4)) : 0,
    unitAreaElectricity: area > 0 ? Number((item.dailyElectricity / area).toFixed(4)) : 0,
    unitAreaWater: area > 0 ? Number((item.dailyWater / area).toFixed(4)) : 0,
  };
}

function hdd(temp) {
  return Math.max(0, BASE_TEMP - temp);
}

function predict(communities, currentTemp, forecastTemp) {
  const enriched = communities.map(calcUnitArea);
  const hddCurrent = hdd(currentTemp);
  const hddForecast = hdd(forecastTemp);
  const hddDelta = hddForecast - hddCurrent;

  const predictions = enriched.map(c => {
    const area = c.heatingArea;
    const baseGas = c.dailyGas;
    const baseElec = c.dailyElectricity;
    const baseWater = c.dailyWater;

    const heatingGas = hddDelta > 0 ? STD_COEFFS.gas.value * hddDelta * area : 0;
    const heatingElec = hddDelta > 0 ? STD_COEFFS.electricity.value * hddDelta * area : 0;
    const heatingWater = hddDelta > 0 ? STD_COEFFS.water.value * hddDelta * area : 0;

    const predictedGas = Math.max(0, Number((baseGas + heatingGas).toFixed(2)));
    const predictedElectricity = Math.max(0, Number((baseElec + heatingElec).toFixed(2)));
    const predictedWater = Math.max(0, Number((baseWater + heatingWater).toFixed(2)));

    const gasLo = Math.max(0, Number((baseGas + heatingGas * (1 - STD_COEFFS.gas.uncertainty)).toFixed(2)));
    const gasHi = Math.max(0, Number((baseGas + heatingGas * (1 + STD_COEFFS.gas.uncertainty)).toFixed(2)));
    const elecLo = Math.max(0, Number((baseElec + heatingElec * (1 - STD_COEFFS.electricity.uncertainty)).toFixed(2)));
    const elecHi = Math.max(0, Number((baseElec + heatingElec * (1 + STD_COEFFS.electricity.uncertainty)).toFixed(2)));
    const waterLo = Math.max(0, Number((baseWater + heatingWater * (1 - STD_COEFFS.water.uncertainty)).toFixed(2)));
    const waterHi = Math.max(0, Number((baseWater + heatingWater * (1 + STD_COEFFS.water.uncertainty)).toFixed(2)));

    return {
      ...c,
      predictedGas, predictedElectricity, predictedWater,
      gasConfidenceLow: gasLo, gasConfidenceHigh: gasHi,
      elecConfidenceLow: elecLo, elecConfidenceHigh: elecHi,
      waterConfidenceLow: waterLo, waterConfidenceHigh: waterHi,
      heatingGasAdded: Number(heatingGas.toFixed(2)),
      heatingElecAdded: Number(heatingElec.toFixed(2)),
      heatingWaterAdded: Number(heatingWater.toFixed(2)),
      predUnitAreaGas: area > 0 ? Number((predictedGas / area).toFixed(4)) : 0,
      predUnitAreaElectricity: area > 0 ? Number((predictedElectricity / area).toFixed(4)) : 0,
      predUnitAreaWater: area > 0 ? Number((predictedWater / area).toFixed(4)) : 0,
    };
  });

  const totals = predictions.reduce((acc, c) => ({
    totalGas: acc.totalGas + c.predictedGas,
    totalElec: acc.totalElec + c.predictedElectricity,
    totalWater: acc.totalWater + c.predictedWater,
    totalGasLo: acc.totalGasLo + c.gasConfidenceLow,
    totalGasHi: acc.totalGasHi + c.gasConfidenceHigh,
    totalElecLo: acc.totalElecLo + c.elecConfidenceLow,
    totalElecHi: acc.totalElecHi + c.elecConfidenceHigh,
    totalWaterLo: acc.totalWaterLo + c.waterConfidenceLow,
    totalWaterHi: acc.totalWaterHi + c.waterConfidenceHigh,
    totalArea: acc.totalArea + c.heatingArea,
  }), { totalGas: 0, totalElec: 0, totalWater: 0, totalGasLo: 0, totalGasHi: 0, totalElecLo: 0, totalElecHi: 0, totalWaterLo: 0, totalWaterHi: 0, totalArea: 0 });

  return {
    model: {
      name: 'HDD 度日法模型',
      description: '基于 Heating Degree Day 法的能耗预测，当前温度下当前数据作为基准负荷，供暖负荷系数参照西安地区建筑热工标准',
      baseTemperature: BASE_TEMP,
      reference: 'ASHRAE Standard 55 / GB 50736-2012',
      coefficients: [
        { key: 'gas', label: STD_COEFFS.gas.label, value: STD_COEFFS.gas.value, unit: STD_COEFFS.gas.unit, uncertainty: `${STD_COEFFS.gas.uncertainty * 100}%` },
        { key: 'electricity', label: STD_COEFFS.electricity.label, value: STD_COEFFS.electricity.value, unit: STD_COEFFS.electricity.unit, uncertainty: `${STD_COEFFS.electricity.uncertainty * 100}%` },
        { key: 'water', label: STD_COEFFS.water.label, value: STD_COEFFS.water.value, unit: STD_COEFFS.water.unit, uncertainty: `${STD_COEFFS.water.uncertainty * 100}%` },
      ],
    },
    input: {
      currentTemp,
      forecastTemp,
      currentHDD: Number(hddCurrent.toFixed(2)),
      forecastHDD: Number(hddForecast.toFixed(2)),
      hddDelta: Number(hddDelta.toFixed(2)),
    },
    summary: {
      totalGas: Number(totals.totalGas.toFixed(2)),
      totalElectricity: Number(totals.totalElec.toFixed(2)),
      totalWater: Number(totals.totalWater.toFixed(2)),
      totalGasConfidenceLow: Number(totals.totalGasLo.toFixed(2)),
      totalGasConfidenceHigh: Number(totals.totalGasHi.toFixed(2)),
      totalElecConfidenceLow: Number(totals.totalElecLo.toFixed(2)),
      totalElecConfidenceHigh: Number(totals.totalElecHi.toFixed(2)),
      totalWaterConfidenceLow: Number(totals.totalWaterLo.toFixed(2)),
      totalWaterConfidenceHigh: Number(totals.totalWaterHi.toFixed(2)),
      totalArea: totals.totalArea,
    },
    predictions,
  };
}

module.exports = { predict };
