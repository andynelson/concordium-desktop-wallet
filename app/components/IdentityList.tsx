import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import routes from '../constants/routes.json';
import IdentityListElement from './IdentityListElement';
import {
    loadIdentities,
    chooseIdentity,
    identitiesSelector,
    chosenIdentitySelector,
} from '../features/IdentitySlice';
import { Identity } from '../utils/types';
import styles from './Identity.css';

export default function IdentityList() {
    const dispatch = useDispatch();
    const identities = useSelector(identitiesSelector);
    const chosenIdentity = useSelector(chosenIdentitySelector);

    useEffect(() => {
        if (!identities) {
            loadIdentities(dispatch);
        }
    }, [dispatch, identities]);

    if (!identities) {
        return null;
    }

    return (
        <div className={styles.halfPage}>
            <Link to={routes.IDENTITYISSUANCE}>
                <button type="button">x</button>
            </Link>

            {identities.map((identity: Identity, i: number) => (
                <IdentityListElement
                    identity={identity}
                    highlighted={identity === chosenIdentity}
                    index={i}
                    onClick={() => dispatch(chooseIdentity(i))}
                    key={identity.id}
                />
            ))}
        </div>
    );
}
