import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addDebtPayment as addDebtPaymentRecord,
  addInstallmentPayment,
  markReminderPaid as markReminderPaidRecord,
  subscribeDebts,
  subscribeInstallments,
  subscribeReminders,
  createDebt,
  deleteDebt,
  createInstallment,
  deleteInstallment,
  type PaymentInput,
  type NewDebtInput,
  type NewInstallmentInput,
} from './repositories/obligationRepository';
import { addGoalContribution, subscribeGoals, createGoal, deleteGoal, type NewContributionInput, type NewGoalInput } from './repositories/goalRepository';
import { createAccount, deleteAccount, subscribeAccounts, updateAccount, type NewAccountInput } from './repositories/accountRepository';
import {
  bootstrapUserData,
  DEFAULT_SETTINGS,
  subscribeCategories,
  subscribeUser,
  updateUserSettings,
} from './repositories/userRepository';
import {
  createTransactionRecord,
  deleteTransactionRecord,
  subscribeTransactions,
  type NewTransactionInput,
} from './repositories/transactionRepository';
import {
  createPlanningEntry,
  deletePlanningEntry as deletePlanningEntryRecord,
  subscribePlanningEntries,
  updatePlanningEntry as updatePlanningEntryRecord,
  type NewPlanningEntryInput,
} from './repositories/planningEntryRepository';
import { goalProgressPercent, plannerTotals, remainingDebtAmount } from './financeCalculations';
import {
  defaultCategories,
  demoAccounts,
  demoDebts,
  demoGoals,
  demoInstallments,
  demoPlanningEntries,
  demoProfile,
  demoReminders,
  demoTransactions,
} from './demoData';
import {
  completeGoogleRedirectSignIn,
  getAuthErrorMessage,
  getExistingSignInMethods,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  observeAuthState,
  sendPasswordReset,
  signupWithEmail,
} from '../firebase/auth';
import { isFirebaseConfigured } from '../firebase/client';
import type {
  Account,
  AppSettings,
  Category,
  Debt,
  Goal,
  Installment,
  Language,
  PlanningEntry,
  Reminder,
  Theme,
  Transaction,
  UserProfile,
} from './types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
type SessionMode = 'firebase' | 'demo';
type OperationArea = 'auth' | 'bootstrap' | 'settings' | 'accounts' | 'transactions' | 'planning' | 'goals' | 'obligations';

interface OperationState {
  auth: boolean;
  bootstrap: boolean;
  settings: boolean;
  accounts: boolean;
  transactions: boolean;
  planning: boolean;
  goals: boolean;
  obligations: boolean;
}

interface OperationErrors {
  auth: string | null;
  bootstrap: string | null;
  settings: string | null;
  accounts: string | null;
  transactions: string | null;
  planning: string | null;
  goals: string | null;
  obligations: string | null;
}

interface ReminderPaymentOptions {
  accountId?: string;
  markWithoutSourceAccount?: boolean;
}

interface AppState {
  authStatus: AuthStatus;
  sessionMode: SessionMode;
  isAuthenticated: boolean;
  currentUserId: string | null;
  profile: UserProfile;
  settings: AppSettings;
  lastSyncedAt: string | null;
  isOffline: boolean;
  loading: OperationState;
  errors: OperationErrors;

  accounts: Account[];
  transactions: Transaction[];
  planningEntries: PlanningEntry[];
  categories: Category[];
  debts: Debt[];
  installments: Installment[];
  goals: Goal[];
  reminders: Reminder[];

  initializeApp: () => void;
  clearError: (area?: OperationArea) => void;

  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  startDemoSession: () => void;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;

  setLanguage: (language: Language) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;

