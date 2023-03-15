'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.renderValue =
  exports.renderInput =
  exports.Render =
  exports.vecForm =
  exports.optForm =
  exports.variantForm =
  exports.tupleForm =
  exports.recordForm =
  exports.inputBox =
    void 0;
const IDL = __importStar(require('./idl.js'));
const principal_1 = require('@dfinity/principal');
const UI = __importStar(require('./candid-core.js'));
const InputConfig = { parse: parsePrimitive };
const FormConfig = { render: renderInput };
const inputBox = (t, config) => {
  return new UI.InputBox(t, Object.assign(Object.assign({}, InputConfig), config));
};
exports.inputBox = inputBox;
const recordForm = (fields, config) => {
  return new UI.RecordForm(fields, Object.assign(Object.assign({}, FormConfig), config));
};
exports.recordForm = recordForm;
const tupleForm = (components, config) => {
  return new UI.TupleForm(components, Object.assign(Object.assign({}, FormConfig), config));
};
exports.tupleForm = tupleForm;
const variantForm = (fields, config) => {
  return new UI.VariantForm(fields, Object.assign(Object.assign({}, FormConfig), config));
};
exports.variantForm = variantForm;
const optForm = (ty, config) => {
  return new UI.OptionForm(ty, Object.assign(Object.assign({}, FormConfig), config));
};
exports.optForm = optForm;
const vecForm = (ty, config) => {
  return new UI.VecForm(ty, Object.assign(Object.assign({}, FormConfig), config));
};
exports.vecForm = vecForm;
class Render extends IDL.Visitor {
  visitType(t, d) {
    const input = document.createElement('input');
    input.classList.add('argument');
    input.placeholder = t.display();
    return (0, exports.inputBox)(t, { input });
  }
  visitNull(t, d) {
    return (0, exports.inputBox)(t, {});
  }
  visitRecord(t, fields, d) {
    let config = {};
    if (fields.length > 1) {
      const container = document.createElement('div');
      container.classList.add('popup-form');
      config = { container };
    }
    const form = (0, exports.recordForm)(fields, config);
    return (0, exports.inputBox)(t, { form });
  }
  visitTuple(t, components, d) {
    let config = {};
    if (components.length > 1) {
      const container = document.createElement('div');
      container.classList.add('popup-form');
      config = { container };
    }
    const form = (0, exports.tupleForm)(components, config);
    return (0, exports.inputBox)(t, { form });
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
    const form = (0, exports.variantForm)(fields, config);
    return (0, exports.inputBox)(t, { form });
  }
  visitOpt(t, ty, d) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('open');
    const form = (0, exports.optForm)(ty, { open: checkbox, event: 'change' });
    return (0, exports.inputBox)(t, { form });
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
    const form = (0, exports.vecForm)(ty, { open: len, event: 'change', container });
    return (0, exports.inputBox)(t, { form });
  }
  visitRec(t, ty, d) {
    return renderInput(ty);
  }
}
exports.Render = Render;
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
    return principal_1.Principal.fromText(v);
  }
  visitService(t, v) {
    return principal_1.Principal.fromText(v);
  }
  visitFunc(t, v) {
    const x = v.split('.', 2);
    return [principal_1.Principal.fromText(x[0]), x[1]];
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
function renderInput(t) {
  return t.accept(new Render(), null);
}
exports.renderInput = renderInput;
/**
 *
 * @param t an IDL Type
 * @param input an InputBox
 * @param value any
 * @returns rendering that value to the provided input
 */
function renderValue(t, input, value) {
  return t.accept(new RenderValue(), { input, value });
}
exports.renderValue = renderValue;
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
//# sourceMappingURL=candid-ui.js.map
