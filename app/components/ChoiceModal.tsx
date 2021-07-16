import React from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import clsx from 'clsx';
import Modal from '~/cross-app-components/Modal';
import Button from '~/cross-app-components/Button';
import { Action } from '../utils/types';

interface Props {
    title: string;
    description: string | JSX.Element;
    actions: Action[];
    open: boolean;
    postAction(chosenLocation?: string): void;
}

export default function ChoiceModal({
    title,
    description,
    actions,
    open,
    postAction,
}: Props) {
    const dispatch = useDispatch();
    return (
        <Modal open={open} onClose={postAction}>
            <h3>{title}</h3>
            <p>{description}</p>
            <div className="flex justifySpaceBetween mT30">
                {actions.map(({ label, location }, i) => (
                    <Button
                        className={clsx('flexChildFill', i !== 0 && 'mL30')}
                        key={label}
                        onClick={() => {
                            if (location) {
                                dispatch(push(location));
                            }
                            postAction(location);
                        }}
                    >
                        {label}
                    </Button>
                ))}
            </div>
        </Modal>
    );
}
