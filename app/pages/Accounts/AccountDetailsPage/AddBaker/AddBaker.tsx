import { push } from 'connected-react-router';
import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Switch } from 'react-router';
import { AddBakerForm } from '~/components/AddBakerDetailsForm';
import routes from '~/constants/routes.json';
import AddBakerData from './AddBakerData';

export default function AddBaker() {
    const dispatch = useDispatch();
    const [, setBakerData] = useState<AddBakerForm>();

    const handleSubmit = useCallback(
        (values: AddBakerForm) => {
            setBakerData(values);
            dispatch(
                push(
                    routes.ACCOUNTS_EXPORT_BAKER_KEYS.replace(
                        ':bakerTransferType',
                        'addBaker'
                    )
                )
            );
        },
        [dispatch]
    );

    return (
        <Switch>
            <Route path={routes.ACCOUNTS_EXPORT_BAKER_KEYS}>
                Export baker keys
            </Route>
            <Route path={routes.ACCOUNTS_ADD_BAKER}>
                <AddBakerData onSubmit={handleSubmit} />
            </Route>
        </Switch>
    );
}
