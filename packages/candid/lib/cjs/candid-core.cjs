'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.VecForm =
  exports.OptionForm =
  exports.VariantForm =
  exports.TupleForm =
  exports.RecordForm =
  exports.InputForm =
  exports.InputBox =
    void 0;
class InputBox {
  constructor(idl, ui) {
    this.idl = idl;
    this.ui = ui;
    this.label = null;
    this.value = undefined;
    const status = document.createElement('span');
    status.className = 'status';
    this.status = status;
    if (ui.input) {
      ui.input.addEventListener('blur', () => {
        if (ui.input.value === '') {
          return;
        }
        this.parse();
      });
      ui.input.addEventListener('input', () => {
        status.style.display = 'none';
        ui.input.classList.remove('reject');
      });
    }
  }
  isRejected() {
    return this.value === undefined;
  }
  parse(config = {}) {
    if (this.ui.form) {
      const value = this.ui.form.parse(config);
      this.value = value;
      return value;
    }
    if (this.ui.input) {
      const input = this.ui.input;
      try {
        const value = this.ui.parse(this.idl, config, input.value);
        if (!this.idl.covariant(value)) {
          throw new Error(`${input.value} is not of type ${this.idl.display()}`);
        }
        this.status.style.display = 'none';
        this.value = value;
        return value;
      } catch (err) {
        input.classList.add('reject');
        this.status.style.display = 'block';
        this.status.innerHTML = 'InputError: ' + err.message;
        this.value = undefined;
        return undefined;
      }
    }
    return null;
  }
  render(dom) {
    const container = document.createElement('span');
    if (this.label) {
      const label = document.createElement('label');
      label.innerText = this.label;
      container.appendChild(label);
    }
    if (this.ui.input) {
      container.appendChild(this.ui.input);
      container.appendChild(this.status);
    }
    if (this.ui.form) {
      this.ui.form.render(container);
    }
    dom.appendChild(container);
  }
}
exports.InputBox = InputBox;
class InputForm {
  constructor(ui) {
    this.ui = ui;
    this.form = [];
  }
  renderForm(dom) {
    if (this.ui.container) {
      this.form.forEach(e => e.render(this.ui.container));
      dom.appendChild(this.ui.container);
    } else {
      this.form.forEach(e => e.render(dom));
    }
  }
  render(dom) {
    if (this.ui.open && this.ui.event) {
      dom.appendChild(this.ui.open);
      const form = this;
      // eslint-disable-next-line
      form.ui.open.addEventListener(form.ui.event, () => {
        // Remove old form
        if (form.ui.container) {
          form.ui.container.innerHTML = '';
        } else {
          const oldContainer = form.ui.open.nextElementSibling;
          if (oldContainer) {
            oldContainer.parentNode.removeChild(oldContainer);
          }
        }
        // Render form
        form.generateForm();
        form.renderForm(dom);
      });
    } else {
      this.generateForm();
      this.renderForm(dom);
    }
  }
}
exports.InputForm = InputForm;
class RecordForm extends InputForm {
  constructor(fields, ui) {
    super(ui);
    this.fields = fields;
    this.ui = ui;
  }
  generateForm() {
    this.form = this.fields.map(([key, type]) => {
      const input = this.ui.render(type);
      // eslint-disable-next-line
      if (this.ui.labelMap && this.ui.labelMap.hasOwnProperty(key)) {
        input.label = this.ui.labelMap[key] + ' ';
      } else {
        input.label = key + ' ';
      }
      return input;
    });
  }
  parse(config) {
    const v = {};
    this.fields.forEach(([key, _], i) => {
      const value = this.form[i].parse(config);
      v[key] = value;
    });
    if (this.form.some(input => input.isRejected())) {
      return undefined;
    }
    return v;
  }
}
exports.RecordForm = RecordForm;
class TupleForm extends InputForm {
  constructor(components, ui) {
    super(ui);
    this.components = components;
    this.ui = ui;
  }
  generateForm() {
    this.form = this.components.map(type => {
      const input = this.ui.render(type);
      return input;
    });
  }
  parse(config) {
    const v = [];
    this.components.forEach((_, i) => {
      const value = this.form[i].parse(config);
      v.push(value);
    });
    if (this.form.some(input => input.isRejected())) {
      return undefined;
    }
    return v;
  }
}
exports.TupleForm = TupleForm;
class VariantForm extends InputForm {
  constructor(fields, ui) {
    super(ui);
    this.fields = fields;
    this.ui = ui;
  }
  generateForm() {
    const index = this.ui.open.selectedIndex;
    const [_, type] = this.fields[index];
    const variant = this.ui.render(type);
    this.form = [variant];
  }
  parse(config) {
    const select = this.ui.open;
    const selected = select.options[select.selectedIndex].value;
    const value = this.form[0].parse(config);
    if (value === undefined) {
      return undefined;
    }
    const v = {};
    v[selected] = value;
    return v;
  }
}
exports.VariantForm = VariantForm;
class OptionForm extends InputForm {
  constructor(ty, ui) {
    super(ui);
    this.ty = ty;
    this.ui = ui;
  }
  generateForm() {
    if (this.ui.open.checked) {
      const opt = this.ui.render(this.ty);
      this.form = [opt];
    } else {
      this.form = [];
    }
  }
  parse(config) {
    if (this.form.length === 0) {
      return [];
    } else {
      const value = this.form[0].parse(config);
      if (value === undefined) {
        return undefined;
      }
      return [value];
    }
  }
}
exports.OptionForm = OptionForm;
class VecForm extends InputForm {
  constructor(ty, ui) {
    super(ui);
    this.ty = ty;
    this.ui = ui;
  }
  generateForm() {
    const len = +this.ui.open.value;
    this.form = [];
    for (let i = 0; i < len; i++) {
      const t = this.ui.render(this.ty);
      this.form.push(t);
    }
  }
  parse(config) {
    const value = this.form.map(input => {
      return input.parse(config);
    });
    if (this.form.some(input => input.isRejected())) {
      return undefined;
    }
    return value;
  }
}
exports.VecForm = VecForm;
//# sourceMappingURL=candid-core.js.map
