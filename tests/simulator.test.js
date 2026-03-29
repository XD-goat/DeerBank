const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parsePrompt,
  buildGeometry,
  runEngineeringTests,
  simulateShapeFromPrompt
} = require('../src/simulator');

test('parsePrompt extracts shape, material, dimensions, and unit conversions', () => {
  const parsed = parsePrompt('Design a titanium wing 12 m with 180 km/h and 75 kN payload');
  assert.equal(parsed.shape, 'wing');
  assert.equal(parsed.material, 'titanium');
  assert.equal(parsed.sizeMeters, 12);
  assert.ok(Math.abs(parsed.windSpeedMps - 50) < 0.01);
  assert.equal(parsed.loadKiloNewtons, 75);
});

test('buildGeometry scales mesh resolution with complexity and size', () => {
  const geometry = buildGeometry({ shape: 'fuselage', sizeMeters: 10 });
  assert.equal(geometry.meshType, 'fuselage-procedural-mesh');
  assert.ok(geometry.meshResolution > 80);
  assert.ok(geometry.estimatedVertices > 6400);
});

test('runEngineeringTests reports structural and aerodynamic assessments', () => {
  const engineering = runEngineeringTests({
    shape: 'sphere',
    material: 'aluminum',
    sizeMeters: 4,
    windSpeedMps: 20,
    loadKiloNewtons: 60
  });

  assert.ok(['PASS', 'REVIEW'].includes(engineering.structures.status));
  assert.ok(['PASS', 'REVIEW'].includes(engineering.aerodynamics.status));
  assert.ok(engineering.structures.factorOfSafety > 0);
  assert.ok(engineering.aerodynamics.dragForceNewtons > 0);
});

test('simulateShapeFromPrompt returns end-to-end generated model package', () => {
  const result = simulateShapeFromPrompt('Create a carbon tower 20 meters for 120 mph winds and 110 kN load');
  assert.equal(result.input.shape, 'tower');
  assert.equal(result.input.material, 'carbon');
  assert.equal(result.model.exportFormats.includes('stl'), true);
  assert.ok(result.summary.includes('generated'));
  assert.ok(result.engineering.stability.fatigueLifeCycles > 0);
});
