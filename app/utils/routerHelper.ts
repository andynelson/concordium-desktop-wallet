import routes from '../constants/routes.json';
// eslint-disable-next-line import/no-cycle
import { ExportKeyType } from '~/pages/multisig/menu/ExportKeyList';
import {
    TransactionTypes,
    MultiSignatureTransaction,
    instanceOfUpdateInstruction,
    UpdateType,
    TransactionKindId,
} from './types';
import { parse } from './JSONHelper';

export const selectedAddressBookEntryRoute = (address: string) =>
    routes.ADDRESSBOOK_SELECTED.replace(':address', address);

export const selectedProposalRoute = (proposal: MultiSignatureTransaction) => {
    const transaction = parse(proposal.transaction);
    let route;
    if (instanceOfUpdateInstruction(transaction)) {
        route = routes.MULTISIGTRANSACTIONS_PROPOSAL_EXISTING_SELECTED;
    } else {
        route =
            routes.MULTISIGTRANSACTIONS_PROPOSAL_EXISTING_ACCOUNT_TRANSACTION;
    }
    return route.replace(':id', `${proposal.id}`);
};

export function selectedExportKeyRoute(keyType: string) {
    if (keyType === ExportKeyType.Credential) {
        return routes.GENERATE_CREDENTIAL;
    }
    return routes.MULTISIGTRANSACTIONS_EXPORT_KEY.replace(':keyType', keyType);
}

export function createProposalRoute(
    transactionType: TransactionTypes,
    specificType: UpdateType | TransactionKindId
) {
    if (transactionType === TransactionTypes.UpdateInstruction) {
        return routes.MULTISIGTRANSACTIONS_PROPOSAL.replace(
            ':updateType',
            `${specificType}`
        );
    }
    return {
        pathname: routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION,
        state: specificType,
    };
}
