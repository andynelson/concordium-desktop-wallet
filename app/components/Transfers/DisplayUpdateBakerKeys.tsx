import React from 'react';
import { useRouteMatch } from 'react-router';
import { UpdateBakerKeys } from '~/utils/types';
import DisplayEstimatedFee from '~/components/DisplayEstimatedFee';
import { useAccountName } from '~/utils/dataHooks';
import PublicKey from '~/pages/multisig/common/PublicKey/PublicKey';
import DisplayTransactionExpiryTime from '../DisplayTransactionExpiryTime/DisplayTransactionExpiryTime';
import { dateFromTimeStamp } from '~/utils/timeHelpers';
import DisplayAddress from '../DisplayAddress';
import routes from '~/constants/routes.json';

import styles from './transferDetails.module.scss';

interface Props {
    transaction: UpdateBakerKeys;
}

/**
 * Displays an overview of an Update-Baker-Keys-Transaction.
 */
export default function DisplayUpdateBakerKeys({ transaction }: Props) {
    const senderName = useAccountName(transaction.sender);
    const isSingleSig = useRouteMatch(routes.SUBMITTRANSFER);

    return (
        <>
            <p className={styles.title}>From Account:</p>
            <p className={styles.name}>{senderName}</p>
            <DisplayAddress
                address={transaction.sender}
                lineClassName={styles.address}
            />
            <DisplayEstimatedFee estimatedFee={transaction.estimatedFee} />
            <p className={styles.title}>Public keys:</p>
            <PublicKey
                name="Election verify key"
                publicKey={transaction.payload.electionVerifyKey}
            />
            <PublicKey
                name="Signature verify key"
                publicKey={transaction.payload.signatureVerifyKey}
            />
            <PublicKey
                name="Aggregation verify key"
                publicKey={transaction.payload.aggregationVerifyKey}
            />
            {Boolean(isSingleSig) || (
                <DisplayTransactionExpiryTime
                    expiryTime={dateFromTimeStamp(transaction.expiry)}
                />
            )}
        </>
    );
}
