import { addMonths, parseISO } from 'date-fns';
import { doc, getDocs, onSnapshot, orderBy, query, runTransaction, where } from 'firebase/firestore';
import type { Account, Debt, DebtPayment, Installment, InstallmentPayment, Reminder, Transaction } from '../types';
import {
  debtPaymentsCollectionRef,
  installmentPaymentsCollectionRef,
  isoNow,
  todayDate,
  userCollectionRef,
  userDocRef,
} from '../../firebase/firestore';

export interface PaymentInput {
  amount: number;
  date: string;
  accountId?: string;
  markWithoutSourceAccount?: boolean;
}

export type NewDebtInput = Omit<Debt, 'id' | 'createdAt' | 'payments' | 'status' | 'paidAmount'>;
export type NewInstallmentInput = Omit<Installment, 'id' | 'createdAt' | 'payments' | 'status' | 'paidInstallments'>;

type DebtDocument = Omit<Debt, 'payments'>;
type InstallmentDocument = Omit<Installment, 'payments'>;
type LinkedTransactionType = 'income' | 'expense';

export async function createDebt(uid: string, payload: NewDebtInput) {
  const debtsRef = userCollectionRef<Debt>(uid, 'debts');
  const debtRef = doc(debtsRef);
  const now = todayDate();

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    const debtDocument: DebtDocument = {
      id: debtRef.id,
      ...payload,
      paidAmount: 0,
      status: 'active',
      createdAt: now,
    };
    transaction.set(debtRef, debtDocument);

    const remindersRef = userCollectionRef<Reminder>(uid, 'reminders');
    const reminderRef = doc(remindersRef);
    transaction.set(reminderRef, {
      id: reminderRef.id,
      title: payload.name,
      type: 'debt',
      referenceId: debtRef.id,
      amount: payload.totalAmount,
      dueDate: payload.dueDate || todayDate(),
      status: 'upcoming',
      isRecurring: false,
    });

    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}

export async function deleteDebt(uid: string, debtId: string) {
  const paymentsRef = debtPaymentsCollectionRef(uid, debtId);
  const remindersRef = userCollectionRef<Reminder>(uid, 'reminders');
  const [paymentsSnapshot, remindersSnapshot] = await Promise.all([
    getDocs(paymentsRef),
    getDocs(query(remindersRef, where('referenceId', '==', debtId))),
  ]);

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    paymentsSnapshot.docs.forEach((entry) => {
      transaction.delete(entry.ref);
    });
    remindersSnapshot.docs.forEach((entry) => {
      transaction.delete(entry.ref);
    });
    transaction.delete(doc(userCollectionRef<Debt>(uid, 'debts'), debtId));
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}

export async function createInstallment(uid: string, payload: NewInstallmentInput) {
  const installmentsRef = userCollectionRef<Installment>(uid, 'installments');
  const installmentRef = doc(installmentsRef);
  const now = todayDate();

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    const installmentDocument: InstallmentDocument = {
      id: installmentRef.id,
      ...payload,
      paidInstallments: 0,
      status: 'active',
      createdAt: now,
    };
    transaction.set(installmentRef, installmentDocument);

    const remindersRef = userCollectionRef<Reminder>(uid, 'reminders');
    const reminderRef = doc(remindersRef);
    transaction.set(reminderRef, {
      id: reminderRef.id,
      title: payload.name,
      type: 'installment',
      referenceId: installmentRef.id,
      amount: payload.monthlyAmount,
      dueDate: payload.nextDueDate,
      status: 'upcoming',
      isRecurring: true,
    });

    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}

export async function deleteInstallment(uid: string, installmentId: string) {
  const paymentsRef = installmentPaymentsCollectionRef(uid, installmentId);
  const remindersRef = userCollectionRef<Reminder>(uid, 'reminders');
  const [paymentsSnapshot, remindersSnapshot] = await Promise.all([
    getDocs(paymentsRef),
    getDocs(query(remindersRef, where('referenceId', '==', installmentId))),
  ]);

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    paymentsSnapshot.docs.forEach((entry) => {
      transaction.delete(entry.ref);
    });
    remindersSnapshot.docs.forEach((entry) => {
      transaction.delete(entry.ref);
    });
    transaction.delete(doc(userCollectionRef<Installment>(uid, 'installments'), installmentId));
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}

