import {
    TransferTransaction,
    TransactionStatus,
    TransactionKindString,
    OriginType,
    AccountTransaction,
    IncomingTransaction,
    SimpleTransfer,
    instanceOfSimpleTransfer,
    ScheduledTransfer,
    instanceOfScheduledTransfer,
    TransferToEncrypted,
    instanceOfTransferToEncrypted,
    instanceOfTransferToPublic,
    TransferToPublic,
} from './types';
import { getScheduledTransferAmount } from './transactionHelpers';
import { collapseFraction } from './basicHelpers';

/*
 * Converts the given transaction into the structure, which is used in the database.
 */
export function convertIncomingTransaction(
    transaction: IncomingTransaction,
    accountAddress: string
): TransferTransaction {
    const transactionKind = transaction.details.type;
    const originType = transaction.origin.type;

    let fromAddress = '';
    if (transaction.details.transferSource) {
        fromAddress = transaction.details.transferSource;
    } else if (
        originType === OriginType.Account &&
        transaction.origin.address
    ) {
        fromAddress = transaction.origin.address;
    } else if (originType === OriginType.Self) {
        fromAddress = accountAddress;
    }

    let toAddress = '';
    if (transaction.details.transferDestination) {
        toAddress = transaction.details.transferDestination;
    }
    let encrypted;
    if (transaction.encrypted) {
        encrypted = JSON.stringify(transaction.encrypted);
    }

    const success = transaction.details.outcome === 'success';

    let { subtotal } = transaction;

    if (!success) {
        subtotal = subtotal || '0';
    } else if (!subtotal) {
        subtotal = (
            BigInt(transaction.total) - BigInt(transaction.cost || '0')
        ).toString();
    }
    if (BigInt(subtotal) < 0n) {
        subtotal = (-BigInt(subtotal)).toString();
    }

    let decryptedAmount;
    if (
        [
            TransactionKindString.TransferToEncrypted,
            TransactionKindString.TransferToPublic,
        ].includes(transactionKind)
    ) {
        // The subtotal is always non-negative;
        const value = BigInt(subtotal);
        if (transactionKind === TransactionKindString.TransferToEncrypted) {
            // transfer to encrypted increases the decryptedAmount;
            decryptedAmount = value.toString();
        }
        if (transactionKind === TransactionKindString.TransferToPublic) {
            // transfer to encrypted decreases the decryptedAmount;
            decryptedAmount = (-value).toString();
        }
    }

    return {
        remote: true,
        originType,
        transactionKind,
        id: transaction.id,
        blockHash: transaction.blockHash,
        blockTime: transaction.blockTime,
        success,
        transactionHash: transaction.transactionHash,
        subtotal,
        cost: transaction.cost,
        origin: JSON.stringify(transaction.origin),
        details: JSON.stringify(transaction.details),
        encrypted,
        decryptedAmount,
        fromAddress,
        toAddress,
        rejectReason: transaction.details.rawRejectReason?.tag,
        status: TransactionStatus.Finalized,
    };
}

// Return type for the functions for specific transaction types
type TypeSpecific = Pick<
    TransferTransaction,
    | 'transactionKind'
    | 'subtotal'
    | 'schedule'
    | 'toAddress'
    | 'decryptedAmount'
>;

// Helper function for converting Account Transaction to TransferTransaction.
// Handles the fields of a simple transfer, which cannot be converted by the generic function .
function convertSimpleTransfer(transaction: SimpleTransfer): TypeSpecific {
    const amount = BigInt(transaction.payload.amount);

    return {
        transactionKind: TransactionKindString.Transfer,
        subtotal: amount.toString(),
        toAddress: transaction.payload.toAddress,
    };
}

// Helper function for converting Account Transaction to TransferTransaction.
// Handles the fields of a transfer to encrypted, which cannot be converted by the generic function .
function convertTransferToEncrypted(
    transaction: TransferToEncrypted
): TypeSpecific {
    const amount = BigInt(transaction.payload.amount);

    return {
        transactionKind: TransactionKindString.TransferToEncrypted,
        subtotal: amount.toString(),
        decryptedAmount: amount.toString(),
        toAddress: transaction.sender,
    };
}

// Helper function for converting Account Transaction to TransferTransaction.
// Handles the fields of a transfer to public, which cannot be converted by the generic function .
function convertTransferToPublic(transaction: TransferToPublic): TypeSpecific {
    const amount = BigInt(transaction.payload.transferAmount);

    return {
        transactionKind: TransactionKindString.TransferToPublic,
        subtotal: amount.toString(),
        decryptedAmount: (-amount).toString(),
        toAddress: transaction.sender,
    };
}

// Helper function for converting Account Transaction to TransferTransaction.
// Handles the fields of a scheduled transfer, which cannot be converted by the generic function .
function convertScheduledTransfer(
    transaction: ScheduledTransfer
): TypeSpecific {
    const amount = getScheduledTransferAmount(transaction);

    return {
        transactionKind: TransactionKindString.TransferWithSchedule,
        subtotal: amount.toString(),
        schedule: JSON.stringify(transaction.payload.schedule),
        toAddress: transaction.payload.toAddress,
    };
}

/**
 * Converts an Account Transaction, so that it fits local Transfer Transaction model and
 * can be entered into the local database.
 */
export async function convertAccountTransaction(
    transaction: AccountTransaction,
    hash: string
): Promise<TransferTransaction> {

    if (!transaction.estimatedFee) {
        throw new Error('unexpected estimated fee');
    }

    const cost = collapseFraction(transaction.estimatedFee);

    let typeSpecific;
    if (instanceOfSimpleTransfer(transaction)) {
        typeSpecific = convertSimpleTransfer(transaction);
    } else if (instanceOfScheduledTransfer(transaction)) {
        typeSpecific = convertScheduledTransfer(transaction);
    } else if (instanceOfTransferToEncrypted(transaction)) {
        typeSpecific = convertTransferToEncrypted(transaction);
    } else if (instanceOfTransferToPublic(transaction)) {
        typeSpecific = convertTransferToPublic(transaction);
    } else {
        throw new Error('unsupported transaction type - please implement');
    }

    return {
        blockHash: 'pending',
        remote: false,
        originType: OriginType.Self,
        transactionHash: hash,
        cost: cost.toString(),
        fromAddress: transaction.sender,
        blockTime: (Date.now() / 1000).toString(), // Temporary value, unless it fails
        status: TransactionStatus.Pending,
        ...typeSpecific,
    };
}
