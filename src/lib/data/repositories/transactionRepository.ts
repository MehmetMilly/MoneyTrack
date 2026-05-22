import { doc, runTransaction } from 'firebase/firestore';
import type { Account, Transaction } from '../types';
import { isoNow, subscribeCollection, todayDate, userCollectionRef, userDocRef } from '../../firebase/firestore';

export type NewTransactionInput = Omit<Transaction, 'id' | 'createdAt'>;

function applyTransactionDelta(account: Account, transaction: NewTransactionInput | Transaction, direction: 1 | -1) {
  if (transaction.type === 'income') {
    return account.balance + transaction.amount * direction;
  }

  return account.balance - transaction.amount * direction;
}

export function subscribeTransactions(uid: string, callback: (items: Transaction[]) => void, onError: (error: Error) => void) {
  return subscribeCollection<Transaction>(userCollectionRef(uid, 'transactions'), callback, onError);
}

export async function createTransactionRecord(uid: string, payload: NewTransactionInput) {
  const transactionsRef = userCollectionRef<Transaction>(uid, 'transactions');
  const accountsRef = userCollectionRef<Account>(uid, 'accounts');

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    const sourceRef = doc(accountsRef, payload.accountId);
    const sourceSnapshot = await transaction.get(sourceRef);

    if (!sourceSnapshot.exists()) {
      throw new Error('The selected account could not be found.');
    }

    const sourceAccount = sourceSnapshot.data() as Account;
    const transactionRef = doc(transactionsRef);
    const today = todayDate();

    if (payload.type === 'transfer') {
      if (!payload.toAccountId) {
        throw new Error('Choose a destination account for this transfer.');
      }

      if (payload.toAccountId === payload.accountId) {
        throw new Error('Transfer source and destination must be different.');
      }

      const destinationRef = doc(accountsRef, payload.toAccountId);
      const destinationSnapshot = await transaction.get(destinationRef);

      if (!destinationSnapshot.exists()) {
        throw new Error('The destination account could not be found.');
      }

      const destinationAccount = destinationSnapshot.data() as Account;

      transaction.set(
        sourceRef,
        { balance: sourceAccount.balance - payload.amount, updatedAt: today },
        { merge: true }
      );
      transaction.set(
        destinationRef,
        { balance: destinationAccount.balance + payload.amount, updatedAt: today },
        { merge: true }
      );
    } else {
      transaction.set(
        sourceRef,
        {
          balance: applyTransactionDelta(sourceAccount, payload, 1),
          updatedAt: today,
        },
        { merge: true }
      );
    }

    transaction.set(transactionRef, { id: transactionRef.id, ...payload, createdAt: today });
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}

export async function deleteTransactionRecord(uid: string, transactionId: string) {
  const transactionsRef = userCollectionRef<Transaction>(uid, 'transactions');
  const accountsRef = userCollectionRef<Account>(uid, 'accounts');

  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    const transactionRef = doc(transactionsRef, transactionId);
    const transactionSnapshot = await transaction.get(transactionRef);

    if (!transactionSnapshot.exists()) {
      return;
    }

    const data = transactionSnapshot.data() as Transaction;
    const record = { ...data, id: data.id || transactionSnapshot.id };
    const sourceRef = doc(accountsRef, record.accountId);
    const sourceSnapshot = await transaction.get(sourceRef);

    if (!sourceSnapshot.exists()) {
      throw new Error('The related account could not be found.');
    }

    const sourceAccount = sourceSnapshot.data() as Account;
    const today = todayDate();

    if (record.type === 'transfer') {
      if (!record.toAccountId) {
        throw new Error('This transfer is missing its destination account.');
      }

      const destinationRef = doc(accountsRef, record.toAccountId);
      const destinationSnapshot = await transaction.get(destinationRef);

      if (!destinationSnapshot.exists()) {
        throw new Error('The destination account could not be found.');
      }

      const destinationAccount = destinationSnapshot.data() as Account;

      transaction.set(
        sourceRef,
        { balance: sourceAccount.balance + record.amount, updatedAt: today },
        { merge: true }
      );
      transaction.set(
        destinationRef,
        { balance: destinationAccount.balance - record.amount, updatedAt: today },
        { merge: true }
      );
    } else {
      transaction.set(
        sourceRef,
        {
          balance: applyTransactionDelta(sourceAccount, record, -1),
          updatedAt: today,
        },
        { merge: true }
      );
    }

    transaction.delete(transactionRef);
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}
