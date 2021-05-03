import React from 'react';
import { useSelector } from 'react-redux';
import Warning from '@resources/svg/warning.svg';
import { parseTime } from '~/utils/timeHelpers';
import { getGTUSymbol, displayAsGTU } from '~/utils/gtu';
import {
    TransferTransaction,
    TransactionStatus,
    OriginType,
    TransactionKindString,
    Account,
} from '~/utils/types';
import { chosenAccountSelector } from '~/features/AccountSlice';
import { viewingShieldedSelector } from '~/features/TransactionSlice';
import SidedRow from '~/components/SidedRow';
import { isFailed } from '~/utils/transactionHelpers';
import styles from './Transactions.module.scss';

function determineOutgoing(transaction: TransferTransaction, account: Account) {
    return transaction.fromAddress === account.address;
}

function getName(
    transaction: TransferTransaction,
    isOutgoingTransaction: boolean
) {
    if (isOutgoingTransaction) {
        // Current Account is the sender
        if (transaction.toAddressName !== undefined) {
            return transaction.toAddressName;
        }
        return transaction.toAddress.slice(0, 6);
    }
    if (transaction.fromAddressName !== undefined) {
        return transaction.fromAddressName;
    }
    return transaction.fromAddress.slice(0, 6);
}

function buildOutgoingAmountStrings(
    total: bigint,
    subtotal: bigint,
    fee: bigint
) {
    return {
        amount: `${displayAsGTU(total)}`,
        amountFormula: `${displayAsGTU(-BigInt(subtotal))} +${displayAsGTU(
            fee
        )} Fee`,
    };
}

function buildCostFreeAmountString(amount: bigint, negative = false) {
    const sign = negative ? -1n : 1n;
    return {
        amount: `${displayAsGTU(sign * amount)}`,
        amountFormula: '',
    };
}

function parseShieldedAmount(
    transaction: TransferTransaction,
    isOutgoingTransaction: boolean
) {
    if (transaction.decryptedAmount) {
        if (
            transaction.transactionKind ===
                TransactionKindString.TransferToEncrypted ||
            transaction.transactionKind ===
                TransactionKindString.TransferToPublic
        ) {
            return buildCostFreeAmountString(
                BigInt(transaction.decryptedAmount)
            );
        }
        if (
            transaction.transactionKind ===
            TransactionKindString.EncryptedAmountTransfer
        ) {
            return buildCostFreeAmountString(
                BigInt(transaction.decryptedAmount),
                isOutgoingTransaction
            );
        }
    } else {
        const negative = isOutgoingTransaction ? '-' : '';
        return {
            amount: `${negative} ${getGTUSymbol()} ?`,
            amountFormula: '',
        };
    }

    throw new Error(
        'Unexpected transaction type when viewing shielded balance.'
    );
}

function parseAmount(
    transaction: TransferTransaction,
    isOutgoingTransaction: boolean
) {
    switch (transaction.originType) {
        case OriginType.Self:
        case OriginType.Account:
            if (isOutgoingTransaction) {
                const cost = BigInt(transaction.cost || '0');
                return buildOutgoingAmountStrings(
                    BigInt(transaction.total),
                    BigInt(transaction.subtotal),
                    cost
                );
            }
            // incoming transaction:
            return buildCostFreeAmountString(BigInt(transaction.subtotal));

        default:
            return {
                amount: `${getGTUSymbol()} ?`,
                amountFormula: 'Parsing failed',
            };
    }
}

function displayType(kind: TransactionKindString) {
    switch (kind) {
        case TransactionKindString.TransferWithSchedule:
            return ' (schedule)';
        case TransactionKindString.TransferToEncrypted:
            return ' (Shielded)';
        case TransactionKindString.TransferToPublic:
            return ' (Unshielded)';
        default:
            return '';
    }
}

function statusSymbol(status: TransactionStatus) {
    switch (status) {
        case TransactionStatus.Pending:
            return '';
        case TransactionStatus.Committed:
            return '\u2713';
        case TransactionStatus.Finalized:
            return '\u2713\u2713';
        case TransactionStatus.Rejected:
            return '!';
        default:
            return '?';
    }
}

interface Props {
    transaction: TransferTransaction;
    onClick?: () => void;
}

/**
 * Displays the given transaction basic information.
 */
function TransactionListElement({ transaction, onClick }: Props): JSX.Element {
    const account = useSelector(chosenAccountSelector);
    const viewingShielded = useSelector(viewingShieldedSelector);
    if (!account) {
        throw new Error('Unexpected missing chosen account');
    }
    const isOutgoingTransaction = determineOutgoing(transaction, account);
    const time = parseTime(transaction.blockTime);
    const name = getName(transaction, isOutgoingTransaction);
    const amountParser = viewingShielded ? parseShieldedAmount : parseAmount;
    const { amount, amountFormula } = amountParser(
        transaction,
        isOutgoingTransaction
    );

    return (
        <div
            className={styles.transactionListElement}
            onClick={onClick}
            onKeyPress={onClick}
            tabIndex={0}
            role="button"
        >
            <SidedRow
                left={
                    <>
                        {isFailed(transaction) ? <Warning /> : null}
                        {name.concat(displayType(transaction.transactionKind))}
                    </>
                }
                right={amount}
            />
            <SidedRow
                left={`${time} ${statusSymbol(transaction.status)}`}
                right={amountFormula.concat(
                    ` ${
                        transaction.status !== TransactionStatus.Finalized
                            ? ' (Estimated)'
                            : ''
                    }`
                )}
            />
        </div>
    );
}

export default TransactionListElement;
