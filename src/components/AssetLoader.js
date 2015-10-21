/**
 * This component loads a list of assets, wrapping [PreloadJS](http://www.createjs.com/Docs/PreloadJS/modules/PreloadJS.html) or [SpringRoll](http://springroll.github.io/SpringRoll/classes/springroll.Loader.html)loading functionality into a game engine component.
 *
 * @namespace platypus.components
 * @class AssetLoader
 * @uses platypus.Component
 */
/*global console, include, platypus */
/*jslint plusplus:true */
(function () {
    "use strict";
    
    
    var Application = include('springroll.Application'), // Import SpringRoll classes
        createId = function (src) { // returns just the filename (sans extension) as the Id.
            var arr = src.split('/');
            
            arr = arr[arr.length - 1].split('.');
            
            return arr[0];
        },
        checkPush  = function (asset, list) {
            var i = 0,
                found = false;
            
            if (!asset.id) {
                asset.id = createId(asset.src);
            }
            
            for (i = 0; i < list.length; i++) {
                if (list[i].id === asset.id) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                list.push(asset);
            }
        };
    
    return platypus.createComponentClass({
        id: 'AssetLoader',
        
        properties: {
            /**
             * Determines whether to automatically load assets when this component loads.
             * 
             * @property automatic
             * @type boolean
             * @default true
             */
            automatic: true,
            
            /**
             * A list of assets to load. If not provided, the asset list is pulled directly from the game configuration file's asset list.
             * 
             * The list of assets should use PreloadJS syntax such as:
             *       [
             *           {"id": "item-1",         "src": "images/item-1.png"},
             *           {"id": "item-2",         "src": "images/item-2.png"},
             *           {"id": "item-3",         "src": "images/item-3.png"}
             *       ]
             * 
             * @property assets
             * @type Array
             * @default []
             */
            assets: null,
            
            /**
             * Determines whether to store the loaded assets automatically in platypus.assets for later retrieval.
             * 
             * @property cache
             * @type boolean
             * @default true
             */
            cache: true
        },

        constructor: function (definition) {
            this.assets = this.assets || platypus.game.settings.assets || [];
            
            this.app = Application.instance;
            this.sound = this.app.sound;
            
            this.owner.assets = {};
            this.progress = 0;
            this.total = 0;
            this.assetInterface = null;
        },

        events: {
            /**
             * On receiving this event, the asset loader begins downloading the list of assets if the "automatic" property is not set to `false`.
             * 
             * @method 'load'
             */
            "load": function () {
                if (this.automatic) {
                    /**
                     * This event is triggered as soon as the entity loads if the "automatic" property is not set to `false`.
                     * 
                     * @event 'load-assets'
                     */
                    this.owner.triggerEvent('load-assets');
                }
            },

            /**
             * On receiving this event, the asset loader begins downloading the list of assets.
             * 
             * @method 'load-assets'
             */
            "load-assets": function () {
                var onFileLoad = function (result, data) {
                        var asset = null;
                        
                        if (data && data.id) {
                            asset = this.owner.assets[data.id] = {
                                data:  data,
                                asset: result
                            };
                        
                            if (this.cache) {
                                platypus.assets[data.id] = asset;
                            }
                        } else { // audio files don't return any data from the SpringRoll loader.
                            result = null;
                            data   = null;
                        }
                        
                        this.progress += 1;
                        
                        /**
                        * This message is broadcast when an asset has been loaded.
                        * 
                        * @event 'file-load'
                        * @param load {Object} 
                        * @param load.asset {Object} Loaded asset. (`null` for audio)
                        * @param load.data {Object} Key/value pairs containing asset data. (`null` for audio) 
                        * @param load.complete {boolean} Whether this is the final asset to be loaded.
                        * @param load.total {number} The total number of assets being loaded.
                        * @param load.progress {number} The number of assets finished loading.
                        * @param load.fraction {number} Value of (progress / total) provided for convenience.
                        */
                        this.owner.trigger('file-load', {
                            asset:    result,
                            complete: (this.progress === this.total),
                            data:     data,
                            fraction: this.progress / this.total,
                            progress: this.progress,
                            total:    this.total
                        });
                        
                        if (this.progress === this.total) {
                            /**
                            * This message is triggered when the asset loader is finished loading assets.
                            * 
                            * @event 'complete'
                            */
                            this.owner.triggerEvent('complete');
                        }
                    }.bind(this);
                
                if (this.assets && this.assets.length) {
                    this.load(onFileLoad);
                } else {
                    this.owner.triggerEvent('complete');
                }
            }
        },
        
        methods: {
            destroy: function () {
                delete this.owner.assets;
            },
            
            load: function (onFileLoad) {
                var i = 0,
                    loadAssets = [],
                    sound = this.sound;

                for (i = 0; i < this.assets.length; i++) {
                    if (typeof this.assets[i] === 'string') {
                        checkPush({src: this.assets[i]}, loadAssets);
                    } else if (typeof this.assets[i].src === 'string') {
                        checkPush(this.assets[i], loadAssets);
                    }
                }

                platypus.assets = platypus.assets || {};
                this.total = loadAssets.length;

                if (sound) {
                    for (i = loadAssets.length - 1; i >= 0; i--) {
                        if (sound.exists(loadAssets[i].id)) {
                            sound.preload(loadAssets[i].id, onFileLoad);
                            loadAssets.splice(i, 1);
                        }
                    }
                }

                if (loadAssets.length) {
                    this.app.load(loadAssets, {
                        taskDone: onFileLoad
                    });
                }
            }
        }
    });
}());
