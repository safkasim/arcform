import { analyzeSquat } from './squatAnalysis.ts';
import { squatFixtures } from './squatAnalysis.fixtures.ts';

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertError(name: keyof typeof squatFixtures, expected: string) {
  try {
    analyzeSquat(squatFixtures[name]);
  } catch (error) {
    if (error instanceof Error && error.message === expected) return;
    throw error;
  }
  throw new Error(`${name}: expected ${expected}`);
}

assertEqual(analyzeSquat(squatFixtures.sideTwoFullReps).reps, 2, 'side view rep count');
assertEqual(analyzeSquat(squatFixtures.threeQuarterFullRep).reps, 1, 'three-quarter rep count');
assertError('partialRep', 'NO_COMPLETE_REP');
assertError('interrupted', 'NO_COMPLETE_REP');
assertError('obstructed', 'LOW_CONFIDENCE');
assertError('lowLight', 'LOW_CONFIDENCE');
assertError('ambiguousSubjects', 'AMBIGUOUS_SUBJECT');

process.stdout.write('Squat analysis fixtures passed.\n');