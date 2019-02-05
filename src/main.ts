import * as utils from "@iobroker/adapter-core";
import * as viessmann from "viessmann-api-client";
import {p} from "./utils";

let client: viessmann.Client;
let adapter: ioBroker.Adapter;

console.log("hello");
function startAdapter(options: Partial<ioBroker.AdapterOptions> = {}) {
    return adapter = utils.adapter({
        // Default options
        ...options,
        // custom options
        name: 'viessmannapi',

        ready: async () => {
            log("starting adapter...");
            adapter.setState("info.connection", false, true);
            const _client = await initializeClient();
            if (_client === null) {
                return;
            }

            client = _client;
            client.getFeatures().forEach(f => createFeatureObjects(client, f));

            client.observeConnection(connected => adapter.setState("info.connection", connected, true));
            client.observe((f, p) => {
                const name = `${f.meta.feature}.${p.name}`;
                const val = JSON.stringify(p);
                log(`update for ${name}, value ${val}`, 'debug');

                // TODO conversion of arrays and objects into strings due to ioBroker not beeing able to handle those
                let value = p.value;
                if ('array' === p.type || 'object' === p.type) {
                    value = JSON.stringify(value);
                }
                adapter.setState(name, value, true);
            });

            adapter.setState("info.connection", true, true);
            adapter.subscribeStates("*");
        },

        unload: async (callback) => {
            try {
                client.clearObservers();
                adapter.log.info('cleaned everything up...');
                callback();
            } catch (e) {
                callback();
            }
        },

        stateChange: (id, state) => {
            const s = JSON.stringify(state);
            log(`received update for ID ${id}: ${s}`, 'silly');
        },

        message: async (obj) => {
            if (!obj) {
                return false;
            }

            function respond(response: string | {}) {
                if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
            }
            // some predefined responses so we only have to define them once
            const responses = {
                OK: {error: null, result: "ok"},
                ERROR_UNKNOWN_COMMAND: {error: "Unknown command!"},
                MISSING_PARAMETER: (paramName: string) => {
                    return {error: 'missing parameter "' + paramName + '"!'};
                },
                ERROR: (error: string) => ({error}),
            };

            log(`Received command [${obj.command}]`, 'debug');
            switch (obj.command) {
                case 'action': {
                    const params = obj.message as any;
                    const feature = params.feature;
                    const action = params.action;
                    const payload = params.payload;

                    if (!feature) {
                        respond(responses.MISSING_PARAMETER('feature'));
                        return false;
                    }
                    if (!action) {
                        respond(responses.MISSING_PARAMETER('action'));
                        return false;
                    }
                    if (!payload) {
                        respond(responses.MISSING_PARAMETER('payload'));
                        return false;
                    }

                    const result = await client.executeAction(feature, action, payload);
                    return result.caseOf({
                        left: error => {
                            respond(responses.ERROR(error));
                            return false;
                        },
                        right: ok => {
                            respond(responses.OK);
                            return true;
                        }
                    });
                }
                case 'describe': {
                    const allFeatures = client.getFeatures();
                    respond({result: allFeatures});
                    return true;
                }
                default: {
                    log(`Unknown message command [${obj.command}] received`, 'warn');
                    respond(responses.ERROR_UNKNOWN_COMMAND);
                    return false;
                }
            }
        }
    });
}

