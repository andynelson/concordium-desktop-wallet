import clsx from 'clsx';
import React, { forwardRef, InputHTMLAttributes } from 'react';

import { FieldCommonProps } from '../common';

import styles from './Input.module.scss';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> &
    FieldCommonProps;

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ error, className, ...props }, ref) => {
        return (
            <input
                className={clsx(
                    styles.field,
                    className,
                    error && styles.fieldInvalid
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';

export default Input;
