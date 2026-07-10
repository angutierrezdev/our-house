import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

const db = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const anonDb = () => testEnv.unauthenticatedContext().firestore();

// alice: admin of h1 · bob: member of h1 · carol: member of h2 · dave: no household
async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore();
    await setDoc(doc(admin, 'users/alice'), {
      uid: 'alice',
      email: 'alice@test.dev',
      householdId: 'h1',
      role: 'admin',
    });
    await setDoc(doc(admin, 'users/bob'), {
      uid: 'bob',
      email: 'bob@test.dev',
      householdId: 'h1',
      role: 'member',
    });
    await setDoc(doc(admin, 'users/carol'), {
      uid: 'carol',
      email: 'carol@test.dev',
      householdId: 'h2',
      role: 'member',
    });
    await setDoc(doc(admin, 'users/dave'), {
      uid: 'dave',
      email: 'dave@test.dev',
      householdId: null,
      role: 'member',
    });
    await setDoc(doc(admin, 'households/h1'), {
      name: 'Casa 1',
      inviteCode: 'ABC123',
      createdBy: 'alice',
    });
    await setDoc(doc(admin, 'households/h2'), {
      name: 'Casa 2',
      inviteCode: 'XYZ789',
      createdBy: 'carol',
    });
    await setDoc(doc(admin, 'households/h1/people/p1'), { id: 'p1', name: 'Ana' });
    await setDoc(doc(admin, 'households/h1/chores/c1'), { id: 'c1', title: 'Basura' });
    await setDoc(doc(admin, 'households/h1/menu_ingredients/onion'), {
      id: 'onion',
      name: 'Cebolla',
      category: 'produce',
      createdAt: 1,
    });
    await setDoc(doc(admin, 'households/h1/menu_dishes/paella'), {
      id: 'paella',
      name: 'Paella',
      ingredients: [{ ingredientId: 'onion' }],
      createdAt: 1,
    });
    await setDoc(doc(admin, 'households/h1/menu_week_plans/2026-W28'), {
      id: '2026-W28',
      weekStart: '2026-07-06',
      days: {},
      createdAt: 1,
    });
    await setDoc(doc(admin, 'households/h1/grocery_lists/l1'), {
      id: 'l1',
      title: 'Semana',
      items: [],
      createdAt: 1,
    });
    await setDoc(doc(admin, 'households/h1/gastos_settings/main'), { currency: 'EUR' });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'our-house-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

describe('users (regression)', () => {
  it('lets a user read their own profile', async () => {
    await assertSucceeds(getDoc(doc(db('bob'), 'users/bob')));
  });

  it('lets household members read each other, denies outsiders', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'users/bob')));
    await assertFails(getDoc(doc(db('carol'), 'users/bob')));
  });

  it('only allows bootstrap profiles with role=member and householdId=null', async () => {
    await assertSucceeds(
      setDoc(doc(db('eve'), 'users/eve'), {
        uid: 'eve',
        email: 'eve@test.dev',
        householdId: null,
        role: 'member',
      }),
    );
    await assertFails(
      setDoc(doc(db('mallory'), 'users/mallory'), {
        uid: 'mallory',
        email: 'mallory@test.dev',
        householdId: null,
        role: 'admin',
      }),
    );
  });

  it('allows joining an existing household from a null state as member', async () => {
    await assertSucceeds(
      updateDoc(doc(db('dave'), 'users/dave'), { householdId: 'h1', role: 'member' }),
    );
  });

  it('denies self-elevation to admin of a household the user did not create', async () => {
    await assertFails(
      updateDoc(doc(db('dave'), 'users/dave'), { householdId: 'h1', role: 'admin' }),
    );
  });

  it('denies switching households once assigned', async () => {
    await assertFails(updateDoc(doc(db('bob'), 'users/bob'), { householdId: 'h2' }));
  });
});

describe('households (regression)', () => {
  it('members can read their household, outsiders cannot', async () => {
    await assertSucceeds(getDoc(doc(db('bob'), 'households/h1')));
    await assertFails(getDoc(doc(db('carol'), 'households/h1')));
    await assertFails(getDoc(doc(anonDb(), 'households/h1')));
  });

  it('documents the joinHousehold invite-code query behavior', async () => {
    // our-house's joinHousehold queries households by inviteCode before the
    // user is a member. Rules only allow read for members, so this collection
    // query is expected to be DENIED — this test pins down that behavior.
    const q = query(
      collection(db('dave'), 'households'),
      where('inviteCode', '==', 'ABC123'),
    );
    await assertFails(getDocs(q));
  });
});

describe('people & chores (regression)', () => {
  it('members have CRUD, outsiders none', async () => {
    await assertSucceeds(getDoc(doc(db('bob'), 'households/h1/people/p1')));
    await assertSucceeds(
      setDoc(doc(db('bob'), 'households/h1/people/p2'), { id: 'p2', name: 'Luis' }),
    );
    await assertFails(getDoc(doc(db('carol'), 'households/h1/people/p1')));
    await assertFails(
      setDoc(doc(db('carol'), 'households/h1/chores/c2'), { id: 'c2', title: 'X' }),
    );
  });

  it('rejects invalid shapes and id changes', async () => {
    await assertFails(setDoc(doc(db('bob'), 'households/h1/people/p3'), { name: 'SinId' }));
    await assertFails(
      updateDoc(doc(db('bob'), 'households/h1/people/p1'), { id: 'other', name: 'Ana' }),
    );
  });
});

describe('gastos (regression)', () => {
  it('admin can read, plain member without flag cannot', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'households/h1/gastos_settings/main')));
    await assertFails(getDoc(doc(db('bob'), 'households/h1/gastos_settings/main')));
  });
});

