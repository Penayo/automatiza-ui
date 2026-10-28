<template>
    <component :is="elementLayout" ref="container">
        <template #element>
            <div
                class="vf-input-group"
                :class="{ 'vf-input-group-disabled': isDisabled, 'vf-input-group-focused': editing }"
            >
                <input
                    :id="fieldId"
                    class="vf-input-field vf-amount-input"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    :name="name"
                    :value="text"
                    :placeholder="placeholder || undefined"
                    :disabled="isDisabled"
                    :readonly="readonly"
                    @focus="onFocus"
                    @input="draft = $event.target.value"
                    @blur="onBlur"
                    @keydown.enter.prevent="$event.target.blur()"
                />
            </div>
        </template>
    </component>
</template>

<script>
/**
 * AmountElement — a number people read grouped (forms spec §5.6).
 *
 * The value is always a plain number or null: formatting is a display concern only, so
 * SUM_FIELD, expressions and the engine never meet "1,234.50". While focused the input
 * shows the bare number for editing; on blur the typed text is parsed, rounded to
 * `decimals` and shown formatted again.
 */
import { computed, ref } from 'vue';
import { defineElement } from '@vueform/vueform';
import {
    formatCurrency, formatNumber, parseNumber, plainNumber, roundTo, toNumber,
} from '@/utils/valueFormat';

export default defineElement({
    name: 'AmountElement',

    /** Same reason as DataTableElement: Vueform's class merger needs a container key. */
    data() {
        return {
            merge: true,
            defaultClasses: { container: '' },
        };
    },

    props: {
        /** ISO 4217 code. Set, the value shows as money; unset, as a grouped number. */
        currency: {
            required: false,
            type: [String],
            default: null,
        },
        decimals: {
            required: false,
            type: [Number, String],
            default: 2,
        },
        placeholder: {
            required: false,
            type: [String],
            default: null,
        },
        readonly: {
            required: false,
            type: [Boolean],
            default: false,
        },
    },

    setup(props, context) {
        const { value, update, isDisabled, fieldId } = context.element;

        const editing = ref(false);
        const draft = ref('');

        // A builder text field may hand over "2"; anything unreadable falls back to 2.
        const digits = computed(() => {
            const n = Number(props.decimals);
            return Number.isInteger(n) && n >= 0 && n <= 20 ? n : 2;
        });

        const text = computed(() => {
            if (editing.value) return draft.value;
            return props.currency
                ? formatCurrency(value.value, props.currency)
                : formatNumber(value.value, digits.value);
        });

        function onFocus() {
            if (props.readonly) return;
            draft.value = plainNumber(value.value);
            editing.value = true;
        }

        function onBlur() {
            if (!editing.value) return;
            editing.value = false;
            const parsed = parseNumber(draft.value);
            const next = parsed === null ? null : roundTo(parsed, digits.value);
            if (next !== toNumber(value.value)) update(next);
        }

        return { editing, draft, text, onFocus, onBlur, isDisabled, fieldId };
    },
});
</script>

<style>
/* Not scoped, for the same reason as DataTableElement's styles. */
.vf-amount-input {
    text-align: right;
    font-variant-numeric: tabular-nums;
}
</style>
