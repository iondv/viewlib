'use strict';

(function ($) {
  $.fn.addScanCell = function() {
    try {
      if (typeof InlineFormCell === 'undefined')
        throw new Error('Inline cell editing class is not loaded');
      const oldinlineCreate = InlineFormCell.create;
      InlineFormCell.create = function (type, $cell, $data, owner) {
        if (type === 'scan')
          return new ScanCell($cell, $data, owner);
        else
          return oldinlineCreate(type, $cell, $data, owner);
      };
      function ScanCell() {
        InlineFormCell.apply(this, arguments);
      }

      $.extend(ScanCell.prototype, InlineFormCell.prototype, {
        initValue() {
          let input = $("<div></div>");
          let $scanGroup = this.$data;
          let $propInput = $scanGroup.find('.attr-value');
          let $uploaders = $scanGroup.find('.scan-uploader');
          let $holder = $scanGroup.find('.scan-holder');
          let $scanBtn = $scanGroup.find('.scan-btn');
          let $uploadBtn = $scanGroup.find('.uploader-btn');
          this.$value = $propInput;
          $scanBtn.click(function () {
            $uploaders.trigger('uploader.empty');
            $holder.trigger('holder.clear');
            $uploaders.trigger('uploader.scan');
            $uploaders.one('uploader.file.uploaded', function (event, data) {
              $propInput.trigger('change');
            });
          });
          $uploadBtn.click(function () {
            $uploaders.trigger('uploader.empty');
            $holder.trigger('holder.clear');
            $uploaders.trigger('uploader.upload');
            $uploaders.one('uploader.file.uploaded', function (event, data) {
              $propInput.trigger('change');
            });
          });
          $uploaders.ajaxScanUploader($propInput, {fileAttrName: $propInput.attr('name')});
          $holder.thumbnailCollection('', $propInput);
          let removeBtns = $holder.find('.remove-btn');
          removeBtns.click(function () {
            let frame = $(this).parent();
            $propInput.trigger('attr.apply', [frame.data('fileid'), false]);
            frame.remove();
          })
          $propInput.on('attr.apply', function (event, data, add) {
            let old = null;
            let val = $(this).val();
            try {
              old = JSON.parse(val);
            } catch (err) {
            }
            if (!Array.isArray(old))
              old = val;
            if (!old) {
              old = [];
            }
            if (!Array.isArray(old)) {
              old = [old];
            }
            let id = (typeof data === 'object') ? data.id : data;
            if (add) {
              old.push(id);
            } else {
              var ind = old.indexOf(id);
              if (ind >= 0) {
                old.splice(ind, 1);
              }
            }
            $(this).val(old.length > 1 ? JSON.stringify(old) : old[0]);
            $(this).trigger('change');
          })
          input.append($propInput);
          input.append($uploaders);
          input.append($holder);
          input.append($scanBtn);
          input.append($uploadBtn);
          this.addContent(input.children());
          $(window).trigger('resize');
        }
      });
    } catch (err) {
      let text = $('.message-callout-content').text();
      messageCallout.error(`${text}\n${JSON.stringify(err.message, null, '\t')}`);
    }
    $('.scan-inline').click(function () {
      let scanBtn = $(this)
      scanBtn.siblings('.create-inline').click();
      $(document).one('ajaxStop', function () {
        scanBtn.parent().siblings('.table-responsive').find('.inline-form-cell').find('.scan-btn').click();
      });
    });
  };
})(jQuery);
