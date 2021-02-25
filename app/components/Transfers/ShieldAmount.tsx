import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { useLocation, Link } from 'react-router-dom';
import { Button, Header, Grid } from 'semantic-ui-react';
import routes from '../../constants/routes.json';
import PickAmount from './PickAmount';
import FinalPage from './FinalPage';
import {
    AddressBookEntry,
    Account,
    AccountTransaction,
} from '../../utils/types';
import { toMicroUnits } from '../../utils/gtu';
import locations from '../../constants/transferLocations.json';
import { createShieldAmountTransaction } from '../../utils/transactionHelpers';

interface Props {
    account: Account;
}

interface State {
    amount: string;
    transaction: AccountTransaction;
    recipient: AddressBookEntry;
    initialPage: string;
}

/**
 * Controls the flow of creating a simple transfer.
 */
export default function ShieldAmount({ account }: Props) {
    const dispatch = useDispatch();
    const location = useLocation<State>();

    const [subLocation, setSubLocation] = useState<string>(
        location?.state?.initialPage || locations.pickAmount
    );

    // This is a string, to allows user input in GTU
    const [amount, setAmount] = useState<string>(location?.state?.amount);

    function ChosenComponent() {
        switch (subLocation) {
            case locations.pickAmount:
                return (
                    <PickAmount
                        header="Send funds"
                        amount={amount}
                        setAmount={setAmount}
                        toPickRecipient={undefined}
                        toConfirmTransfer={async () => {
                            const transaction = await createShieldAmountTransaction(
                                account.address,
                                toMicroUnits(amount)
                            );

                            dispatch(
                                push({
                                    pathname: routes.SUBMITTRANSFER,
                                    state: {
                                        confirmed: {
                                            pathname:
                                                routes.ACCOUNTS_SHIELDAMOUNT,
                                            state: {
                                                initialPage:
                                                    locations.transferSubmitted,
                                                transaction,
                                            },
                                        },
                                        cancelled: {
                                            pathname:
                                                routes.ACCOUNTS_SHIELDAMOUNT,
                                            state: {
                                                initialPage:
                                                    locations.pickAmount,
                                                amount,
                                            },
                                        },
                                        transaction,
                                        account,
                                    },
                                })
                            );
                        }}
                    />
                );
            case locations.transferSubmitted: {
                return <FinalPage location={location} />;
            }
            default:
                return null;
        }
    }

    return (
        <>
            <Grid columns="3">
                <Grid.Column>
                    {subLocation === locations.confirmTransfer ? (
                        <Button
                            onClick={() => setSubLocation(locations.pickAmount)}
                        >
                            {'<--'}
                        </Button>
                    ) : null}
                </Grid.Column>
                <Grid.Column textAlign="center">
                    <Header>Shield Amount</Header>
                </Grid.Column>
                <Grid.Column textAlign="right">
                    <Link to={routes.ACCOUNTS}>
                        <Button>x</Button>
                    </Link>
                </Grid.Column>
            </Grid>
            <ChosenComponent />
        </>
    );
}
