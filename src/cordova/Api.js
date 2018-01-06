/*
 * Cordova Linux platform API file
 * 
 * Copyright (C) 2018 Pat Deegan, psychogenic.com
 */

/*jslint node: true */


var Q = require('q');
var shell = require('shelljs');
var path = require('path');
var fs = require('fs');
var CordovaError = require('cordova-common').CordovaError
var CordovaLogger = require('cordova-common').CordovaLogger;
var PluginManager = require('cordova-common').PluginManager;
var selfEvents = require('cordova-common').events;

var ConfigParser = require('cordova-common').ConfigParser;
var format = require("string-template");

var logger = require('./logger');
var Utils = require('./utils');

var PLATFORM_NAME = 'linux';

function setupEvents(externalEventEmitter) {
	if (externalEventEmitter) {
		// This will make the platform internal events visible outside
		selfEvents.forwardEventsTo(externalEventEmitter);
		return externalEventEmitter;
	}

	// There is no logger if external emitter is not present,
	// so attach a console logger
	CordovaLogger.get().subscribe(selfEvents);
	return selfEvents;
}

function Api(platform, platformRootDir, events) {

	this.platform = platform || PLATFORM_NAME;
	this.root = path.resolve(__dirname, '..');
	var projectRoot = path.resolve(this.root, '../..');
	this.locations = {
		platformRootDir : platformRootDir,
		root : this.root,
		build : path.join(this.root, 'build'),
		buildPackages: path.join(this.root, 'packages'),

		projectRoot : projectRoot,
		projectConfigXml : path.join(projectRoot, 'config.xml'),
		projectWww : path.join(projectRoot, 'www'),

		platformWww : path.join(this.root, 'platform_www'),

		www : path.join(this.root, 'assets/www'),
		res : path.join(this.root, 'res'),
		configXml : path.join(this.root, 'res/xml/config.xml'),
		defaultConfigXml : path.join(this.root, 'cordova/defaults.xml'),
		// NOTE: Due to platformApi spec we need to return relative paths here
		cordovaJs : 'bin/templates/project/assets/www/cordova.js',
		cordovaJsSrc : 'cordova-js-src'
	};
	
	// standard build dir names
	this.buildSubDirs = {
			shortcut: 'shortcuts',
			bin: 'bin',
			content: '',
			build: 'bldpck'
	};

}

Api.createPlatform = function(destination, config, options, events) {

	events = setupEvents(events);

	// create the destination and the standard place for our api to live
	// platforms/platformName/cordova/Api.js

	var apiSrcPath = __dirname; // default value
	// does options contain the info we desire?

	var projectName = config ? config.name() : "HelloCordova";

	events.emit('log', 'Creating Cordova project for cordova-platform-linux:');
	events.emit('log', '\tPath: ' + destination);
	events.emit('log', '\tName: ' + projectName);

	shell.mkdir(destination);

	// move a copy of our api to the new project
	shell.cp('-r', apiSrcPath, destination);

	// move our node_modules
	var srcModulePath = path.join(__dirname, '../../node_modules');
	shell.cp('-r', srcModulePath, destination);

	var resPath = path.join(__dirname, '../../spec/res');
	shell.cp('-r', resPath, destination);
	
	var assetsPath = path.join(__dirname, '../../spec/assets');
	shell.cp('-r', assetsPath, destination);
	// I promise I will return
	return Promise.resolve(new Api(PLATFORM_NAME, destination, events));

};

Api.updatePlatform = function(destination, options, events) {
	// logger.debug("linux-platform:Api:updatePlatform");
	// todo?: create projectInstance and fulfill promise with it.
	return Promise.resolve();
};

Api.prototype.getPlatformInfo = function() {

	// return PlatformInfo object

	return {
		"locations" : this.locations,
		"root" : this.root,
		"name" : 'linux',
		"version" : {
			"version" : "0.0.6"
		},
		"projectConfig" : this._config
	};
};


Api.prototype.createDirIfDNE = function(theDir) {

	if (!fs.existsSync(theDir)) {
		shell.mkdir('-p', theDir);
		logger.debug("Creating dir:" + theDir);
	}
}

Api.prototype.prepare = function(cordovaProject) {

	var locations = this.locations;
	var api = this;
	return new Promise(function(resolve, reject) {
		logger.debug("linux-platform: preparing");
		api.createDirIfDNE(locations.platformWww);

		Utils.cp(path.join(locations.projectWww, '*'), locations.platformWww);
		Utils.cp(locations.projectConfigXml, locations.platformWww);


		resolve();
	});

};

