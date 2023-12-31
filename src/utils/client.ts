import { v4 as uuidv4 } from 'uuid';

import * as errors from './error';
import {
  fieldValues,
  filePathMap,
  initFormsPromise,
  initInfo,
  initState
} from './init';
import { dataURLToFile, isBase64Image } from './image';
import { encodeGetParams } from './primitives';
import {
  getABVariant,
  getDefaultFormFieldValue,
  updateSessionValues
} from './formHelperFunctions';
import { loadPhoneValidator } from './validation';
import { initializeIntegrations } from '../integrations/utils';
import { loadLottieLight } from '../elements/components/Lottie';
import { featheryDoc } from './browser';
import { authState } from '../auth/LoginForm';
import { parseError } from './error';

// Convenience boolean for urls - manually change for testing
export const API_URL_OPTIONS = {
  local: 'http://localhost:8006/api/',
  staging: 'https://staging.feathery.io/api/',
  production: 'https://api.feathery.io/api/',
  productionAU: 'https://api-au.feathery.io/api/',
  productionEU: 'https://api-eu.feathery.io/api/'
};

const CDN_URL_OPTIONS = {
  local: 'http://localhost:8006/api/',
  staging: 'https://staging.feathery.io/api/',
  production: 'https://cdn.feathery.io/api/',
  productionAU: 'https://cdn-au.feathery.io/api/',
  productionEU: 'https://cdn-eu.feathery.io/api/'
};

const environment = 'production';

export let API_URL = API_URL_OPTIONS[environment];
export let CDN_URL = CDN_URL_OPTIONS[environment];

export const updateRegionApiUrls = (region: string) => {
  if (region === 'au') {
    CDN_URL = CDN_URL_OPTIONS.productionAU;
    API_URL = API_URL_OPTIONS.productionAU;
  } else if (region === 'eu') {
    CDN_URL = CDN_URL_OPTIONS.productionEU;
    API_URL = API_URL_OPTIONS.productionEU;
  }
};

const TYPE_MESSAGES_TO_IGNORE = [
  // e.g. https://sentry.io/organizations/feathery-forms/issues/3571287943/
  'Failed to fetch',
  // e.g. https://sentry.io/organizations/feathery-forms/issues/3529742129/
  'Load failed'
];

export default class Client {
  formKey: string;
  version?: string;
  ignoreNetworkErrors: any; // this should be a ref
  draft: boolean;
  bypassCDN: boolean;
  constructor(
    formKey = '',
    ignoreNetworkErrors?: any,
    draft = false,
    bypassCDN = false
  ) {
    this.formKey = formKey;
    this.ignoreNetworkErrors = ignoreNetworkErrors;
    this.draft = draft;
    this.bypassCDN = bypassCDN;
  }

  async _checkResponseSuccess(response: any) {
    let payload;
    switch (response.status) {
      case 200:
      case 201:
        return;
      case 400:
        payload = JSON.stringify(await response.clone().text());
        throw new errors.FetchError(`Invalid parameters: ${payload}`, payload);
      case 401:
        throw new errors.SDKKeyError();
      case 404:
        throw new errors.FetchError("Can't find object");
      case 409:
        location.reload();
        return;
      case 500:
        throw new errors.FetchError('Internal server error');
      default:
        throw new errors.FetchError('Unknown error');
    }
  }

  _fetch(url: any, options: any, parseResponse = true) {
    const { sdkKey } = initInfo();
    const { headers, ...otherOptions } = options;
    options = {
      cache: 'no-store',
      // Write requests must succeed so data is tracked
      keepalive: ['POST', 'PATCH', 'PUT'].includes(options.method),
      headers: {
        Authorization: 'Token ' + sdkKey,
        ...headers
      },
      ...otherOptions
    };
    return fetch(url, options)
      .then(async (response) => {
        if (parseResponse) await this._checkResponseSuccess(response);
        return response;
      })
      .catch((e) => {
        // Ignore TypeErrors if form has redirected because `fetch` in
        // Safari will error after redirect
        if (
          (this.ignoreNetworkErrors?.current ||
            TYPE_MESSAGES_TO_IGNORE.includes(e.message)) &&
          e instanceof TypeError
        )
          return;
        throw e;
      });
  }

