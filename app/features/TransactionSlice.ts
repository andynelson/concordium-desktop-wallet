import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store/store';
import { getTransactions } from '../utils/httpRequests';
import { decryptAmounts } from '../utils/rustInterface';
import {
    getTransactionsOfAccount,
    insertTransactions,
    updateTransaction,
} from '../database/TransactionDao';
import {
    TransferTransaction,
    TransactionStatus,
    TransactionKindString,
    Account,
    AccountTransaction,
    Dispatch,
    TransactionEvent,
    Global,
    RewardFilter,
} from '../utils/types';
import {
    attachNames,
    isSuccessfulTransaction,
} from '../utils/transactionHelpers';
import {
    convertIncomingTransaction,
    convertAccountTransaction,
} from '../utils/TransactionConverters';
// eslint-disable-next-line import/no-cycle
import { updateMaxTransactionId } from './AccountSlice';
import AbortController from '~/utils/AbortController';
import { RejectReason } from '~/utils/node/RejectReasonHelper';

const updateTransactionInterval: 5000;

interface State {
    transactions: TransferTransaction[];
    viewingShielded: boolean;
}

const transactionSlice = createSlice({
    name: 'transactions',
    initialState: {
        transactions: [],
        viewingShielded: false,
    } as State,
    reducers: {
        setTransactions(state, transactions) {
            state.transactions = transactions.payload;
        },
        setViewingShielded(state, viewingShielded) {
            state.viewingShielded = viewingShielded.payload;
        },
        updateTransactionFields(state, update) {
            const { hash, updatedFields } = update.payload;
            const index = state.transactions.findIndex(
                (transaction) => transaction.transactionHash === hash
            );
            if (index > -1) {
                state.transactions[index] = {
                    ...state.transactions[index],
                    ...updatedFields,
                };
            }
        },
    },
});

export const { setViewingShielded } = transactionSlice.actions;

const { setTransactions, updateTransactionFields } = transactionSlice.actions;

// Decrypts the encrypted transfers in the given transacion list, using the prfKey.
// This function expects the prfKey to match the account's prfKey,
// and that the account is the receiver of the transactions.
export async function decryptTransactions(
    transactions: TransferTransaction[],
    prfKey: string,
    credentialNumber: number,
    global: Global
) {
    const encryptedTransfers = transactions.filter(
        (t) =>
            t.transactionKind ===
                TransactionKindString.EncryptedAmountTransfer &&
            t.decryptedAmount === null
    );

    if (encryptedTransfers.length > 0) {
        return Promise.resolve();
    }

    const encryptedAmounts = encryptedTransfers.map((t) => {
        if (!t.encrypted) {
            throw new Error('Unexpected missing field');
        }
        return JSON.parse(t.encrypted).encryptedAmount;
    });

    const decryptedAmounts = await decryptAmounts(
        encryptedAmounts,
        credentialNumber,
        global,
        prfKey
    );

    return Promise.all(
        encryptedTransfers.map(async (transaction, index) =>
            updateTransaction(
                { id: transaction.id },
                {
                    decryptedAmount: decryptedAmounts[index],
                }
            )
        )
    );
}

/**
 * Determine whether the transaction affects unshielded balance.
 */
function filterUnShieldedBalanceTransaction(transaction: TransferTransaction) {
    switch (transaction.transactionKind) {
        case TransactionKindString.Transfer:
        case TransactionKindString.BakingReward:
        case TransactionKindString.FinalizationReward:
        case TransactionKindString.BlockReward:
        case TransactionKindString.TransferWithSchedule:
        case TransactionKindString.TransferToEncrypted:
        case TransactionKindString.TransferToPublic:
            return true;
        default:
            return false;
    }
}

/**
 * Determine whether the transaction affects shielded balance.
 */
function filterShieldedBalanceTransaction(transaction: TransferTransaction) {
    switch (transaction.transactionKind) {
        case TransactionKindString.EncryptedAmountTransfer:
        case TransactionKindString.TransferToEncrypted:
        case TransactionKindString.TransferToPublic:
            return true;
        default:
            return false;
    }
}