  addAccount: (account: NewAccountInput) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  addTransaction: (tx: NewTransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addPlanningEntry: (entry: NewPlanningEntryInput) => Promise<void>;
  updatePlanningEntry: (id: string, updates: Partial<PlanningEntry>) => Promise<void>;
  deletePlanningEntry: (id: string) => Promise<void>;
  markPlanningEntryConfirmed: (entryId: string, actualAmount: number) => Promise<void>;
  markPlanningEntryCancelled: (entryId: string) => Promise<void>;

  addGoal: (goal: NewGoalInput) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addDebt: (debt: NewDebtInput) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addInstallment: (installment: NewInstallmentInput) => Promise<void>;
  deleteInstallment: (id: string) => Promise<void>;
  addContribution: (goalId: string, contribution: NewContributionInput) => Promise<void>;
  addDebtPayment: (debtId: string, payment: PaymentInput) => Promise<void>;
  markInstallmentPaid: (installmentId: string, payment: PaymentInput) => Promise<void>;
  markReminderPaid: (reminderId: string, options?: ReminderPaymentOptions) => Promise<void>;

  getTotalAssets: () => number;
  getTotalDebts: () => number;
  getAvailableMoney: () => number;
  getMonthlyIncome: (month?: string) => number;
  getMonthlyExpenses: (month?: string) => number;
  getPlannerPositiveTotal: () => number;
  getPlannerNegativeTotal: () => number;
  getPlannerNetTotal: () => number;
  getPrimaryGoal: () => Goal | null;
  getPrimaryGoalProgress: () => number;
  getPrimaryGoalRemaining: () => number;
  setPrimaryGoal: (goalId: string) => Promise<void>;
}

const EMPTY_PROFILE: UserProfile = {
  name: 'MoneyTrack User',
  email: '',
};

const DEMO_WRITE_MESSAGE = 'The local demo workspace is read-only. Connect Firebase to create, edit, or save finance data.';

const initialLoadingState: OperationState = {
  auth: false,
  bootstrap: false,
  settings: false,
  accounts: false,
  transactions: false,
  planning: false,
  goals: false,
  obligations: false,
};

const initialErrorState: OperationErrors = {
  auth: null,
  bootstrap: null,
  settings: null,
  accounts: null,
  transactions: null,
  planning: null,
  goals: null,
  obligations: null,
};

let storeInitialized = false;
let authStateUnsubscribe: (() => void) | null = null;
let dataSubscriptions: Array<() => void> = [];
let authEventVersion = 0;
let onlineListenerAttached = false;
let redirectResultHandled = false;

function buildDemoWorkspaceState() {
  return {
    sessionMode: 'demo' as const,
    authStatus: 'authenticated' as const,
    isAuthenticated: true,
    currentUserId: 'demo-local',
    profile: demoProfile,
    lastSyncedAt: null,
    accounts: [...demoAccounts],
    transactions: [...demoTransactions],
    planningEntries: [...demoPlanningEntries],
    categories: [...defaultCategories],
    debts: [...demoDebts],
    installments: [...demoInstallments],
    goals: [...demoGoals],
    reminders: [...demoReminders],
    settings: {
      ...DEFAULT_SETTINGS,
      planner: {
        ...DEFAULT_SETTINGS.planner,
        primaryGoalId: demoGoals[0]?.id,
      },
    },
  };
}

function withMessage(error: unknown) {
  const authMessage = getAuthErrorMessage(error);
  if (authMessage !== 'Something went wrong. Please try again.') {
    return authMessage;
  }

  if (error instanceof Error && error.message) {
    if (/missing or insufficient permissions/i.test(error.message)) {
      return 'You are signed in, but MoneyTrack cannot access your account data yet. Please check the Firestore security rules for this Firebase project.';
    }

    return error.message;
  }

  return authMessage;
}

function detachDataSubscriptions() {
  dataSubscriptions.forEach((unsubscribe) => unsubscribe());
  dataSubscriptions = [];
}

function patchLoading(area: OperationArea, value: boolean) {
  useAppStore.setState((state) => ({
    loading: {
      ...state.loading,
      [area]: value,
    },
  }));
}

function patchError(area: OperationArea, value: string | null) {
  useAppStore.setState((state) => ({
    errors: {
      ...state.errors,
      [area]: value,
    },
  }));
}

function attachOnlineListeners() {
  if (onlineListenerAttached || typeof window === 'undefined') {
    return;
  }

  const updateConnectivity = () => {
    useAppStore.setState({ isOffline: !window.navigator.onLine });
  };

  onlineListenerAttached = true;
  updateConnectivity();
  window.addEventListener('online', updateConnectivity);
  window.addEventListener('offline', updateConnectivity);
}

function connectUserData(uid: string) {
  detachDataSubscriptions();

  dataSubscriptions = [
    subscribeUser(
      uid,
      ({ profile, settings, lastSyncedAt }) => {
        useAppStore.setState({
          profile,
          settings,
          lastSyncedAt,
        });
      },
      (error) => patchError('bootstrap', error.message)
    ),
    subscribeCategories(
      uid,
      (categories) => useAppStore.setState({ categories }),
      (error) => patchError('bootstrap', error.message)
    ),
    subscribeAccounts(
      uid,
      (accounts) => useAppStore.setState({ accounts }),
      (error) => patchError('accounts', error.message)
    ),
    subscribeTransactions(
      uid,
      (transactions) => useAppStore.setState({ transactions }),
      (error) => patchError('transactions', error.message)
    ),
    subscribePlanningEntries(
      uid,
      (planningEntries) => useAppStore.setState({ planningEntries }),
      (error) => patchError('planning', error.message)
    ),
    subscribeGoals(
      uid,
      (goals) => useAppStore.setState({ goals }),
      (error) => patchError('goals', error.message)
    ),
    subscribeDebts(
      uid,
      (debts) => useAppStore.setState({ debts }),
      (error) => patchError('obligations', error.message)
    ),
    subscribeInstallments(
      uid,
      (installments) => useAppStore.setState({ installments }),
      (error) => patchError('obligations', error.message)
    ),
    subscribeReminders(
      uid,
      (reminders) => useAppStore.setState({ reminders }),
      (error) => patchError('obligations', error.message)
    ),
  ];
}

function initializeAuthStateListener() {
  if (authStateUnsubscribe) {
    return;
  }

  authStateUnsubscribe = observeAuthState(async (user) => {
    if (useAppStore.getState().sessionMode === 'demo') {
      return;
    }

    const currentVersion = ++authEventVersion;
    patchLoading('bootstrap', true);
    patchError('bootstrap', null);

    if (!user) {
      detachDataSubscriptions();
      if (currentVersion !== authEventVersion) {
        return;
      }

      useAppStore.setState({
        sessionMode: 'firebase',
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        currentUserId: null,
        profile: EMPTY_PROFILE,
        lastSyncedAt: null,
        accounts: [],
        transactions: [],
        planningEntries: [],
        categories: [],
        debts: [],
        installments: [],
        goals: [],
        reminders: [],
      });
      patchLoading('bootstrap', false);
      return;
    }

    try {
      const email = user.email ?? '';
      const displayName = user.displayName?.trim() || email.split('@')[0] || 'User';

      useAppStore.setState({
        sessionMode: 'firebase',
        authStatus: 'authenticated',
        isAuthenticated: true,
        currentUserId: user.uid,
        profile: {
          name: displayName,
          email,
          avatar: user.photoURL ?? undefined,
        },
      });

      await bootstrapUserData({
        uid: user.uid,
        name: displayName,
        email,
        avatar: user.photoURL ?? undefined,
      });

      if (currentVersion !== authEventVersion) {
        return;
      }

      connectUserData(user.uid);
    } catch (error) {
      if (currentVersion !== authEventVersion) {
        return;
      }

      patchError('bootstrap', withMessage(error));
    } finally {
      if (currentVersion === authEventVersion) {
        patchLoading('bootstrap', false);
      }
    }
  });

  if (!redirectResultHandled) {
    redirectResultHandled = true;
    void completeGoogleRedirectSignIn().catch((error) => {
      patchError('auth', withMessage(error));
      if (useAppStore.getState().authStatus === 'loading') {
        useAppStore.setState({ sessionMode: 'firebase', authStatus: 'unauthenticated', isAuthenticated: false, currentUserId: null });
      }
    });
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const runOperation = async <T>(area: OperationArea, task: () => Promise<T>) => {
        patchLoading(area, true);
        patchError(area, null);

        try {
          return await task();
        } catch (error) {
          const message = withMessage(error);
          patchError(area, message);
          throw new Error(message, { cause: error });
        } finally {
          patchLoading(area, false);
        }
      };

      const requireWritableSession = () => {
        if (get().sessionMode === 'demo') {
          throw new Error(DEMO_WRITE_MESSAGE);
        }
      };

      const persistSettings = async (nextSettings: AppSettings) => {
        set({ settings: nextSettings });
        if (get().sessionMode === 'demo') {
          return;
        }

        const uid = get().currentUserId;
        if (!uid) {
          return;
        }

        await runOperation('settings', async () => {
          await updateUserSettings(uid, nextSettings);
        });
      };

      return {
        authStatus: 'loading',
        sessionMode: 'firebase',
        isAuthenticated: false,
        currentUserId: null,
        profile: EMPTY_PROFILE,
        settings: DEFAULT_SETTINGS,
        lastSyncedAt: null,
        isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
        loading: initialLoadingState,
        errors: initialErrorState,

        accounts: [],
        transactions: [],
        planningEntries: [],
        categories: [],
        debts: [],
        installments: [],
        goals: [],
        reminders: [],

        initializeApp: () => {
          if (storeInitialized) {
            return;
          }

          storeInitialized = true;
          attachOnlineListeners();
          if (!isFirebaseConfigured) {
            set({ sessionMode: 'firebase', authStatus: 'unauthenticated', isAuthenticated: false, currentUserId: null });
            return;
          }
          initializeAuthStateListener();
        },

        clearError: (area) => {
          if (!area) {
            set({ errors: initialErrorState });
            return;
          }

          patchError(area, null);
        },

        login: async (email, password) => {
          await runOperation('auth', async () => {
            await loginWithEmail(email, password);
          });
        },

        signup: async (name, email, password) => {
          await runOperation('auth', async () => {
            await signupWithEmail({ name, email, password });
          });
        },

        loginWithGoogle: async () => {
          await runOperation('auth', async () => {
            try {
              await loginWithGoogle();
            } catch (error) {
              if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code?: string }).code === 'auth/account-exists-with-different-credential'
              ) {
                const email =
                  typeof error === 'object' &&
                  error !== null &&
                  'customData' in error &&
                  typeof (error as { customData?: { email?: unknown } }).customData?.email === 'string'
                    ? (error as { customData: { email: string } }).customData.email
                    : '';
                const methods = email ? await getExistingSignInMethods(email) : [];
                const providerLabel = methods[0] === 'password' ? 'email and password' : methods[0] || 'another provider';
                throw new Error(`This email is already linked to ${providerLabel}. Sign in that way first, then try Google again.`, {
                  cause: error,
                });
              }

              throw error;
            }
          });
        },

