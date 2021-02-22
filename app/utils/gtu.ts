export function getGTUSymbol(): string {
    return '\u01E4';
}

const microGTUPerGTU = 1000000n;
const separator = '.';
const gtuFormat = new RegExp('^(0|[1-9]\\d*)(\\.\\d{1,6})?$');

/**
 * Given an ambigous input, convert it into a bigint.
 * N.B. In case the input is a string, it is assumed that it represents the value in microGTU.
 */
function toBigInt(input: bigint | string): bigint {
    if (typeof input === 'string') {
        try {
            return BigInt(input);
        } catch (e) {
            throw new Error(
                'Given string that was not a valid microGTU string.'
            );
        }
    }
    return input;
}

// Checks that the input is a valid GTU string.
export function isValidGTUString(amount: string): boolean {
    // Only allow numerals, and only allow millionth decimals (in order to keep microGTU atomic)
    return gtuFormat.test(amount);
}

/**
 * expects the fractional part of the a GTU string.
 * i.e. from an amount of 10.001, the subGTU string is 001.
 */
function parseSubGTU(subGTU: string) {
    let result = subGTU;
    result += '0'.repeat(6 - subGTU.toString().length);
    return result;
}

/**
 * Convert a microGTU amount to a gtu string.
 * Should be used for user interaction.
 * N.B. Gives the absolute value of the amount.
 * N.B. In case the input is a string, it is assumed that it represents the value in microGTU.
 */
export function toGTUString(microGTUAmount: bigint | string): string {
    const amount: bigint = toBigInt(microGTUAmount);
    const absolute = amount < 0 ? -amount : amount;
    const GTU = absolute / microGTUPerGTU;
    const microGTU = absolute % microGTUPerGTU;
    const microGTUFormatted =
        microGTU === 0n
            ? ''
            : `.${'0'.repeat(
                  6 - microGTU.toString().length
              )}${microGTU.toString().replace(/0+$/, '')}`;
    return `${GTU}${microGTUFormatted}`;
}

/**
 * Given a GTU string, convert to microGTU
 */
export function toMicroUnits(amount: string): bigint {
    if (!isValidGTUString(amount)) {
        throw new Error('Given string that was not a valid GTU string.');
    }
    if (amount.includes(separator)) {
        const separatorIndex = amount.indexOf(separator);
        const gtu = amount.slice(0, separatorIndex);
        const microGTU = parseSubGTU(amount.slice(separatorIndex + 1));
        return BigInt(gtu) * microGTUPerGTU + BigInt(microGTU);
    }
    return BigInt(amount) * microGTUPerGTU;
}

/**
 * Given a microGTU amount, returns the same amount in GTU
 * in a displayable format.
 * Allows input type string, because microGTU from external sources are strings.
 * N.B. In case the input is a string, it is assumed that it represents the value in microGTU.
 */
export function displayAsGTU(microGTUAmount: bigint | string) {
    const amount: bigint = toBigInt(microGTUAmount);
    const negative = amount < 0 ? '-' : '';
    return `${negative}${getGTUSymbol()}${toGTUString(amount)}`;
}
