import React from 'react';
import clsx from 'clsx';
import PendingImage from '@resources/svg/pending_old.svg';
import SuccessImage from '@resources/svg/success_old.svg';
import RejectedImage from '@resources/svg/warning_old.svg';
import { Identity, IdentityStatus } from '~/utils/types';
import { formatDate } from '~/utils/timeHelpers';
import styles from './IdentityListElement.module.scss';

interface Props {
    identity: Identity;
    className?: string;
    onClick?: () => void;
    active?: boolean;
}

// Returns the image corresponding to the given status.
function statusImage(status: IdentityStatus) {
    switch (status) {
        case IdentityStatus.Confirmed:
            return <SuccessImage />;
        case IdentityStatus.Rejected:
            return <RejectedImage />;
        case IdentityStatus.Pending:
            return <PendingImage />;
        default:
            return undefined;
    }
}

/**
 * Displays the information of the Identity.
 * TODO: Simplify structure
 */
function IdentityListElement({
    identity,
    onClick,
    className,
    active = false,
}: Props): JSX.Element {
    const identityProvider = JSON.parse(identity.identityProvider);
    const identityObject = JSON.parse(identity.identityObject);
    return (
        <div
            className={clsx(
                styles.identityListElement,
                active && styles.active,
                onClick && styles.clickable,
                className
            )}
            onClick={onClick}
            onKeyPress={onClick}
            tabIndex={0}
            role="button"
        >
            <div className={styles.topRow}>
                {identityProvider?.metadata?.icon ? (
                    <img
                        className={styles.statusImage}
                        src={`data:image/png;base64, ${identityProvider?.metadata?.icon}`}
                        alt={identity.status}
                    />
                ) : null}
                {statusImage(identity.status)}
                <span className={clsx(styles.rightAligned, 'body2')}>
                    Identity
                </span>
            </div>

            <h1> {identity.name} </h1>
            <div className="textFaded">
                {' '}
                {identityObject
                    ? ` Expires on ${formatDate(
                          identityObject.value.attributeList.validTo
                      )} `
                    : undefined}
            </div>
        </div>
    );
}

export default IdentityListElement;
