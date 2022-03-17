import {
    AccountBakerDetails,
    AccountDelegationDetails,
} from '@concordium/node-sdk';
import { isReduceStakePendingChange } from '@concordium/node-sdk/lib/src/accountHelpers';
import React, { PropsWithChildren } from 'react';
import Label from '~/components/Label';
import Card from '~/cross-app-components/Card';
import { displayAsCcd } from '~/utils/ccd';
import { useConsensusStatus } from '~/utils/dataHooks';
import {
    dateFromStakePendingChange,
    getFormattedDateString,
} from '~/utils/timeHelpers';
import { displayDelegationTarget } from '~/utils/transactionFlows/configureDelegation';

import styles from './StakingDetails.module.scss';

interface ValueProps<T> {
    title: string;
    value: T | undefined;
    format(v: T): string | JSX.Element;
}

function Value<T>({ title, value, format = (v) => `${v}` }: ValueProps<T>) {
    return (
        <div className="mB20">
            <Label className="mB5 textWhite">{title}:</Label>
            <span className="body2">
                {value !== undefined ? format(value) : 'N/A'}
            </span>
        </div>
    );
}

type StakingType = 'baker' | 'delegator';

interface ValuesProps<T> {
    details: T | undefined;
}

function BakerValues({ details }: ValuesProps<AccountBakerDetails>) {
    return <>{details?.bakerId}</>;
}

function DelegatorValues({ details }: ValuesProps<AccountDelegationDetails>) {
    return (
        <>
            <Value
                title="Delegation amount"
                value={details?.stakedAmount}
                format={displayAsCcd}
            />
            <Value
                title="Target pool"
                value={details?.delegationTarget}
                format={displayDelegationTarget}
            />
            <Value
                title="Rewards wil be"
                value={details?.restakeEarnings}
                format={(v) =>
                    v ? 'Added to delegation amount' : 'Added to public balance'
                }
            />
        </>
    );
}

interface DetailsText {
    titleRegistered: string;
    titleNotRegistrered: string;
    titlePendingTransaction: string;
    pendingReduce: string;
    pendingRemove: string;
}

const bakerText: DetailsText = {
    titleRegistered: 'Baker registered',
    titleNotRegistrered: 'No baker registered',
    titlePendingTransaction: 'Waiting for finalization',
    pendingReduce: 'New baker stake',
    pendingRemove:
        'Baking will be stopped, and the staked amount will be unlocked on the public balance of the account.',
};

const delegatorText: DetailsText = {
    titleRegistered: 'Delegation registered',
    titleNotRegistrered: 'No delegation registered',
    titlePendingTransaction: 'Waiting for finalization',
    pendingReduce: 'New delegation amount',
    pendingRemove:
        'The delegation will be stopped, and the delegation amount will be unlocked on the public balance of the account.',
};

type StakingDetails = AccountBakerDetails | AccountDelegationDetails;

const isBakerDetails = (
    details: StakingDetails
): details is AccountBakerDetails =>
    (details as AccountBakerDetails).bakerId !== undefined;
const isDelegationDetails = (
    details: StakingDetails
): details is AccountDelegationDetails =>
    (details as AccountDelegationDetails).delegationTarget !== undefined;

type Props = PropsWithChildren<{
    type: StakingType;
    details: StakingDetails | undefined;
    hasPendingTransaction: boolean;
}>;

export default function StakingDetails({
    details,
    type,
    hasPendingTransaction,
}: Props) {
    const cs = useConsensusStatus(true);
    const text = type === 'baker' ? bakerText : delegatorText;
    const Values = type === 'baker' ? BakerValues : DelegatorValues;

    let title = text.titleNotRegistrered;
    if (hasPendingTransaction) {
        title = text.titlePendingTransaction;
    } else if (details !== undefined) {
        title = text.titleRegistered;
    }

    if (
        details !== undefined &&
        ((type === 'baker' && isDelegationDetails(details)) ||
            (type === 'delegator' && isBakerDetails(details)))
    ) {
        throw new Error('Wrong type for details given to component');
    }

    const pendingChangeDate =
        details?.pendingChange !== undefined
            ? dateFromStakePendingChange(details.pendingChange, cs)
            : undefined;

    return (
        <Card className={styles.root} dark>
            <header className={styles.header}>
                <h2 className="mB0">{title}</h2>
            </header>
            {/* We already know here, that the type prop and the details type match. */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Values details={details as any} />
            {details?.pendingChange !== undefined &&
                pendingChangeDate !== undefined && (
                    <div className={styles.pending}>
                        <div className="textWhite mB20">
                            The following changes will take effect on
                            <br />
                            {getFormattedDateString(pendingChangeDate)}
                        </div>
                        {isReduceStakePendingChange(details.pendingChange) ? (
                            <Value
                                title={text.pendingReduce}
                                value={details.pendingChange.newStake}
                                format={displayAsCcd}
                            />
                        ) : (
                            <span className="mB20">{text.pendingRemove}</span>
                        )}
                    </div>
                )}
        </Card>
    );
}
