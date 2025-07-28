import { OAuth2Client } from '@badgateway/oauth2-client';
import { httpRequest } from 'http-request';

/**
 * Check auth when Origin makrs it as required
 *
 * @export
 * @async
 * @param {EW.IngressClientRequest} request
 */
export async function onClientRequest(request) {
    // OAuth2 configuration, demo with public test server
    const oauth2Server = "https://oidctest.wsweet.org/";
    // To be replaced by constant registered as on OAuth2 Server
    const oauth2RedirectUri = `https://${request.host}${request.path}`;
    const oauth2ClientId = "private";
    const oauth2Secret = "tardis";
    const oauth2Scope = ['openid', 'email'];

    const client = new OAuth2Client({
        // OAUTH2 params
        server: oauth2Server,
        discoveryEndpoint: oauth2Server + ".well-known/openid-configuration",
        clientId: oauth2ClientId,
        clientSecret: oauth2Secret,
        // Better if OAuth2 server supports it:
        authenticationMethod: 'client_secret_post',

        // EdgeWorkers compat
        fetch: async function(/** @type {string} */ url, options) {
            // Reject URL that are not going outside of registered oauth idp server
            if (!url.startsWith(oauth2Server)) {
                throw new Error(`OAuth2Client.fetch for EdgeWorkers: got URL "${url}", expected base "${oauth2Server}"`);
            }
            // EdgeWorkers allows subrequest only to Akamaized hostnames.
            // As a workaround we are mooping back on current property, while adding a custom request header.
            // Add a rule to your property:
            // - Criteria:  when header `oauth2-client-ew-subreq` exists
            // - Behaviors: OAuth2 server is the Origin
            const relativeUrl = url.replace(oauth2Server, "/");
            options = options || {};
            options.headers = options.headers || {}
            options.headers["oauth2-client-ew-subreq"] = oauth2Server;
            const response = await httpRequest(relativeUrl, options);
            // Has method is not implemented by EW (July-2025) but required by lib
            response["headers"].has = (/** @type {string} */ headerName) => response.getHeader(headerName) !== undefined;
            return response;
        },
    });

    // Request on redirect URI => validate auth code
    if (`https://${request.host}${request.path}` === oauth2RedirectUri && request.query?.includes("code=")) {
        const oauth2Token = await client.authorizationCode.getTokenFromCodeRedirect(
            request.url,
            {
                redirectUri: oauth2RedirectUri, 
                state: 'some-string',
                // Add code-verifier for proper security
            }
        );
        request.respondWith(200, {}, JSON.stringify(oauth2Token).substring(0, 2048));
        // Stop processing to avoid looping on authorize
        return;

        // const oauth2TokenValidity = await client.introspect(oauth2Token);
        // return request.respondWith(200, {}, JSON.stringify(oauth2TokenValidity).substring(0, 2048));
    }

    // Unauthenticated request => redirect to oauth2 server
    // TODO: implement criteria to run only when required
    // if (authRequired) {
    const ssoAuthoriseUrl = await client.authorizationCode.getAuthorizeUri({
        // URL in the app that the user should get redirected to after authenticating
        redirectUri: oauth2RedirectUri,

        // Optional string that can be sent along to the auth server. This value will
        // be sent along with the redirect back to the app verbatim.
        state: 'some-string',

        scope: oauth2Scope,

        // Add code-verifier for proper security
    });
    request.respondWith(302, {location: ssoAuthoriseUrl}, "");
}