const MATERIAL_LIBRARY = {
  titanium: { density: 4500, yieldStrength: 900e6, dragFactor: 0.85 },
  aluminum: { density: 2700, yieldStrength: 300e6, dragFactor: 0.95 },
  steel: { density: 7850, yieldStrength: 450e6, dragFactor: 1.0 },
  carbon: { density: 1600, yieldStrength: 600e6, dragFactor: 0.8 },
  plastic: { density: 1050, yieldStrength: 70e6, dragFactor: 1.1 }
};

const SHAPE_LIBRARY = {
  sphere: { complexity: 1.0, baseDragCoefficient: 0.47, loadMultiplier: 0.85 },
  cube: { complexity: 1.2, baseDragCoefficient: 1.05, loadMultiplier: 1.4 },
  wing: { complexity: 2.4, baseDragCoefficient: 0.04, loadMultiplier: 1.1 },
  fuselage: { complexity: 2.8, baseDragCoefficient: 0.18, loadMultiplier: 1.05 },
  tower: { complexity: 1.8, baseDragCoefficient: 0.8, loadMultiplier: 1.7 }
};

const DEFAULTS = {
  shape: 'sphere',
  material: 'aluminum',
  sizeMeters: 2,
  windSpeedMps: 30,
  loadKiloNewtons: 120
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickMatch(text, values, fallback) {
  const normalized = text.toLowerCase();
  return values.find((value) => normalized.includes(value)) || fallback;
}

function firstNumber(text) {
  const matched = text.match(/(\d+(?:\.\d+)?)/);
  return matched ? Number(matched[1]) : null;
}

function parsePrompt(prompt) {
  const safePrompt = (prompt || '').trim();
  const shape = pickMatch(safePrompt, Object.keys(SHAPE_LIBRARY), DEFAULTS.shape);
  const material = pickMatch(safePrompt, Object.keys(MATERIAL_LIBRARY), DEFAULTS.material);

  const sizeMatch = safePrompt.match(/(\d+(?:\.\d+)?)\s*(m|meter|meters)/i);
  const windMatch = safePrompt.match(/(\d+(?:\.\d+)?)\s*(m\/s|mph|km\/h|kph)/i);
  const loadMatch = safePrompt.match(/(\d+(?:\.\d+)?)\s*(kn|kilonewton|kilonewtons|ton|tons)/i);

  let sizeMeters = sizeMatch ? Number(sizeMatch[1]) : firstNumber(safePrompt) || DEFAULTS.sizeMeters;
  sizeMeters = clamp(sizeMeters, 0.5, 200);

  let windSpeedMps = DEFAULTS.windSpeedMps;
  if (windMatch) {
    const value = Number(windMatch[1]);
    const unit = windMatch[2].toLowerCase();
    if (unit === 'mph') windSpeedMps = value * 0.44704;
    else if (unit === 'km/h' || unit === 'kph') windSpeedMps = value / 3.6;
    else windSpeedMps = value;
  }

  let loadKiloNewtons = DEFAULTS.loadKiloNewtons;
  if (loadMatch) {
    const value = Number(loadMatch[1]);
    const unit = loadMatch[2].toLowerCase();
    loadKiloNewtons = unit.startsWith('ton') ? value * 9.80665 : value;
  }

  return {
    prompt: safePrompt,
    shape,
    material,
    sizeMeters,
    windSpeedMps: clamp(windSpeedMps, 1, 200),
    loadKiloNewtons: clamp(loadKiloNewtons, 10, 5000)
  };
}

function buildGeometry(config) {
  const shapeProfile = SHAPE_LIBRARY[config.shape];
  const meshResolution = Math.round(24 * shapeProfile.complexity + config.sizeMeters * 2);
  const radius = config.sizeMeters / 2;
  const surfaceAreaEstimate = Number((4 * Math.PI * radius * radius * shapeProfile.complexity).toFixed(2));

  return {
    meshType: `${config.shape}-procedural-mesh`,
    meshResolution,
    surfaceAreaEstimate,
    estimatedVertices: meshResolution * meshResolution,
    exportFormats: ['glb', 'obj', 'stl']
  };
}

function runEngineeringTests(config) {
  const material = MATERIAL_LIBRARY[config.material];
  const shape = SHAPE_LIBRARY[config.shape];

  const frontalArea = Math.PI * Math.pow(config.sizeMeters / 2, 2);
  const dynamicPressure = 0.5 * 1.225 * Math.pow(config.windSpeedMps, 2);
  const dragForceN = dynamicPressure * shape.baseDragCoefficient * frontalArea * material.dragFactor;

  const loadN = config.loadKiloNewtons * 1000 * shape.loadMultiplier;
  const stressArea = Math.max(0.05, frontalArea * 0.35);
  const estimatedStress = loadN / stressArea;
  const factorOfSafety = material.yieldStrength / estimatedStress;

  const stabilityIndex = clamp((factorOfSafety / 2) - (dragForceN / 250000), 0, 5);
  const fatigueLifeCycles = Math.round(250000 * factorOfSafety * (shape.complexity > 2 ? 0.8 : 1.1));

  return {
    structures: {
      loadKiloNewtons: config.loadKiloNewtons,
      estimatedStressMPa: Number((estimatedStress / 1e6).toFixed(2)),
      materialYieldMPa: Number((material.yieldStrength / 1e6).toFixed(2)),
      factorOfSafety: Number(factorOfSafety.toFixed(2)),
      status: factorOfSafety >= 1.5 ? 'PASS' : 'REVIEW'
    },
    aerodynamics: {
      windSpeedMps: Number(config.windSpeedMps.toFixed(2)),
      dragCoefficient: shape.baseDragCoefficient,
      dragForceNewtons: Number(dragForceN.toFixed(2)),
      status: dragForceN < 150000 ? 'PASS' : 'REVIEW'
    },
    stability: {
      stabilityIndex: Number(stabilityIndex.toFixed(2)),
      fatigueLifeCycles,
      status: stabilityIndex >= 1.2 ? 'PASS' : 'REVIEW'
    }
  };
}

function simulateShapeFromPrompt(prompt) {
  const config = parsePrompt(prompt);
  const geometry = buildGeometry(config);
  const tests = runEngineeringTests(config);

  return {
    input: config,
    model: geometry,
    engineering: tests,
    summary: `${config.material} ${config.shape} generated with ${geometry.meshResolution} mesh resolution and structural FoS ${tests.structures.factorOfSafety}.`
  };
}

module.exports = {
  MATERIAL_LIBRARY,
  SHAPE_LIBRARY,
  parsePrompt,
  buildGeometry,
  runEngineeringTests,
  simulateShapeFromPrompt
};
