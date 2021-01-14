import React from 'react';
import styles from './Accounts.css';
import { fromMicroUnits } from '../utils/transactionHelpers';
import { AccountInfo, Account } from '../utils/types';
import SidedText from './SidedText';

interface Props {
    account: Account;
    accountInfo: AccountInfo;
    onClick?: (shielded: boolean) => void;
    highlighted?: boolean;
    index: number;
}

function AccountListElement({
    account,
    accountInfo,
    onClick,
    highlighted,
    index,
}: Props): JSX.Element {
    return (
        <div
            key={account.address}
            tabIndex={index}
            className={`${styles.accountListElement} ${
                highlighted ? styles.chosenAccountListElement : null
            }`}
        >
            <SidedText
                left={`${account.name}${' '}
                ${account.accountNumber === 0 ? '(initial)' : ''}
                ${accountInfo && accountInfo.accountBaker ? '(baker)' : ''}
                ${account.status === 'pending' ? ' ??? ' : ''}`}
                right={account.identityName}
            />
            <div
                onClick={() => onClick(false)}
                className={styles.accountListElementUnShieldedBalance}
            >
                <SidedText
                    left="Balance:"
                    right={
                        accountInfo
                            ? fromMicroUnits(accountInfo.accountAmount)
                            : '0'
                    }
                />
                <SidedText
                    left=" - At Disposal:"
                    right={
                        accountInfo && accountInfo.accountReleaseSchedule
                            ? fromMicroUnits(
                                  accountInfo.accountAmount -
                                      accountInfo.accountReleaseSchedule.total
                              )
                            : '0'
                    }
                />
                <SidedText left=" - Staked:" right="0" />
            </div>
            <div onClick={() => onClick(true)}>
                <SidedText
                    left="Shielded Balance:"
                    right={`${fromMicroUnits(
                        account.totalDecrypted ? account.totalDecrypted : 0
                    )} ${account.allDecrypted ? '' : ' + ?'}`}
                />
            </div>
        </div>
    );
}

AccountListElement.defaultProps = {
    onClick: () => {},
    highlighted: false,
};

export default AccountListElement;
