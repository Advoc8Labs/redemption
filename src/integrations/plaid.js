import { dynamicImport } from './utils';

let plaidPromise = null;

export function installPlaid(isPlaidActive) {
  if (plaidPromise) return plaidPromise;
  else if (!isPlaidActive) return Promise.resolve();
  else {
    plaidPromise = dynamicImport(
      'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    );
    return plaidPromise;
  }
}

export async function openPlaidLink(client, onSuccess, updateFieldValues) {
  const linkToken = (await client.fetchPlaidLinkToken()).link_token;
  const handler = global.Plaid.create({
    token: linkToken,
    onSuccess: async (publicToken) => {
      const fieldVals = await client.submitPlaidUserData(publicToken);
      updateFieldValues(fieldVals);
      await onSuccess();
      handler.exit();
      handler.destroy();
    }
  });
  handler.open();
}

export function getPlaidFieldValues(plaidConfig, fieldValues) {
  // eslint-disable-next-line camelcase
  const keys = plaidConfig?.metadata?.plaid_field_map || [];
  return Object.values(keys).reduce((result, key) => {
    result[key] = fieldValues[key];
    return result;
  }, {});
}