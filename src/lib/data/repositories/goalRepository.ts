import { doc, getDocs, onSnapshot, orderBy, query, runTransaction, setDoc } from 'firebase/firestore';
import type { Account, Goal, GoalContribution } from '../types';
import {
  goalContributionsCollectionRef,
  isoNow,
  todayDate,
  userCollectionRef,
  userDocRef,
} from '../../firebase/firestore';

export interface NewContributionInput {
  amount: number;
  date: string;
  type: GoalContribution['type'];
  accountId: string;
}

export type NewGoalInput = Omit<Goal, 'id' | 'createdAt' | 'contributions' | 'currentAmount'> & {
  initialDeposit?: number;
  accountId?: string;
};

type GoalDocument = Omit<Goal, 'contributions'>;

export async function createGoal(uid: string, payload: NewGoalInput) {
  const goalsRef = userCollectionRef<Goal>(uid, 'goals');
  const goalRef = doc(goalsRef);
  const now = todayDate();
  const initialDeposit = payload.initialDeposit || 0;

  const goalDocument = (currentAmount: number): GoalDocument => ({
    id: goalRef.id,
    name: payload.name,
    targetAmount: payload.targetAmount,
    currentAmount,
    targetDate: payload.targetDate,
    monthlyContribution: payload.monthlyContribution,
    icon: payload.icon || 'Goal',
    color: payload.color || '#2D5A3D',
    createdAt: now,
  });

  if (initialDeposit > 0) {
    if (!payload.accountId) {
      throw new Error('Choose an account for the initial deposit.');
    }

    await runTransaction(userDocRef(uid).firestore, async (transaction) => {
      const accountRef = doc(userCollectionRef<Account>(uid, 'accounts'), payload.accountId!);
      const accountSnapshot = await transaction.get(accountRef);

      if (!accountSnapshot.exists()) {
        throw new Error('Choose a valid account for the initial deposit.');
      }

      const account = accountSnapshot.data() as Account;
      transaction.set(
        accountRef,
        {
          balance: account.balance - initialDeposit,
          updatedAt: now,
        },
        { merge: true }
      );

      transaction.set(goalRef, goalDocument(initialDeposit));

      const contributionRef = doc(goalContributionsCollectionRef(uid, goalRef.id));
      transaction.set(contributionRef, {
        id: contributionRef.id,
        amount: initialDeposit,
        date: now,
        type: 'manual',
        accountId: payload.accountId,
      });

      transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
    });
    return;
  }

  await setDoc(goalRef, goalDocument(0));
  await setDoc(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
}

export async function deleteGoal(uid: string, goalId: string) {
  const contributionsRef = goalContributionsCollectionRef(uid, goalId);
  const snapshot = await getDocs(contributionsRef);

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    snapshot.docs.forEach((entry) => {
      transaction.delete(entry.ref);
    });
    transaction.delete(doc(userCollectionRef<Goal>(uid, 'goals'), goalId));
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}

async function hydrateGoal(uid: string, goal: Goal) {
  const contributionsRef = goalContributionsCollectionRef(uid, goal.id);
  const contributionsSnapshot = await getDocs(query(contributionsRef, orderBy('date', 'asc')));
  const contributions = contributionsSnapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  })) as GoalContribution[];

  return {
    ...goal,
    contributions,
  };
}

export function subscribeGoals(uid: string, callback: (items: Goal[]) => void, onError: (error: Error) => void) {
  let active = true;
  const unsubscribe = onSnapshot(
    userCollectionRef<Goal>(uid, 'goals'),
    async (snapshot) => {
      try {
        const items = (await Promise.all(
          snapshot.docs.map(async (entry) => {
            const data = entry.data() as Goal;
            return hydrateGoal(uid, { ...data, id: data.id || entry.id });
          })
        )).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
        if (active) callback(items);
      } catch (error) {
        if (active) onError(error instanceof Error ? error : new Error(String(error)));
      }
    },
    (error) => { if (active) onError(error); }
  );
  return () => {
    active = false;
    unsubscribe();
  };
}

export async function addGoalContribution(uid: string, goalId: string, payload: NewContributionInput) {
  const accountsRef = userCollectionRef<Account>(uid, 'accounts');
  const goalsRef = userCollectionRef<Goal>(uid, 'goals');

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    const accountRef = doc(accountsRef, payload.accountId);
    const goalRef = doc(goalsRef, goalId);
    const [accountSnapshot, goalSnapshot] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(goalRef),
    ]);

    if (!accountSnapshot.exists()) {
      throw new Error('Choose a valid source account for this contribution.');
    }

    if (!goalSnapshot.exists()) {
      throw new Error('This goal could not be found.');
    }

    const account = accountSnapshot.data() as Account;
    const goal = goalSnapshot.data() as Goal;
    const contributionRef = doc(goalContributionsCollectionRef(uid, goalId));

    transaction.set(
      accountRef,
      {
        balance: account.balance - payload.amount,
        updatedAt: todayDate(),
      },
      { merge: true }
    );
    transaction.set(
      goalRef,
      {
        currentAmount: goal.currentAmount + payload.amount,
      },
      { merge: true }
    );
    transaction.set(contributionRef, {
      id: contributionRef.id,
      ...payload,
    });
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}
