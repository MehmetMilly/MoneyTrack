import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import type { PlanningEntry } from '../types';
import { planningEntryAmount } from '../financeCalculations';
import { isoNow, subscribeCollection, userCollectionRef, userDocRef } from '../../firebase/firestore';

export type NewPlanningEntryInput = Omit<PlanningEntry, 'id' | 'createdAt' | 'updatedAt'>;

export function getPlanningEntryAmount(entry: PlanningEntry) {
  return planningEntryAmount(entry);
}

export function subscribePlanningEntries(
  uid: string,
  callback: (items: PlanningEntry[]) => void,
  onError: (error: Error) => void
) {
  return subscribeCollection<PlanningEntry>(userCollectionRef(uid, 'planningEntries'), callback, onError);
}

export async function createPlanningEntry(uid: string, payload: NewPlanningEntryInput) {
  const planningEntriesRef = userCollectionRef<PlanningEntry>(uid, 'planningEntries');
  const planningEntryRef = doc(planningEntriesRef);
  const now = isoNow();

  await setDoc(planningEntryRef, {
    id: planningEntryRef.id,
    ...payload,
    createdAt: now,
    updatedAt: now,
  });
  await setDoc(userDocRef(uid), { updatedAt: now, lastSyncedAt: now }, { merge: true });
}

export async function updatePlanningEntry(uid: string, id: string, updates: Partial<PlanningEntry>) {
  const now = isoNow();

  await setDoc(
    doc(userCollectionRef<PlanningEntry>(uid, 'planningEntries'), id),
    {
      ...updates,
      updatedAt: now,
    },
    { merge: true }
  );
  await setDoc(userDocRef(uid), { updatedAt: now, lastSyncedAt: now }, { merge: true });
}

export async function deletePlanningEntry(uid: string, id: string) {
  const now = isoNow();

  await deleteDoc(doc(userCollectionRef<PlanningEntry>(uid, 'planningEntries'), id));
  await setDoc(userDocRef(uid), { updatedAt: now, lastSyncedAt: now }, { merge: true });
}
