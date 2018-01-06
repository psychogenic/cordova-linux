/*
 *
 * Copyright 2014 Canonical Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/
var events = require('cordova-common').events;
var colors = require('colors');
var config = require('./config');

/**
 * Output debug messages in white. If not in verbose mode, nothing is output.
 */
module.exports.debug = function (msg) {
    if (config.inVerboseMode()) {
        events.emit('verbose', msg);
    }
};

module.exports.log = function (msg) {
	events.emit('log', msg.green);
}

/**
 * Output info messages in green to the console.
 */
module.exports.info = function (msg) {
	events.emit('log', msg.green);
};

/**
 * Output warning messages in yellow to the console.
 */
module.exports.warn = function (msg) {
	events.emit('warn', msg.yellow);
};

/**
 * Output error messages in red to the console.
 */
module.exports.error = function (msg) {
    events.emit('error', msg.red);
};

module.exports.rainbow = function (msg) {
    events.emit('log', msg.rainbow);
};
