"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = require("@iobroker/adapter-core");
const viessmann = require("viessmann-api-client");
let client;
const adapter = utils.adapter({
    name: 'viessmannapi',
    ready: () => __awaiter(this, void 0, void 0, function* () {
        log("starting adapter...");
        adapter.setState("info.connection", false, true);
        let viessmannConfig = {
            auth: {
                host: 'https://iam.viessmann.com',
                token: '/idp/v1/token',
                authorize: '/idp/v1/authorize',
                onRefresh: (token) => adapter.setState('auth.refreshToken', token, true),
            },
            api: {
                host: 'https://api.viessmann-platform.io',
            },
            logger: log,
            pollInterval: 60000
        };
        let user = adapter.config.email;
        let pwd = adapter.config.password;
        if (!user || !pwd) {
            log('provide username and password in adapter settings!', 'error');
            return;
        }
        const credentials = yield obtainCredentials(user, pwd);
        client = yield new viessmann.Client(viessmannConfig).connect(credentials);
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
        yield adapter.setState("info.connection", true, true);
        adapter.subscribeStates("*");
    }),
    unload: (callback) => __awaiter(this, void 0, void 0, function* () {
        try {
            client.clearObservers();
            adapter.log.info('cleaned everything up...');
            callback();
        }
        catch (e) {
            callback();
        }
    }),
    stateChange: (id, state) => {
        const s = JSON.stringify(state);
        log(`received update for ID ${id}: ${s}`);
    }
});
function obtainCredentials(user, password) {
    return __awaiter(this, void 0, void 0, function* () {
        return createAuthObject()
            .then(() => getRefreshToken())
            .catch(err => null)
            .then(token => token !== undefined && token !== null ? {
            refreshToken: token
        } : {
            user: user,
            password: password
        });
    });
}
function createAuthObject() {
    return __awaiter(this, void 0, void 0, function* () {
        const objectId = 'auth.refreshToken';
        return new Promise((resolve, reject) => {
            adapter.setObjectNotExists(objectId, {
                type: 'state',
                common: {
                    name: 'OAuth2 Refresh token',
                    type: 'string',
                    role: 'auth'
                },
                native: {}
            }, (err, obj) => {
                if (err)
                    reject(err);
                else
                    resolve(obj);
            });
        });
    });
}
;
function getRefreshToken() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            adapter.getState('auth.refreshToken', (err, state) => {
                if (err) {
                    return reject(err);
                }
                if (!state || !state.val) {
                    return reject("could not retrieve refresh token");
                }
                return resolve(state.val);
            });
        });
    });
}
function createFeatureObjects(client, feature) {
    feature.properties.forEach(p => createPropertyObject(client, feature, p));
}
function createPropertyObject(client, feature, property) {
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
        if (err)
            log(`error creating object ${name}`, 'error');
        else
            adapter.setState(name, value, true);
    });
}
function log(message, level = "info") {
    if (!adapter)
        return;
    if (level === "silly" && !(level in adapter.log))
        level = "debug";
    adapter.log[level](message);
}
;
//# sourceMappingURL=main.js.map