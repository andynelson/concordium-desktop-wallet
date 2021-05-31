import React from 'react';
import { MultiSignatureTransactionStatus, SimpleTransfer } from '~/utils/types';
import {
    withHeaderAndFooter,
    table,
    sender,
    recipient,
    totalWithdrawn,
    displayAmount,
    fee,
    standardPageFooter,
    displayStatus,
    hashRow,
    standardTableHeader,
    displayExpiry,
} from '~/utils/printUtility';
import withNames from '~/components/Transfers/withNames';

interface Props {
    transaction: SimpleTransfer;
    status: MultiSignatureTransactionStatus;
    image?: string;
    fromName?: string;
    toName?: string;
}

/**
 * Component that contains the information of a simple
 * Transfer, in a format suited for print.
 */
function PrintFormatSimpleTransfer({
    transaction,
    image,
    status,
    fromName,
    toName,
}: Props) {
    const { amount } = transaction.payload;
    const body = (
        <>
            <h1>Transaction - Send GTU</h1>
            {table(
                standardTableHeader,
                <tbody>
                    {sender(transaction.sender, fromName)}
                    {recipient(transaction.payload.toAddress, toName)}
                    {totalWithdrawn(amount, transaction)}
                    {displayAmount(amount)}
                    {fee(transaction)}
                    {displayStatus(status)}
                    {status === MultiSignatureTransactionStatus.Open &&
                        displayExpiry(transaction.expiry)}
                    {hashRow(transaction)}
                    {Boolean(image) && (
                        <tr>
                            <td>Identicon:</td>
                        </tr>
                    )}
                </tbody>
            )}
            {Boolean(image) && <img src={image} alt="" />}
        </>
    );
    return withHeaderAndFooter(
        body,
        undefined,
        standardPageFooter(transaction)
    );
}

export default withNames(PrintFormatSimpleTransfer);
