const respond = require('modules/registry/backend/respond');
const onError = require('modules/registry/backend/error');
const {urlResolver, slashChecker} = require('core/impl/resource/OwnCloudStorage/util');
const {getStorageDir} = require('modules/registry/backend/items');
const request = require('core/util/request');

function FileCollection(options) {

  const fulltextPath = 'index.php/apps/fulltextsearch/v1/remote';
  const searchUrl = encodeURI(urlResolver(slashChecker(options.cloudUrl), fulltextPath));

  this.init = () => {
    options.module.get([
      '/viewlib/api/file-collection/search/:class/:id/:property/:fileField',
      '/viewlib/api/file-collection/search/:class/:property/:fileField',
      '/viewlib/api/file-collection/search/:class/:fileField'
    ], (req, res) => respond(['auth', 'fileStorage', 'securedDataRepo'],
      (scope) => {
        const className = req.params.property ? `${req.params.class}.${req.params.property}` : req.params.class;
        getStorageDir(className, req.params.id, req.params.fileField, scope)
          .then((cloudDir) => {
            const reqParams = {
              method: 'GET',
              uri: searchUrl,
              qs: {
                request: JSON.stringify({
                  providers: 'all',
                  search: req.query.search,
                  page: 1,
                  options: {
                    files_local: req.query.local ? '1' : '',
                    files_within_dir: cloudDir || '',
                    files_extension: req.query.extension || ''
                  },
                  size: 20
                })
              },
              headers: {'OCS-APIRequest': true},
              auth: {
                user: options.cloudLogin,
                password: options.cloudPassword
              }
            };
            return request(reqParams);
          })
          .then(body => JSON.parse(body))
          .then((data) => {
            const {result} = data;
            const docs = [];
            Array.isArray(result) && result.map(r => r.documents).forEach(r => docs.push(...r));
            return docs.map((doc) => {
              const {excerpts, link, title} = doc;
              return {
                excerpts,
                title,
                link: urlResolver(slashChecker(options.cloudUrl), link)
              };
            });
          })
          .then(result => res.send({result}))
          .catch(err => onError(scope, err, res));
      },
      res)
    );

    return Promise.resolve();
  };

}

module.exports = FileCollection;
