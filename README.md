#cordova-linux

Linux platform support for Cordova.

Cordova Linux is an application library that allows for Cordova-based projects to be built for the Linux Platform. 

Cordova based applications are, at the core, applications written with web technology: HTML, CSS and JavaScript.

[Apache Cordova](https://cordova.apache.org/) is a project of The Apache Software Foundation (ASF).

#Requires
The development system needs to have:

	[Cordova](https://cordova.apache.org/)
	[CMake and CPack](https://cmake.org/)
	[Coraline](https://coraline.psychogenic.com/)
	tools to build Linux bundles (distro dependent -- e.g. debuild, alien, etc)

available.

#Usage

Use with existing or new projects, e.g.

	$ cordova create SomeApp com.example.someapp SomeApp
	$ cd SomeApp
	$ cordova platform add https://github.com/psychogenic/cordova-linux.git
	$ cordova build 

Installable bundles (RPM, DEB, ZIP) will be produced, their location output at the end of the process.


