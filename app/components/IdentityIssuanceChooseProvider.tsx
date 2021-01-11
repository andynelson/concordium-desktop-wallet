import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import routes from '../constants/routes.json';
import styles from './IdentyIssuance.css';
import { getIdentityProviders } from '../utils/httpRequests';

export default function IdentityIssuanceChooseProvider(
    setProvider
): JSX.Element {
    const dispatch = useDispatch();
    const [providers, setProviders] = useState([]);

    useEffect(() => {
        getIdentityProviders()
            .then((loadedProviders) => setProviders(loadedProviders.data))
            .catch(console.log);
    }, []);

    function onClick(provider) {
        setProvider(provider);
        dispatch(push(routes.IDENTITYISSUANCE_EXTERNAL));
    }

    return (
        <div>
            {providers.map((provider) => (
                <div
                    className={styles.providerListElement}
                    key={provider.ipInfo.ipIdentity}
                    onClick={() => onClick(provider)}
                >
                    <img
                        className={styles.providerImage}
                        alt="unable to display"
                        src={`data:image/png;base64, ${provider.metadata.icon}`}
                    />
                    <div className={styles.providerText}>
                        {provider.ipInfo.ipDescription.name}
                    </div>
                    <div className={styles.providerText}>Privacy Policy</div>
                </div>
            ))}
        </div>
    );
}
