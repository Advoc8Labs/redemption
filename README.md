# feathery-react-client-sdk

> React SDK for Div

[![NPM](https://img.shields.io/npm/v/feathery-react-client-sdk.svg)](https://www.npmjs.com/package/feathery-react-client-sdk) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save feathery-react-client-sdk
```

## API Guide
The following is an example React functional component that leverages the Feathery API.
```JavaScript
import { Feathery } from 'feathery-react-client-sdk';

function App() {
  // Initialize Feathery to Peter
  Feathery.init('sdkKey', 'peter@feathery.tech');

  // Access the attributes that Peter filled out in the
  // onboarding flow
  const [attributes, setAttributes] = useState({});
  useEffect(() => {
    Feathery
        .fetchAttributes()
        .then(newAttrs => {setAttributes(newAttrs)});
  }, [])

  // Show Peter's onboarding flow
  return <Feathery.Div
    clientKey='clientKey'
    redirectURI='https://homepage.com'
  />
}
```

### `Feathery.init`
Function that initializes the Feathery library to the correct user and auth info.
This is necessary before using the rest of the API.

#### Parameters
1. `userKey`\
   Type: `string`\
   Unique ID of the user who is accessing Feathery. This can be anything as long as it's unique per user.
2. `sdkKey`\
   Type: `string`\
   Feathery API Key. This authorizes your SDK to communicate with Feathery servers.

### `<Feathery.Div>`
Initialize this component in your React app at the location where
you want the onboarding flow to appear. It renders a `div` that contains
the onboarding flow and expands to fill its parent container.

#### Props
1. `redirectURI` - Optional\
   Type: `string`\
   URL to redirect to after user completes the onboarding flow. If not present, the component returns `null` after the onboarding flow is completed.
2. `clientKey` - Optional\
   Type: `string`\
   Authentication token to authorize non-Feathery API actions

### `Feathery.fetchAttributes`
Function that returns a Promise containing a map of user attributes of the form
`{attributeKey: attributeValue}`.

If the user doesn't exist, the map will be
empty. If the user doesn't have a value for a particular attribute,
the attribute value will be `null`.

This method is implemented as a singleton, so there will only be one
global source of data.

## License
MIT © [Peter Dun](https://github.com/bo-dun-1)
