import { Dispatch } from '@reduxjs/toolkit';
import { parse } from 'json-bigint';
import { updateCurrentProposal } from '../features/MultiSignatureSlice';
import { getNow } from './timeHelpers';
import {
    MultiSignatureTransaction,
    MultiSignatureTransactionStatus,
    TimeStampUnit,
    UpdateInstruction,
    UpdateInstructionPayload,
} from './types';

/**
 * Effect for awaiting the expiration of a proposal. If the proposal expires, then the proposal
 * is set to failed and updated in the database and the state.
 * @param proposal if supplied the total list of proposals in the state will also be updated
 */
export default function expirationEffect(
    proposal: MultiSignatureTransaction,
    dispatch: Dispatch
) {
    if (proposal.status === MultiSignatureTransactionStatus.Open) {
        const updateInstruction: UpdateInstruction<UpdateInstructionPayload> = parse(
            proposal.transaction
        );
        const expiration = updateInstruction.header.timeout;

        const interval = setInterval(async () => {
            if (expiration <= BigInt(getNow(TimeStampUnit.seconds))) {
                const failedProposal = {
                    ...proposal,
                    status: MultiSignatureTransactionStatus.Failed,
                };
                await updateCurrentProposal(dispatch, failedProposal);
                clearInterval(interval);
            }
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    }
    return () => {};
}
