import { ConfigureBakerPayload } from '@concordium/web-sdk';
import { ExchangeRate } from '~/components/Transfers/withExchangeRate';
import { multiplyFraction } from '../basicHelpers';
import { createConfigureBakerTransaction } from '../transactionHelpers';
import { Fraction, NotOptional, Account, ConfigureBaker } from '../types';

export type BakerSuspensionDependencies = NotOptional<ExchangeRate>;

export interface BakerSuspensionFlowState {
    confirm: undefined;
}

export type BakerSuspensionPayload = NotOptional<
    Pick<ConfigureBakerPayload, 'suspended'>
>;

export const bakerSuspensionTitle = (suspended: boolean) =>
    suspended ? 'Resume validation' : 'Suspend validation';

export const convertToBakerSuspensionTransaction = (
    account: Account,
    nonce: bigint,
    exchangeRate: Fraction
) => (suspended: boolean, expiry?: Date): ConfigureBaker => {
    const payload: BakerSuspensionPayload = {
        suspended,
    };

    const transaction = createConfigureBakerTransaction(
        account.address,
        payload,
        nonce,
        account.signatureThreshold,
        expiry
    );
    transaction.estimatedFee = multiplyFraction(
        exchangeRate,
        transaction.energyAmount
    );

    return transaction;
};
