import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'semantic-ui-react';
import { BlockSummary } from '../../utils/NodeApiTypes';

interface Props {
    onError: () => void;
    onSuccess: (arg) => void;
    execution: () => Promise<BlockSummary>;
    title: string;
    content: string;
}

/**
 * Modal component that will open if an error occurs while executing the
 * provided 'execution' function. When accepting the opened modal, the supplied
 * 'onError' callback is called. If everything went well, then the 'onSuccess'
 * function is called with the result of the 'execution' function.
 *
 * Note: this component has only been verified to work in the case where the
 * onError function navigates away from where this component was placed.
 */
export default function DynamicModal({
    onError,
    onSuccess,
    execution,
    title,
    content,
}: Props) {
    const [open, setOpen] = useState(false);
    const [started, setStarted] = useState(false);

    const runner = async () => {
        setStarted(true);
        try {
            const result = await execution();
            onSuccess(result);
        } catch (error) {
            setOpen(true);
        }
    };

    useEffect(() => {
        if (!started) {
            runner();
        }
    });

    return (
        <Modal open={open} closeOnEscape>
            <Modal.Header>{title}</Modal.Header>
            <Modal.Content>{content}</Modal.Content>
            <Modal.Actions>
                <Button
                    onClick={() => {
                        onError();
                    }}
                >
                    Okay
                </Button>
            </Modal.Actions>
        </Modal>
    );
}
