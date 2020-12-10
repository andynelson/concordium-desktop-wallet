import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { push } from 'connected-react-router';
import {
    loadProviders,
    providersSelector,
    accountNameSelector,
    identityNameSelector,
} from '../features/identityIssuanceSlice';
import { addIdentity, confirmIdentity } from '../features/accountsSlice';
import routes from '../constants/routes.json';
import styles from './IdentyIssuance.css';
import {
    getGlobal,
    performIdObjectRequest,
    getHTMLform,
} from '../utils/httpRequests';
// import { createIdentityRequestObject } from '../utils/rustInterface';
import { createIdentityRequestObjectLedger } from '../utils/rustInterface';
import identityjson from '../utils/IdentityObject.json';

const redirectUri = 'ConcordiumRedirectToken';

async function getIdentityLocation(provider, global, setText) {
    const data = await createIdentityRequestObjectLedger(
        provider.ipInfo,
        provider.arsInfos,
        global,
        setText
    );
    console.log(data);
    const verifyLocation = await performIdObjectRequest(
        'http://localhost:8100/api/identity', // provider.metadata.issuanceStart,
        redirectUri,
        data.idObjectRequest
    );
    console.log(verifyLocation);
    return verifyLocation;
}

async function createIdentity(provider, setText, setLocation, iframeRef) {
    setText('Please Wait');
    const global = await getGlobal();
    const location = await getIdentityLocation(provider, global, setText);

    return new Promise((resolve, reject) => {
        setLocation(location);
        iframeRef.current.addEventListener('did-navigate', (e) => {
            console.log(e);
            const loc = e.url;
            if (loc.includes(redirectUri)) {
                resolve(loc.substring(loc.indexOf('=') + 1));
            }
        });
    });
}

export default function IdentityIssuanceExternal(): JSX.Element {
    const { index } = useParams();
    const dispatch = useDispatch();
    const providers = useSelector(providersSelector);
    const accountName = useSelector(accountNameSelector);
    const identityName = useSelector(identityNameSelector);
    const provider = providers[index];
    const [text, setText] = useState();
    const [location, setLocation] = useState();
    const iframeRef = useRef(null);

    useEffect(() => {
        if (provider) {
            createIdentity(provider, setText, setLocation, iframeRef)
                .then((verifyLocation) => {
                    const input = {
                        identityName,
                        accountName,
                    };
                    dispatch(addIdentity(input));
                    confirmIdentity(dispatch, identityName, verifyLocation);
                    dispatch(push(routes.IDENTITYISSUANCE_FINAL));
                })
                .catch(console.log('unable to create identity')); // TODO: handle failure
        }
    }, [provider, setLocation, dispatch, accountName, identityName]);

    if (!location) {
        return (
            <div>
                <h2>
                    <pre>{text}</pre>
                </h2>
            </div>
        );
    }

    return (
        <webview ref={iframeRef} className={styles.webview} src={location} />
    );
}