Api.prototype.addPlugin = function(plugin, installOptions) {

	var self = this;
	var dummyInstaller = {
			install: function() {
			},
			uninstall: function() {
			}
	};
	
	var dummyProject = {
			write: function() {},
			getInstaller: function() {
				return dummyInstaller.install;
			},
			getUninstaller: function() {
				return dummyInstaller.uninstall;
			},

	};
	
	
	return Q().then(function () {
		return PluginManager.get(self.platform, self.locations, 
				dummyProject).addPlugin(plugin, installOptions);
	}).thenResolve(true);
			
	
};

Api.prototype.removePlugin = function(plugin, uninstallOptions) {
	logger.debug("linux-platform:Api:removePlugin");
	return Promise.resolve();
};

Api.prototype.configToTemplateVars = function(appConfig) {

	var appId = appConfig.packageName();
	var appidsuffix = appId.replace(/^.*\./, '');

	logger.debug("APP ID: " + appId + " aka '" + appidsuffix + "'");

	var tplVars = {
		appname : appConfig.name(),
		version : appConfig.version(),
		author : appConfig.author(),
		description : appConfig.description(),
		appid : appId,
		appidsuffix : appidsuffix,
		icon: '',
		splash: ''
	};

	return tplVars;

}

Api.prototype.createBuildDirStructure = function(topLevel) {

	this.createDirIfDNE(path.join(topLevel, this.buildSubDirs.bin));
	this.createDirIfDNE(path.join(topLevel, this.buildSubDirs.content));
	this.createDirIfDNE(path.join(topLevel, this.buildSubDirs.shortcut));
	this.createDirIfDNE(path.join(topLevel, this.buildSubDirs.build));

	
}

/*
 * setupStaticResource -- returns the resource location, 
 * relative to the platform www content.  If it's configured 
 * in config.xml and exists relative to the project root, it will be 
 * copied into platform www.
 */
Api.prototype.setupStaticResource = function(staticResource) {
	
	var resSrc = staticResource.src;
	var absToPlatWww = path.join(this.locations.platformWww, resSrc);
	if (fs.existsSync(absToPlatWww)) {
		// ok, it's some path relative to our www, leave as-is
		return resSrc;
	}

	
	// not a relative path into our www... search from top level
	var absToProjRoot = path.join(this.locations.projectRoot, resSrc);
	var absPlatWwwDir = absToPlatWww.replace(/\/[^/]+$/, '');
	if (fs.existsSync(absToProjRoot)) {
		this.createDirIfDNE(absPlatWwwDir);
		Utils.cp(absToProjRoot, absPlatWwwDir);
		return resSrc;
	}

	
	return null;
	

}

