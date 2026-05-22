import { doc, getDoc, getDocs, onSnapshot, setDoc, writeBatch, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import type { Account, AppSettings, Category, Debt, Goal, Installment, PlanningEntry, Reminder, Transaction, UserProfile } from '../types';
import {
  defaultCategories,
  demoAccounts,
  demoTransactions,
  demoGoals,
  demoDebts,
  demoInstallments,
  demoReminders,
} from '../demoData';
import { getAuthErrorMessage } from '../../firebase/auth';
import {
  debtPaymentsCollectionRef,
  goalContributionsCollectionRef,
  installmentPaymentsCollectionRef,
  isoNow,
  subscribeCollection,
  userCollectionRef,
  userDocRef,
} from '../../firebase/firestore';

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'light',
  currency: 'SAR',
  planner: {
    dashboardMode: 'planner',
    goalProgressMode: 'automatic',
    includeExpectedEntries: true,
    showAdvancedFinancePages: true,
  },
};

interface UserDocument extends DocumentData {
  name: string;
  email: string;
  avatar?: string;
  settings?: AppSettings;
  plannerMigrationVersion?: number;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}

type GoalSeedDocument = Omit<Goal, 'contributions'>;
type DebtSeedDocument = Omit<Debt, 'payments'>;
type InstallmentSeedDocument = Omit<Installment, 'payments'>;

export interface BootstrapUserPayload {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface UserSnapshotPayload {
  profile: UserProfile;
  settings: AppSettings;
  lastSyncedAt: string | null;
}

function buildProfile(name: string, email: string, avatar?: string): UserProfile {
  return {
    name: name.trim() || email.split('@')[0] || 'User',
    email,
    avatar,
  };
}

function withDefaultSettings(settings?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    planner: {
      ...DEFAULT_SETTINGS.planner,
      ...settings?.planner,
    },
  };
}

function planningEntryId(prefix: string, id: string) {
  return `${prefix}-${id}`;
}

function buildPlanningEntry(
  id: string,
  payload: Omit<PlanningEntry, 'id' | 'createdAt' | 'updatedAt'>,
  createdAt: string
): PlanningEntry {
  return {
    id,
    ...payload,
    createdAt,
    updatedAt: createdAt,
  };
}