describe('menu_ingredients', () => {
  it('members have full CRUD with valid data', async () => {
    const bob = db('bob');
    await assertSucceeds(getDoc(doc(bob, 'households/h1/menu_ingredients/onion')));
    await assertSucceeds(
      setDoc(doc(bob, 'households/h1/menu_ingredients/rice'), {
        id: 'rice',
        name: 'Arroz',
        category: 'pantry',
        createdAt: 2,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(bob, 'households/h1/menu_ingredients/onion'), {
        name: 'Cebolla morada',
        updatedAt: 3,
      }),
    );
    await assertSucceeds(deleteDoc(doc(bob, 'households/h1/menu_ingredients/onion')));
  });

  it('denies non-members and unauthenticated users', async () => {
    await assertFails(getDoc(doc(db('carol'), 'households/h1/menu_ingredients/onion')));
    await assertFails(
      setDoc(doc(db('carol'), 'households/h1/menu_ingredients/x'), { id: 'x', name: 'X' }),
    );
    await assertFails(getDoc(doc(anonDb(), 'households/h1/menu_ingredients/onion')));
  });

  it('rejects invalid shapes and id mutation', async () => {
    const bob = db('bob');
    await assertFails(
      setDoc(doc(bob, 'households/h1/menu_ingredients/bad'), { name: 'SinId' }),
    );
    await assertFails(
      setDoc(doc(bob, 'households/h1/menu_ingredients/bad'), { id: 42, name: 'X' }),
    );
    await assertFails(
      updateDoc(doc(bob, 'households/h1/menu_ingredients/onion'), { id: 'other' }),
    );
  });
});

describe('menu_dishes', () => {
  it('members have full CRUD with valid data', async () => {
    const bob = db('bob');
    await assertSucceeds(getDoc(doc(bob, 'households/h1/menu_dishes/paella')));
    await assertSucceeds(
      setDoc(doc(bob, 'households/h1/menu_dishes/sopa'), {
        id: 'sopa',
        name: 'Sopa',
        ingredients: [],
        createdAt: 2,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(bob, 'households/h1/menu_dishes/paella'), {
        ingredients: [{ ingredientId: 'onion', quantity: 2, unit: 'uds' }],
      }),
    );
    await assertSucceeds(deleteDoc(doc(bob, 'households/h1/menu_dishes/paella')));
  });

  it('denies non-members and invalid shapes', async () => {
    await assertFails(getDoc(doc(db('carol'), 'households/h1/menu_dishes/paella')));
    await assertFails(
      setDoc(doc(db('bob'), 'households/h1/menu_dishes/bad'), { id: 'bad', name: 'X' }),
    );
    await assertFails(
      setDoc(doc(db('bob'), 'households/h1/menu_dishes/bad'), {
        id: 'bad',
        name: 'X',
        ingredients: 'not-a-list',
      }),
    );
    await assertFails(
      updateDoc(doc(db('bob'), 'households/h1/menu_dishes/paella'), { id: 'other' }),
    );
  });
});

describe('menu_week_plans', () => {
  it('members have full CRUD with valid data', async () => {
    const bob = db('bob');
    await assertSucceeds(getDoc(doc(bob, 'households/h1/menu_week_plans/2026-W28')));
    await assertSucceeds(
      setDoc(doc(bob, 'households/h1/menu_week_plans/2026-W29'), {
        id: '2026-W29',
        weekStart: '2026-07-13',
        days: { monday: { breakfast: [], lunch: ['paella'], dinner: [] } },
        createdAt: 2,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(bob, 'households/h1/menu_week_plans/2026-W28'), {
        days: { monday: { breakfast: [], lunch: [], dinner: ['sopa'] } },
      }),
    );
    await assertSucceeds(deleteDoc(doc(bob, 'households/h1/menu_week_plans/2026-W28')));
  });

  it('denies non-members and invalid shapes', async () => {
    await assertFails(getDoc(doc(db('carol'), 'households/h1/menu_week_plans/2026-W28')));
    await assertFails(
      setDoc(doc(db('bob'), 'households/h1/menu_week_plans/bad'), {
        id: 'bad',
        weekStart: '2026-07-13',
        days: 'not-a-map',
      }),
    );
    await assertFails(
      updateDoc(doc(db('bob'), 'households/h1/menu_week_plans/2026-W28'), { id: 'other' }),
    );
  });
});

describe('grocery_lists', () => {
  it('members have full CRUD with valid (smart-grocery schema) data', async () => {
    const bob = db('bob');
    await assertSucceeds(getDoc(doc(bob, 'households/h1/grocery_lists/l1')));
    await assertSucceeds(
      setDoc(doc(bob, 'households/h1/grocery_lists/l2'), {
        id: 'l2',
        title: 'Semana 13–19 jul',
        items: [{ id: 'i1', name: 'Cebolla', completed: false, createdAt: 2 }],
        createdAt: 2,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(bob, 'households/h1/grocery_lists/l1'), {
        items: [{ id: 'i2', name: 'Arroz (500 g)', completed: false, createdAt: 3 }],
      }),
    );
    await assertSucceeds(deleteDoc(doc(bob, 'households/h1/grocery_lists/l1')));
  });

  it('denies non-members and invalid shapes', async () => {
    await assertFails(getDoc(doc(db('carol'), 'households/h1/grocery_lists/l1')));
    await assertFails(getDoc(doc(anonDb(), 'households/h1/grocery_lists/l1')));
    await assertFails(
      setDoc(doc(db('bob'), 'households/h1/grocery_lists/bad'), { id: 'bad', title: 'X' }),
    );
    await assertFails(
      updateDoc(doc(db('bob'), 'households/h1/grocery_lists/l1'), { id: 'other' }),
    );
  });
});
