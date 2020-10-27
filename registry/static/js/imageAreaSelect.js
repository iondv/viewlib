(function ($) {
  $('[data-handler="imageAreaSelect"]').each(function () {

    const $attr = $(this);
    const options = $attr.data('handlerOptions');
    const $image = $attr.find('.file-frame-image');
    const $data = $('[name="'+ options.dataAttr +'"]');
    const $uploader = $attr.find('.uploader');

    let stage = null;

    $attr.find('[data-toggle-crop]').click(function () {
      stage ? destroyStage() : createStage();
      $(this).blur();
    });

    $attr.find('[data-remove-file]').click(function () {
      destroyStage();
      $attr.removeClass('has-image');
      $uploader.show();
    });

    $uploader.on('uploader.file.uploaded', function (event, data) {
      destroyStage();
      $attr.addClass('has-image');
      const src = $uploader.find('.uploader-item .uploader-thumb img').first().attr('src');
      $image.attr('src', src);
    });

    $uploader.on('uploader.file.remove', function () {
      $attr.removeClass('has-image');
    });

    $data.attr('readonly', true);

    if (getDataValue()) {
      createStage();
    }

    function createStage () {
      Jcrop.load($image.get(0)).then(function (image) {
        let params = {};
        let ratio = options.aspectRatio;
        if (ratio) {
          params.aspectRatio = ratio;
          params.handles = ['sw','nw','ne','se'];
        }
        stage = Jcrop.attach(image, params);
        const data = getDataValue();
        const rect = data
          ? createRectByData(data)
          : createRectByElement(stage.el, ratio);
        const widget = stage.newWidget(rect);
        widget.listen('crop.change', onChangeRect);
        updateRectPos(rect);
        stage.focus();
      }).catch(function (data) {
        console.error(data);
      });
    }

    function createRectByData (data) {
      return Jcrop.Rect.fromPoints(
        [data.left, data.top],
        [data.right, data.bottom]
      );
    }

    function createRectByElement (element, ratio) {
      const rect = Jcrop.Rect.sizeOf(element);
      if (ratio) {
        resolveRectScale(rect, ratio);
        rect.scale(ratio);
      } else {
        rect.scale(1);
      }
      return rect;
    }

    function resolveRectScale (rect, ratio) {
      const w = rect.w;
      const h = rect.h;
      rect.w = h * ratio;
      if (rect.w > w) {
        rect.w = w;
        rect.h = w / ratio;
      }
      rect.w = Math.round(rect.w);
      rect.h = Math.round(rect.h);
      rect.x = Math.round((w - rect.w) / 2);
      rect.y = Math.round((h - rect.h) / 2);
    }

    function destroyStage () {
      if (stage) {
        stage.destroy();
        stage = null;
        clearDataValue();
      }
    }

    function onChangeRect (rect) {
      updateRectPos(rect.pos);
    }

    function updateRectPos (rect) {
      setDataValue(JSON.stringify(serializeRect(rect)));
    }

    function getDataValue () {
      const value = $data.val();
      if (value) {
        try {
          return JSON.parse(value);
        } catch {}
      }
    }

    function clearDataValue () {
      setDataValue('');
    }

    function setDataValue (value) {
      $data.val(value).change();
    }

    function serializeRect (pos) {
      return {
        left: pos.x,
        top: pos.y,
        right: Math.round(pos.x + pos.w),
        bottom: Math.round(pos.y + pos.h)
      };
    }
  })
})(jQuery);