import { deleteDoc, doc, getDocs, query, runTransaction, setDoc, where } from 'firebase/firestore';
import type { Account, Transaction } from '../types';
import { isoNow, subscribeCollection, todayDate, userCollectionRef, userDocRef } from '../../firebase/firestore';

export type NewAccountInput = Omit<Account, 'id' | 'createdAt' | 'updatedAt'>;

export function subscribeAccounts(uid: string, callback: (items: Account[]) => void, onError: (error: Error) => void) {
  return subscribeCollection<Account>(userCollectionRef(uid, 'accounts'), callback, onError);
}

export async function createAccount(uid: string, payload: NewAccountInput) {
  const accountsRef = userCollectionRef<Account>(uid, 'accounts');
  const accountRef = doc(accountsRef);
  const now = todayDate();
  await setDoc(accountRef, {
    id: accountRef.id,
    ...payload,
    createdAt: now,
    updatedAt: now,
  });
  await setDoc(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
}

export async function updateAccount(uid: string, id: string, updates: Partial<Account>) {
  const accountRef = doc(userCollectionRef<Account>(uid, 'accounts'), id);
  await setDoc(
    accountRef,
    {
      ...updates,
      updatedAt: todayDate(),
    },
    { merge: true }
  );
  await setDoc(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
}

export async function deleteAccount(uid: string, accountId: string) {
  const transactionsRef = userCollectionRef<Transaction>(uid, 'transactions');
  const [sourceTransactions, destinationTransactions] = await Promise.all([
    getDocs(query(transactionsRef, where('accountId', '==', accountId))),
    getDocs(query(transactionsRef, where('toAccountId', '==', accountId))),
  ]);

  if (!sourceTransactions.empty || !destinationTransactions.empty) {
    throw new Error('Delete the related transactions before removing this account.');
  }

  await deleteDoc(doc(userCollectionRef(uid, 'accounts'), accountId));
  await setDoc(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
}

export async function adjustAccountBalanceInTransaction(
  uid: string,
  accountId: string,
  delta: number
) {
  await runTransaction(userDocRef(uid).firestore, async (transaction) => {
    const accountRef = doc(userCollectionRef<Account>(uid, 'accounts'), accountId);
    const accountSnapshot = await transaction.get(accountRef);

    if (!accountSnapshot.exists()) {
      throw new Error('The selected account could not be found.');
    }

    const account = accountSnapshot.data() as Account;
    transaction.set(
      accountRef,
      {
        balance: account.balance + delta,
        updatedAt: todayDate(),
      },
      { merge: true }
    );
    transaction.set(userDocRef(uid), { updatedAt: isoNow(), lastSyncedAt: isoNow() }, { merge: true });
  });
}
