import React from 'react';
import { Header } from 'semantic-ui-react';
import { getNow, getISOFormat } from '../utils/timeHelpers';
import {
    TimeStampUnit,
    UpdateInstruction,
    UpdateInstructionPayload,
} from '../utils/types';
import findHandler from '../utils/updates/HandlerFinder';

interface Props {
    transaction: UpdateInstruction<UpdateInstructionPayload>;
}

/**
 * Component that displays the details of an UpdateInstruction in a human readable way.
 * @param {UpdateInstruction} transaction: The transaction, which details is displayed.
 */
export default function UpdateInstructionDetails({ transaction }: Props) {
    const handler = findHandler(transaction.type);

    let effectiveTimeComponent;
    // TODO Note that it is the timeoute/expiration that we react on as that is always prior to the
    // effective time. This makes sense currently as the expiration is always 1 second earlier than the
    // effective time, but that might not be the case we end up with. If we change that, then this
    // should be reconsidered.
    if (transaction.header.timeout <= getNow(TimeStampUnit.seconds)) {
        effectiveTimeComponent = (
            <>
                <Header color="red">Effective time</Header>
                {getISOFormat(transaction.header.effectiveTime.toString())}
                <Header color="red" size="small">
                    The transaction has expired
                </Header>
            </>
        );
    } else {
        effectiveTimeComponent = (
            <>
                <Header>Effective time</Header>
                {getISOFormat(transaction.header.effectiveTime.toString())}
            </>
        );
    }

    return (
        <>
            {handler.view(transaction)}
            {effectiveTimeComponent}
        </>
    );
}
