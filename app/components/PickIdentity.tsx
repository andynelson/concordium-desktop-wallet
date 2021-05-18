import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ClassName, Identity } from '~/utils/types';
import { confirmedIdentitiesSelector } from '~/features/IdentitySlice';
import IdentityCard from '~/components/IdentityCard';
import CardList from '~/cross-app-components/CardList';
import { noOp } from '~/utils/basicHelpers';

interface Props extends ClassName {
    chosenIdentity?: Identity;
    setReady?(ready: boolean): void;
    setIdentity(identity: Identity): void;
}

/**
 * Allows the user to pick an Identity
 */
export default function PickIdentity({
    chosenIdentity,
    setReady = noOp,
    setIdentity,
    className,
}: Props): JSX.Element {
    const identities = useSelector(confirmedIdentitiesSelector);
    const [chosenIndex, setChosenIndex] = useState<number | undefined>();

    useEffect(() => {
        if (chosenIdentity) {
            setReady(true);
            setChosenIndex(
                identities.findIndex(
                    (identity) => identity.id === chosenIdentity.id
                )
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <CardList className={className}>
            {identities.map((identity: Identity, index: number) => (
                <IdentityCard
                    identity={identity}
                    key={identity.id}
                    active={chosenIndex === index}
                    onClick={() => {
                        setReady(true);
                        setChosenIndex(index);
                        setIdentity(identity);
                    }}
                />
            ))}
        </CardList>
    );
}