  _submitJSONData(servars: any, stepKey: string, noComplete: boolean) {
    const { userId, collaboratorId } = initInfo();
    const url = `${API_URL}panel/step/submit/v3/`;
    const data: Record<string, any> = {
      fuser_key: userId,
      step_key: stepKey,
      servars,
      panel_key: this.formKey,
      __feathery_version: this.version,
      draft: this.draft,
      no_complete: noComplete
    };
    if (collaboratorId) data.collaborator = collaboratorId;

    const options = {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(data)
    };
    return this._fetch(url, options);
  }

  async _getFileValue(servar: any) {
    let fileValue;
    if ('file_upload' in servar) {
      fileValue = servar.file_upload;
    } else if ('signature' in servar) {
      fileValue = servar.signature;
    }

    if (!fileValue) {
      return null;
    }

    // If we've already stored the file from a previous session
    // There will be an entry in filePathMap for it
    // If so we just need to send the S3 path to the backend, not the full file
    const resolveFile = async (file: any, index = null) => {
      let path = filePathMap[servar.key];
      if (path && index !== null) path = path[index];
      return path ?? (await file);
    };
    return Array.isArray(fileValue)
      ? // @ts-expect-error TS(2345): Argument of type '(file: any, index?: null) => Pro... Remove this comment to see the full error message
        Promise.all(fileValue.map(resolveFile))
      : resolveFile(fileValue);
  }

  async _submitFileData(servar: any) {
    const { userId } = initInfo();
    const url = `${API_URL}panel/step/submit/file/${userId}/`;

    const formData = new FormData();
    const fileValue = await this._getFileValue(servar);

    if (fileValue) {
      if (Array.isArray(fileValue)) {
        fileValue
          .filter((file) => !!file)
          .forEach((file) => formData.append(servar.key, file));
      } else {
        formData.append(servar.key, fileValue);
      }
    }

    formData.set('__feathery_form_key', this.formKey);
    if (this.version) formData.set('__feathery_version', this.version);
    await this._fetch(url, {
      method: 'POST',
      body: formData,
      // In Safari, request fails with keepalive = true if over 64kb payload.
      keepalive: false
    });
  }

