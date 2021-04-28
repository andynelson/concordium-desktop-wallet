import { AccountPathInput } from '~/features/ledger/Path';
import ConcordiumLedgerClient from '~/features/ledger/ConcordiumLedgerClient';
import {
    CreateTransactionInput,
    AccountTransactionHandler,
} from '~/utils/transactionTypes';
import {
    MultiSignatureTransactionStatus,
    AccountTransaction,
    instanceOfAccountTransaction,
    Transaction,
} from '~/utils/types';

export default class AccountHandlerTypeMiddleware<T extends AccountTransaction>
    implements
        AccountTransactionHandler<
            AccountTransaction,
            ConcordiumLedgerClient,
            Transaction
        > {
    base: AccountTransactionHandler<T, ConcordiumLedgerClient>;

    creationLocationHandler: (currentLocation: string) => string;

    title: string;

    type: string;

    constructor(base: AccountTransactionHandler<T, ConcordiumLedgerClient>) {
        this.base = base;
        this.title = base.title;
        this.creationLocationHandler = base.creationLocationHandler;
        this.type = base.type;
    }

    confirmType(transaction: Transaction) {
        if (instanceOfAccountTransaction(transaction)) {
            return transaction;
        }
        throw Error('Invalid transaction type was given as input.');
    }

    serializePayload(transaction: AccountTransaction) {
        return this.base.serializePayload(this.base.confirmType(transaction));
    }

    signTransaction(
        transaction: AccountTransaction,
        ledger: ConcordiumLedgerClient,
        path: AccountPathInput
    ) {
        return this.base.signTransaction(
            this.base.confirmType(transaction),
            ledger,
            path
        );
    }

    createTransaction(input: Partial<CreateTransactionInput>) {
        return this.base.createTransaction(input);
    }

    view(transaction: AccountTransaction) {
        return this.base.view(this.base.confirmType(transaction));
    }

    print(
        transaction: Transaction,
        status: MultiSignatureTransactionStatus,
        identiconImage?: string
    ) {
        return this.base.print(
            this.confirmType(transaction),
            status,
            identiconImage
        );
    }
}
