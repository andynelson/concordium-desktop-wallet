import { useEffect, useMemo, useState } from 'react';
import { isBlockSummaryV1 } from '@concordium/node-sdk/lib/src/blockSummaryHelpers';
import { isRewardStatusV1 } from '@concordium/node-sdk/lib/src/rewardStatusHelpers';
import { isBakerAccount } from '@concordium/node-sdk/lib/src/accountHelpers';
import { BlockSummaryV1 } from '@concordium/node-sdk';
import { useDispatch, useSelector } from 'react-redux';
import { getAccount } from '~/database/AccountDao';
import { BlockSummary, ConsensusStatus } from '~/node/NodeApiTypes';
import { getConsensusStatus } from '~/node/nodeRequests';
import {
    fetchLastFinalizedIdentityProviders,
    fetchLastFinalizedBlockSummary,
    getAccountInfoOfAddress,
    fetchLastFinalizedAnonymityRevokers,
    getRewardStatusLatest,
} from '../node/nodeHelpers';
import { useCurrentTime, useAsyncMemo } from './hooks';
import {
    epochDate,
    getDefaultExpiry,
    getEpochIndexAt,
    isFutureDate,
} from './timeHelpers';
import { getTransactionKindCost } from './transactionCosts';
import { lookupName } from './addressBookHelpers';
import {
    AccountInfo,
    Amount,
    Fraction,
    TransactionKindId,
    Account,
    IpInfo,
    ArInfo,
} from './types';
import { noOp } from './basicHelpers';
import { RootState } from '~/store/store';
import { setBlockSummary, setConsensusStatus } from '~/features/ChainDataSlice';

/** Hook for looking up an account name from an address */
export function useAccountName(address: string) {
    const [name, setName] = useState<string | undefined>();
    useEffect(() => {
        lookupName(address)
            .then(setName)
            .catch(() => {}); // lookupName will only reject if there is a problem with the database. In that case we ignore the error and just display the address only.
    }, [address]);
    return name;
}

/** Hook for looking up an account, is undefined while loading and null if account is not found */
export function useAccount(address: string) {
    const [account, setAccount] = useState<Account | undefined | null>();
    useEffect(() => {
        getAccount(address)
            .then((a) => setAccount(a ?? null))
            .catch(() => {});
    }, [address]);
    return account;
}

/** Hook for fetching account info given an account address */
export function useAccountInfo(address?: string) {
    const [accountInfo, setAccountInfo] = useState<AccountInfo>();
    useEffect(() => {
        if (address) {
            getAccountInfoOfAddress(address)
                .then(setAccountInfo)
                .catch(() => {});
        } else {
            setAccountInfo(undefined);
        }
    }, [address]);
    return accountInfo;
}

/** Hook for estimating transaction cost */
export function useTransactionCostEstimate(
    kind: TransactionKindId,
    exchangeRate: Fraction,
    signatureAmount?: number,
    memo?: string,
    payloadSize?: number
) {
    return useMemo(
        () =>
            getTransactionKindCost(
                kind,
                exchangeRate,
                signatureAmount,
                memo,
                payloadSize
            ),
        [kind, exchangeRate, payloadSize, signatureAmount, memo]
    );
}

/**
 * Hook for fetching last finalized block summary
 *
 * @param swr If true, returns stale response from store while fetching update.
 */
export function useLastFinalizedBlockSummary(swr = false) {
    const cd = useAsyncMemo<{
        lastFinalizedBlockSummary: BlockSummary;
        consensusStatus: ConsensusStatus;
    }>(fetchLastFinalizedBlockSummary, noOp, []);
    const stale = useSelector((s: RootState) => ({
        consensusStatus: s.chainData.consensusStatus,
        lastFinalizedBlockSummary: s.chainData.blockSummary,
    }));
    const dispatch = useDispatch();

    useEffect(() => {
        if (cd !== undefined) {
            dispatch(setConsensusStatus(cd.consensusStatus));
            dispatch(setBlockSummary(cd.lastFinalizedBlockSummary));
        }
    }, [cd, dispatch]);

    return swr ? stale ?? cd : cd;
}

/**
 * Hook for fetching consensus status
 *
 * @param swr If true, returns stale response from store while fetching update.
 */
export function useConsensusStatus(swr = false) {
    const cs = useAsyncMemo<ConsensusStatus>(getConsensusStatus, noOp, []);
    const stale = useSelector((s: RootState) => s.chainData.consensusStatus);
    const dispatch = useDispatch();

    useEffect(() => {
        if (cs !== undefined) {
            dispatch(setConsensusStatus(cs));
        }
    }, [cs, dispatch]);

    return swr ? stale ?? cs : cs;
}

/** Hook for fetching identity providers */
export function useIdentityProviders() {
    const [providers, setProviders] = useState<IpInfo[]>([]);
    useEffect(() => {
        fetchLastFinalizedIdentityProviders()
            .then(setProviders)
            .catch(() => {});
    }, []);
    return providers;
}

/** Hook for fetching anonymity revokers */
export function useAnonymityRevokers() {
    const [revokers, setRevokers] = useState<ArInfo[]>([]);
    useEffect(() => {
        fetchLastFinalizedAnonymityRevokers()
            .then(setRevokers)
            .catch(() => {});
    }, []);
    return revokers;
}

/** Hook for fetching staked amount for a given account address, Returns undefined while loading and 0 if account is not a baker */
export function useStakedAmount(accountAddress: string): Amount | undefined {
    const accountInfo = useAccountInfo(accountAddress);
    if (accountInfo === undefined || !isBakerAccount(accountInfo)) {
        return undefined;
    }
    return BigInt(accountInfo.accountBaker?.stakedAmount ?? '0');
}

