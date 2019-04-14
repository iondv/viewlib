/**
 * Created by IVAN KUZNETSOV{piriflegetont@gmail.com} on 29.08.2018.
 */


$.fn.thumbnailCollection = function(array, $input) {
  if (!$(this).data('thumb')) {
    let thumb = new Thumbnail ($(this), $input);
    if (Array.isArray(array)) {
      if (array.length === 0) {
        thumb.add();
      } else {
        array.forEach((item) => {
          thumb.add(item);
        });
      }
    }
    $(this).data('thumb', thumb);
  }
};

function Thumbnail ($holder, $input) {
  this.$holder = $holder;
  this.$input = $input;
  this.files = [];
  this.init();
};

$.extend(Thumbnail.prototype, {
  init() {
    let self = this;
    if (this.$input) {
      if (Array.isArray(this.$input.val()))
        this.files = this.$input.val();
      else
        this.files = [this.$input.val()];
    }

    this.$holder
      .on('holder.clear', () => {
        self.removeAll();
      })
      .on('holder.add', (event, data) => {
        self.add(data);
      });
  },
  add (item) {
    if (typeof item !== 'object' || item === null || typeof item.link === 'undefined') {
      if (this.$holder.children().length === 0)
        this.$holder.append($('<div class="form-control-static file-frame"></div>'));
      return;
    }
    let self = this;
    let $frame = $('<div class="form-control-static file-frame"></div>');
    this.$holder.append($frame);
    const linkThumb = item.thumbnails && item.thumbnails.small ? item.thumbnails.small.link : item.link;
    const name = item.name ? item.name : item.link;
    let $img = $(`<a href="${item.link}" target="_blank" class="file-frame-title">
                    <img src="${linkThumb}" alt="${name}">
                 </a>`);
    $frame.append($img);
    if (self.$input) {
      let $del = $('<span class="remove-btn glyphicon glyphicon-remove text-danger ml10" title="Удалить файл"></span>');
      $frame.append($del);
      $del.click(function () {
        self.$input.trigger('attr.apply', [item, false]);
        $(this).parent().remove();
      });
      self.files.push(item);
    }
    return $frame;
  },
  removeAll() {
    let self = this;
    if (self.$input) {
      self.files.forEach((item) => {
        self.$input.trigger('attr.apply', [item, false]);
      });
    }
    this.$holder.empty();
  }
});