async function hydrateDebt(uid: string, debt: Debt) {
  const paymentsSnapshot = await getDocs(query(debtPaymentsCollectionRef(uid, debt.id), orderBy('date', 'asc')));
  const payments = paymentsSnapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  })) as DebtPayment[];

  return {
    ...debt,
    payments,
  };
}

async function hydrateInstallment(uid: string, installment: Installment) {
  const paymentsSnapshot = await getDocs(
    query(installmentPaymentsCollectionRef(uid, installment.id), orderBy('installmentNumber', 'asc'))
  );
  const payments = paymentsSnapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  })) as InstallmentPayment[];

  return {
    ...installment,
    payments,
  };
}

function nextInstallmentDate(date: string) {
  return addMonths(parseISO(date), 1).toISOString().split('T')[0];
}

function createLinkedTransactionPayload(
  amount: number,
  accountId: string,
  notes: string,
  date: string,
  type: LinkedTransactionType
): Omit<Transaction, 'id'> {
  return {
    type,
    amount,
    accountId,
    categoryId: type === 'income' ? 'cat-other-income' : 'cat-other',
    date,
    notes,
    isRecurring: false,
    createdAt: date,
  };
}

function ensureSourceAccount(accountId?: string, markWithoutSourceAccount?: boolean) {
  if (!markWithoutSourceAccount && !accountId) {
    throw new Error('Choose a source account or use the no-account option.');
  }
}

function getDebtPaymentEffect(debt: Debt) {
  if (debt.type === 'owed_to_me') {
    return {
      accountDelta: 1,
      transactionType: 'income' as const,
      notesPrefix: 'Debt collection',
    };
  }

  return {
    accountDelta: -1,
    transactionType: 'expense' as const,
    notesPrefix: 'Debt payment',
  };
}

export function subscribeDebts(uid: string, callback: (items: Debt[]) => void, onError: (error: Error) => void) {
  return onSnapshot(
    userCollectionRef<Debt>(uid, 'debts'),
    async (snapshot) => {
      const items = await Promise.all(
        snapshot.docs.map(async (entry) => {
          const data = entry.data() as Debt;
          return hydrateDebt(uid, { ...data, id: data.id || entry.id });
        })
      );
      callback(items);
    },
    (error) => onError(error)
  );
}

export function subscribeInstallments(uid: string, callback: (items: Installment[]) => void, onError: (error: Error) => void) {
  return onSnapshot(
    userCollectionRef<Installment>(uid, 'installments'),
    async (snapshot) => {
      const items = await Promise.all(
        snapshot.docs.map(async (entry) => {
          const data = entry.data() as Installment;
          return hydrateInstallment(uid, { ...data, id: data.id || entry.id });
        })
      );
      callback(items);
    },
    (error) => onError(error)
  );
}

export function subscribeReminders(uid: string, callback: (items: Reminder[]) => void, onError: (error: Error) => void) {
  return onSnapshot(
    userCollectionRef<Reminder>(uid, 'reminders'),
    (snapshot) => {
      const items = snapshot.docs.map((entry) => {
        const data = entry.data() as Reminder;
        return { ...data, id: data.id || entry.id };
      });
      callback(items);
    },
    (error) => onError(error)
  );
}

