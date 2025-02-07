import {
    AccountInfo,
    AccountInfoBaker,
    AccountInfoType,
} from '@concordium/web-sdk';

import React from 'react';
import { Redirect, Route, Switch, useLocation } from 'react-router';
import { Account } from '~/utils/types';
import routes from '~/constants/routes.json';
import ButtonNavLink from '~/components/ButtonNavLink';
import AddBaker from './AddBaker';
import RemoveBaker from './RemoveBaker';
import UpdateBakerStake from './UpdateBakerStake';
import UpdateBakerPool from './UpdateBakerPool';
import UpdateBakerKeys from './UpdateBakerKeys';
import StakingDetails from '../StakingDetails';

function Actions() {
    return (
        <>
            <ButtonNavLink
                className="mB20 flex width100"
                to={routes.ACCOUNTS_UPDATE_BAKER_STAKE}
            >
                Update validator stake
            </ButtonNavLink>
            <ButtonNavLink
                className="mB20 flex width100"
                to={routes.ACCOUNTS_UPDATE_BAKER_POOL}
            >
                Update staking pool
            </ButtonNavLink>
            <ButtonNavLink
                className="mB20 flex width100"
                to={routes.ACCOUNTS_UPDATE_BAKER_KEYS}
            >
                Update validator keys
            </ButtonNavLink>
            <ButtonNavLink
                className="flex width100"
                to={routes.ACCOUNTS_REMOVE_BAKER}
                negative
            >
                Stop validation
            </ButtonNavLink>
        </>
    );
}

interface Props {
    account: Account;
    accountInfo: AccountInfo;
}

export default function Baking({ account, accountInfo }: Props) {
    const { pathname } = useLocation();
    const isBaker = accountInfo.type === AccountInfoType.Baker;

    if (!pathname.startsWith(routes.ACCOUNTS_ADD_BAKER) && !isBaker) {
        return <Redirect to={routes.ACCOUNTS} />;
    }

    return (
        <Switch>
            <Route
                path={routes.ACCOUNTS_ADD_BAKER}
                render={() => {
                    if (isBaker) {
                        return <Redirect to={routes.ACCOUNTS_BAKING} />;
                    }

                    return (
                        <AddBaker account={account} accountInfo={accountInfo} />
                    );
                }}
            />
            <Route path={routes.ACCOUNTS_REMOVE_BAKER}>
                {isBaker && (
                    <RemoveBaker account={account} accountInfo={accountInfo} />
                )}
            </Route>
            <Route path={routes.ACCOUNTS_UPDATE_BAKER_KEYS}>
                {isBaker && <UpdateBakerKeys account={account} />}
            </Route>
            <Route path={routes.ACCOUNTS_UPDATE_BAKER_STAKE}>
                {isBaker && (
                    <UpdateBakerStake
                        account={account}
                        accountInfo={accountInfo}
                    />
                )}
            </Route>
            <Route path={routes.ACCOUNTS_UPDATE_BAKER_POOL}>
                <UpdateBakerPool account={account} accountInfo={accountInfo} />
            </Route>
            <Route default>
                <StakingDetails
                    details={(accountInfo as AccountInfoBaker).accountBaker}
                />
                <Actions />
            </Route>
        </Switch>
    );
}
