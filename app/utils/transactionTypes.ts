import { Authorization, Authorizations, BlockSummary } from './NodeApiTypes';
import {
    MultiSignatureTransaction,
    UpdateInstruction,
    UpdateInstructionPayload,
    AddressBookEntry,
    Word8,
    AccountTransaction,
    TransactionPayload,
    UpdateInstructionSignature,
} from './types';

export interface TransactionInput {
    transaction: string;
    type: string;
}

/**
 * The Props interface used by components for handling parameter update
 * transactions.
 */
export interface UpdateProps {
    blockSummary: BlockSummary;
    effectiveTime: bigint | undefined;
    setProposal: React.Dispatch<
        React.SetStateAction<Partial<MultiSignatureTransaction> | undefined>
    >;
    setDisabled: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * The interface contains the location state used by components
 *  for handling the flows to create transfers.
 */
export interface TransferState {
    amount: string;
    transaction: string;
    recipient: AddressBookEntry;
    initialPage: string;
}

export type UpdateComponent = (props: UpdateProps) => JSX.Element | null;

/**
 * Interface definition for a class that handles a specific type
 * of transaction. The handler can serialize and sign the transaction,
 * and generate a view of the transaction.
 * TODO: Decide whether this handler is only for updateInstruction, or make it support account transactions
 */
export type TransactionHandler<T, S> =
    | UpdateInstructionHandler<T, S>
    | AccountTransactionHandler<T, S>;

/**
 * Interface definition for a class that handles a specific type
 * of transaction. The handler can serialize and sign the transaction,
 * and generate a view of the transaction.
 * TODO: Decide whether this handler is only for updateInstruction, or make it support account transactions
 */
export interface UpdateInstructionHandler<T, S> {
    confirmType: (
        transaction: UpdateInstruction<UpdateInstructionPayload>
    ) => T;
    serializePayload: (transaction: T) => Buffer;
    signTransaction: (transaction: T, signer: S) => Promise<Buffer>;
    view: (transaction: T) => JSX.Element;
    getAuthorization: (authorizations: Authorizations) => Authorization;
    update: UpdateComponent;
    title: string;
}

/**
 * Interface definition for a class that handles a specific type
 * of transaction. The handler can serialize and sign the transaction,
 * and generate a view of the transaction.
 * TODO: Fix Description
 */
export interface AccountTransactionHandler<T, S> {
    confirmType: (transaction: AccountTransaction<TransactionPayload>) => T;
    serializePayload: (transaction: T) => Buffer;
    signTransaction: (transaction: T, signer: S) => Promise<Buffer>;
    view: (transaction: T) => JSX.Element;
    title: string;
}

// An actual signature, which goes into an account transaction.
export type Signature = Buffer;

type KeyIndex = Word8;
// Signatures from a single credential, for an AccountTransaction
export type TransactionCredentialSignature = Record<KeyIndex, Signature>;

type CredentialIndex = Word8;
// The signature of an account transaction.
export type TransactionAccountSignature = Record<
    CredentialIndex,
    TransactionCredentialSignature
>;

export function instanceOfUpdateInstructionSignature(
    object: TransactionCredentialSignature | UpdateInstructionSignature
): object is UpdateInstructionSignature {
    return 'signature' in object && 'authorizationKeyIndex' in object;
}

export interface AccountTransactionWithSignature<
    PayloadType extends TransactionPayload = TransactionPayload
> extends AccountTransaction<PayloadType> {
    signature: TransactionAccountSignature;
}
