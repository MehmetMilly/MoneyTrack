import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

// Execute the production functions with isolated Firestore/auth substitutes.
// No Firebase project, credentials, dependency installation, or network is used.
// Run with Node 22.13+ using: node --test scripts/auth-subscription-race.test.mjs
const readSource = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const goalsSource = readSource('lib/data/repositories/goalRepository.ts');
const obligationsSource = readSource('lib/data/repositories/obligationRepository.ts');
const storeSource = readSource('lib/data/store.ts');

function section(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Missing source section ${start}`);
  return source.slice(startIndex, endIndex).replaceAll('export function ', 'function ');
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

function compile(source, dependencies, expression) {
  const code = stripTypeScriptTypes(source);
  return new Function(...Object.keys(dependencies), `${code}\nreturn ${expression};`)(...Object.values(dependencies));
}

const subscriptions = [
  ['subscribeGoals', section(goalsSource, 'export function subscribeGoals', 'export async function addGoalContribution'), 'hydrateGoal'],
  ['subscribeDebts', section(obligationsSource, 'export function subscribeDebts', 'export function subscribeInstallments'), 'hydrateDebt'],
  ['subscribeInstallments', section(obligationsSource, 'export function subscribeInstallments', 'export function subscribeReminders'), 'hydrateInstallment'],
];

for (const [name, source, hydrateName] of subscriptions) {
  function createHarness() {
    let snapshotCallback;
    let snapshotError;
    let unsubscribes = 0;
    const hydration = deferred();
    const received = [];
    const errors = [];
    const subscribe = compile(source, {
      onSnapshot: (_ref, callback, onError) => {
        snapshotCallback = callback;
        snapshotError = onError;
        return () => { unsubscribes += 1; };
      },
      userCollectionRef: (uid, name) => ({ uid, name }),
      [hydrateName]: () => hydration.promise,
    }, name);
    const unsubscribe = subscribe('alice', (items) => received.push(items), (error) => errors.push(error));
    return {
      hydration, received, errors, unsubscribe,
      unsubscribes: () => unsubscribes,
      emit: () => snapshotCallback({ docs: [{ id: 'private-record', data: () => ({ createdAt: '2026-10-01' }) }] }),
      emitError: (error) => snapshotError(error),
    };
  }

  test(`${name} delivers current-session records`, async () => {
    const harness = createHarness();
    const pending = harness.emit();
    harness.hydration.resolve({ id: 'private-record', name: 'Alice private record', createdAt: '2026-10-01' });
    await pending;
    assert.equal(harness.received[0][0].name, 'Alice private record');
    assert.deepEqual(harness.errors, []);
  });

  test(`${name} discards hydration completing after unsubscribe`, async () => {
    const harness = createHarness();
    const pending = harness.emit();
    harness.unsubscribe();
    harness.hydration.resolve({ id: 'private-record', name: 'Alice private record', createdAt: '2026-10-01' });
    await pending;
    assert.equal(harness.unsubscribes(), 1);
    assert.deepEqual(harness.received, []);
    assert.deepEqual(harness.errors, []);
  });

  test(`${name} discards hydration and listener errors after unsubscribe`, async () => {
    const harness = createHarness();
    const pending = harness.emit();
    harness.unsubscribe();
    harness.hydration.reject(new Error('Alice-only error'));
    harness.emitError(new Error('Late Alice listener error'));
    await pending;
    assert.deepEqual(harness.received, []);
    assert.deepEqual(harness.errors, []);
  });

  test(`${name} reports current-session hydration errors`, async () => {
    const harness = createHarness();
    const pending = harness.emit();
    const expected = new Error('Read failed');
    harness.hydration.reject(expected);
    await pending;
    assert.deepEqual(harness.received, []);
    assert.deepEqual(harness.errors, [expected]);
  });
}

function createStoreHarness(bootstrap = async () => {}) {
  const state = { currentUserId: 'alice', authStatus: 'authenticated' };
  const listeners = [];
  const errors = [];
  let authCallback;
  const dependencies = {
    useAppStore: { getState: () => state, setState: (patch) => Object.assign(state, patch) },
    patchError: (area, message) => errors.push({ area, message }),
    patchLoading: () => {},
    observeAuthState: (callback) => { authCallback = callback; return () => {}; },
    bootstrapUserData: bootstrap,
    EMPTY_PROFILE: { name: '', email: '' },
    withMessage: (error) => error.message,
  };
  for (const name of ['User', 'Categories', 'Accounts', 'Transactions', 'PlanningEntries', 'Goals', 'Debts', 'Installments', 'Reminders']) {
    dependencies[`subscribe${name}`] = (uid, callback, onError) => {
      const listener = { name, uid, callback, onError, unsubscribed: false };
      listeners.push(listener);
      return () => { listener.unsubscribed = true; };
    };
  }
  const source = `
    let dataSubscriptions: Array<() => void> = [];
    let authEventVersion = 0;
    let authStateUnsubscribe: (() => void) | null = null;
    let redirectResultHandled = true;
    ${section(storeSource, 'function detachDataSubscriptions()', 'function patchLoading')}
    ${section(storeSource, 'function connectUserData(', 'function initializeAuthStateListener')}
    ${section(storeSource, 'function initializeAuthStateListener()', 'export const useAppStore')}
  `;
  const functions = compile(source, dependencies, '({ connectUserData, initializeAuthStateListener })');
  functions.initializeAuthStateListener();
  return { ...functions, state, listeners, errors, emitAuth: (user) => authCallback(user) };
}

function emitPrivateData(listener) {
  listener.callback(listener.name === 'User'
    ? { profile: { name: 'Alice private name' }, settings: { private: true }, lastSyncedAt: 'alice-sync' }
    : [{ id: 'alice-private-record' }]);
  listener.onError(new Error('Alice private error'));
}

test('all current-session store subscriptions preserve their data and existing error areas', () => {
  const harness = createStoreHarness();
  harness.connectUserData('alice');
  harness.listeners.forEach(emitPrivateData);
  assert.deepEqual(harness.state.profile, { name: 'Alice private name' });
  assert.deepEqual(harness.state.settings, { private: true });
  assert.equal(harness.state.lastSyncedAt, 'alice-sync');
  for (const field of ['accounts', 'transactions', 'planningEntries', 'categories', 'debts', 'installments', 'goals', 'reminders']) {
    assert.deepEqual(harness.state[field], [{ id: 'alice-private-record' }], field);
  }
  assert.deepEqual(harness.errors.map(({ area }) => area), [
    'bootstrap', 'bootstrap', 'accounts', 'transactions', 'planning', 'goals', 'obligations', 'obligations', 'obligations',
  ]);
});

test('all store subscription callbacks reject a different current UID', () => {
  const harness = createStoreHarness();
  harness.connectUserData('alice');
  harness.state.currentUserId = 'bob';
  const before = structuredClone(harness.state);
  harness.listeners.forEach(emitPrivateData);
  assert.deepEqual(harness.state, before);
  assert.deepEqual(harness.errors, []);
});

test('direct account switch clears all previous data before awaiting bootstrap', async () => {
  const bootstrap = deferred();
  const harness = createStoreHarness(() => bootstrap.promise);
  harness.connectUserData('alice');
  const oldListeners = [...harness.listeners];
  oldListeners.forEach(emitPrivateData);
  const pending = harness.emitAuth({ uid: 'bob', email: 'bob@example.test' });
  assert.equal(harness.state.currentUserId, 'bob');
  assert.equal(harness.state.profile.name, 'bob');
  for (const field of ['accounts', 'transactions', 'planningEntries', 'categories', 'debts', 'installments', 'goals', 'reminders']) {
    assert.deepEqual(harness.state[field], [], field);
  }
  assert.ok(oldListeners.every((listener) => listener.unsubscribed));
  const before = structuredClone(harness.state);
  const errorCount = harness.errors.length;
  oldListeners.forEach(emitPrivateData);
  assert.deepEqual(harness.state, before);
  assert.equal(harness.errors.length, errorCount);
  bootstrap.resolve();
  await pending;
  assert.equal(harness.listeners.length, 18);
});

test('logout clears data and old callbacks remain blocked after the same UID signs in again', async () => {
  const harness = createStoreHarness();
  harness.connectUserData('alice');
  const oldListeners = [...harness.listeners];
  await harness.emitAuth(null);
  oldListeners.forEach(emitPrivateData);
  assert.deepEqual(harness.state.goals, []);
  assert.equal(harness.state.currentUserId, null);
  await harness.emitAuth({ uid: 'alice', email: 'alice@example.test' });
  const before = structuredClone(harness.state);
  const errorCount = harness.errors.length;
  oldListeners.forEach(emitPrivateData);
  assert.deepEqual(harness.state, before);
  assert.equal(harness.errors.length, errorCount);
  harness.listeners.slice(oldListeners.length).find(({ name }) => name === 'Goals').callback([{ id: 'current-session-goal' }]);
  assert.deepEqual(harness.state.goals, [{ id: 'current-session-goal' }]);
});

test('old bootstrap completion cannot reconnect after logout', async () => {
  const bootstrap = deferred();
  const harness = createStoreHarness(() => bootstrap.promise);
  const pending = harness.emitAuth({ uid: 'alice', email: 'alice@example.test' });
  await harness.emitAuth(null);
  bootstrap.resolve();
  await pending;
  assert.equal(harness.listeners.length, 0);
  assert.equal(harness.state.currentUserId, null);
});
