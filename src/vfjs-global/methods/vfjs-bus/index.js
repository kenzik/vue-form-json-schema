import Vue from 'vue';
import { isEqual, set } from 'lodash';
import {
  VFJS_EVENT_FIELD_MODEL_UPDATE,
  VFJS_EVENT_FIELD_MODEL_VALIDATE,
  VFJS_EVENT_FIELD_STATE_UPDATE,
  VFJS_EVENT_MODEL_UPDATED,
  VFJS_EVENT_MODEL_VALIDATE,
  VFJS_EVENT_STATE_UPDATED,
  VFJS_EXTERNAL_EVENT_CHANGE,
  VFJS_EXTERNAL_EVENT_STATE_CHANGE,
  VFJS_EXTERNAL_EVENT_VALIDATED,
} from '../../../constants';

const vfjsBus = {
  addVfjsListener(event, callback) {
    const listener = this.vfjsBus.$on(event, value => callback(event, value));
    this.vfjsListeners.push(listener);
  },
  addVfjsListeners(events = [], callback) {
    events.forEach(event => this.addVfjsListener(event, callback));
  },
  removeVfjsListener(event) {
    this.vfjsBus.$off(event);
  },
  removeVfjsListeners(events = []) {
    events.forEach(this.removeVfjsListener);
  },
  removeVfjsListenersAll() {
    this.vfjsBus.$off();
    this.vfjsListeners = [];
  },
  vfjsBusEventHandler(event, payload) {
    const eventActions = {
      [VFJS_EVENT_FIELD_MODEL_VALIDATE]: ({ key, value, cb }) => {
        const vfjsFieldModel = this.getVfjsFieldModel(key);
        const vfjsModel = this.vfjsHelperApplyFieldModel(key, value);

        this.vfjsBus.$emit(VFJS_EVENT_MODEL_VALIDATE, {
          vfjsModel,
          cb: (vfjsErrors) => {
            const vfjsFieldErrors = this.getVfjsFieldModelValidationErrors(key, value);
            const newFieldState = Object.assign({}, this.getVfjsFieldState(key), {
              $dirty: !isEqual(vfjsFieldModel, value),
              vfjsFieldErrors,
            });

            this.setVfjsFieldState(newFieldState, key);

            if (cb && typeof cb === 'function') {
              cb(vfjsFieldErrors);
            }
          },
        });
      },
      [VFJS_EVENT_FIELD_MODEL_UPDATE]: ({ key, value, cb }) => {
        this.vfjsBus.$emit(VFJS_EVENT_FIELD_MODEL_VALIDATE, {
          key,
          value,
          cb: (errors) => {
            const vfjsFieldModel = this.getVfjsFieldModel(key);
            const newFieldState = Object.assign({}, this.getVfjsFieldState(key), {
              $dirty: !isEqual(vfjsFieldModel, value),
              errors,
              updatedAt: Date.now(),
            });

            this.setVfjsFieldState(newFieldState, key);

            if (!errors || (errors && errors.length === 0) || this.vfjsOptions.allowInvalidModel) {
              const newModel = this.vfjsHelperApplyFieldModel(key, value);
              this.setVfjsModel(newModel);
            }

            if (cb && typeof cb === 'function') {
              cb(errors);
            }
          },
        });
      },
      [VFJS_EVENT_FIELD_STATE_UPDATE]: ({ key, value }) => {
        const newVfjsState = Object.assign({}, this.getVfjsState());
        set(newVfjsState, key, value);
        this.setVfjsState(newVfjsState);

        this.setVfjsUiFieldsActive();
      },
      [VFJS_EVENT_MODEL_VALIDATE]: ({ vfjsModel, cb }) => {
        const vfjsErrors = this.getVfjsValidationErrors(vfjsModel);
        const newState = Object.assign({}, this.getVfjsState(), {
          vfjsErrors,
        });
        this.setVfjsState(newState);

        const vfjsState = this.getVfjsState();
        this.$emit(VFJS_EXTERNAL_EVENT_VALIDATED, vfjsState.vfjsErrors.length === 0);

        if (cb && typeof cb === 'function') {
          cb(vfjsErrors);
        }
      },
      [VFJS_EVENT_MODEL_UPDATED]: () => {
        this.setVfjsUiFieldsActive();
        this.$emit(VFJS_EXTERNAL_EVENT_CHANGE, this.getVfjsModel());
      },
      [VFJS_EVENT_STATE_UPDATED]: () => {
        this.$emit(VFJS_EXTERNAL_EVENT_STATE_CHANGE, this.getVfjsState());
      },
    };

    if (event && event in eventActions) {
      eventActions[event](payload);
    }
  },
  vfjsBusInitialize() {
    this.vfjsBus = new Vue();
  },
};

export default vfjsBus;