export async function addDebtPayment(uid: string, debtId: string, payload: PaymentInput) {
  ensureSourceAccount(payload.accountId, payload.markWithoutSourceAccount);

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    const debtRef = doc(userCollectionRef<Debt>(uid, 'debts'), debtId);
    const debtSnapshot = await transaction.get(debtRef);

    if (!debtSnapshot.exists()) {
      throw new Error('This debt could not be found.');
    }

    const debt = debtSnapshot.data() as Debt;
    const newPaidAmount = debt.paidAmount + payload.amount;
    const isPaid = newPaidAmount >= debt.totalAmount;
    const paymentEffect = getDebtPaymentEffect(debt);

    if (payload.accountId) {
      const accountRef = doc(userCollectionRef<Account>(uid, 'accounts'), payload.accountId);
      const accountSnapshot = await transaction.get(accountRef);

      if (!accountSnapshot.exists()) {
        throw new Error('The source account could not be found.');
      }

      const account = accountSnapshot.data() as Account;
      transaction.set(
        accountRef,
        {
          balance: account.balance + paymentEffect.accountDelta * payload.amount,
          updatedAt: todayDate(),
        },
        { merge: true }
      );

      const linkedTransactionRef = doc(userCollectionRef<Transaction>(uid, 'transactions'));
      transaction.set(
        linkedTransactionRef,
        createLinkedTransactionPayload(
          payload.amount,
          payload.accountId,
          `${paymentEffect.notesPrefix}: ${debt.name}`,
          payload.date,
          paymentEffect.transactionType
        )
      );
    }

    transaction.set(
      debtRef,
      {
        paidAmount: newPaidAmount,
        status: isPaid ? 'paid' : debt.status,
      },
      { merge: true }
    );

    const paymentRef = doc(debtPaymentsCollectionRef(uid, debtId));
    transaction.set(paymentRef, {
      id: paymentRef.id,
      amount: payload.amount,
      date: payload.date,
      accountId: payload.accountId,
    });
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}

export async function addInstallmentPayment(uid: string, installmentId: string, payload: PaymentInput) {
  ensureSourceAccount(payload.accountId, payload.markWithoutSourceAccount);

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    const installmentRef = doc(userCollectionRef<Installment>(uid, 'installments'), installmentId);
    const installmentSnapshot = await transaction.get(installmentRef);

    if (!installmentSnapshot.exists()) {
      throw new Error('This installment could not be found.');
    }

    const installment = installmentSnapshot.data() as Installment;
    const paidInstallments = installment.paidInstallments + 1;
    const isComplete = paidInstallments >= installment.totalInstallments;

    if (payload.accountId) {
      const accountRef = doc(userCollectionRef<Account>(uid, 'accounts'), payload.accountId);
      const accountSnapshot = await transaction.get(accountRef);

      if (!accountSnapshot.exists()) {
        throw new Error('The source account could not be found.');
      }

      const account = accountSnapshot.data() as Account;
      transaction.set(
        accountRef,
        {
          balance: account.balance - payload.amount,
          updatedAt: todayDate(),
        },
        { merge: true }
      );

      transaction.set(
        doc(userCollectionRef<Transaction>(uid, 'transactions')),
        createLinkedTransactionPayload(payload.amount, payload.accountId, `Installment payment: ${installment.name}`, payload.date, 'expense')
      );
    }

    transaction.set(
      installmentRef,
      {
        paidInstallments,
        status: isComplete ? 'completed' : installment.status,
        nextDueDate: isComplete ? installment.nextDueDate : nextInstallmentDate(installment.nextDueDate),
      },
      { merge: true }
    );

    const paymentRef = doc(installmentPaymentsCollectionRef(uid, installmentId));
    transaction.set(paymentRef, {
      id: paymentRef.id,
      installmentNumber: paidInstallments,
      amount: payload.amount,
      dueDate: installment.nextDueDate,
      paidDate: payload.date,
      status: 'paid',
      accountId: payload.accountId,
    });
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}

