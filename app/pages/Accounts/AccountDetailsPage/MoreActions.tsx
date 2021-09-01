import React from 'react';
import { useSelector } from 'react-redux';
import { Switch, Route } from 'react-router-dom';
import { Account, AccountInfo, TransactionKindId } from '~/utils/types';
import routes from '~/constants/routes.json';
import ButtonNavLink from '~/components/ButtonNavLink';
import { accountHasDeployedCredentialsSelector } from '~/features/CredentialSlice';
import { createTransferWithAccountPathName } from '~/utils/accountRouterHelpers';
import { hasEncryptedBalance } from '~/utils/accountHelpers';
import ShowAccountAddress from '../ShowAccountAddress';
import ShowReleaseSchedule from '../ShowReleaseSchedule';
import ScheduleTransfer from '../ScheduleTransfer';
import TransferLogFilters from '../TransferLogFilters';
import CredentialInformation from '../CredentialInformation';

interface Props {
    account: Account;
    accountInfo: AccountInfo;
}

interface MoreActionObject {
    label: string | JSX.Element;
    location: string;
    isDisabled?: (
        hasCredential: boolean,
        usedEncrypted: boolean,
        isBaker: boolean,
        bakerCooldown: boolean
    ) => boolean;
}

const items: MoreActionObject[] = [
    { label: 'Account Address', location: routes.ACCOUNTS_MORE_ADDRESS },
    {
        label: 'Inspect release schedule',
        location: routes.ACCOUNTS_MORE_INSPECTRELEASESCHEDULE,
    },
    {
        label: 'Transfer Log Filters',
        location: routes.ACCOUNTS_MORE_TRANSFER_LOG_FILTERS,
    },
    {
        label: 'Make Account Report',
        location: routes.ACCOUNT_REPORT,
    },
    {
        label: 'Credential Information',
        location: routes.ACCOUNTS_MORE_CREDENTIAL_INFORMATION,
    },
    {
        label: 'Send GTU with a schedule',
        location: routes.ACCOUNTS_MORE_CREATESCHEDULEDTRANSFER,
        isDisabled: (hasCredential) => !hasCredential,
    },
    {
        label: 'Update credentials',
        location: createTransferWithAccountPathName(
            TransactionKindId.Update_credentials
        ),
        isDisabled: (hasCredential, usedEncrypted) =>
            !hasCredential || usedEncrypted,
    },
    {
        label: 'Add baker',
        location: createTransferWithAccountPathName(
            TransactionKindId.Add_baker
        ),
        isDisabled: (hasCredential, _encrypted, isBaker) =>
            !hasCredential || isBaker,
    },
    {
        label: 'Remove baker',
        location: createTransferWithAccountPathName(
            TransactionKindId.Remove_baker
        ),
        isDisabled: (hasCredential, _encrypted, isBaker, bakerCooldown) =>
            !hasCredential || !isBaker || bakerCooldown,
    },
    {
        label: 'Update baker keys',
        location: createTransferWithAccountPathName(
            TransactionKindId.Update_baker_keys
        ),
        isDisabled: (hasCredential, _encrypted, isBaker) =>
            !hasCredential || !isBaker,
    },
    {
        label: 'Update baker stake',
        location: createTransferWithAccountPathName(
            TransactionKindId.Update_baker_stake
        ),
        isDisabled: (hasCredential, _encrypted, isBaker, bakerCooldown) =>
            !hasCredential || !isBaker || bakerCooldown,
    },
    {
        label: 'Update baker restake earnings',
        location: createTransferWithAccountPathName(
            TransactionKindId.Update_baker_restake_earnings
        ),
        isDisabled: (hasCredential, _encrypted, isBaker) =>
            !hasCredential || !isBaker,
    },
];

function MoreActionsMenu({ account, accountInfo }: Props) {
    const accountHasDeployedCredentials = useSelector(
        accountHasDeployedCredentialsSelector(account)
    );
    const hasUsedEncrypted = hasEncryptedBalance(account);
    const hasBakerCooldown = Boolean(accountInfo?.accountBaker?.pendingChange);
    return (
        <>
            {items
                .filter(
                    (item) =>
                        !(
                            item.isDisabled &&
                            item.isDisabled(
                                accountHasDeployedCredentials,
                                hasUsedEncrypted,
                                Boolean(accountInfo.accountBaker),
                                hasBakerCooldown
                            )
                        )
                )
                .map((item) => {
                    return (
                        <ButtonNavLink
                            to={{
                                pathname: item.location,
                                state: {
                                    account,
                                },
                            }}
                            key={item.location}
                            className="mB20:notLast flex"
                        >
                            {item.label}
                        </ButtonNavLink>
                    );
                })}
        </>
    );
}

/**
 * Lists additional actions, for the account.
 * And controls the flow of those actions' pages.
 */
export default function MoreActions({ account, accountInfo }: Props) {
    return (
        <Switch>
            <Route path={routes.ACCOUNTS_MORE_ADDRESS}>
                <ShowAccountAddress account={account} />
            </Route>
            <Route path={routes.ACCOUNTS_MORE_INSPECTRELEASESCHEDULE}>
                <ShowReleaseSchedule accountInfo={accountInfo} />
            </Route>
            <Route path={routes.ACCOUNTS_MORE_CREATESCHEDULEDTRANSFER}>
                <ScheduleTransfer account={account} />
            </Route>
            <Route path={routes.ACCOUNTS_MORE_TRANSFER_LOG_FILTERS}>
                <TransferLogFilters account={account} />
            </Route>
            <Route path={routes.ACCOUNTS_MORE_CREDENTIAL_INFORMATION}>
                <CredentialInformation
                    account={account}
                    accountInfo={accountInfo}
                />
            </Route>
            <Route>
                <MoreActionsMenu account={account} accountInfo={accountInfo} />
            </Route>
        </Switch>
    );
}
