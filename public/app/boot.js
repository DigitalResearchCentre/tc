require('script!angular2/bundles/angular2-polyfills');
require('script!rxjs/bundles/Rx.umd');
require('script!angular2/bundles/angular2-all.umd');

var AppComponent = require('./app');

document.addEventListener('DOMContentLoaded', function() {
  ng.platform.browser.bootstrap(AppComponent);
});
