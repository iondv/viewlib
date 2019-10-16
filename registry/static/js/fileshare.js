(function ($) {

  $.fn.ionFileShare = function (options) {
    if (!options.url ||
      !options.url.getShare ||
      !options.url.updateShare ||
      !options.url.shareStatus) {
      console.error('no url specified');
      return;
    }
    var $this = $(this.get(0)),
    $shareModal = $this.find('.modal.fileshare'),
    $uploader = $this.find('.uploader'),
    $loader = $shareModal.find('.table-loading'),
    $shareDir = $this.find('.dir-share');

    function drawModalParams($modal, params, isDir) {
      var a, $permissions, $permissionsContainer, expiration;
      $loader.show();
      if ($modal && params){
        $modal.find('input[name=shareSet]').prop('checked', !!(params.shareUrl)).change();
        if (params.shareUrl) {
          a = document.createElement('a');
          a.setAttribute('href', params.shareUrl);
          $modal.find('input.share-link').val(a.href);
          $modal.find('.modal-footer > a').attr('href', params.shareUrl).show();
        } else {
          $modal.find('input.share-link').val('');
          $modal.find('.modal-footer > a').attr('href', '').hide();
        }
        $modal.find('input[name=passwordSet]').prop('checked', !!(params.passwordSet)).change();
        $modal.find('input[name=expirationSet]').prop('checked', !!(params.expiration)).change();
        if (params.expiration) {
          $modal.find('input[name=expiration]')
            .val(moment(params.expiration).format(options.locale ? options.locale.dateTimeFormat : null));
        } else {
          $modal.find('input[name=expiration]').val('');
        }
        $permissions = $modal.find('input[name=permissions]');
        $permissionsContainer = $permissions.closest('div.form-group');
        $permissionsContainer.hide();
        if (isDir){
          $permissions.prop('checked', parseInt(params.permissions) > 2);
          $permissionsContainer.show();
        }
      }
      $loader.hide();
    }

    $shareModal.find('input.toggler').on('change', function() {
      var $toggler = $(this),
        handleId = $toggler.data('handle');
      $shareModal.find(handleId).toggle(this.checked);
    });

    $shareModal.find('input[name=expiration]').datetimepicker({
      locale: options.locale ? options.locale.lang : false,
      format: options.locale ? options.locale.dateFormat: false
    });

    $shareModal.on('show.bs.modal', function (e) {
      if (!e.relatedTarget) {
        return;
      }
      var $target = $(e.relatedTarget),
        ff = $target.closest('.file-frame'),
        fileId = ff.data('fileid'),
        fileName = ff.data('filename'),
        shareOptions = $target.data('share-options');

      $shareModal.data('related', e.relatedTarget);
      if (fileName) {
        $shareModal.find('.modal-title').html(fileName);
      }
      if (shareOptions) {
        drawModalParams($shareModal, shareOptions, $target.hasClass('dir-share'));
      } else if (fileId) {
        $loader.show();
        $.ajax({
          url: options.url.getShare + encodeURIComponent(fileId),
          type: 'GET',
          dataType: 'json',
          success: function (data) {
            $loader.hide();
            if (data) {
              $target.data('share-options', data);
              drawModalParams($shareModal, data, $target.hasClass('dir-share'));
            }
          },
          error: function (xhreq, status, error) {
            $loader.hide();
            $shareModal.modal('hide');
            messageCallout.error(xhreq.responseText || error);
            console.log(status, error);
          }
        });
      }
    });

    $shareModal.find('.share-apply').on('click', function(){
      var $target = $($shareModal.data('related')),
        so = $target.data('share-options') || {},
        fileId = $target.closest('.file-frame').data('fileid'),
        form = {},
        result = {},
        dirty = 0;
      $shareModal.find(':input').each(function() {
        if (this.name) {
          if (this.type === 'checkbox') {
            form[this.name] = this.checked;
          } else {
            form[this.name] = this.value;
          }
        }
      });
      form.expiration = form.expirationSet ? form.expiration : null;
      if (form.shareSet !== !!(so.shareUrl)) {
        result.shareSet = form.shareSet; dirty++;
      }
      if (result.shareSet !== false) {
        if (form.permissions !== (parseInt(so.permissions) > 2)) {
          result.permissions = !!(form.permissions); dirty++;
        }
        if ((form.passwordSet !== !!(so.passwordSet)) || 
          (form.passwordSet === true && !!(so.passwordSet) === true)) {
          result.password = form.password || false; dirty++;
        }
        if (form.expiration !== moment(so.expiration).format(options.locale ? options.locale.dateTimeFormat : null)) {
          result.expiration = form.expiration || false; dirty++;
        }
      }
      if (dirty > 0 && fileId) {
        $loader.show();
        $.ajax({
          url: options.url.updateShare + encodeURIComponent(fileId),
          type: 'POST',
          dataType: 'json',
          data: result,
          success: function (data) {
            $loader.hide();
            if (data) {
              $target.data('share-options', data);
              drawModalParams($shareModal, data, $target.hasClass('dir-share'));
            }
          },
          error: function (xhreq, status, error) {
            $loader.hide();
            $shareModal.modal('hide');
            messageCallout.error(xhreq.responseText || error);
            console.log(status, error);
          }
        });
      }
    });

    $this.find('.remove-fileshare-btn').on('click', function() {
      var frm = $(this).closest('.file-frame');
      var fileId = frm.data('fileid');
      if(confirm('Вы действительно хотите удалить файл "' + frm.data('filename') + '" ?')){
        $.ajax({
          url: options.url.removeFile + encodeURIComponent(fileId),
          type: 'POST',
          success: function (data) {
            frm.remove();
            $uploader.show();
            messageCallout.info('Файл удален');
          },
          error: function (xhreq, status, error) {
            console.log(status, error);
            messageCallout.error(error);
          }
        });
      }
    });

    $.ajax({
      url: options.url.shareStatus,
      type: 'GET',
      dataType: 'json',
      success: function (data) {
        var ff;
        if (data && data.directory) {
          ff = $shareDir.closest('.file-frame');
          ff.data('fileid', data.directory);
          ff.data('filename', data.directory);
          $shareDir.show();
        }
      },
      error: function (xhreq, status, error) {
        console.log(status, error);
      }
    });

  };

})(jQuery);