        startDemoSession: () => {
          detachDataSubscriptions();
          authEventVersion += 1;
          set({
            ...buildDemoWorkspaceState(),
            loading: initialLoadingState,
            errors: initialErrorState,
          });
        },

        logout: async () => {
          if (get().sessionMode === 'demo') {
            detachDataSubscriptions();
            set({
              sessionMode: 'firebase',
              authStatus: 'unauthenticated',
              isAuthenticated: false,
              currentUserId: null,
              profile: EMPTY_PROFILE,
              lastSyncedAt: null,
              accounts: [],
              transactions: [],
              planningEntries: [],
              categories: [],
              debts: [],
              installments: [],
              goals: [],
              reminders: [],
              errors: initialErrorState,
            });
            return;
          }

          await runOperation('auth', async () => {
            await logoutUser();
          });
        },

        sendPasswordReset: async (email) => {
          await runOperation('auth', async () => {
            await sendPasswordReset(email);
          });
        },

        setLanguage: async (language) => {
          await persistSettings({
            ...get().settings,
            language,
          });
        },

        setTheme: async (theme) => {
          await persistSettings({
            ...get().settings,
            theme,
          });
        },

        addAccount: async (account) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to add an account.');
          }

          await runOperation('accounts', async () => {
            await createAccount(uid, account);
          });
        },

        updateAccount: async (id, updates) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to update an account.');
          }

          await runOperation('accounts', async () => {
            await updateAccount(uid, id, updates);
          });
        },

        deleteAccount: async (id) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to delete an account.');
          }

          await runOperation('accounts', async () => {
            await deleteAccount(uid, id);
          });
        },

        addTransaction: async (tx) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to create a transaction.');
          }

          await runOperation('transactions', async () => {
            await createTransactionRecord(uid, tx);
          });
        },

        deleteTransaction: async (id) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to delete a transaction.');
          }

          await runOperation('transactions', async () => {
            await deleteTransactionRecord(uid, id);
          });
        },

        addPlanningEntry: async (entry) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to create a planning entry.');
          }

          await runOperation('planning', async () => {
            await createPlanningEntry(uid, entry);
          });
        },

        updatePlanningEntry: async (id, updates) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to update a planning entry.');
          }

          await runOperation('planning', async () => {
            await updatePlanningEntryRecord(uid, id, updates);
          });
        },

        deletePlanningEntry: async (id) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to delete a planning entry.');
          }

          await runOperation('planning', async () => {
            await deletePlanningEntryRecord(uid, id);
          });
        },

        markPlanningEntryConfirmed: async (entryId, actualAmount) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to confirm a planning entry.');
          }

          await runOperation('planning', async () => {
            await updatePlanningEntryRecord(uid, entryId, {
              status: 'confirmed',
              actualAmount,
            });
          });
        },

        markPlanningEntryCancelled: async (entryId) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to cancel a planning entry.');
          }

          await runOperation('planning', async () => {
            await updatePlanningEntryRecord(uid, entryId, {
              status: 'cancelled',
            });
          });
        },

        addGoal: async (goal) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to add a goal.');
          }

          await runOperation('goals', async () => {
            await createGoal(uid, goal);
          });
        },

        deleteGoal: async (id) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to delete a goal.');
          }

          await runOperation('goals', async () => {
            await deleteGoal(uid, id);
          });
        },

        addDebt: async (debt) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to add a debt.');
          }

          await runOperation('obligations', async () => {
            await createDebt(uid, debt);
          });
        },

        deleteDebt: async (id) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to delete a debt.');
          }

          await runOperation('obligations', async () => {
            await deleteDebt(uid, id);
          });
        },

        addInstallment: async (installment) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to add an installment.');
          }

          await runOperation('obligations', async () => {
            await createInstallment(uid, installment);
          });
        },

        deleteInstallment: async (id) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to delete an installment.');
          }

          await runOperation('obligations', async () => {
            await deleteInstallment(uid, id);
          });
        },

        addContribution: async (goalId, contribution) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to add a contribution.');
          }

          await runOperation('goals', async () => {
            await addGoalContribution(uid, goalId, contribution);
          });
        },

        addDebtPayment: async (debtId, payment) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to pay a debt.');
          }

          await runOperation('obligations', async () => {
            await addDebtPaymentRecord(uid, debtId, payment);
          });
        },

        markInstallmentPaid: async (installmentId, payment) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to pay an installment.');
          }

          await runOperation('obligations', async () => {
            await addInstallmentPayment(uid, installmentId, payment);
          });
        },

        markReminderPaid: async (reminderId, options) => {
          requireWritableSession();
          const uid = get().currentUserId;
          if (!uid) {
            throw new Error('You must be signed in to mark a reminder as paid.');
          }

          await runOperation('obligations', async () => {
            await markReminderPaidRecord(uid, reminderId, options);
          });
        },

        getTotalAssets: () => {
          const accountAssets = get().accounts.reduce((sum, account) => sum + account.balance, 0);
          const receivables = get()
            .debts.filter((debt) => debt.type === 'owed_to_me' && debt.status !== 'paid')
            .reduce((sum, debt) => sum + remainingDebtAmount(debt), 0);

          return accountAssets + receivables;
        },

        getTotalDebts: () =>
          get().debts
            .filter((debt) => debt.type === 'owed_by_me' && debt.status !== 'paid')
            .reduce((sum, debt) => sum + remainingDebtAmount(debt), 0),

        getAvailableMoney: () => get().accounts.reduce((sum, account) => sum + account.balance, 0),

        getMonthlyIncome: (month) => {
          const targetMonth = month || new Date().toISOString().slice(0, 7);
          return get()
            .transactions.filter((tx) => tx.type === 'income' && tx.date.startsWith(targetMonth))
            .reduce((sum, tx) => sum + tx.amount, 0);
        },

        getMonthlyExpenses: (month) => {
          const targetMonth = month || new Date().toISOString().slice(0, 7);
          return get()
            .transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(targetMonth))
            .reduce((sum, tx) => sum + tx.amount, 0);
        },

        getPlannerPositiveTotal: () =>
          plannerTotals({
            accounts: get().accounts,
            debts: get().debts,
            planningEntries: get().planningEntries,
            includeExpectedEntries: get().settings.planner.includeExpectedEntries,
          }).positive,

        getPlannerNegativeTotal: () =>
          plannerTotals({
            accounts: get().accounts,
            debts: get().debts,
            planningEntries: get().planningEntries,
            includeExpectedEntries: get().settings.planner.includeExpectedEntries,
          }).negative,

        getPlannerNetTotal: () =>
          plannerTotals({
            accounts: get().accounts,
            debts: get().debts,
            planningEntries: get().planningEntries,
            includeExpectedEntries: get().settings.planner.includeExpectedEntries,
          }).net,

        getPrimaryGoal: () => {
          const { goals, settings } = get();
          return goals.find((goal) => goal.id === settings.planner.primaryGoalId) || goals[0] || null;
        },

        getPrimaryGoalProgress: () => {
          const goal = get().getPrimaryGoal();
          if (!goal || goal.targetAmount <= 0) {
            return 0;
          }

          const progressAmount =
            get().settings.planner.goalProgressMode === 'manual_contributions'
              ? goal.currentAmount
              : get().getPlannerNetTotal();

          return goalProgressPercent({ goal, progressAmount });
        },

        getPrimaryGoalRemaining: () => {
          const goal = get().getPrimaryGoal();
          if (!goal) {
            return 0;
          }

          const progressAmount =
            get().settings.planner.goalProgressMode === 'manual_contributions'
              ? goal.currentAmount
              : get().getPlannerNetTotal();

          return Math.max(0, goal.targetAmount - progressAmount);
        },

        setPrimaryGoal: async (goalId) => {
          await persistSettings({
            ...get().settings,
            planner: {
              ...get().settings.planner,
              primaryGoalId: goalId,
            },
          });
        },
      };
    },
    {
      name: 'moneytrack-ui-settings',
      version: 4,
      partialize: (state) => ({
        settings: state.settings,
        sessionMode: state.sessionMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.sessionMode === 'demo') {
          state.startDemoSession();
        }
      },
    }
  )
);
