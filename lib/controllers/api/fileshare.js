const respond = require('modules/registry/backend/respond');
const onError = require('modules/registry/backend/error');
const {parseDirName, mapDirProperties} = require('modules/registry/backend/items');
const moduleName = require('modules/registry/module-name');
const ShareAccessLevel = require('core/interfaces/ResourceStorage/lib/ShareAccessLevel');

function toBoolean(val) {
  if (typeof val === 'boolean') {
    return val;
  }
  if (typeof val === 'string') {
    return val === 'true';
  }
  return null;
}

function toShareAccess(val) {
  val = toBoolean(val);
  if (val === true) {
    return ShareAccessLevel.WRITE;
  }
  if (val === false) {
    return ShareAccessLevel.READ;
  }
  return null;
}

function validateString(val) {
  if (typeof val === 'boolean') {
    if (val === false) {
      return false;
    }
  }
  if (typeof val === 'string') {
    if (val === 'false') {
      return false;
    }
    return val;
  }
  return null;
}

/*
  * */
function FileshareController(options) {

  function removeFile(req) {
    try {
      return options.fileStorage.remove(decodeURIComponent(req.params.fileId)).then(() => {return {status: 'ok'};});
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function updateShare(req) {
    try {
      if (validateString(req.body.shareSet) === false) {
        return options.fileStorage.deleteShare(decodeURIComponent(req.params.fileId)).then(() => {return {};});
      }
      const access = toShareAccess(req.body.permissions);
      const params = {
        password: validateString(req.body.password),
        expiration: validateString(req.body.expiration)
      };
      return options.fileStorage.share(decodeURIComponent(req.params.fileId), access, params)
        .then(share => share.getOptions());
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function shareStatus(scope, req) {
    try {
      const storageSettings = scope.settings.get(`${moduleName}.storage`) || {};
      let directory = null;
      let promise = Promise.resolve(null);
      if (storageSettings[req.params.class] && storageSettings[req.params.class][req.params.property]) {
        if (req.params.id) {
          let eagerLoading = [];
          mapDirProperties(storageSettings[req.params.class][req.params.property], (prop) => {
            if (!eagerLoading.includes(prop)) {
              eagerLoading.push(prop);
            }
          });
          eagerLoading = eagerLoading.map(el => el.split('.'));
          let opts = {forceEnrichment: eagerLoading};
          promise = scope.dataRepo.getItem(req.params.class, req.params.id, opts);
        }
        promise = promise
          .then(item => parseDirName(
            storageSettings[req.params.class][req.params.property], req.params.class, '', req.params.property, item
          ))
          .then(dir => directory = dir);
      }
      return promise
        .then((dir) => {
          if (!dir) {
            return null;
          }
          if (dir.slice(-1) === '/') {
            directory = dir.slice(0, -1);
          }
          return scope.fileStorage.currentShare(directory);
        })
        .then((data) => {
          data = data || {};
          data.directory = directory;
          return data;
        });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  this.init = () => {
    if (options.module) {
      options.module.post('/viewlib/api/fileshare/remove/:fileId', (req, res) => respond([],
        (scope) => {
          removeFile(req)
            .then(data => res.send(data))
            .catch(err => onError(scope, err, res));
        },
        res));

      options.module.post('/viewlib/api/fileshare/:fileId', (req, res) => respond([],
        (scope) => {
          updateShare(req)
            .then(data => res.send(data))
            .catch(err => onError(scope, err, res));
        },
        res));

      options.module.get([
        '/viewlib/api/fileshare/:class/:property',
        '/viewlib/api/fileshare/:class/:id/:property'
      ], (req, res) => respond([],
        (scope) => {
          shareStatus(scope, req)
            .then(data => res.send(data))
            .catch((err) => {
              if (err && err.name === 'OwnCloudError' && parseInt(err.statusCode) === 404) {
                return res.send({});
              }
              return onError(scope, err, res);
            });
        },
        res));
    }
    return Promise.resolve();
  };
}
module.exports = FileshareController;
