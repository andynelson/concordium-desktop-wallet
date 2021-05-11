import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Identity, Account, AccountInfo } from '~/utils/types';
import AccountCard from '~/components/AccountCard';
import {
    accountsOfIdentitySelector,
    accountsInfoSelector,
    loadAccountInfos,
} from '~/features/AccountSlice';
import CardList from '~/cross-app-components/CardList';

interface Props {
    chosenAccount?: Account;
    identity: Identity | undefined;
    setReady: (ready: boolean) => void;
    setAccount: (account: Account) => void;
    filter?: (account: Account, info?: AccountInfo) => boolean;
}

/**
 * Allows the user to pick an account of the given identity.
 */
export default function PickAccount({
    setReady,
    chosenAccount,
    setAccount,
    identity,
    filter,
}: Props): JSX.Element {
    const dispatch = useDispatch();

    if (!identity) {
        throw new Error('unexpected missing identity');
    }

    const accounts = useSelector(accountsOfIdentitySelector(identity));
    const accountsInfo = useSelector(accountsInfoSelector);
    const [chosenIndex, setChosenIndex] = useState<number | undefined>();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (chosenAccount) {
            setReady(true);
            setChosenIndex(
                accounts.findIndex(
                    (acc) => acc.address === chosenAccount.address
                )
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (accounts && !loaded) {
            setLoaded(true);
            loadAccountInfos(accounts, dispatch);
        }
    }, [accounts, dispatch, loaded]);

    return (
        <CardList>
            {accounts
                .filter((a) => filter?.(a, accountsInfo[a.address]) ?? true)
                .map((account: Account, index: number) => (
                    <AccountCard
                        key={account.address}
                        active={index === chosenIndex}
                        account={account}
                        accountInfo={accountsInfo[account.address]}
                        onClick={() => {
                            setReady(true);
                            setChosenIndex(index);
                            setAccount(account);
                        }}
                    />
                ))}
        </CardList>
    );
}