export async function markReminderPaid(uid: string, reminderId: string, payload: Omit<PaymentInput, 'amount' | 'date'> = {}) {
  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    const reminderRef = doc(userCollectionRef<Reminder>(uid, 'reminders'), reminderId);
    const reminderSnapshot = await transaction.get(reminderRef);

    if (!reminderSnapshot.exists()) {
      throw new Error('This reminder could not be found.');
    }

    const reminder = reminderSnapshot.data() as Reminder;
    ensureSourceAccount(payload.accountId, payload.markWithoutSourceAccount);

    if (reminder.status === 'paid') {
      return;
    }

    if (reminder.type === 'debt' && reminder.referenceId) {
      const debtRef = doc(userCollectionRef<Debt>(uid, 'debts'), reminder.referenceId);
      const debtSnapshot = await transaction.get(debtRef);

      if (debtSnapshot.exists()) {
        const debt = debtSnapshot.data() as Debt;
        const paymentEffect = getDebtPaymentEffect(debt);
        const newPaidAmount = debt.paidAmount + reminder.amount;
        const accountRef = payload.accountId ? doc(userCollectionRef<Account>(uid, 'accounts'), payload.accountId) : null;
        const accountSnapshot = accountRef ? await transaction.get(accountRef) : null;

        if (accountRef && !accountSnapshot?.exists()) {
          throw new Error('The source account could not be found.');
        }

        transaction.set(
          debtRef,
          {
            paidAmount: newPaidAmount,
            status: newPaidAmount >= debt.totalAmount ? 'paid' : debt.status,
          },
          { merge: true }
        );

        const paymentRef = doc(debtPaymentsCollectionRef(uid, reminder.referenceId));
        transaction.set(paymentRef, {
          id: paymentRef.id,
          amount: reminder.amount,
          date: todayDate(),
          accountId: payload.accountId,
        });

        if (accountRef && accountSnapshot) {
          const account = accountSnapshot.data() as Account;
          const linkedAccountId = accountRef.id;
          transaction.set(
            accountRef,
            {
              balance: account.balance + paymentEffect.accountDelta * reminder.amount,
              updatedAt: todayDate(),
            },
            { merge: true }
          );
          transaction.set(
            doc(userCollectionRef<Transaction>(uid, 'transactions')),
            createLinkedTransactionPayload(
              reminder.amount,
              linkedAccountId,
              `${paymentEffect.notesPrefix}: ${reminder.title}`,
              todayDate(),
              paymentEffect.transactionType
            )
          );
        }
      }
    }

    if (reminder.type === 'installment' && reminder.referenceId) {
      const installmentRef = doc(userCollectionRef<Installment>(uid, 'installments'), reminder.referenceId);
      const installmentSnapshot = await transaction.get(installmentRef);

      if (installmentSnapshot.exists()) {
        const installment = installmentSnapshot.data() as Installment;
        const paidInstallments = installment.paidInstallments + 1;
        const isComplete = paidInstallments >= installment.totalInstallments;
        const accountRef = payload.accountId ? doc(userCollectionRef<Account>(uid, 'accounts'), payload.accountId) : null;
        const accountSnapshot = accountRef ? await transaction.get(accountRef) : null;

        if (accountRef && !accountSnapshot?.exists()) {
          throw new Error('The source account could not be found.');
        }

        transaction.set(
          installmentRef,
          {
            paidInstallments,
            status: isComplete ? 'completed' : installment.status,
            nextDueDate: isComplete ? installment.nextDueDate : nextInstallmentDate(installment.nextDueDate),
          },
          { merge: true }
        );

        const paymentRef = doc(installmentPaymentsCollectionRef(uid, reminder.referenceId));
        transaction.set(paymentRef, {
          id: paymentRef.id,
          installmentNumber: paidInstallments,
          amount: reminder.amount,
          dueDate: installment.nextDueDate,
          paidDate: todayDate(),
          status: 'paid',
          accountId: payload.accountId,
        });

        if (accountRef && accountSnapshot) {
          const account = accountSnapshot.data() as Account;
          const linkedAccountId = accountRef.id;
          transaction.set(
            accountRef,
            {
              balance: account.balance - reminder.amount,
              updatedAt: todayDate(),
            },
            { merge: true }
          );
          transaction.set(
            doc(userCollectionRef<Transaction>(uid, 'transactions')),
            createLinkedTransactionPayload(reminder.amount, linkedAccountId, `Reminder payment: ${reminder.title}`, todayDate(), 'expense')
          );
        }
      }
    }

    if ((reminder.type === 'bill' || reminder.type === 'custom') && payload.accountId) {
      const accountRef = doc(userCollectionRef<Account>(uid, 'accounts'), payload.accountId);
      const accountSnapshot = await transaction.get(accountRef);

      if (!accountSnapshot.exists()) {
        throw new Error('The source account could not be found.');
      }

      const account = accountSnapshot.data() as Account;
      transaction.set(
        accountRef,
        {
          balance: account.balance - reminder.amount,
          updatedAt: todayDate(),
        },
        { merge: true }
      );
      transaction.set(
        doc(userCollectionRef<Transaction>(uid, 'transactions')),
        createLinkedTransactionPayload(reminder.amount, payload.accountId, `Reminder payment: ${reminder.title}`, todayDate(), 'expense')
      );
    }

    transaction.set(
      reminderRef,
      {
        status: 'paid',
        paidDate: todayDate(),
      },
      { merge: true }
    );
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}