async function migratePlannerDataIfNeeded(uid: string, current: Partial<UserDocument>) {
  if ((current.plannerMigrationVersion ?? 0) >= 1) {
    return;
  }

  const planningEntriesRef = userCollectionRef<PlanningEntry>(uid, 'planningEntries');
  const planningEntriesSnapshot = await getDocs(planningEntriesRef);
  const now = isoNow();

  if (!planningEntriesSnapshot.empty) {
    await setDoc(userDocRef(uid), { plannerMigrationVersion: 1, updatedAt: now, lastSyncedAt: now }, { merge: true });
    return;
  }

  const [accountsSnapshot, transactionsSnapshot, debtsSnapshot, installmentsSnapshot, remindersSnapshot, goalsSnapshot] = await Promise.all([
    getDocs(userCollectionRef<Account>(uid, 'accounts')),
    getDocs(userCollectionRef<Transaction>(uid, 'transactions')),
    getDocs(userCollectionRef<Debt>(uid, 'debts')),
    getDocs(userCollectionRef<Installment>(uid, 'installments')),
    getDocs(userCollectionRef<Reminder>(uid, 'reminders')),
    getDocs(userCollectionRef<Goal>(uid, 'goals')),
  ]);

  const batch = writeBatch(userDocRef(uid).firestore);
  const entries: PlanningEntry[] = [];

  accountsSnapshot.docs.forEach((entry) => {
    const account = entry.data() as Account;
    if (account.balance <= 0) return;

    entries.push(buildPlanningEntry(planningEntryId('account', entry.id), {
      kind: 'positive',
      status: 'confirmed',
      category: account.type === 'cash' ? 'cash' : 'bank_balance',
      title: account.name,
      expectedAmount: account.balance,
      actualAmount: account.balance,
      linkedAccountId: entry.id,
      notes: 'Migrated from account balance.',
    }, now));
  });

  transactionsSnapshot.docs.forEach((entry) => {
    const transaction = entry.data() as Transaction;
    if (transaction.type === 'transfer') return;

    entries.push(buildPlanningEntry(planningEntryId('transaction', entry.id), {
      kind: transaction.type === 'income' ? 'positive' : 'negative',
      status: 'confirmed',
      category: transaction.type === 'income' ? 'expected_profit' : 'expense',
      title: transaction.notes || (transaction.type === 'income' ? 'Income transaction' : 'Expense transaction'),
      expectedAmount: transaction.amount,
      actualAmount: transaction.amount,
      dueDate: transaction.date,
      linkedAccountId: transaction.accountId,
      linkedTransactionId: entry.id,
    }, transaction.createdAt || now));
  });

  debtsSnapshot.docs.forEach((entry) => {
    const debt = entry.data() as Debt;
    const remaining = Math.max(0, debt.totalAmount - debt.paidAmount);
    if (remaining <= 0 || debt.status === 'paid') return;

    entries.push(buildPlanningEntry(planningEntryId('debt', entry.id), {
      kind: debt.type === 'owed_to_me' ? 'positive' : 'negative',
      status: 'expected',
      category: debt.type === 'owed_to_me' ? 'owed_to_me' : 'debt_i_owe',
      title: debt.name,
      expectedAmount: remaining,
      dueDate: debt.dueDate,
      notes: debt.creditor,
    }, debt.createdAt || now));
  });

  installmentsSnapshot.docs.forEach((entry) => {
    const installment = entry.data() as Installment;
    if (installment.status === 'completed') return;

    entries.push(buildPlanningEntry(planningEntryId('installment', entry.id), {
      kind: 'negative',
      status: 'expected',
      category: 'installment',
      title: installment.name,
      expectedAmount: installment.monthlyAmount,
      dueDate: installment.nextDueDate,
      notes: installment.provider,
    }, installment.createdAt || now));
  });

  remindersSnapshot.docs.forEach((entry) => {
    const reminder = entry.data() as Reminder;
    if (reminder.status === 'paid' || reminder.type === 'debt' || reminder.type === 'installment') return;

    entries.push(buildPlanningEntry(planningEntryId('reminder', entry.id), {
      kind: 'negative',
      status: 'expected',
      category: reminder.type === 'bill' ? 'bill' : 'custom',
      title: reminder.title,
      expectedAmount: reminder.amount,
      dueDate: reminder.dueDate,
    }, now));
  });

  entries.forEach((entry) => {
    batch.set(doc(planningEntriesRef, entry.id), entry);
  });

  const settings = withDefaultSettings(current.settings);
  batch.set(
    userDocRef(uid),
    {
      plannerMigrationVersion: 1,
      settings: {
        ...settings,
        planner: {
          ...settings.planner,
          primaryGoalId: settings.planner.primaryGoalId || goalsSnapshot.docs[0]?.id,
        },
      },
      updatedAt: now,
      lastSyncedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function bootstrapUserData({ uid, name, email, avatar }: BootstrapUserPayload) {
  const profileRef = userDocRef(uid);
  const categoriesRef = userCollectionRef<Category>(uid, 'categories');
  const [profileSnapshot, categoriesSnapshot] = await Promise.all([
    getDoc(profileRef),
    getDocs(categoriesRef),
  ]);

  const batch = writeBatch(profileRef.firestore);
  const now = isoNow();
  const profile = buildProfile(name, email, avatar);

  if (!profileSnapshot.exists()) {
    batch.set(profileRef, {
      ...profile,
      settings: DEFAULT_SETTINGS,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: now,
    });

    const accountsRef = userCollectionRef<Account>(uid, 'accounts');
    demoAccounts.forEach((account) => {
      batch.set(doc(accountsRef, account.id), account);
    });

    const transactionsRef = userCollectionRef<Transaction>(uid, 'transactions');
    demoTransactions.forEach((transaction) => {
      batch.set(doc(transactionsRef, transaction.id), transaction);
    });

    const goalsRef = userCollectionRef<Goal>(uid, 'goals');
    demoGoals.forEach((goal) => {
      const goalDocument: GoalSeedDocument = {
        id: goal.id,
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
        monthlyContribution: goal.monthlyContribution,
        icon: goal.icon,
        color: goal.color,
        createdAt: goal.createdAt,
      };
      batch.set(doc(goalsRef, goal.id), goalDocument);

      const contributionsRef = goalContributionsCollectionRef(uid, goal.id);
      goal.contributions.forEach((contribution) => {
        batch.set(doc(contributionsRef, contribution.id), contribution);
      });
    });

    const debtsRef = userCollectionRef<Debt>(uid, 'debts');
    demoDebts.forEach((debt) => {
      const debtDocument: DebtSeedDocument = {
        id: debt.id,
        name: debt.name,
        type: debt.type,
        totalAmount: debt.totalAmount,
        paidAmount: debt.paidAmount,
        creditor: debt.creditor,
        dueDate: debt.dueDate,
        notes: debt.notes,
        status: debt.status,
        createdAt: debt.createdAt,
      };
      batch.set(doc(debtsRef, debt.id), debtDocument);

      const paymentsRef = debtPaymentsCollectionRef(uid, debt.id);
      debt.payments.forEach((payment) => {
        batch.set(doc(paymentsRef, payment.id), payment);
      });
    });

    const installmentsRef = userCollectionRef<Installment>(uid, 'installments');
    demoInstallments.forEach((installment) => {
      const installmentDocument: InstallmentSeedDocument = {
        id: installment.id,
        name: installment.name,
        totalAmount: installment.totalAmount,
        monthlyAmount: installment.monthlyAmount,
        totalInstallments: installment.totalInstallments,
        paidInstallments: installment.paidInstallments,
        startDate: installment.startDate,
        nextDueDate: installment.nextDueDate,
        provider: installment.provider,
        status: installment.status,
        notes: installment.notes,
        createdAt: installment.createdAt,
      };
      batch.set(doc(installmentsRef, installment.id), installmentDocument);

      const paymentsRef = installmentPaymentsCollectionRef(uid, installment.id);
      installment.payments.forEach((payment) => {
        batch.set(doc(paymentsRef, payment.id), payment);
      });
    });

    const remindersRef = userCollectionRef<Reminder>(uid, 'reminders');
    demoReminders.forEach((reminder) => {
      batch.set(doc(remindersRef, reminder.id), reminder);
    });
  } else {
    const current = profileSnapshot.data() as Partial<UserDocument>;
    batch.set(
      profileRef,
      {
        name: current.name || profile.name,
        email: current.email || profile.email,
        avatar: current.avatar ?? profile.avatar,
        settings: withDefaultSettings(current.settings),
        updatedAt: now,
        lastSyncedAt: current.lastSyncedAt ?? now,
      },
      { merge: true }
    );
  }

  if (categoriesSnapshot.empty) {
    defaultCategories.forEach((category) => {
      batch.set(doc(categoriesRef, category.id), category);
    });
  }

  await batch.commit();

  const latestProfile = (await getDoc(profileRef)).data() as Partial<UserDocument> | undefined;
  await migratePlannerDataIfNeeded(uid, latestProfile ?? {});
}

export function subscribeUser(uid: string, callback: (payload: UserSnapshotPayload) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(
    userDocRef(uid),
    (snapshot) => {
      const data = snapshot.data() as UserDocument | undefined;
      callback({
        profile: buildProfile(data?.name ?? '', data?.email ?? '', data?.avatar),
        settings: withDefaultSettings(data?.settings),
        lastSyncedAt: data?.lastSyncedAt ?? null,
      });
    },
    (error) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'permission-denied'
      ) {
        onError(new Error(`Firestore denied access to users/${uid}. Update the rules so authenticated users can read and write only their own document tree.`));
        return;
      }

      if (error instanceof Error) {
        onError(error);
        return;
      }

      onError(new Error(getAuthErrorMessage(error)));
    }
  );
}

export function subscribeCategories(uid: string, callback: (items: Category[]) => void, onError: (error: Error) => void) {
  return subscribeCollection<Category>(userCollectionRef(uid, 'categories'), callback, onError);
}

export async function updateUserSettings(uid: string, settings: AppSettings) {
  const now = isoNow();
  await setDoc(
    userDocRef(uid),
    {
      settings,
      updatedAt: now,
      lastSyncedAt: now,
    },
    { merge: true }
  );
}
