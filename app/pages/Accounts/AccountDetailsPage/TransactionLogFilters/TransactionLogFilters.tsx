import React, { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TransactionFilters, {
    TransactionFiltersRef,
} from '~/components/TransactionFilters';
import Button from '~/cross-app-components/Button';
import {
    chosenAccountSelector,
    updateRewardFilter,
} from '~/features/AccountSlice';
import { RewardFilter, Account } from '~/utils/types';

import styles from './TransactionLogFilters.module.scss';

interface Props {
    onUpdate(): void;
}

export default function TransactionLogFilters({ onUpdate }: Props) {
    const account = useSelector(chosenAccountSelector);
    const { rewardFilter = {}, address } = account ?? ({} as Account);
    const ref = useRef<TransactionFiltersRef>(null);
    const dispatch = useDispatch();

    const handleUpdate = useCallback(
        (store: boolean) => async (filter: RewardFilter) => {
            await updateRewardFilter(dispatch, address, filter, store);
            onUpdate();
        },
        [dispatch, address, onUpdate]
    );

    const clear = useCallback(() => {
        ref.current?.clear(handleUpdate(true));
    }, [ref, handleUpdate]);

    const submit = useCallback(
        (store: boolean) => () => {
            ref.current?.submit(handleUpdate(store));
        },
        [ref, handleUpdate]
    );

    return (
        <>
            <TransactionFilters ref={ref} values={rewardFilter} />
            <footer className={styles.footer}>
                <Button size="tiny" onClick={submit(false)}>
                    Apply
                </Button>
                <Button size="tiny" onClick={submit(true)}>
                    Save
                </Button>
                <Button size="tiny" onClick={clear}>
                    Clear
                </Button>
            </footer>
        </>
    );
}
