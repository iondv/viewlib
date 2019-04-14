const respond = require('modules/registry/backend/respond');
const onError = require('modules/registry/backend/error');

const map = {
  file: 'file'
}

function FileCollection(options) {

  this.init = () => {
    options.module.post([
      '/viewlib/api/file-collection/:class/:id/:collection'
    ], (req, res) => respond(['auth', 'fileStorage', 'securedDataRepo'],
      (scope) => {
        const user = scope.auth.getUser(req);
        scope.securedDataRepo.getItem(req.params.class, req.params.id, {user})
          // .then((item) => scope.fileStorage.fetch([req.body.id]))
          .then(() => res.send({}))
          .catch(err => onError(scope, err, res));
      },
      res)
    );
    return Promise.resolve();
  };

}

module.exports = FileCollection;
