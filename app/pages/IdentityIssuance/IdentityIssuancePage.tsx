import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { Switch, Route } from 'react-router-dom';
import routes from '../../constants/routes.json';
import PickProvider from './PickProvider';
import PickName from './PickName';
import GeneratePage from './GeneratePage';
import FinalPage from './FinalPage';
import { IdentityProvider } from '../../utils/types';
import ErrorModal from '../../components/SimpleErrorModal';

/**
 * The Last route is the default (because it has no path)
 */
export default function IdentityIssuancePage(): JSX.Element {
    const dispatch = useDispatch();

    const [provider, setProvider] = useState<IdentityProvider | undefined>();
    const [initialAccountName, setInitialAccountName] = useState<string>('');
    const [identityName, setIdentityName] = useState<string>('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState<string>('');

    function activateModal(message: string) {
        setModalMessage(message);
        setModalOpen(true);
    }

    return (
        <>
            <ErrorModal
                header="Unable to create identity"
                content={modalMessage}
                show={modalOpen}
                onClick={() => dispatch(push(routes.IDENTITIES))}
            />
            <Switch>
                <Route
                    path={routes.IDENTITYISSUANCE_PICKPROVIDER}
                    render={() => (
                        <PickProvider
                            setProvider={setProvider}
                            onError={activateModal}
                        />
                    )}
                />
                <Route
                    path={routes.IDENTITYISSUANCE_EXTERNAL}
                    render={() => {
                        if (provider) {
                            return (
                                <GeneratePage
                                    identityName={identityName}
                                    accountName={initialAccountName}
                                    provider={provider}
                                    onError={activateModal}
                                />
                            );
                        }
                        throw new Error(
                            'Unexpected missing identity Provider!'
                        );
                    }}
                />
                <Route
                    path={routes.IDENTITYISSUANCE_FINAL}
                    render={() => (
                        <FinalPage
                            identityName={identityName}
                            accountName={initialAccountName}
                        />
                    )}
                />
                <Route
                    render={() => (
                        <PickName
                            setIdentityName={setIdentityName}
                            setAccountName={setInitialAccountName}
                        />
                    )}
                />
            </Switch>
        </>
    );
}
