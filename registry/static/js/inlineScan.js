/**
 * Created by IVAN KUZNETSOV{piriflegetont@gmail.com} on 28.08.2018.
 */
(function ($) {
  $.fn.inlineScanner = function(options) {
    try {
      let $group = $(this);
      let $scanHolder = $group.find('.scan-holder');
      let $value = $group.find('.attr-value');
      let $btn = $group.find('.scan-inline');
      let $uploaders = $group.find('.scan-uploader');
      let attr = options.attr;

      function create(fileName, options) {
        let url = options.refCreate;
        let params = options.requestParams;
        let requestParams = Object.assign({}, params, {
          $action: "SAVE",
        });
        requestParams[options.attr] = fileName;
        $.ajax({
          url: `${url}/do`,
          data: JSON.stringify(requestParams),
          type: 'POST',
          contentType: 'application/json',
          processData: false,
          success: function (data, textStatus, jqXHR) {
            $value.val(data.id);
            $value.trigger('change');
          },
          error: function (jqXHR, textStatus, errorThrown) {
            messageCallout.error(`${textStatus}: ${errorThrown}`);
          }
        });
      }

      function read(options, cb) {
        $.ajax({
          url: `${options.refRead}/${$value.val()}`,
          type: 'GET',
          contentType: 'application/json',
          processData: false,
          success: cb,
          error: function (jqXHR, textStatus, errorThrown) {
            messageCallout.error(`${textStatus}: ${errorThrown}`);
          }
        });
      }

      function update(fileName, options) {
        let url = options.refCreate;
        let requestParams = {
          $action: "SAVE",
        };
        requestParams[options.attr] = fileName;
        $.ajax({
          url: `${url}/${$value.val()}/do`,
          data: JSON.stringify(requestParams),
          type: 'POST',
          contentType: 'application/json',
          processData: false,
          success: function (data, textStatus, jqXHR) {
            $value.trigger('change');
          },
          error: function (jqXHR, textStatus, errorThrown) {
            messageCallout.error(`${textStatus}: ${errorThrown}`);
          }
        });
      }

      if ($value.val()) {
        read(options, (data, textStatus, jqXHR) => {
          let filesData = data[attr];
          if (typeof filesData === 'undefined')
            throw new Error(`Can't find property ${attr} in refClass ${options.refClass}`);
          if (!Array.isArray(filesData))
            filesData = [filesData];
          $scanHolder.thumbnailCollection(filesData);
        });
      } else {
        $scanHolder.thumbnailCollection([]);
      }
      $uploaders.ajaxScanUploader(null, {fileAttrName: options.attr});
      $btn.on('click', () => {
        $uploaders.trigger('uploader.empty');
        $uploaders.trigger('uploader.scan');
        let sendToObject = function (event, data) {
          let fileData = {};
          if (data.response) {
            try {
              fileData = JSON.parse(data.response);
            } catch (err) {
              console.error('Error parsing file upload response');
            }
          }
          if (typeof fileData[attr] === 'undefined' || typeof fileData[attr].id === 'undefined') {
            console.error('Error uploading file');
            return;
          }
          if ($value.val())
            update(fileData[attr].id, options);
          else
            create(fileData[attr].id, options);
        };
        $uploaders.one('uploader.file.started', function (event, data) {
          $scanHolder.trigger('holder.clear');
        });
        $uploaders.one('uploader.file.uploaded', sendToObject);
        $uploaders.one('uploader.file.error', () => {
          $uploaders.unbind('uploader.file.uploaded', sendToObject);
          $scanHolder.trigger('holder.add', []);
        });
      });
      $value.on('change', () => {
        $scanHolder.trigger('holder.clear');
        if ($value.val()) {
          read(options, (data, textStatus, jqXHR) => {
            let filesData = data[attr];
            if (!Array.isArray(filesData))
              filesData = [filesData];
            filesData.forEach(file => {
              $scanHolder.trigger('holder.add', file);
            });
          });
        } else {
          $scanHolder.trigger('holder.add', []);
        }
        $uploaders.trigger('uploader.empty');
      });
    } catch (err) {
      console.error(err);
    }
  }
})(jQuery);