/** Hook for accessing chain parameters of the last finalized block */
export function useChainParameters() {
    const lastFinalizedBlock = useLastFinalizedBlockSummary();
    return lastFinalizedBlock?.lastFinalizedBlockSummary?.updates
        .chainParameters;
}

/** Hook for creating transaction exiry state and error */
export function useTransactionExpiryState(
    validation?: (expiry: Date | undefined) => string | undefined
) {
    const [expiryTime, setExpiryTime] = useState<Date | undefined>(
        getDefaultExpiry()
    );

    const expiryTimeError = useMemo(
        () =>
            expiryTime === undefined || isFutureDate(expiryTime)
                ? validation?.(expiryTime)
                : 'Transaction expiry time must be in the future',
        [expiryTime, validation]
    );
    return [expiryTime, setExpiryTime, expiryTimeError] as const;
}

function getV0Cooldown(
    cooldownEpochs: number,
    cs: ConsensusStatus,
    now: Date
): Date {
    const genesisTime = new Date(cs.currentEraGenesisTime);
    const currentEpochIndex = getEpochIndexAt(
        now,
        cs.epochDuration,
        genesisTime
    );
    const nextEpochIndex = currentEpochIndex + 1;

    return epochDate(
        nextEpochIndex + cooldownEpochs,
        cs.epochDuration,
        genesisTime
    );
}

function getV1Cooldown(
    cooldownSeconds: number,
    bs: BlockSummaryV1,
    cs: ConsensusStatus,
    nextPaydayTime: Date,
    now: Date
): Date {
    const genesisTime = new Date(cs.currentEraGenesisTime);
    const ei = (t: Date) => getEpochIndexAt(t, cs.epochDuration, genesisTime);

    const { rewardPeriodLength } = bs.updates.chainParameters;
    const nRewardPeriodLength = Number(rewardPeriodLength);

    const nextRewardPeriodStartIndex = ei(nextPaydayTime);
    const cooldownEpochIndex = ei(
        new Date(now.getTime() + cooldownSeconds * 1000)
    );
    const remainingAtNext = cooldownEpochIndex - nextRewardPeriodStartIndex;

    let cooldownEnd: number;
    if (remainingAtNext < 1) {
        cooldownEnd = nextRewardPeriodStartIndex;
    } else {
        const remainingRewardPeriods = Math.ceil(
            remainingAtNext / nRewardPeriodLength
        );
        cooldownEnd =
            nextRewardPeriodStartIndex +
            remainingRewardPeriods * nRewardPeriodLength;
    }

    return epochDate(cooldownEnd, cs.epochDuration, genesisTime);
}

/** Hook for calculating the date of the delegation cooldown ending, will result in undefined while loading */
export function useCalcDelegatorCooldownUntil() {
    const lastFinalizedBlockSummary = useLastFinalizedBlockSummary();
    const rs = useAsyncMemo(getRewardStatusLatest);
    const now = useCurrentTime(60000);

    if (
        lastFinalizedBlockSummary === undefined ||
        lastFinalizedBlockSummary.lastFinalizedBlockSummary === undefined ||
        lastFinalizedBlockSummary.consensusStatus === undefined ||
        rs === undefined
    ) {
        return undefined;
    }

    const {
        lastFinalizedBlockSummary: bs,
        consensusStatus: cs,
    } = lastFinalizedBlockSummary;

    if (isBlockSummaryV1(bs)) {
        if (!isRewardStatusV1(rs)) {
            throw new Error('Block summary and reward status do not match.'); // Should not happen, as this indicates rs and bs are queried with different blocks.
        }

        return getV1Cooldown(
            Number(bs.updates.chainParameters.delegatorCooldown),
            bs,
            cs,
            rs.nextPaydayTime,
            now
        );
    }
    throw new Error(
        'Delegation cooldown not available for current protocol version.'
    );
}

/** Hook for calculating the date of the baking stake cooldown ending, will result in undefined while loading */
export function useCalcBakerStakeCooldownUntil() {
    const lastFinalizedBlockSummary = useLastFinalizedBlockSummary();
    const rs = useAsyncMemo(getRewardStatusLatest);
    const now = useCurrentTime(60000);

    if (
        lastFinalizedBlockSummary === undefined ||
        lastFinalizedBlockSummary.lastFinalizedBlockSummary === undefined ||
        lastFinalizedBlockSummary.consensusStatus === undefined ||
        rs === undefined
    ) {
        return undefined;
    }

    const {
        lastFinalizedBlockSummary: bs,
        consensusStatus: cs,
    } = lastFinalizedBlockSummary;

    if (isBlockSummaryV1(bs)) {
        if (!isRewardStatusV1(rs)) {
            throw new Error('Block summary and reward status do not match.'); // Should not happen, as this indicates rs and bs are queried with different blocks.
        }

        return getV1Cooldown(
            Number(bs.updates.chainParameters.poolOwnerCooldown),
            bs,
            cs,
            rs.nextPaydayTime,
            now
        );
    }

    return getV0Cooldown(
        Number(bs.updates.chainParameters.bakerCooldownEpochs),
        cs,
        now
    );
}

/**
 * Hook for getting chain protocol version
 *
 * @param swr If true, returns stale response from store while fetching update.
 */
export function useProtocolVersion(swr = false): bigint | undefined {
    return useConsensusStatus(swr)?.protocolVersion;
}
