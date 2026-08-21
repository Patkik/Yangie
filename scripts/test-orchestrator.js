#!/usr/bin/env node
/**
 * 🧠 TEST RUNNER: KIRO AGENTIC ORCHESTRATION ENGINE (MAS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates the Supervisor-Specialist architecture, 3-tier memory hierarchy,
 * and deterministic Standard Operating Procedures (SOPs).
 */

const assert = require('assert');
const path = require('path');

// Setup minimal mock browser globals for Node.js execution
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✔ ${name}\x1b[0m`);
  } catch (err) {
    console.error(`  \x1b[31m❌ FAILED: ${name}\x1b[0m`, err);
  }
}

console.log('\n\x1b[36m\x1b[1m🛰️  TESTING AGENTIC ORCHESTRATION ENGINE (orchestrator.js)...\x1b[0m\n');

// Mock scene and synth delegates
const mockSynth = {
  ambientFilter: {
    frequency: {
      cancelScheduledValues() {},
      exponentialRampToValueAtTime() {}
    }
  },
  ctx: { currentTime: 1.0 },
  playPurrSound: () => {},
  playPetChime: () => {},
  playChewSound: () => {},
  playWaterSound: () => {}
};

const mockScene = {
  dropCandy: (type) => { mockScene.lastDropped = type || 'star'; },
  splashWater: () => { mockScene.waterSplashed = true; },
  triggerPetReaction: () => { mockScene.petReacted = true; },
  setSleepMode: (isSleeping) => { mockScene.isSleeping = isSleeping; },
  setTelescopeMode: (isActive) => { mockScene.telescopeActive = isActive; }
};

// Dynamic import of ESM modules
async function runTests() {
  const { KiroState } = await import('../android-app/app/src/main/assets/js/state.js');
  const { KiroAgenticOrchestrator } = await import('../android-app/app/src/main/assets/js/orchestrator.js');

  test('1. Supervisor Engine Boot & Working Memory Initialization', () => {
    const orchestrator = new KiroAgenticOrchestrator(mockSynth, mockScene);
    assert(orchestrator !== null, 'Orchestrator should instantiate');
    assert(orchestrator.workingMemory !== undefined, 'Working memory must be defined');
    assert(orchestrator.vitalsAgent !== undefined, 'VitalsSpecialist must exist');
    assert(orchestrator.soundscapeAgent !== undefined, 'SoundscapeSpecialist must exist');
    assert(orchestrator.astrogationAgent !== undefined, 'AstrogationSpecialist must exist');
  });

  test('2. SOP Execution: executeFeedingSOP("star")', () => {
    const orchestrator = new KiroAgenticOrchestrator(mockSynth, mockScene);
    const initialFood = KiroState.get('food') || 80;
    orchestrator.executeFeedingSOP('star');
    assert.strictEqual(orchestrator.workingMemory.activeSOP, 'FEEDING');
    assert.strictEqual(mockScene.lastDropped, 'star');
    assert(KiroState.get('food') >= initialFood, 'Food metric should increase');
  });

  test('3. SOP Execution: executeFeedingSOP("water")', () => {
    const orchestrator = new KiroAgenticOrchestrator(mockSynth, mockScene);
    orchestrator.executeFeedingSOP('water');
    assert.strictEqual(orchestrator.workingMemory.activeSOP, 'FEEDING');
    assert.strictEqual(mockScene.waterSplashed, true);
  });

  test('4. SOP Execution: executePettingSOP()', () => {
    const orchestrator = new KiroAgenticOrchestrator(mockSynth, mockScene);
    const initialPets = orchestrator.workingMemory.petCountSession;
    orchestrator.executePettingSOP();
    assert.strictEqual(orchestrator.workingMemory.petCountSession, initialPets + 1);
    assert.strictEqual(mockScene.petReacted, true);
  });

  test('5. SOP Execution: executeBedtimeSOP() and executeWakeupSOP()', () => {
    const orchestrator = new KiroAgenticOrchestrator(mockSynth, mockScene);
    
    // Trigger Bedtime
    orchestrator.executeBedtimeSOP();
    assert.strictEqual(orchestrator.workingMemory.activeSOP, 'BEDTIME');
    assert.strictEqual(KiroState.get('isSleeping'), true);
    assert.strictEqual(mockScene.isSleeping, true);

    // Trigger Wakeup
    orchestrator.executeWakeupSOP();
    assert.strictEqual(orchestrator.workingMemory.activeSOP, 'WAKEUP');
    assert.strictEqual(KiroState.get('isSleeping'), false);
    assert.strictEqual(mockScene.isSleeping, false);
  });

  test('6. VitalsSpecialist Autonomous Decay & Boosts', () => {
    const orchestrator = new KiroAgenticOrchestrator(mockSynth, mockScene);
    KiroState.set('isSleeping', false);
    KiroState.set('hunger', 80);
    orchestrator.vitalsAgent.tick();
    assert.strictEqual(KiroState.get('hunger'), 79, 'Hunger should decay by 1 on tick');
    orchestrator.vitalsAgent.boostHunger(10);
    assert.strictEqual(KiroState.get('hunger'), 89, 'Hunger should boost by 10');
  });

  test('7. AstrogationSpecialist Observatory Mode Routing', () => {
    const orchestrator = new KiroAgenticOrchestrator(mockSynth, mockScene);
    orchestrator.astrogationAgent.enterObservatoryMode();
    assert.strictEqual(mockScene.telescopeActive, true);
    orchestrator.astrogationAgent.exitObservatoryMode();
    assert.strictEqual(mockScene.telescopeActive, false);
  });

  console.log(`\n\x1b[1m===============================================================================\x1b[0m`);
  if (passed === total) {
    console.log(`\x1b[32m\x1b[1m🎉 ALL ORCHESTRATOR TESTS PASSED: ${passed}/${total} checks verified! 🚀\x1b[0m\n`);
    process.exit(0);
  } else {
    console.log(`\x1b[31m\x1b[1m💥 FAILURES DETECTED: ${total - passed} failed out of ${total} total!\x1b[0m\n`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution exception:', err);
  process.exit(1);
});
