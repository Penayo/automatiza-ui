import { describe, it, expect } from 'vitest';
import { serializeParams } from '../BaseService';

/**
 * serializeParams feeds every GET in the app via axios' paramsSerializer.
 * Two behaviours are load-bearing and easy to regress:
 *
 *  1. Arrays serialize as repeated plain keys (keys=a&keys=b), NOT keys[]=a —
 *     the backend runs ValidationPipe with forbidNonWhitelisted, which 400s on a
 *     literal "keys[]" property.
 *  2. Plain objects nest with brackets (filter[name][like]=x) so Express' qs
 *     parser rebuilds the nested filter DTOs on the paginated list endpoints.
 */
describe('serializeParams', () => {
    it('serializes flat scalars', () => {
        expect(serializeParams({ page: 1, rowsPerPage: 15 })).toBe('page=1&rowsPerPage=15');
    });

    it('skips undefined and null', () => {
        expect(serializeParams({ page: 1, search: undefined, sortField: null })).toBe('page=1');
    });

    it('serializes arrays as repeated plain keys, not keys[]', () => {
        expect(serializeParams({ keys: ['a', 'b'] })).toBe('keys=a&keys=b');
    });

    it('nests plain objects with brackets', () => {
        expect(serializeParams({ filter: { name: { like: 'invoice' } } }))
            .toBe('filter[name][like]=invoice');
    });

    it('nests multiple filter fields alongside flat params', () => {
        const qs = serializeParams({
            page: 2,
            filter: { name: { like: 'inv' }, type: { equalsTo: 'jsonschema' } },
        });
        expect(qs).toBe('page=2&filter[name][like]=inv&filter[type][equalsTo]=jsonschema');
    });

    it('percent-encodes values but leaves structural brackets literal', () => {
        expect(serializeParams({ filter: { name: { like: 'a b&c' } } }))
            .toBe('filter[name][like]=a%20b%26c');
    });

    it('omits filter branches whose operators are undefined', () => {
        expect(serializeParams({ filter: { name: { like: undefined } }, page: 1 })).toBe('page=1');
    });

    it('serializes dates as values rather than descending into them', () => {
        const date = new Date('2026-07-29T00:00:00.000Z');
        expect(serializeParams({ from: date })).toBe(`from=${encodeURIComponent(date.toString())}`);
    });
});
