import clsx from 'clsx';
import React from 'react';

import { isDefined } from '../../../utils/basicHelpers';
import { CommonInputProps } from '../common';
import ErrorMessage from '../ErrorMessage';
import {
    useInputTimeStamp,
    fieldNames,
    TimeStampContext,
    DateParts,
} from './util';
import TimeStampField from './TimestampField';

import styles from './InputTimestamp.module.scss';

type TimestampErrorMessages = DateParts;

const defaultErrorMessages: TimestampErrorMessages = {
    year: 'Invalid year value',
    month: 'Invalid month value',
    date: 'Invalid date value',
    hours: 'Invalid hours value',
    minutes: 'Invalid minutes value',
    seconds: 'Invalid seconds value',
};

export interface InputTimeStampProps extends CommonInputProps {
    /**
     * Value of Input (type Date).
     */
    value: Date | undefined;
    /**
     * Change event handler, supplies date as argument.
     */
    onChange(date: Date | undefined): void;
    /**
     * Focus event handler.
     */
    onBlur?(): void;
    errorMessages?: TimestampErrorMessages;
}

/**
 * @description
 * Controlled input (stores value externally) for setting date + time.
 *
 * @example
 * const [date, setDate] = useState<Date | undefined>();
 * ...
 * <InputTimeStamp label="Timestamp" value={date} onChange={setDate} />
 */
export default function InputTimeStamp({
    label,
    error,
    value,
    errorMessages = defaultErrorMessages,
    onChange,
    onBlur,
}: InputTimeStampProps): JSX.Element {
    const {
        form,
        fireOnChange,
        validateDate,
        isFocused,
        setIsFocused,
    } = useInputTimeStamp(value, onChange, onBlur);

    const firstFormError = Object.values(form.errors).filter(isDefined)[0];
    const errorMessage =
        errorMessages[firstFormError?.ref?.name as keyof DateParts] || error;
    const isInvalid =
        !!Object.values(form.errors).filter(isDefined)[0] || !!error;

    return (
        <div className={styles.root}>
            {label}
            <div
                className={clsx(
                    styles.input,
                    isFocused && styles.inputFocused,
                    isInvalid && styles.inputInvalid
                )}
            >
                <TimeStampContext.Provider
                    value={{ ...form, setIsFocused, fireOnChange }}
                >
                    <TimeStampField
                        className={styles.year}
                        name={fieldNames.year}
                        placeholder="YYYY"
                        rules={{ min: 100, max: 9999 }}
                    />
                    -
                    <TimeStampField
                        className={styles.field}
                        name={fieldNames.month}
                        placeholder="MM"
                        rules={{ min: 1, max: 12 }}
                    />
                    -
                    <TimeStampField
                        className={styles.field}
                        name={fieldNames.date}
                        placeholder="DD"
                        rules={{
                            validate: validateDate,
                            max: 31,
                        }}
                    />
                    <span>at</span>
                    <TimeStampField
                        className={styles.field}
                        name={fieldNames.hours}
                        placeholder="HH"
                        rules={{ max: 23 }}
                    />
                    :
                    <TimeStampField
                        className={styles.field}
                        name={fieldNames.minutes}
                        placeholder="MM"
                        rules={{ max: 59 }}
                    />
                    :
                    <TimeStampField
                        className={styles.field}
                        name={fieldNames.seconds}
                        placeholder="SS"
                        rules={{ max: 59 }}
                    />
                </TimeStampContext.Provider>
            </div>
            <ErrorMessage>{errorMessage}</ErrorMessage>
        </div>
    );
}
