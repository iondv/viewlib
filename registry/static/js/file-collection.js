(function ($) {

  $.fn.ionFileCollection = function (opts) {
    var options = opts.collection;

  	var $this = $(this.get(0));

    var $table = $this.find('.table');

    var map = options.map || {};

    $table.data('file-col-tools_render', function(data, type, row, meta) {
      var file = map.file && data[map.file] && data[map.file] || {};
      var content = '<div style="width:135px;" class="file-frame" data-fileid="' + file.id + '" data-filename="' + file.name + '">';

      // link
      if (file.link) {
        content += '<a target="_blank" href="' + file.link + '" class="btn btn-default"><span class="fa fa-download"></span></a>';
      } else {
        content += '<button class="btn btn-default" disabled><span class="fa fa-download"></span></button>';
      }

      // delete button
      if (options.actions.delete) {
        content += '<button class="btn btn-default file-col-delete" data-row="' + meta.row + '">';
        content += '<span class="fa fa-trash"></span></button>';
      }

      // share button
      if (options.actions.share) {
        content += '<button class="btn btn-default" data-toggle="modal" data-target="#' + opts.modalId + '">';
        content += '<span class="glyphicon glyphicon-cloud-download" title="sharing"></span>';
        content += '</button>';
      }

      content += '</div>'
      return content;
    });

  	var table = new AttrListManager($this, function (e, settings, json, xhr) {});

    if (options.actions.share) {
      $this.ionFileShare(opts.fileshare);
    }

    $table.on('click', '.file-col-delete', function (event) {
      var $thisBtn = $(this);
      var data = table.dt.row($thisBtn.data('row')).data() || {};
      if (data._id && data.__class && confirm('Удалить объект?')) {
        if (options.url && options.url.remove) {
          $.post(options.url.remove, {class: data.__class, id: data._id})
            .done(function(){
              table.dt.rows($thisBtn.data('row')).remove();
              table.dt.draw();
            })
            .fail(function (xhr) {
              messageCallout.error(xhr.$message || 'Ошибка при извлечении объектов');
              console.error(xhr);
            })
            .fail(processAjaxError);
        } else {
          table.dt.rows($thisBtn.data('row')).remove();
          table.dt.draw();
        }
      }
    });

    var $uploader = $this.find('.uploader');

    var hidden = $this.find('input[type=hidden]');

    var $form = $this.closest('form');
    var objectManager = $form.data('manager');

    function applier(file, $container, action) {
      if (!file || !file.id) {
        return;
      }
      var item = {
        '$action': 'CREATE',
        '$masterClass': options.masterClass,
        '$masterId': options.masterId,
        '$masterProperty': options.masterProperty,
        validateBy: options.validateBy
      };
      if (map.file) {
        item[map.file] = file.id;
      }
      if (map.fileName) {
        item[map.fileName] = file.options && file.options.name || file.name;
      }
      $.ajax({
        url: options.url.do,
        type: 'POST',
        dataType: 'json',
        data: item,
        success: function(data){
          table.onNewItem(data);
          $container.hide();
        }
      });
    };

    var messageSelector = '.uploader-message';
    var $field = $this.find('.attr-value');

    $uploader.ajaxUploader()
      .on('uploader.selected', function (event, data) {
        $uploader.find('.uploader-overflow').hide();
      })
      .on('uploader.overflow', function (event, data) {
        $uploader.find('.uploader-overflow').text(data).show();
      })
      .on('uploader.file.appended', function (event, data) {
        data.$item.find('.uploader-filename').text(data.file.name
          +' ('+ commonHelper.formatFileSize(data.file.size) + ')');
      })
      .on('uploader.file.validated', function (event, data) {
        if (data.image) {
          data.$item.addClass('thumb').find('.uploader-thumb div').append(data.image);
        }
      })
      .on('uploader.file.started', function (event, data) {
        data.$item.removeClass('pending').addClass('processing');
        data.$item.find(messageSelector).text('Загрузка на сервер...');
      })
      .on('uploader.file.progress', function (event, data) {
        data.$item.find('.progress-bar').css('width', data.percent + '%');
      })
      .on('uploader.file.uploaded', function (event, data) {
        data.$item.removeClass('processing').addClass('done');
        data.$item.find(messageSelector).text('Загружен');
        var file;
        try {
          file = JSON.parse(data.response)[$uploader.data('attr')];
        } catch (err) {
          file = data.response;
        }
        applier(file, data.$item, true);
      })
      .on('uploader.file.error', function (event, data) {
        data.$item.removeClass('pending processing').addClass('failed');
        data.$item.find(messageSelector).text('Ошибка при загрузке файла');
      })
      .on('uploader.file.confirmRemove', function (event, data) {
        if (confirm('Удалить загруженный файл?')) {
          applier(data.response, data.$item, false);
          data.remove();
        }
      });

  };

})(jQuery);