import { LogLevel, Configuration, BrowserCacheLocation } from '@azure/msal-browser';

const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1;

export const msalConfig: Configuration = {
    auth: {
        clientId: 'IT-KINFRA-CLIENT_ID_PLACEHOLDER'.includes('PLACEHOLDER') ? '66c1d0f3-806a-4a1e-b44c-c0d4e55f146f' : 'IT-KINFRA-CLIENT_ID_PLACEHOLDER',
        authority: 'IT-KINFRA-AUTHORITY_PLACEHOLDER'.includes('PLACEHOLDER') ? 'https://login.microsoftonline.com/4cb14595-301a-44ee-af4e-33b9bb64c9c4' : 'IT-KINFRA-AUTHORITY_PLACEHOLDER',
        redirectUri: '/',
        postLogoutRedirectUri: '/',
    },
    cache: {
        cacheLocation: BrowserCacheLocation.LocalStorage,
    },
    system: {
        loggerOptions: {
            loggerCallback(logLevel: LogLevel, message: string) {
                // console.log(message);
            },
            logLevel: LogLevel.Info,
            piiLoggingEnabled: false
        }
    }
};

export const loginRequest = {
    scopes: ["User.Read"]
};
