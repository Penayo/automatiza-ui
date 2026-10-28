import { describe, it, expect } from 'vitest';
import {
    formatColumnValue, formatCurrency, formatDate, formatNumber, formatPercent, parseNumber, plainNumber,
} from '../valueFormat';

describe('NUMBER / CURRENCY formatters (forms spec §5.4)', () => {
    it('formats numbers and numeric strings', () => {
        expect(formatNumber(1234.5, 1, 'en-US')).toBe('1,234.5');
        expect(formatNumber('1234.567', undefined, 'en-US')).toBe('1,234.57');
        expect(formatCurrency(1234.5, 'EUR', 'en-US')).toBe('€1,234.50');
    });

    it('renders nothing for blank or non-numeric values', () => {
        for (const v of ['', null, undefined, 'abc']) {
            expect(formatNumber(v)).toBe('');
            expect(formatCurrency(v)).toBe('');
        }
    });

    it('falls back to a plain number on an unknown currency', () => {
        expect(formatCurrency(10, 'XXXX', 'en-US')).toBe('10.00');
    });
});

describe('percent, date and column formats (forms spec §5.5)', () => {
    it('reads percent values as already in percent', () => {
        expect(formatPercent(15, undefined, 'en-US')).toBe('15%');
    });

    it('formats an ISO day without shifting it, and leaves junk as is', () => {
        expect(formatDate('2026-10-13', 'en-US')).toBe('10/13/2026');
        expect(formatDate('nope')).toBe('nope');
    });

    it('formats a column value, or returns null to keep the raw text', () => {
        expect(formatColumnValue(1234.5, { format: 'currency', currency: 'EUR' })).toBe('€1,234.50');
        expect(formatColumnValue('x', { format: 'number' })).toBeNull();
        expect(formatColumnValue(5, {})).toBeNull();
    });
});

describe('Amount parsing (forms spec §5.6)', () => {
    it('drops grouping and finds the decimal point per locale', () => {
        expect(parseNumber('1,234.50', 'en-US')).toBe(1234.5);
        expect(parseNumber('$ 1,000', 'en-US')).toBe(1000);
        expect(parseNumber('1.234,50', 'es-AR')).toBe(1234.5);
        expect(parseNumber('1.234', 'es-AR')).toBe(1234);
        expect(parseNumber('12.5', 'es-AR')).toBe(12.5);
        expect(parseNumber('abc', 'en-US')).toBeNull();
    });

    it('shows the plain number for editing with the locale separator', () => {
        expect(plainNumber(1234.5, 'es-AR')).toBe('1234,5');
    });
});
