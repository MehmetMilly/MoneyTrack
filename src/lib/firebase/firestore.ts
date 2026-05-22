import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  type CollectionReference,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';

export function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function userDocRef(uid: string) {
  return doc(db, 'users', uid);
}

export function userCollectionRef<T extends DocumentData>(uid: string, collectionName: string) {
  return collection(db, 'users', uid, collectionName) as CollectionReference<T>;
}

export function debtPaymentsCollectionRef(uid: string, debtId: string) {
  return collection(db, 'users', uid, 'debts', debtId, 'payments');
}

export function installmentPaymentsCollectionRef(uid: string, installmentId: string) {
  return collection(db, 'users', uid, 'installments', installmentId, 'payments');
}

export function goalContributionsCollectionRef(uid: string, goalId: string) {
  return collection(db, 'users', uid, 'goals', goalId, 'contributions');
}

export function createNestedDocId(parent: CollectionReference<DocumentData>, nestedPath: string[]) {
  return doc(collection(parent.firestore, parent.path, ...nestedPath)).id;
}

export function mapSnapshotList<T>(snapshotDocs: QueryDocumentSnapshot<DocumentData>[]) {
  return snapshotDocs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  })) as T[];
}

export async function getCollectionList<T>(ref: CollectionReference<DocumentData>) {
  const snapshot = await getDocs(ref);
  return mapSnapshotList<T>(snapshot.docs);
}

export function subscribeCollection<T>(
  ref: CollectionReference<DocumentData>,
  callback: (items: T[]) => void,
  onError: (error: Error) => void,
  ...constraints: QueryConstraint[]
): Unsubscribe {
  const target = constraints.length > 0 ? query(ref, ...constraints) : ref;
  return onSnapshot(
    target,
    (snapshot) => {
      callback(mapSnapshotList<T>(snapshot.docs));
    },
    (error) => onError(error)
  );
}
