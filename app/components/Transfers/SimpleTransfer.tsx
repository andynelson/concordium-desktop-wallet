import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { stringify } from '../../utils/JSONHelper';
import routes from '../../constants/routes.json';
import {
    AddressBookEntry,
    Account,
    TransactionKindId,
    Fraction,
} from '../../utils/types';
import { toMicroUnits } from '../../utils/gtu';
import locations from '../../constants/transferLocations.json';
import { createSimpleTransferTransaction } from '../../utils/transactionHelpers';
import ExternalTransfer from '~/components/Transfers/ExternalTransfer';

import { getTransactionKindCost } from '~/utils/transactionCosts';
import SimpleErrorModal from '~/components/SimpleErrorModal';
import ensureExchangeRateAndNonce from '~/components/Transfers/ensureExchangeRateAndNonce';

interface Props {
    account: Account;
    exchangeRate: Fraction;
    nonce: string;
}

/**
 * Controls the flow of creating a simple transfer.
 */
function SimpleTransfer({ account, exchangeRate, nonce }: Props) {
    const dispatch = useDispatch();

    const [error, setError] = useState<string | undefined>();
    const [estimatedFee, setEstimatedFee] = useState<Fraction | undefined>();

    useEffect(() => {
        getTransactionKindCost(TransactionKindId.Simple_transfer, exchangeRate)
            .then((transferCost) => setEstimatedFee(transferCost))
            .catch((e) =>
                setError(`Unable to get transaction cost due to: ${e}`)
            );
    }, [setEstimatedFee]);

    const toConfirmTransfer = useCallback(
        async (amount: string, recipient: AddressBookEntry) => {
            if (!recipient) {
                throw new Error('Unexpected missing recipient');
            }

            const transaction = await createSimpleTransferTransaction(
                account.address,
                toMicroUnits(amount),
                recipient.address,
                nonce
            );
            transaction.estimatedFee = estimatedFee;

            dispatch(
                push({
                    pathname: routes.SUBMITTRANSFER,
                    state: {
                        confirmed: {
                            pathname: routes.ACCOUNTS_SIMPLETRANSFER,
                            state: {
                                initialPage: locations.transferSubmitted,
                                transaction: stringify(transaction),
                                recipient,
                            },
                        },
                        cancelled: {
                            pathname: routes.ACCOUNTS_SIMPLETRANSFER,
                            state: {
                                initialPage: locations.pickAmount,
                                amount,
                                recipient,
                            },
                        },
                        transaction: stringify(transaction),
                        account,
                    },
                })
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(account), estimatedFee]
    );

    return (
        <>
            <SimpleErrorModal
                show={Boolean(error)}
                content={error}
                onClick={() => dispatch(push(routes.ACCOUNTS))}
            />
            <ExternalTransfer
                estimatedFee={estimatedFee}
                toConfirmTransfer={toConfirmTransfer}
                exitFunction={() => dispatch(push(routes.ACCOUNTS))}
                amountHeader="Send GTU"
                senderAddress={account.address}
                transactionKind={TransactionKindId.Simple_transfer}
            />
        </>
    );
}

export default ensureExchangeRateAndNonce(SimpleTransfer);
