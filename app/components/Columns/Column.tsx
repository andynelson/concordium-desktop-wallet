import clsx from 'clsx';
import React, { HTMLAttributes, PropsWithChildren } from 'react';

import styles from './Columns.module.scss';

export type ColumnProps = HTMLAttributes<HTMLDivElement>;

/**
 * @description
 * Used inside \<Columns /\>, and is namespaced as sub-component for that reason.
 *
 * @example
 * <Columns>
 *   <Columns.Column />
 *   <Columns.Column />
 * </Columns>
 */
export default function Column({
    className,
    ...props
}: PropsWithChildren<ColumnProps>): JSX.Element {
    return <div className={clsx(styles.column, className)} {...props} />;
}
