import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import routes from '../constants/routes.json';

export default function AccountCreationPickAttributes(
    identity,
    setRevealedAttributes
): JSX.Element {
    const dispatch = useDispatch();
    const [attributes, setAttributes] = useState([]);

    useEffect(() => {
        const idObject = JSON.parse(identity.identityObject).value;
        const { chosenAttributes, ...otherAttributes } = idObject.attributeList;
        const allAttributes = { ...chosenAttributes, ...otherAttributes };
        setAttributes(
            Object.keys(allAttributes).map((tag) => ({
                tag,
                value: allAttributes[tag],
                isChecked: false,
            }))
        );
    }, [identity]);

    function submit() {
        const attributeObject = [];
        attributes
            .filter((x) => x.isChecked)
            .forEach(({ tag }) => attributeObject.push(tag));
        setRevealedAttributes(attributeObject);
        dispatch(push(routes.ACCOUNTCREATION_GENERATE));
    }

    return (
        <div>
            <h2>Pick Attributes to reveal</h2>
            {attributes.map((attribute, i) => (
                <div
                    key={attribute.tag}
                    onClick={() => {
                        // TODO: find better way?
                        const newAttributes = [...attributes];
                        newAttributes[i].isChecked = !newAttributes[i]
                            .isChecked;
                        setAttributes(newAttributes);
                    }}
                >
                    <p>
                        {' '}
                        {attribute.isChecked ? '!' : '_'} {attribute.tag}:{' '}
                        {attribute.value}{' '}
                    </p>
                </div>
            ))}
            <button
                type="submit"
                onClick={() => {
                    submit();
                }}
            >
                submit
            </button>
        </div>
    );
}
