import { describe, it, expect } from 'vitest';
import { isEmptySampleJson } from '../sampleData';
import { deriveEmailSample } from '../emailSample';
import { deriveReportSample } from '../reportSample';
import { deriveDmnSample, valueFromCell } from '../dmnSample';

describe('isEmptySampleJson', () => {
    it('treats blank and {} as empty, anything else as content', () => {
        expect(isEmptySampleJson('')).toBe(true);
        expect(isEmptySampleJson('{\n  \n}')).toBe(true);
        expect(isEmptySampleJson('{"a":1}')).toBe(false);
        expect(isEmptySampleJson('{"a":')).toBe(false);
    });
});

describe('email preview example data (email-templates spec §4a)', () => {
    it('derives values, loops and flags from Handlebars references', () => {
        const out = deriveEmailSample(
            '<p>Hi {{variables.customer.name}}</p>{{#if variables.vip}}VIP{{/if}}'
            + '{{#each variables.items as |it|}}{{it.sku}}{{qty}}{{/each}}',
        );
        expect(out).toEqual({
            customer: { name: 'Sample name' },
            vip: true,
            items: [
                { sku: 'Sample sku 1', qty: 'Sample qty 1' },
                { sku: 'Sample sku 2', qty: 'Sample qty 2' },
            ],
        });
    });

    it('keeps the block shape for a path used as value and loop', () => {
        const out = deriveEmailSample('{{#if variables.items}}{{#each variables.items}}{{name}}{{/each}}{{/if}}');
        expect(Array.isArray(out.items)).toBe(true);
    });

    it('ignores references outside variables', () => {
        expect(deriveEmailSample('{{foo}} {{#if bar}}{{/if}}')).toEqual({});
    });
});

describe('report preview example data (reports spec §3a)', () => {
    it('uses content first, then a typed example, and omits images', () => {
        const out = deriveReportSample({
            schemas: [[
                { name: 'title', type: 'text' },
                { name: 'preset', type: 'text', content: 'Preset' },
                { name: 'logo', type: 'image' },
                { name: 'mvt', type: 'multiVariableText', content: 'Hi {a}', variables: ['a'] },
            ]],
        });
        expect(out).toEqual({ title: 'Sample title', preset: 'Preset', mvt: '{"a":"Sample a"}' });
    });
});

describe('decision preview example data (decisions-dmn spec §5a)', () => {
    it('reads simple unary tests', () => {
        expect(valueFromCell('"gold"')).toBe('gold');
        expect(valueFromCell('>= 18')).toBe(18);
        expect(valueFromCell('< 5')).toBe(4);
        expect(valueFromCell('[1..10]')).toBe(1);
        expect(valueFromCell('"a","b"')).toBe('a');
    });

    it('derives from input expressions, first rule, then typeRef', () => {
        const xml = `<?xml version="1.0"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">
  <decision id="d"><decisionTable>
    <input><inputExpression typeRef="number"><text>customer.age</text></inputExpression></input>
    <input><inputExpression typeRef="string"><text>tier</text></inputExpression></input>
    <input><inputExpression typeRef="boolean"><text>active</text></inputExpression></input>
    <input><inputExpression typeRef="number"><text>sum(a, b)</text></inputExpression></input>
    <rule>
      <inputEntry><text>&gt;= 18</text></inputEntry>
      <inputEntry><text>"gold"</text></inputEntry>
      <inputEntry><text>-</text></inputEntry>
      <inputEntry><text>-</text></inputEntry>
    </rule>
  </decisionTable></decision>
</definitions>`;
        expect(deriveDmnSample(xml)).toEqual({ customer: { age: 18 }, tier: 'gold', active: true });
    });
});
