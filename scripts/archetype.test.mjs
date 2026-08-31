import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const portraitSource = readFileSync('client/public/the-return.html', 'utf8');
const portraitStart = portraitSource.indexOf('const DR=');
const portraitEnd = portraitSource.indexOf(
  '\n// ═══════════════════════════════════════════════════════\n// NARRATIVE ENDING',
  portraitStart,
);

assert.notEqual(portraitStart, -1, 'portrait definitions should exist in the game');
assert.notEqual(portraitEnd, -1, 'portrait definitions should end before narrative endings');

const harness = `
let S = {
  d: { body: 0, mind: 0, rel: 0, spirit: 0 },
  shadows: [],
  guideRecognized: false,
  ceremony: false,
  reactionCount: 0,
  seed: { animal: { name: 'test animal' } },
};

${portraitSource.slice(portraitStart, portraitEnd)}

globalThis.archetypeTest = {
  archetypes: ARCHETYPES,
  rank: ARCHETYPE_RANK,
  readings: ARCHETYPE_READINGS,
  inflections: ASCENDANT_INFLECTIONS,
  getResult: getArchetypeResult,
  renderPortrait,
  setState(next) {
    S = { ...S, ...next };
  },
};
`;

const context = {};
vm.runInNewContext(harness, context, { filename: 'the-return.html' });
const game = context.archetypeTest;

const allArchetypeIds = game.archetypes.map(({ id }) => id);
const archetypeRank = new Map(game.rank.map((id, index) => [id, index]));

function setState(d, flags = {}) {
  game.setState({
    d: { body: 0, mind: 0, rel: 0, spirit: 0, ...d },
    shadows: [],
    guideRecognized: false,
    ceremony: false,
    reactionCount: 0,
    seed: { animal: { name: 'test animal' } },
    ...flags,
  });
}

function resultFor(d, flags) {
  setState(d, flags);
  return game.getResult();
}

const representativePrimaries = [
  ['sovereign', { body: 3, spirit: 4 }],
  ['jaguar', { body: 2, spirit: 3 }, { ceremony: true }],
  ['witness', { body: 3, mind: 2 }],
  ['cartographer', { mind: 4 }],
  ['opengate', { spirit: 2 }, { guideRecognized: true }],
  ['healer', { spirit: 2, rel: 2 }],
  ['bridge', { rel: 3 }],
  ['crossing', {}],
];

test('each primary archetype is selected by a representative final state', () => {
  for (const [expectedPrimary, d, flags] of representativePrimaries) {
    const result = resultFor(d, flags);
    assert.equal(
      result.primary.id,
      expectedPrimary,
      `${expectedPrimary} representative should select the expected primary`,
    );
  }
});

test('single-qualifier states do not invent an ascendant', () => {
  for (const [expectedPrimary, d, flags] of representativePrimaries) {
    const result = resultFor(d, flags);
    assert.equal(
      result.ascendant,
      null,
      `${expectedPrimary} should not have an ascendant when it is the only qualifier`,
    );
  }
});

const representativePairings = [
  ['sovereign', 'jaguar', { body: 3, spirit: 4 }, { ceremony: true }],
  ['sovereign', 'witness', { body: 3, mind: 2, spirit: 4 }],
  ['jaguar', 'witness', { body: 3, mind: 2, spirit: 3 }, { ceremony: true }],
  ['witness', 'cartographer', { body: 3, mind: 4 }],
  ['cartographer', 'opengate', { mind: 4, spirit: 2 }, { guideRecognized: true }],
  ['opengate', 'healer', { rel: 2, spirit: 2 }, { guideRecognized: true }],
  ['healer', 'bridge', { rel: 3, spirit: 2 }],
];

test('representative ascendant pairings follow the strictness ranking', () => {
  for (const [expectedPrimary, expectedAscendant, d, flags] of representativePairings) {
    const result = resultFor(d, flags);
    assert.equal(result.primary.id, expectedPrimary);
    assert.equal(result.ascendant?.id, expectedAscendant);
  }
});

test('every score and story-flag state renders complete portrait copy', () => {
  // Values between thresholds are equivalent, so these representatives exhaust
  // every resolver outcome while keeping the test small and deterministic.
  const thresholdRepresentatives = [0, 1, 2, 3, 4];

  for (const body of thresholdRepresentatives) {
    for (const mind of thresholdRepresentatives) {
      for (const rel of thresholdRepresentatives) {
        for (const spirit of thresholdRepresentatives) {
          for (const ceremony of [false, true]) {
            for (const guideRecognized of [false, true]) {
              const result = resultFor(
                { body, mind, rel, spirit },
                { ceremony, guideRecognized },
              );
              const primaryId = result.primary.id;
              const ascendantId = result.ascendant?.id ?? null;
              const portrait = game.renderPortrait();

              assert.ok(allArchetypeIds.includes(primaryId));
              assert.ok(game.readings[primaryId], `${primaryId} needs primary portrait copy`);
              assert.match(portrait, /<div class="parch-reading">.+<\/div>/s);
              assert.doesNotMatch(portrait, /undefined|NaN/);

              if (result.ascendant) {
                assert.ok(
                  archetypeRank.get(ascendantId) > archetypeRank.get(primaryId),
                  `${primaryId} ascendant should be lower-ranked`,
                );
                assert.match(portrait, /<div class="parch-inflection">.+<\/div>/s);
                assert.match(portrait, new RegExp(result.ascendant.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
              } else {
                assert.doesNotMatch(portrait, /parch-sub|parch-inflection/);
              }
            }
          }
        }
      }
    }
  }
});