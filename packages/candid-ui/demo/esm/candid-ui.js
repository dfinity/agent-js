import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import * as UI from './candid-core';
const InputConfig = { parse: parsePrimitive };
const FormConfig = { render: renderInput };
export const inputBox = (t, config) => {
  return new UI.InputBox(t, { ...InputConfig, ...config });
};
export const recordForm = (fields, config) => {
  return new UI.RecordForm(fields, { ...FormConfig, ...config });
};
export const tupleForm = (components, config) => {
  return new UI.TupleForm(components, { ...FormConfig, ...config });
};
export const variantForm = (fields, config) => {
  return new UI.VariantForm(fields, { ...FormConfig, ...config });
};
export const optForm = (ty, config) => {
  return new UI.OptionForm(ty, { ...FormConfig, ...config });
};
export const vecForm = (ty, config) => {
  return new UI.VecForm(ty, { ...FormConfig, ...config });
};
export class Render extends IDL.Visitor {
  visitType(t, d) {
    const input = document.createElement('input');
    input.classList.add('argument');
    input.placeholder = t.display();
    return inputBox(t, { input });
  }
  visitNull(t, d) {
    return inputBox(t, {});
  }
  visitRecord(t, fields, d) {
    let config = {};
    if (fields.length > 1) {
      const container = document.createElement('div');
      container.classList.add('popup-form');
      config = { container };
    }
    const form = recordForm(fields, config);
    return inputBox(t, { form });
  }
  visitTuple(t, components, d) {
    let config = {};
    if (components.length > 1) {
      const container = document.createElement('div');
      container.classList.add('popup-form');
      config = { container };
    }
    const form = tupleForm(components, config);
    return inputBox(t, { form });
  }
  visitVariant(t, fields, d) {
    const select = document.createElement('select');
    for (const [key, type] of fields) {
      const option = new Option(key);
      select.add(option);
    }
    select.selectedIndex = -1;
    select.classList.add('open');
    const config = { open: select, event: 'change' };
    const form = variantForm(fields, config);
    return inputBox(t, { form });
  }
  visitOpt(t, ty, d) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('open');
    const form = optForm(ty, { open: checkbox, event: 'change' });
    return inputBox(t, { form });
  }
  visitVec(t, ty, d) {
    const len = document.createElement('input');
    len.type = 'number';
    len.min = '0';
    len.max = '100';
    len.style.width = '8rem';
    len.placeholder = 'len';
    len.classList.add('open');
    const container = document.createElement('div');
    container.classList.add('popup-form');
    const form = vecForm(ty, { open: len, event: 'change', container });
    return inputBox(t, { form });
  }
  visitRec(t, ty, d) {
    return renderInput(ty);
  }
}
class Parse extends IDL.Visitor {
  visitNull(t, v) {
    return null;
  }
  visitBool(t, v) {
    if (v === 'true') {
      return true;
    }
    if (v === 'false') {
      return false;
    }
    throw new Error(`Cannot parse ${v} as boolean`);
  }
  visitText(t, v) {
    return v;
  }
  visitFloat(t, v) {
    return parseFloat(v);
  }
  visitFixedInt(t, v) {
    if (t._bits <= 32) {
      return parseInt(v, 10);
    } else {
      return BigInt(v);
    }
  }
  visitFixedNat(t, v) {
    if (t._bits <= 32) {
      return parseInt(v, 10);
    } else {
      return BigInt(v);
    }
  }
  visitNumber(t, v) {
    return BigInt(v);
  }
  visitPrincipal(t, v) {
    return Principal.fromText(v);
  }
  visitService(t, v) {
    return Principal.fromText(v);
  }
  visitFunc(t, v) {
    const x = v.split('.', 2);
    return [Principal.fromText(x[0]), x[1]];
  }
}
class Random extends IDL.Visitor {
  visitNull(t, v) {
    return null;
  }
  visitBool(t, v) {
    return Math.random() < 0.5;
  }
  visitText(t, v) {
    return Math.random().toString(36).substring(6);
  }
  visitFloat(t, v) {
    return Math.random();
  }
  visitInt(t, v) {
    return BigInt(this.generateNumber(true));
  }
  visitNat(t, v) {
    return BigInt(this.generateNumber(false));
  }
  visitFixedInt(t, v) {
    const x = this.generateNumber(true);
    if (t._bits <= 32) {
      return x;
    } else {
      return BigInt(v);
    }
  }
  visitFixedNat(t, v) {
    const x = this.generateNumber(false);
    if (t._bits <= 32) {
      return x;
    } else {
      return BigInt(v);
    }
  }
  generateNumber(signed) {
    const num = Math.floor(Math.random() * 100);
    if (signed && Math.random() < 0.5) {
      return -num;
    } else {
      return num;
    }
  }
}
function parsePrimitive(t, config, d) {
  if (config.random && d === '') {
    return t.accept(new Random(), d);
  } else {
    return t.accept(new Parse(), d);
  }
}
/**
 *
 * @param t an IDL type
 * @returns an input for that type
 */
export function renderInput(t) {
  return t.accept(new Render(), null);
}
/**
 *
 * @param t an IDL Type
 * @param input an InputBox
 * @param value any
 * @returns rendering that value to the provided input
 */
export function renderValue(t, input, value) {
  return t.accept(new RenderValue(), { input, value });
}
class RenderValue extends IDL.Visitor {
  visitType(t, d) {
    d.input.ui.input.value = t.valueToString(d.value);
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  visitNull(t, d) {}
  visitText(t, d) {
    d.input.ui.input.value = d.value;
  }
  visitRec(t, ty, d) {
    renderValue(ty, d.input, d.value);
  }
  visitOpt(t, ty, d) {
    if (d.value.length === 0) {
      return;
    } else {
      const form = d.input.ui.form;
      const open = form.ui.open;
      open.checked = true;
      open.dispatchEvent(new Event(form.ui.event));
      renderValue(ty, form.form[0], d.value[0]);
    }
  }
  visitRecord(t, fields, d) {
    const form = d.input.ui.form;
    fields.forEach(([key, type], i) => {
      renderValue(type, form.form[i], d.value[key]);
    });
  }
  visitTuple(t, components, d) {
    const form = d.input.ui.form;
    components.forEach((type, i) => {
      renderValue(type, form.form[i], d.value[i]);
    });
  }
  visitVariant(t, fields, d) {
    const form = d.input.ui.form;
    const selected = Object.entries(d.value)[0];
    fields.forEach(([key, type], i) => {
      if (key === selected[0]) {
        const open = form.ui.open;
        open.selectedIndex = i;
        open.dispatchEvent(new Event(form.ui.event));
        renderValue(type, form.form[0], selected[1]);
      }
    });
  }
  visitVec(t, ty, d) {
    const form = d.input.ui.form;
    const len = d.value.length;
    const open = form.ui.open;
    open.value = len;
    open.dispatchEvent(new Event(form.ui.event));
    d.value.forEach((v, i) => {
      renderValue(ty, form.form[i], v);
    });
  }
}