async function initializeClient(): Promise<viessmann.Client | null> {
    let pollInterval = (adapter.config.pollInterval || 60) * 1000;
    if (pollInterval < 10000) {
        log('poll interval must not be smaller than 10 seconds', 'warn');
        pollInterval = 10000;
    }

    let viessmannConfig: viessmann.ViessmannClientConfig = {
        auth: {
            host: 'https://iam.viessmann.com',
            token: '/idp/v1/token',
            authorize: '/idp/v1/authorize',
            onRefresh: (token: string) => adapter.setState('auth.refreshToken', token, true),
        },
        api: {
            host: 'https://api.viessmann-platform.io',
        },
        logger: log,
        pollInterval: pollInterval
    };

    let user = adapter.config.email;
    let pwd = adapter.config.password;

    const credentials = await obtainCredentials(user, pwd);
    if ((credentials as viessmann.TokenCredentials).refreshToken !== undefined) {
        try {
            if (user || pwd) {
                log('found email and password in configuration, deleting it due to security reasons. Adapter should restart now', 'info');
                updateConfig({
                    email: undefined,
                    password: undefined,
                });
            }
            log('authenticating with refresh token', 'info');
            return await new viessmann.Client(viessmannConfig).connect(credentials);
        } catch (error) {
            log(`error connecting: ${JSON.stringify(error)}`, 'error');
            log('could not connect with refresh token, please enter email and password on adapter admin page', 'error');
            adapter.setState('auth.refreshToken', '', true);
        }
    } else {
        try {
            const result = await new viessmann.Client(viessmannConfig).connect(credentials);
            // delete user and password from config & restart adapter
            log('sucessfully obtained refresh token, adapter should now restart', 'info');
            updateConfig({
                email: undefined,
                password: undefined,
            });
            return result;
        } catch (error) {
            log(`error connecting: ${JSON.stringify(error)}`, 'error');
            log('could not connect using email and password, check credentials!', 'error');
        }
    }
    return null;
}

async function obtainCredentials(user: string | undefined, password: string | undefined): Promise<viessmann.Credentials> {
    return createAuthObject()
        .then(() => getRefreshToken())
        .catch(err => null)
        .then(token => token !== undefined && token !== null ? {
            refreshToken: token
        } : {
                user: user!,
                password: password!
            });
}

async function updateConfig(newConfig: Partial<ioBroker.AdapterConfig>) {
    const config: ioBroker.AdapterConfig = {
        ...adapter.config,
        ...newConfig,
    };

    return p<ioBroker.SettableObject>(adapter.getForeignObject, adapter)
        (`system.adapter.${adapter.namespace}`)
        .then((obj) => {
            obj.native = config;
            return obj
        }).then(updatedAdapter => p<{id: string}>(adapter.setForeignObject, adapter)
            (`system.adapter.${adapter.namespace}`, updatedAdapter))
}

async function createAuthObject(): Promise<object> {
    const objectId = 'auth.refreshToken';
    return p<object>(adapter.setObjectNotExists, adapter)(objectId, {
        type: 'state',
        common: {
            name: 'OAuth2 Refresh token',
            type: 'string',
            role: 'auth'
        },
        native: {}
    });
};

async function getRefreshToken(): Promise<string> {
    return p<ioBroker.State>(adapter.getState, adapter)('auth.refreshToken').then(state => {
        if (!state || !state.val || '' === state.val) {
            throw new Error('could not retrieve refersh token');
        }
        return state.val as string;
    });
}

function createFeatureObjects(client: viessmann.Client, feature: viessmann.Feature) {
    feature.properties.forEach(p => createPropertyObject(client, feature, p));
}

function createPropertyObject(client: viessmann.Client, feature: viessmann.Feature, property: viessmann.Property) {
    const name = `${feature.meta.feature}.${property.name}`;
    // TODO conversion of arrays and objects into strings due to ioBroker not beeing able to handle those
    let type = property.type;
    let value = property.value;
    if ('array' === type || 'object' === type) {
        type = 'string';
        value = JSON.stringify(value);
    }

    adapter.setObjectNotExists(name, {
        type: 'state',
        common: {
            name: name,
            type: type,
            role: 'value',
            read: true,
            write: false,
        }, native: {}
    }, (err, obj) => {
        if (err) log(`error creating object ${name}`, 'error');
        else adapter.setState(name, value, true);
    });
}

function log(message: string, level: ioBroker.LogLevel = 'info') {
    if (!adapter) return;
    if (level === 'silly' && !(level in adapter.log)) level = 'debug';
    adapter.log[level](message);
};

if (module && module.parent) {
    module.exports = startAdapter;
} else {
    startAdapter();
}