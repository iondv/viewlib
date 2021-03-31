const respond = require('@iondv/registry/backend/respond');
const onError = require('@iondv/registry/backend/error');
const {getStorageDir} = require('@iondv/registry/backend/items');
const moduleName = require('@iondv/registry/module-name');
const { resources: { ShareAccessLevel } } = require('@iondv/commons-contracts');
const { PropertyTypes } = require('@iondv/meta-model-contracts');

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

  function removeFile(scope, req) {
    try {
      return options.fileStorage.remove(decodeURIComponent(req.params.fileId))
        .then(() => {
          if (req.params.class && req.params.id && req.params.property) {
            return scope.dataRepo.getItem(req.params.class, req.params.id, {})
              .then((item) => {
                const cm = item.getMetaClass();
                const pm = cm.getPropertyMeta(req.params.property);
                if (!pm) {
                  return;
                }
                let upd;
                if (pm.type === PropertyTypes.FILE) {
                  upd = {[pm.name]: null};
                } else if (pm.type === PropertyTypes.FILE_LIST) {
                  const files = item.get(pm.name);
                  if (Array.isArray(files)) {
                    upd = {[pm.name]: files.filter(sf => sf.id !== req.params.fileId).map(sf => sf.id)};
                  } else {
                    upd = {[pm.name]: []};
                  }
                }
                if (!upd) {
                  return;
                }
                return scope.dataRepo.editItem(req.params.class, req.params.id, upd);
              });
          }
        })
        .then(() => {return {status: 'ok'};});
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
      let directory;
      return getStorageDir(req.params.class, req.params.id, req.params.property, scope, moduleName)
        .then((dir) => {
          if (!dir) {
            return null;
          }
          directory = dir.slice(-1) === '/' ? dir.slice(0, -1) : dir;
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
      options.module.post([
        '/viewlib/api/fileshare/remove/:fileId',
        '/viewlib/api/fileshare/remove/:class/:id/:property/:fileId'
      ], (req, res) => respond([],
        (scope) => {
          removeFile(scope, req)
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
