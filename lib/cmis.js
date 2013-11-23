//  CmisJS 
//  http://github.com/agea/CmisJS
//  (c) 2013 Andrea Agili
//  CmisJS may be freely distributed under the Apache 2.0 license.

(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root.cmis = factory();
    }
}(this, function () {
    'use strict';

    /**
    * @class cmis
    * global object
    *
    *      var session = cmis.createSession(url);
    *
    */

    var lib = {};

    /**
    * @method createSession
    * @return {CmisSession}
    *
    */

    lib.createSession = function(url){

        /**
        * @class CmisSession
        *
        * the session is the enrty point for all cmis requests
        * before making any request, session.loadRepository() must be invoked
        *
        */
        var session = {};

        /**
        * sets token for authentication 
        *
        * @param {String} token
        * @return {CmisSession}
        */
        session.setToken = function (token) {
            _defaultOptions.token = token;
            return session;
        }

        /**
        * sets credentials for authentication 
        * @method setCredentials
        * @param {String} username
        * @param {String} password
        * @return {CmisSession}
        */
        session.setCredentials = function (username, password) {
            _username = username;
            _password = password;
            return session;
        }

        /**
        * sets global handlers for non ok and error responses
        * @method setGlobalHandlers
        * @param {Function} notOk
        * @param {Function} error
        * @return {CmisSession}
        */
        session.setGlobalHandlers = function (notOk, error) {
            _globalNotOk = notOk || _noop;
            _globalError = error || _noop;
            return session;
        };

        /**  
        * Connects to a cmis server and retrieves repositories, 
        * token or credentils must already be set
        *
        * @param {String} url (or path if running in the browser)  
        * @param {String} username  
        * @param {String} password 
        * @return {CmisRequest} request
        */
        session.loadRepositories = function () {
            var r = new CmisRequest(_get(url)).ok(function (res) {
                    for (var repo in res.body) {
                        session.defaultRepository = res.body[repo];
                        break;
                    }
                    session.repositories = res.body;

                    if (_afterlogin !== undefined) {
                        _afterlogin(res);
                    }
                });
            r.ok = function (callback) {
                _afterlogin = callback;
                return r;
            };
            return r;
        };


        /**
        * gets an object by objectId
        *
        * @param  {String}  objectId
        * @param  {Object}  options
        * @return {CmisRequest}
        */
        session.getObject = function (objectId, options) {
            options = _fill(options);
            options.cmisselector = 'object';
            options.objectId = objectId;
            return new CmisRequest(_get(session.defaultRepository.rootFolderUrl)
                .query(options));
        };

        /**
        * gets an object by path
        *
        * @param {String} path
        * @param {Object} options
        * @return {CmisRequest}
        */
        session.getObjectByPath = function (path, options) {
            options = _fill(options);
            options.cmisselector = 'object';
            
            return new CmisRequest(_get(session.defaultRepository.rootFolderUrl + path)
                .query(options));
        };

        /**
        * creates a new folder
        *
        * @param {String} parentId
        * @param {String/Object} input
        * if `input` is a string used as the folder name, 
        * if `input` is an object it must contain required properties: 
        *   {'cmis:name': 'aFolder', 'cmis:objectTypeId': 'cmis:folder'}
        * @return {CmisRequest}
        */    
        session.createFolder = function (parentId, input, policies, addACEs, removeACEs){
            var options = _fill({});
            if ('string' == typeof input){
                input = {'cmis:name': input};
            }
            var properties = input || {};
            if (!properties['cmis:objectTypeId']) {
                properties['cmis:objectTypeId'] = 'cmis:folder';   
            }
            _setProps(properties, options);
            options.repositoryId = session.defaultRepository.repositoryId;
            options.cmisaction = 'createFolder';
            return new CmisRequest(_post(session.defaultRepository.rootFolderUrl)
                .send(options));
        }

        /**
        * deletes an object
        * @method deleteObject
        * @param {String} objectId
        * @param {Boolean} allVersions
        * @return {CmisRequest}
        */    
        session.deleteObject = function (objectId, allVersions){
            var options = _fill({});
            options.repositoryId = session.defaultRepository.repositoryId;
            options.cmisaction = 'delete';
            options.objectId = objectId;
            options.allVersions = !!allVersions;
            return new CmisRequest(_post(session.defaultRepository.rootFolderUrl)
                .send(options));
        }


        /**
         * gets repository informations
         * @method getRepositoryInfo
         * @param {Object} options
         * @return CmisRequest
         */
        session.getRepositoryInfo = function (options) {
            options = _fill(options);
            options.cmisselector = 'repositoryInfo';
            return new CmisRequest(_get(session.defaultRepository.repositoryUrl)
                .query(options));
        };

        /**
         * gets the types that are immediate children 
         * of the specified typeId, or the base types if no typeId is provided
         * @method getTypeChildren
         * @param {String} typeId
         * @param {Boolean} includePropertyDefinitions
         * @param {Object} options
         * @return CmisRequest
         */
        session.getTypeChildren = function (typeId, includePropertyDefinitions, options) {
            options = _fill(options);
            if (typeId) {
                options.typeId = typeId;                
            }
            options.includePropertyDefinitions = includePropertyDefinitions;
            options.cmisselector = 'typeChildren'
            return new CmisRequest(_get(session.defaultRepository.repositoryUrl)
                .query(options));
        };

        /**
         * gets all types descended from the specified typeId, or all the types
         * in the repository if no typeId is provided
         * @method getTypeDescendants
         * @param {String} typeId
         * @param {Integer} depth
         * @param {Boolean} includePropertyDefinitions
         * @param {Object} options
         * @return CmisRequest
         */
        session.getTypeDescendants = function (typeId, depth, includePropertyDefinitions, options) {
            options = _fill(options);
            if (typeId) {
                options.typeId = typeId;                
            }
            options.depth = depth || 1;
            options.includePropertyDefinitions = includePropertyDefinitions;
            options.cmisselector = 'typeDescendants'
            return new CmisRequest(_get(session.defaultRepository.repositoryUrl)
                .query(options));

        };

        /**
         * gets definition of the specified type
         * @method getTypeDefinition
         * @param {String} typeId
         * @param {Boolean} options
         * @return CmisRequest
         */
        session.getTypeDefinition = function (typeId, options) {
            options = _fill(options);
            options.typeId = typeId;                
            options.cmisselector = 'typeDefinition'
            return new CmisRequest(_get(session.defaultRepository.repositoryUrl)
                .query(options));

        };

        /**
         * gets the documents that have been checked out in the repository
         * @method getCheckedOutDocs
         * @param {String} objectId
         * @return 
         */
        session.getCheckedOutDocs = function (objectId, options) {
            options = _fill(options);
            if (objectId){
                options.objectId = objectId;
            }
            options.cmisselector = 'checkedOut'
            return new CmisRequest(_get(session.defaultRepository.repositoryUrl)
                .query(options));

        };

        /**
         * Not yet implemented
         * @method createDocument
         * @return 
         */
        session.createDocument = function () {};

        /**
         * Not yet implemented
         * @method createDocumentFromSource
         * @return 
         */
        session.createDocumentFromSource = function () {};

        /**
        * Not yet implemented
        * @method createRelationship
        * @return 
        */
       session.createRelationship = function () {};

        /**
         * Not yet implemented
         * @method createPolicy
         * @return 
         */
        session.createPolicy = function () {};

        /**
         * Not yet implemented
         * @method createItem
         * @return 
         */
        session.createItem = function () {};

        /**
         * Not yet implemented
         * @method bulkUpdateProperties
         * @return 
         */
        session.bulkUpdateProperties = function () {};

        /**
         * performs a cmis query against the repository
         * @method query
         * @param {String} statement
         * @param {Boolean} searchAllversions
         * @param {Object} options
         * @return 
         */
        session.query = function (statement, searchAllversions, options) {
            options = _fill(options);
            options.cmisaction = 'query';
            options.statement = statement;
            options.searchAllversions = !!searchAllversions;
            return new CmisRequest(_post(session.defaultRepository.repositoryUrl)
                .send(options));

        };

        /**
         * gets the changed objects, the list object should contain the next change log token.
         * @method getContentChanges
         * @param {String} changeLogToken
         * @param {Boolean} includeProperties
         * @param {Boolean} includePolicyIds
         * @param {Boolean} includeACL
         * @param {Object} options
         * @return 
         */
        session.getContentChanges = function (changeLogToken, includeProperties, includePolicyIds, includeACL, options) {
            options = _fill(options);
            options.cmisselector = 'contentChanges';
            if (changeLogToken) {
                options.changeLogToken = changeLogToken;
            }
            options.includeProperties = !! includeProperties;
            options.includePolicyIds = !! includePolicyIds;
            options.includeACL = !! includeACL;
            return new CmisRequest(_get(session.defaultRepository.repositoryUrl)
                .query(options));            
        };

        /**
         * Not yet implemented
         * @method createType
         * @param {} type
         * @param {} options
         * @return 
         */
        session.createType = function (type, options) {};

        /**
         * Not yet implemented
         * @method updateType
         * @param {} type
         * @param {} options
         * @return 
         */
        session.updateType = function (type, options) {};

        /**
         * Not yet implemented
         * @method deleteType
         * @param {} type
         * @param {} options
         * @return 
         */
        session.deleteType = function (type, options) {};

        /**
         * Not yet implemented
         * @method getLastResult
         * @param {} options
         * @return 
         */
        session.getLastResult = function (options) {};

        /**
         * Not yet implemented
         * @method getChildren
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.getChildren = function (objectId, options) {};

        /**
         * Not yet implemented
         * @method getDescendants
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.getDescendants = function (objectId, options) {};

        /**
         * Not yet implemented
         * @method getFolderTree
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.getFolderTree = function (objectId, options) {};

        /**
         * Not yet implemented
         * @method getFolderParent
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.getFolderParent = function (objectId, options) {};

        /**
         * Not yet implemented
         * @method getObjectParents
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.getObjectParents = function (objectId, options) {};

        /**
         * Not yet implemented
         * @method getAllowableActions
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.getAllowableActions = function(objectId, options) {};

        /**
         * Not yet implemented
         * @method getProperties
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.getProperties = function (objectId, options) {};

        /**
         * Not yet implemented
         * @method getContentStream
         * @param {} streamId
         * @param {} download
         * @param {} options
         * @return 
         */
        session.getContentStream = function (streamId, download, options) {};

        /**
         * Not yet implemented
         * @method getRenditions
         * @param {} renditionFilter
         * @param {} options
         * @return 
         */
        session.getRenditions = function (renditionFilter, options) {};

        /**
         * Not yet implemented
         * @method updateProperties
         * @param {} properties
         * @param {} options
         * @return 
         */
        session.updateProperties = function (properties, options) {};    
        
        /**
         * Not yet implemented
         * @method moveObject
         * @param {} targetId
         * @param {} sourceId
         * @param {} options
         * @return 
         */
        session.moveObject = function (targetId, sourceId, options) {};

        /**
         * Not yet implemented
         * @method deleteTree
         * @param {} objectId
         * @return 
         */
        session.deleteTree = function (objectId) {};

        /**
         * Not yet implemented
         * @method setContentStream
         * @param {} objectId
         * @return 
         */
        session.setContentStream = function (objectId) {};

        /**
         * Not yet implemented
         * @method appendContentStream
         * @param {} objectId
         * @return 
         */
        session.appendContentStream = function (objectId) {};

        /**
         * Not yet implemented
         * @method deleteContentStream
         * @param {} objectId
         * @return 
         */
        session.deleteContentStream = function (objectId) {};

        /**
         * Not yet implemented
         * @method addObjectToFolder
         * @param {} folderId
         * @param {} allVersions
         * @param {} options
         * @return 
         */
        session.addObjectToFolder = function (folderId, allVersions, options) {};

        /**
         * Not yet implemented
         * @method removeObjectFromFolder
         * @param {} folderId
         * @param {} options
         * @return 
         */
        session.removeObjectFromFolder = function (folderId, options) {};

        /**
         * Not yet implemented
         * @method checkOut
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.checkOut = function (objectId, options) {};

        /**
         * Not yet implemented
         * @method cancelCheckOut
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.cancelCheckOut = function (objectId, options) {};

        /**
         * Not yet implemented
         * @method checkIn
         * @return 
         */
        session.checkIn = function () {};

        /**
         * Not yet implemented
         * @method getObjectOfLatestVersion
         * @return 
         */
        session.getObjectOfLatestVersion = function () {};

        /**
         * Not yet implemented
         * @method getPropertiesOfLatestVersion
         * @return 
         */
        session.getPropertiesOfLatestVersion = function () {};

        /**
         * Not yet implemented
         * @method getAllVersions
         * @param {} filter
         * @param {} options
         * @return 
         */
        session.getAllVersions = function (filter, options) {};

        /**
         * Not yet implemented
         * @method getObjectRelationships
         * @param {} includeSubRelationshipTypes
         * @param {} relationshipDirection
         * @param {} typeId
         * @param {} options
         * @return 
         */
        session.getObjectRelationships = function(includeSubRelationshipTypes, relationshipDirection, typeId, options) {};

        /**
         * Not yet implemented
         * @method getAppliedPolicies
         * @param {} objectId
         * @param {} options
         * @return 
         */
        session.getAppliedPolicies = function (objectId, options) {};

        /**
         * Not yet implemented
         * @method applyPolicy
         * @param {} objectId
         * @param {} policyId
         * @param {} options
         * @return 
         */
        session.applyPolicy = function (objectId, policyId, options) {};

        /**
         * Not yet implemented
         * @method removePolicy
         * @param {} objectId
         * @param {} policyId
         * @param {} options
         * @return 
         */
        session.removePolicy = function (objectId, policyId, options) {};

        /**
         * Not yet implemented
         * @method applyACL
         * @param {} objectId
         * @return 
         */
        session.applyACL = function (objectId) {};

        /**
         * Not yet implemented
         * @method getACL
         * @return 
         */
        session.getACL = function () {};


        // http://visionmedia.github.io/superagent
        var request;

        // if running on node.js require superagent 
        if (typeof module !== 'undefined' && module.exports) {
            request = require('superagent');
        } else {
            request = window.request;
        }

        /**
        * @class CmisRequest
        * superagent wrapper used to manage async requests
        * all cmis actions return a CmisRequest
        */
        function CmisRequest(req){

            var callback_ok = _noop;
            var callback_notOk = _globalNotOk;
            var callback_error = _globalError;


            req.on('error', callback_error)
                .end(function (res) {
                    if (res.ok) {
                        callback_ok(res);
                    } else {
                        callback_notOk(res);
                    }
                });

            /**
            * sets callback when response status == 2XX
            *
            * @param {Function} callback
            * @return {CmisRequest} 
            */
            this.ok = function (callback) {
                callback_ok = callback || _noop;
                return this;
            };

            /**
            * sets callback when response status != 2XX
            *
            * @param {Function} callback
            * @return {CmisRequest} 
            */        
            this.notOk = function (callback) {
                callback_notOk = callback || _noop;
                return this;
            };

            /**
            *  sets callback when response is in error
            *  (network, parsing errors etc..)
            *
            * @param {Function} callback
            * @return {CmisRequest} request
            */
            this.error = function (callback) {
                callback_error = callback || _noop;
                return this;
            };

        }


        //Private members and methods
        var _url = url;
        var _token = null;
        var _username = null;
        var _password = null;
        var _afterlogin;

        var _noop = function () {};

        var _globalNotOk = _noop;
        var _globalError = _noop;


        var _http = function (method, url) {
            var r = request(method, url);
            if (_username && _password) {
                return r.auth(_username, _password);
            }
            return r;
        };

        var _get = function (url) {
            return _http('GET', url);
        };

        var _post = function (url) {
            return _http('POST', url).type('form');
        };

        var _defaultOptions = {succinct: true};

        var _fill = function (options) {
            var o = {};
            for (var k in _defaultOptions) {
                o[k] = _defaultOptions[k];
            }
            if (options === undefined) {
                return o;
            }
            for (k in options) {
                o[k] = options[k];
            }
            return o;
        };

        var _setProps = function(properties, options){        
            var i = 0;
            for (var id in properties){
                options['propertyId['+i+']'] = id;
                options['propertyValue['+i+']'] = properties[id];
                i++;
            }
        };
        
        return session;
        };

    return lib;

}));