import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { LocationDescriptorObject } from 'history';
import { parse, stringify } from '../../utils/JsonBuffer';
import { hashSha256 } from '../../utils/serializationHelpers';
import routes from '../../constants/routes.json';
import {
    MultiSignatureTransaction,
    TransactionHandler,
    UpdateInstruction,
    UpdateInstructionPayload,
} from '../../utils/types';
import { insert } from '../../database/MultiSignatureProposalDao';
import { setCurrentProposal } from '../../features/MultiSignatureSlice';
import GenericSignTransactionProposalView from './GenericSignTransactionProposalView';
import ConcordiumLedgerClient from '../../features/ledger/ConcordiumLedgerClient';
import { createTransactionHandler } from '../../utils/UpdateInstructionHelper';
import { serializeUpdateInstructionHeaderAndPayload } from '../../utils/UpdateSerialization';

interface Props {
    location: LocationDescriptorObject<string>;
}

/**
 * Component that displays an overview of a  multi signature transaction
 * proposal that is to be signed before being generated and persisted
 * to the database.
 */
export default function SignTransactionProposalView({ location }: Props) {
    const [transactionHash, setTransactionHash] = useState<string>();

    if (!location.state) {
        throw new Error(
            'No transaction handler was found. An invalid transaction has been received.'
        );
    }

    const multiSignatureTransaction: MultiSignatureTransaction = parse(
        location.state
    );
    const { transaction } = multiSignatureTransaction;
    const type = 'UpdateInstruction';

    const [transactionHandler] = useState<
        TransactionHandler<
            UpdateInstruction<UpdateInstructionPayload>,
            ConcordiumLedgerClient
        >
    >(() => createTransactionHandler({ transaction, type }));

    const dispatch = useDispatch();

    // TODO Add support for account transactions.
    const updateInstruction: UpdateInstruction<UpdateInstructionPayload> = parse(
        transaction
    );

    useEffect(() => {
        const serialized = serializeUpdateInstructionHeaderAndPayload(
            transactionHandler.transaction,
            transactionHandler.serializePayload()
        );
        const hashed = hashSha256(serialized).toString('hex');
        setTransactionHash(hashed);
    }, [setTransactionHash, transactionHandler]);

    async function signingFunction(ledger: ConcordiumLedgerClient) {
        const signatureBytes = await transactionHandler.signTransaction(ledger);
        const signature = signatureBytes.toString('hex');

        // Add signature
        updateInstruction.signatures = [signature];

        const updatedMultiSigTransaction = {
            ...multiSignatureTransaction,
            transaction: stringify(updateInstruction),
        };

        // Save to database and use the assigned id to update the local object.
        const entryId = (await insert(updatedMultiSigTransaction))[0];
        updatedMultiSigTransaction.id = entryId;

        // Set the current proposal in the state to the one that was just generated.
        dispatch(setCurrentProposal(updatedMultiSigTransaction));

        // Navigate to the page that displays the current proposal from the state.
        dispatch(push(routes.MULTISIGTRANSACTIONS_PROPOSAL_EXISTING));
    }

    if (!transactionHash) {
        return null;
    }

    return (
        <GenericSignTransactionProposalView
            transaction={transaction}
            transactionHash={transactionHash}
            signFunction={signingFunction}
            checkboxes={['The transaction details are correct']}
            signText="Sign"
        />
    );
}