  updateUserId(newUserId: any, merge = false) {
    const { userId: oldUserId } = initInfo();
    const data = {
      new_fuser_key: newUserId,
      merge,
      ...(oldUserId ? { fuser_key: oldUserId } : {})
    };
    const url = `${API_URL}fuser/update_key/`;
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
      body: JSON.stringify(data)
    };
    return this._fetch(url, options);
  }

  setDefaultFormValues({ steps, additionalValues }: any) {
    const values: Record<string, any> = {};
    steps.forEach((step: any) => {
      step.servar_fields.forEach((field: any) => {
        const servar = field.servar;
        if (isBase64Image(additionalValues[servar.key])) {
          // All base64 strings need to be wrapped in a File
          additionalValues[servar.key] = dataURLToFile(
            additionalValues[servar.key],
            `${servar.key}.png`
          );
        }

        values[servar.key] = getDefaultFormFieldValue(field);
      });
    });
    Object.assign(fieldValues, {
      ...values,
      ...additionalValues,
      ...fieldValues
    });
  }

  _loadFormPackages(res: any) {
    // Load default fonts
    if (res.fonts.length && global.webfontloaderPromise) {
      global.webfontloaderPromise.then((WebFont: any) => {
        WebFont.load({ google: { families: res.fonts } });
      });
    }
    // Load user-uploaded fonts
    Object.entries(res.uploaded_fonts).forEach(([family, fontStyles]) => {
      (fontStyles as any).forEach(({ source, style, weight }: any) =>
        new FontFace(family, `url(${source})`, { style, weight })
          .load()
          .then((font) => featheryDoc().fonts.add(font))
          .catch((e) => console.warn(e))
      );
    });
    // Load Lottie if form needs animations
    let needLottie = false;
    // Load phone number validator for phone and login fields
    let needPhoneVal = false;

    res.steps.some((step: any) => {
      // If we've loaded everything available, we don't need to keep looking
      if (needLottie && needPhoneVal) return true;
      step.buttons.some((button: any) => {
        if (needLottie) return true; // Already loaded
        const { loading_icon: li, loading_icon_type: lit } = button.properties;
        needLottie = li && lit === 'application/json';
        if (needLottie) loadLottieLight();
      });
      step.servar_fields.some((field: any) => {
        if (needPhoneVal) return true; // Already loaded
        needPhoneVal = ['phone', 'phone_number'].includes(field.servar.type);
        if (needPhoneVal) loadPhoneValidator();
      });
    });
  }

  fetchCacheForm(formLanguage?: string) {
    const { preloadForms, language: globalLanguage, theme } = initInfo();
    if (!formLanguage && this.formKey in preloadForms)
      return Promise.resolve(preloadForms[this.formKey]);

    const params = encodeGetParams({
      form_key: this.formKey,
      draft: this.draft,
      theme
    });
    const baseURL = this.bypassCDN ? API_URL : CDN_URL;
    const url = `${baseURL}panel/v19/?${params}`;
    const options: Record<string, any> = {
      importance: 'high',
      headers: { 'Accept-Encoding': 'gzip' }
    };
    const language = formLanguage ?? globalLanguage;
    if (language) options.headers['Accept-Language'] = language;

    return this._fetch(url, options).then(async (response) => {
      if (!response) return {};

      const res = await response.json();
      if (res.data) {
        res.steps = getABVariant(res);
        delete res.data;
        this._loadFormPackages(res);
      }
      initState.defaultErrors = res.default_errors;
      initState.isTestEnv = !res.production;
      return res;
    });
  }

  async fetchForm(initVals: any, language?: string) {
    const res = await this.fetchCacheForm(language);
    // If form is disabled, data will equal `null`
    if (!res.steps) return { steps: [], formOff: true };
    this.version = res.version;
    this.setDefaultFormValues({ steps: res.steps, additionalValues: initVals });
    return res;
  }

  async fetchSession(formPromise = null, block = false) {
    // Block if there's a chance user id isn't available yet
    await (block ? initFormsPromise : Promise.resolve());
    const {
      userId,
      collaboratorId,
      overrideUserId,
      formSessions,
      fieldValuesInitialized: noData
    } = initInfo();

    if (this.formKey in formSessions) {
      const formData = await (formPromise ?? Promise.resolve());
      return [formSessions[this.formKey], formData];
    }

    initState.fieldValuesInitialized = true;
    let params: Record<string, any> = {
      form_key: this.formKey,
      draft: this.draft,
      override: overrideUserId
    };
    if (userId) params.fuser_key = userId;
    if (collaboratorId) params.collaborator = collaboratorId;
    if (authState.authId) params.auth_id = authState.authId;
    if (noData) params.no_data = 'true';
    // @ts-expect-error TS(2322): Type 'string' is not assignable to type '{ form_ke... Remove this comment to see the full error message
    params = encodeGetParams(params);
    const url = `${API_URL}panel/session/v2/?${params}`;
    const options = { importance: 'high' };

    const response = await this._fetch(url, options);
    if (!response) return [];

    const session = await response.json().catch((reason) => {
      throw new Error(
        reason + ' ' + userId + ' ' + this.formKey + response.status
      );
    });

    // Turn form off if invalid collaborator for submission
    if (session.collaborator?.invalid) return [];

    // If tracking disabled or ID overridden, update user id from backend
    if (!noData && session.new_user_id) initState.userId = session.new_user_id;

    // Auth session only contains new field data
    const authSession = await initializeIntegrations(
      session.integrations,
      this
    );

    const trueSession = { ...session, ...authSession };
    if (!noData) updateSessionValues(trueSession);

    // submitAuthInfo can set formCompleted before the session is set, so we don't want to override completed flags
    if (initState.formSessions[this.formKey]?.form_completed)
      trueSession.form_completed = true;
    initState.formSessions[this.formKey] = trueSession;

    const formData = await (formPromise ?? Promise.resolve());
    return [trueSession, formData];
  }

  async submitAuthInfo({
    authId,
    authData = {},
    isStytchTemplateKey = false
  }: any) {
    const { userId } = initInfo();
    await authState.onLogin();

    const data = {
      auth_id: authId,
      auth_data: authData,
      is_stytch_template_key: isStytchTemplateKey,
      ...(userId ? { fuser_key: userId } : {})
    };
    const url = `${API_URL}panel/update_auth/v2/`;
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
      body: JSON.stringify(data)
    };
    return this._fetch(url, options)
      .then((response) => {
        return response ? response.json() : Promise.resolve();
      })
      .then((data: any) => {
        if (data === undefined) return Promise.resolve();
        data.completed_forms.forEach((formKey: string) => {
          if (!initState.formSessions[formKey])
            initState.formSessions[formKey] = {};
          initState.formSessions[formKey].form_completed = true;
        });
        // Need to wait until form_completed has been fetched before setting
        // authId, otherwise we would flash the onboarding questions before
        // LoginForm renders its children
        authState.setAuthId(authId);
        return Promise.resolve(data);
      });
  }

  async submitCustom(customKeyValues: any, override = true) {
    if (this.draft) return;
    if (Object.keys(customKeyValues).length === 0) return;

    const { userId } = initInfo();
    const url = `${API_URL}panel/custom/submit/v3/`;

    const jsonKeyVals: Record<string, any> = {};
    const formData = new FormData();

    await Promise.all(
      Object.entries(customKeyValues).map(async ([key, entry]) => {
        if (Array.isArray(entry)) {
          // Need to resolve the promises for successful file upload.
          const vals = await Promise.all(entry);
          if (vals.some((val) => val instanceof Blob)) {
            vals.forEach((val) => {
              formData.append('files', val);
              formData.append('file_keys', key);
            });
            return;
          }
        }

        entry = await entry;
        if (entry instanceof Blob) {
          formData.append('files', entry);
          formData.append('file_keys', key);
          return;
        }

        jsonKeyVals[key] = entry;
      })
    );

    formData.set('custom_key_values', JSON.stringify(jsonKeyVals));
    // @ts-expect-error TS(2345): Argument of type 'boolean' is not assignable to pa... Remove this comment to see the full error message
    formData.set('override', override);
    if (this.formKey) {
      formData.set('form_key', this.formKey);
      if (this.version) formData.set('__feathery_version', this.version);
    }
    if (userId) formData.set('fuser_key', userId);

    return this._fetch(url, { method: 'POST', body: formData });
  }

  // servars = [{key: <servarKey>, <type>: <value>}]
  submitStep(servars: any, stepKey: string, hasNext: boolean) {
    if (this.draft) return Promise.resolve();
    const isFileServar = (servar: any) =>
      ['file_upload', 'signature'].some((type) => type in servar);
    const jsonServars = servars.filter((servar: any) => !isFileServar(servar));
    const fileServars = servars.filter(isFileServar);
    return Promise.all([
      this._submitJSONData(jsonServars, stepKey, hasNext),
      ...fileServars.map((servar: any) => this._submitFileData(servar))
    ]);
  }

  async registerEvent(eventData: any, promise: any = null) {
    await initFormsPromise;
    const { userId, collaboratorId } = initInfo();

    const url = `${API_URL}event/`;
    const data: Record<string, string> = {
      form_key: this.formKey,
      ...eventData,
      ...(userId ? { fuser_key: userId } : {})
    };
    if (collaboratorId) data.collaborator = collaboratorId;
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(data)
    };
    // no events for draft
    promise = promise || Promise.resolve();
    return promise.then(() => !this.draft && this._fetch(url, options));
  }

  // Logic custom APIs
  runCustomRequest(
    method: string,
    url: string,
    userData: Record<string, any> | any[],
    headers: Record<string, string>
  ) {
    const { userId } = initInfo();
    const data = {
      fuser_key: userId,
      form_key: this.formKey,
      method,
      url,
      user_data: userData,
      headers
    };
    return this._fetch(`${API_URL}custom_request/`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(data)
    }).then((response) => (response ? response.json() : Promise.resolve()));
  }

  // Collaboration
  async verifyCollaborator(email: string) {
    const { userId, collaboratorId } = initInfo();
    const params: Record<string, any> = { fuser_key: userId, email };
    if (collaboratorId) params.collaborator = collaboratorId;
    const url = `${API_URL}collaborator/verify/?${encodeGetParams(params)}`;
    return this._fetch(url, {}).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  async inviteCollaborator(email: string, templateId: string) {
    const { userId, collaboratorId } = initInfo();
    const data: Record<string, any> = {
      form_key: this.formKey,
      fuser_key: userId,
      email,
      template_id: templateId
    };
    if (collaboratorId) data.collaborator = collaboratorId;
    const url = `${API_URL}collaborator/invite/`;
    return this._fetch(
      url,
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(data)
      },
      false
    ).then(async (response) => {
      if (response) {
        if (response.ok) return await response.json();
        else throw Error(parseError(await response.json()));
      }
    });
  }

  // THIRD-PARTY INTEGRATIONS
  async fetchPlaidLinkToken(includeLiabilities: boolean) {
    await initFormsPromise;
    const { userId } = initInfo();
    const params = encodeGetParams({
      form_key: this.formKey,
      fuser_key: userId,
      liabilities: includeLiabilities ? 'true' : 'false'
    });
    const url = `${API_URL}plaid/link_token/?${params}`;
    return this._fetch(url, {}).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  async submitPlaidUserData(publicToken: string) {
    await initFormsPromise;
    const { userId } = initInfo();
    const url = `${API_URL}plaid/user_data/`;
    const data = {
      public_token: publicToken,
      form_key: this.formKey,
      fuser_key: userId
    };
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(data)
    };
    return this._fetch(url, options).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  async fetchArgyleUserToken() {
    await initFormsPromise;
    const { userId } = initInfo();
    const params = encodeGetParams({
      form_key: this.formKey,
      fuser_key: userId
    });
    const url = `${API_URL}argyle/user_token/?${params}`;
    const options = { headers: { 'Content-Type': 'application/json' } };
    return this._fetch(url, options).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  addressSearchResults(searchTerm: any) {
    const params = encodeGetParams({ search_term: searchTerm });
    const url = `${API_URL}integration/address/search/?${params}`;
    const options = { headers: { 'Content-Type': 'application/json' } };
    return this._fetch(url, options).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  addressDetail(addressId: any) {
    const params = encodeGetParams({ address_id: addressId });
    const url = `${API_URL}integration/address/detail/?${params}`;
    const options = { headers: { 'Content-Type': 'application/json' } };
    return this._fetch(url, options).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  verifyRecaptchaToken(token: string) {
    const url = `${API_URL}google/recaptcha/verify/`;
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ token })
    };
    return this._fetch(url, options).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  // Stripe
  async setupPaymentIntent(paymentMethodFieldId: any) {
    await initFormsPromise;
    const { userId } = initInfo();
    const url = `${API_URL}stripe/payment_method/`;
    const data = {
      form_key: this.formKey,
      ...(userId ? { user_id: userId } : {}),
      field_id: paymentMethodFieldId
    };
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(data)
    };
    return this._fetch(url, options).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  // Stripe
  async retrievePaymentMethodData(
    paymentMethodFieldId: any,
    stripePaymentMethodId: any
  ) {
    await initFormsPromise;
    const { userId } = initInfo();
    const params = encodeGetParams({
      field_id: paymentMethodFieldId,
      form_key: this.formKey,
      ...(userId ? { user_id: userId } : {}),
      stripe_payment_method_id: stripePaymentMethodId
    });
    const url = `${API_URL}stripe/payment_method/card/?${params}`;
    const options = { headers: { 'Content-Type': 'application/json' } };
    return this._fetch(url, options).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  // Stripe
  async _payment(method: 'POST' | 'PUT', extraParams = {}) {
    await initFormsPromise;
    const { userId } = initInfo();
    const url = `${API_URL}stripe/payment/`;
    const data = {
      form_key: this.formKey,
      user_id: userId,
      ...extraParams
    };
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method,
      body: JSON.stringify(data)
    };
    return this._fetch(url, options).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  createPayment() {
    return this._payment('POST');
  }

  async createCheckoutSession(successUrl: string, cancelUrl?: string) {
    await initFormsPromise;
    const { userId } = initInfo();
    const url = `${API_URL}stripe/checkout/`;
    const data = {
      form_key: this.formKey,
      user_id: userId,
      success_url: successUrl,
      cancel_url: cancelUrl || ''
    };
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(data)
    };
    return this._fetch(url, options).then((response) =>
      response ? response.json() : Promise.resolve()
    );
  }

  async sendSMSOTP(phoneNumber: string) {
    const { userId } = initInfo();
    const url = `${API_URL}otp/send/`;
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({
        phone_number: phoneNumber,
        form_key: this.formKey,
        fuser_key: userId
      })
    };
    return this._fetch(url, options, false).then(async (response) => {
      if (response) {
        if (response.ok) return await response.json();
        else throw Error(parseError(await response.json()));
      }
    });
  }

  async verifySMSOTP(otp: string) {
    const { userId } = initInfo();
    const url = `${API_URL}otp/verify/`;
    const options = {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ otp, fuser_key: userId, form_key: this.formKey })
    };
    return this._fetch(url, options, false).then(async (response) => {
      if (response) {
        if (response.ok) return await response.json();
        else throw Error(parseError(await response.json()));
      }
    });
  }
}