Api.prototype.rejectAndThrow = function(msg, rej, code) {
	logger.error(msg);
	if (rej) {
		rej();
	}
	
	throw CordovaError(msg, code);
}
Api.prototype.build = function(buildOptions) {
	var rootDir = this.locations.build;
	var locations = this.locations;
	var api = this;
	logger.log("building linux platform");
	return new Promise(function(resolve, reject) {
		//var buildDir = path.join(rootDir, 'platforms', 'linux');
		var buildDir = rootDir;

		/* Get the app config, and setup build dir hierarchy */
		var appConfig = new ConfigParser(path.join(locations.platformWww,
				'config.xml'));
		var tplVars = api.configToTemplateVars(appConfig);

		if (!(tplVars.appid && tplVars.appidsuffix)) {
			api.rejectAndThrow('Need app id in config.xml', reject, 20);
		}
		
		var appShortName = tplVars.appidsuffix
		api.buildSubDirs.content = appShortName;

		api.createDirIfDNE(buildDir);
		api.createBuildDirStructure(buildDir);

		logger.debug("building under:" + buildDir);


		
		
		/* generate CMake file and stick it in build top level */
		var cmakefile = fs.readFileSync(path.join(locations.res,
				'CMakeLists.txt.in'), 'utf8');

		if (!cmakefile) {
			api.rejectAndThrow('Could not load CMakeLists template file?', reject, 22);
		}

		var outCmake = format(cmakefile, tplVars);

		
		var outCmakePath = path.join(buildDir, 'CMakeLists.txt');
		fs.writeFile(outCmakePath, 
				outCmake, function(err) { 
				if(err) { 
					api.rejectAndThrow('Could not save to: ' + outCmakePath, reject, 24);
				
				}
		});

		

		/* figure out if we have any icon/splash, and any work to do in that department */
		var icon = appConfig.getStaticResources('linux', 'icon').getDefault() || appConfig.getGlobalPreference('icon');
		var splash = appConfig.getStaticResources('linux', 'splash').getDefault() || appConfig.getGlobalPreference('splash');

		if (icon) {
			tplVars.icon = api.setupStaticResource(icon);
			if (! tplVars.icon ) {
				api.rejectAndThrow('Could not find the icon specified for "linux" platform:' + icon.src, reject, 26);
			}
		} 
		
		if (splash) {
			tplVars.splash = api.setupStaticResource(splash);
			if (! tplVars.splash ) {
				api.rejectAndThrow('Could not find the icon specified for "linux" platform:' + splash.src, reject, 28);
			}
		}


		/* select appropriate shortcut file and write it to build dir */
		var shortcutFile = 'appshortcut.desktop.in';
		if (tplVars.icon) {
			shortcutFile = 'appwiconshortcut.desktop.in';
		}
		
		var shortcutFilePath = path.join(locations.res,
				shortcutFile);

		var shortcutTpl = fs.readFileSync(shortcutFilePath, 'utf8');
		
		if (! shortcutTpl ) {
			api.rejectAndThrow('Cannot find the desktop shortcut file? ' + shortcutFilePath, reject, 30);
			
		}


		var shortcutOutName = appShortName + '.desktop';

		var outShortcutContent = format(shortcutTpl, tplVars);
		
		var outShortcutPath = path.join(buildDir, api.buildSubDirs.shortcut, shortcutOutName);
		fs.writeFile(outShortcutPath, 
				outShortcutContent, function(err) { 
				if(err) { 
					reject();
					throw CordovaError('Could not save to: ' + outShortcutPath, 28);
				
				}
		});
		
		Utils.cp(path.join(locations.platformWww, '*'), 
				path.join(buildDir, appShortName));
		
		var daLink =  path.join(buildDir, api.buildSubDirs.bin, appShortName);
		// console.error("DALINK:" + daLink);
	
		shell.ln('-sf', '/usr/local/bin/coraline', daLink);
	
		shell.cd(path.join(buildDir, api.buildSubDirs.build));
		shell.rm('*.deb');
		shell.rm('*.rpm');
		shell.rm('*.zip');
		
		Utils.execAsync("cmake ..", true).then(function(){
			Utils.execAsync("make package", true).then(function(){
				api.createDirIfDNE(locations.buildPackages);
				Utils.cp(
					path.join(buildDir, api.buildSubDirs.build, appShortName + '*'),
					locations.buildPackages
				);
				
				console.log("Linux packages prepared for version " 
						+ tplVars.version + ", now available under:\n"
						+ locations.buildPackages);
				resolve();
			}).catch(function(){
				logger.error("make package has failed!");
				reject();
			});
		}).catch(function() {
			logger.error("Cmake has failed!");
			reject();
		});
	});

};

Api.prototype.run = function(runOptions) {
	


	var locations = this.locations;
	var api = this;
	return new Promise(function(resolve, reject) {
		//var buildDir = path.join(rootDir, 'platforms', 'linux');
		var buildDir = locations.build;

		/* Get the app config, and setup build dir hierarchy */
		var appConfig = new ConfigParser(path.join(locations.platformWww,
				'config.xml'));
		var tplVars = api.configToTemplateVars(appConfig);

		if (!(tplVars.appid && tplVars.appidsuffix)) {
			api.rejectAndThrow('Need app id in config.xml', reject, 20);
		}
		
		var appShortName = tplVars.appidsuffix
		api.buildSubDirs.content = appShortName;
		var cmd = path.join(buildDir, api.buildSubDirs.bin, appShortName) + ' ' + 
					path.join(buildDir, api.buildSubDirs.content, 'index.html');
		
		logger.log("Running " + cmd);
		Utils.execAsync(cmd);
		
		resolve();

	});
	
};

Api.prototype.clean = function(cleanOptions) {
	
	let api = this;
	let locations = this.locations;
	
	return new Promise(function(resolve, reject) {
		logger.warn("Removing : " + locations.build);
		shell.rm('-rf', locations.build);
		logger.warn("Removing contents of:" + locations.platformWww)
		// shell.rm('-rf', '/tmp/*');
		shell.rm('-rf', path.join(locations.platformWww, '*'));

		resolve();
	});

	
};

Api.prototype.requirements = function() {
	
	// not certain what to do here...
	var a= new Promise(function (resolve, reject) {

		if (fs.existsSync('/usr/local/bin/coraline'))
		{
			logger.log("Coraline seems to be installed -- ready to run!");
			resolve();
		} else {
			
			logger.error("Could not find Coraline executable -- install coraline [https://coraline.psychogenic.com/]");
			reject();
			
		}
	});
	
	return true;
	
};

module.exports = Api;
