import React from 'react';
import {
    Account,
    Identity,
    AddressBookEntry,
    TransactionKindId,
    Schedule,
    Fraction,
} from '~/utils/types';
import DisplayEstimatedFee from '~/components/DisplayEstimatedFee';
import ScheduleList from '~/components/ScheduleList';
import { AccountDetail, AmountDetail, Details, PlainDetail } from './shared';

interface Props {
    transactionType:
        | TransactionKindId.Simple_transfer
        | TransactionKindId.Transfer_with_schedule;
    account?: Account;
    identity?: Identity;
    amount?: string;
    recipient?: AddressBookEntry;
    schedule?: Schedule;
    estimatedFee?: Fraction;
}

export default function TransferProposalDetails({
    identity,
    account,
    amount,
    recipient,
    schedule,
    transactionType,
    estimatedFee,
}: Props) {
    const isScheduledTransfer =
        transactionType === TransactionKindId.Transfer_with_schedule;

    return (
        <Details>
            <PlainDetail title="Identity" value={identity?.name} />
            <AccountDetail title="Account" value={account} />
            <AmountDetail title="Amount" value={amount} />
            <DisplayEstimatedFee estimatedFee={estimatedFee} />
            <AccountDetail title="Recipient" value={recipient} />
            {isScheduledTransfer ? (
                <PlainDetail
                    title="Release Schedule"
                    value={schedule}
                    format={(s) => <ScheduleList schedule={s} />}
                />
            ) : null}
            <br />
        </Details>
    );
}