// Load transactions from storage.
// Filters according to viewingShielded parameter
export async function loadTransactions(account: Account, dispatch: Dispatch) {
    let filteredTypes: TransactionKindString[] = [];

    if (account.rewardFilter === RewardFilter.AllButFinalization) {
        filteredTypes = [TransactionKindString.FinalizationReward];
    } else if (account.rewardFilter === RewardFilter.None) {
        filteredTypes = [
            TransactionKindString.BakingReward,
            TransactionKindString.BlockReward,
            TransactionKindString.FinalizationReward,
        ];
    }

    let transactions = await getTransactionsOfAccount(
        account,
        'id',
        filteredTypes
    );

    transactions = await attachNames(transactions);
    dispatch(setTransactions(transactions));
}

async function fetchTransactions(address: string, currentMaxId: number) {
    const { transactions, full } = await getTransactions(address, currentMaxId);

    const newMaxId = transactions.reduce((id, t) => Math.max(id, t.id), 0);
    const isFinished = !full;

    await insertTransactions(
        transactions.map((transaction) =>
            convertIncomingTransaction(transaction, address)
        )
    );
    return { newMaxId, isFinished };
}

// Update the transactions from remote source.
// will fetch transactions in intervals, updating the state each time.
// stops when it reaches the newest transaction, or it is told to abort by the controller.
export async function updateTransactions(
    dispatch: Dispatch,
    account: Account,
    controller: AbortController
) {
    let maxId = account.maxTransactionId || 0;
    let finished = false;

    let result = await fetchTransactions(account.address, maxId);

    if (maxId !== result.newMaxId) {
        maxId = result.newMaxId;
        await updateMaxTransactionId(dispatch, account.address, maxId);
        await loadTransactions(account, dispatch);
    }

    if (result.isFinished) {
        return;
    }

    const interval = setInterval(async () => {
        if (finished || controller.isAborted) {
            controller.finish();
            clearInterval(interval);
        } else {
            result = await fetchTransactions(account.address, maxId);
            maxId = result.newMaxId;
            finished = result.isFinished;
            await updateMaxTransactionId(dispatch, account.address, maxId);
            await loadTransactions(account, dispatch);
        }
    }, updateTransactionInterval);
}

// Add a pending transaction to storage
export async function addPendingTransaction(
    transaction: AccountTransaction,
    hash: string
) {
    const convertedTransaction = await convertAccountTransaction(
        transaction,
        hash
    );
    return insertTransactions([convertedTransaction]);
}

// Set the transaction's status to confirmed, update the cost and whether it succeded.
// TODO: update Total to reflect change in cost.
export async function confirmTransaction(
    dispatch: Dispatch,
    transactionHash: string,
    outcomeRecord: Record<string, TransactionEvent>
) {
    const outcomes = Object.values(outcomeRecord);
    const success = isSuccessfulTransaction(outcomes);
    const cost = outcomes.reduce(
        (accu, event) => accu + parseInt(event.cost, 10),
        0
    );
    let rejectReason;
    if (!success) {
        const failure = outcomes.find(
            (event) => event.result.outcome !== 'success'
        );
        if (!failure) {
            throw new Error('Missing failure for unsuccessful transaction');
        }
        if (!failure.result) {
            throw new Error('Missing failure result');
        }
        if (!failure.result.rejectReason) {
            throw new Error('Missing rejection reason in failure result');
        }

        rejectReason =
            RejectReason[
                failure.result.rejectReason.tag as keyof typeof RejectReason
            ];
        if (rejectReason === undefined) {
            // If the reject reason was not known, then just store it directly as a string anyway.
            rejectReason = failure.result.rejectReason.tag;
        }
    }

    const update = {
        status: TransactionStatus.Finalized,
        cost: cost.toString(),
        success,
        rejectReason,
    };
    updateTransaction({ transactionHash }, update);
    return dispatch(
        updateTransactionFields({
            hash: transactionHash,
            updatedFields: update,
        })
    );
}

// Set the transaction's status to rejected.
export async function rejectTransaction(
    dispatch: Dispatch,
    transactionHash: string
) {
    const status = { status: TransactionStatus.Rejected };
    updateTransaction({ transactionHash }, status);
    return dispatch(
        updateTransactionFields({
            hash: transactionHash,
            updatedFields: status,
        })
    );
}

export const transactionsSelector = (state: RootState) => {
    const filter = state.transactions.viewingShielded
        ? filterShieldedBalanceTransaction
        : filterUnShieldedBalanceTransaction;
    return state.transactions.transactions.filter(filter);
};

export const viewingShieldedSelector = (state: RootState) =>
    state.transactions.viewingShielded;

export default transactionSlice.reducer;
