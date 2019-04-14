'use strict';
(function () {

  var defaultSettings = {
    maxFiles: 1,
    minSize: 1,
    maxSize: 10485760,
    extensions: null,
    mimeTypes: null,
    tooSmall: "Минимальный размер файла - {limit}",
    tooBig: "Максимальный размер файла - {limit}",
    wrongExtension: "Разрешены только: {extensions}",
    wrongMimeType: "Разрешены только: {mimeTypes}",
    onlyImage: false,
    maxHeight: null,
    maxWidth: null,
    minHeight: 1,
    minWidth: 1,
    notImage: "Файл не является изображением.",
    overHeight: "Высота максимум - {limit} пикс.",
    overWidth: "Ширина максимум - {limit} пикс.",
    underHeight: "Высота минимум - {limit} пикс.",
    underWidth: "Ширина минимум - {limit} пикс.",
    tooMany: "Слишком много файлов.",
    alreadyExists: "Такой файл уже выбран",
    confirmRemoveStatus: ['done', 'uploading'],
    scanSettings: {
      use_asprise_dialog: true,
      show_scanner_ui: true,
      twain_cap_setting: {
        ICAP_PIXELTYPE: 'TWPT_RGB'
      },
      output_settings: [{
        type: 'return-base64',
        format: 'jpg'
      }]
    }
  };

  $.fn.ajaxScanUploader = function ($attrInput, options) {
    return this.each(function () {
      var $uploader = $(this);
      if (!$uploader.data('uploader')) {
        new Uploader($uploader, $attrInput, options);
      }
    });
  };

  const kByte = 1024;
  const mByte = kByte * 1024;
  function resetFormElement ($element) {
    $element.wrap('<form>').closest('form').get(0).reset();
    $element.unwrap();
  }
  function formatFileSize (size) {
    if (size > mByte) return parseInt(size / mByte) + ' Мб';
    if (size > kByte) return parseInt(size / kByte) + ' Кб';
    return size + ' байт';
  }

  function Uploader ($uploader, $attrInput, options) {
    var self = this;
    this.$uploader = $uploader;
    this.$attrInput = $attrInput;
    this.messageSelector = '.uploader-message';
    this.options = $.extend({}, defaultSettings, $uploader.data('options'), options);
    this.options.sourceMaxFiles = this.options.maxFiles;
    this.url = $uploader.data('url');
    this.fileAttrName = this.options.fileAttrName;
    if (typeof this.fileAttrName === 'undefined') {
      console.error('Не определен аттрибут в который будет загружен файл');
    }
    this.files = [];
    this.$input = $uploader.find('.scan-input-file');
    this.initControl();
    if (this.options.mimeTypes) {
      this.$input.attr('accept', this.options.mimeTypes.join(','));
    }
    if (this.options.maxFiles > 1) {
      this.$input.attr('multiple', true);
    }
    this.$input.change(function () {
      self.setFiles(this.files);
    });
    $uploader.data('uploader', this);
  }

  $.extend(Uploader.prototype, {
    isFinished() {
      for (var i = 0; i < this.files.length; ++i)
        if (this.files[i].isProcessing()) return false;
      return true;
    },
    fireEvent(eventName, data) {
      this.$uploader.trigger('uploader.' + eventName, data);
    },
    empty(eventName) {
      this.options.maxFiles = this.options.sourceMaxFiles;
      this.$uploader.find('.uploader-item').not('.sample').remove();
      let self = this;
      if (self.$attrInput) {
        this.files.forEach((uFile) => {
          self.$attrInput.trigger('attr.apply', [uFile.file.name, false]);
        });
      }
      this.files = [];
    },
    initControl() {
      const self = this;
      this.$uploader
        .on('uploader.empty', function () {
          self.empty();

        })
        .on('uploader.upload', function (event, data) {
          self.$input.click();
        })
        .on('uploader.scan', function (event, data) {
          self.scan();
        })
        .on('uploader.selected', function (event, data) {
          $(this).find('.uploader-overflow').hide();
        })
        .on('uploader.overflow', function (event, data) {
          $(this).find('.uploader-overflow').text(data).show();
        })
        .on('uploader.file.appended', function (event, data) {
          data.$item.find('.uploader-filename').text(data.file.name
            +' ('+ formatFileSize(data.file.size) + ')');
        })
        .on('uploader.file.validated', function (event, data) {
          if (data.image) {
            data.$item.addClass('thumb').find('.uploader-thumb div').append(data.image);
          }
        })
        .on('uploader.file.started', function (event, data) {
          data.$item.removeClass('pending').addClass('processing');
          data.$item.find(self.messageSelector).text('Загрузка на сервер...');
        })
        .on('uploader.file.progress', function (event, data) {
          data.$item.find('.progress-bar').css('width', data.percent + '%');
        })
        .on('uploader.file.uploaded', function (event, data) {
          data.$item.removeClass('processing').addClass('done');
          data.$item.find(self.messageSelector).text('Загружен');
          $(window).trigger('resize');
          try {
            data = JSON.parse(data.response)[self.fileAttrName];
          } catch (err) {
            data = data.response;
          }
          if (self.$attrInput)
            self.$attrInput.trigger('attr.apply', [data, true]);
          self.fireEvent('done', data);
        })
        .on('uploader.file.error', function (event, data) {
          data.$item.removeClass('pending processing').addClass('failed');
          data.$item.find(self.messageSelector).text('Ошибка при загрузке файла');
          self.fireEvent('done', {});
        })
        .on('uploader.file.confirmRemove', function (event, data) {
          if (confirm('Удалить загруженный файл?')) {
            let eventData = JSON.parse(data.response);
            if (self.$attrInput && eventData &&  self.fileAttrName)
              self.$attrInput.trigger('attr.apply', [eventData[self.fileAttrName], false]);
            data.remove();
          }
        });
    },
    scan() {
      let self = this;
      scanner.scan(function (successful, mesg, response) {
        if (!successful)
          console.error('Failed: ' + mesg);
        else
        if (successful && mesg != null && mesg.toLowerCase().indexOf('user cancel') >= 0)
          console.info('User cancelled');
        else {
          let scannedImages = scanner.getScannedImages(response, true, false);
          if (Array.isArray(scannedImages))
            scannedImages = scannedImages.map(img => self.base64ToBlob(img.src, img.mimeType));
          self.setFiles(scannedImages);
        }
      }, self.options.scanSettings);
    },
    setFiles(files) {
      var counter = this.getCounter();
      counter.total += files.length;
      if (counter.total > this.options.maxFiles) {
        this.fireEvent('overflow', this.options.tooMany);
      } else if (files.length) {
        for (var i = 0; i < files.length; ++i) {
          this.files.push(new UFile(files[i], this));
        }
        resetFormElement(this.$input);
        this.fireEvent('selected', counter);
        this.processNext();
      }
    },
    getCounter() {
      var counter = {total: 0, failed: 0, done: 0};
      for (var i = 0; i < this.files.length; ++i) {
        if (this.files[i].removed) continue;
        if (this.files[i].failed) ++counter.failed;
        if (this.files[i].status === File.STATUS_DONE) ++counter.done;
        ++counter.total;
      }
      return counter;
    },
    processNext() {
      var self = this;
      setTimeout(function () {
        var map = self.getFirstFilesByStatus();
        if (UFile.STATUS_PENDING in map) {
          map[UFile.STATUS_PENDING].append();
        } else if (UFile.STATUS_APPENDED in map) {
          map[UFile.STATUS_APPENDED].validate();
        } else if (UFile.STATUS_VALIDATED in map && !(UFile.STATUS_UPLOADING in map)) {
          map[UFile.STATUS_VALIDATED].upload();
        }
      }, 50);
    },
    getFirstFilesByStatus() {
      var map = {};
      for (var i = 0; i < this.files.length; ++i) {
        var file = this.files[i];
        if (file.removed || file.failed || file.status in map) continue;
        map[file.status] = file;
      }
      return map;
    },
    base64ToBlob(src, mime) {
      if (null != src && 0 == src.indexOf("data:")) {
        var mimePos = src.indexOf(";");
        !mime && 0 < mimePos && (mime = src.substring(5, mimePos));
        mimePos = src.indexOf("base64,");
        0 < mimePos && (src = src.substr(mimePos + 7))
      }
      src = src.replace(/(\r\n|\n|\r)/gm, "");
      src = atob(src);
      mimePos = src.length;
      var binary = new ArrayBuffer(mimePos);
      binary = new Uint8Array(binary);
      for (var f = 0; f < mimePos; f++)
        binary[f] = src.charCodeAt(f);
      src = new Blob([binary], {
        type: mime
      });
      let ext;
      if (mime === null) {
        ext = 'unknown'
      } else if(mime.toLowerCase().indexOf('bmp') !== -1) {
        ext = 'bmp'
      } else if(mime.toLowerCase().indexOf('png') !== -1) {
        ext = 'png'
      } else if(mime.toLowerCase().indexOf('jp') !== -1) {
        ext = 'jpg'
      } else if(mime.toLowerCase().indexOf('tif') !== -1) {
        ext = 'tif'
      } else if(mime.toLowerCase().indexOf('pdf') !== -1) {
        ext = 'pdf'
      } else if(mime.toLowerCase().indexOf('pdf') !== -1) {
        ext = 'unknown';
      }
      let name = Math.random().toString(36).substr(2, 5);
      src.lastModifiedDate = new Date();
      src.name = `${name}.${ext}`;
      return src;
    },
    changeMaxFiles(delta) {
      this.options.maxFiles += delta;
      this.$uploadBtn.toggle(this.options.maxFiles > this.files.length);
      this.$scanBtn.toggle(this.options.maxFiles > this.files.length);
    }
  });

  function UFile (file, uploader) {
    this.failed = false;
    this.removed = false;
    this.status = UFile.STATUS_PENDING;
    this.file = file;
    this.uploader = uploader;
  }

  UFile.STATUS_PENDING = 'pending';
  UFile.STATUS_APPENDED = 'appended';
  UFile.STATUS_VALIDATED = 'validated';
  UFile.STATUS_UPLOADING = 'uploading';
  UFile.STATUS_DONE = 'done';

  $.extend(UFile.prototype, {
    fireEvent(eventName) {

      this.uploader.fireEvent('file.' + eventName, this);
    },
    progressUploading(event) {
      // can be FALSE if server nevere sent Content-Length header in the response
      if (event.lengthComputable) {
        this.percent = parseInt(event.loaded * 100 / event.total);
        this.fireEvent('progress');
      }
    },
    changeReadyState() {
      if (this.xhr.readyState != 4) return;
      if (this.xhr.status == 200) {
        this.status = UFile.STATUS_DONE;
        this.response = this.xhr.response;
        this.fireEvent('uploaded');
      } else {
        this.setError(this.xhr.response);
      }
      this.uploader.processNext();
    },

    isProcessing() {
      return !this.removed && !this.failed && !this.status != UFile.STATUS_DONE;
    },
    isDone() {
      return !this.removed && !this.failed && this.status === UFile.STATUS_DONE;
    },
    isMatchFile() {
      var files = this.uploader.files;
      for (var i = 0; i < files.length; ++i) {
        if (files[i].removed) continue;
        // проверять на совпадение только с предыдущими файлами
        if (files[i] === this) return false;
        if (files[i].file.size == this.file.size && files[i].file.name == this.file.name) return true;
      }
      return false;
    },

    setError(error) {
      this.failed = true;
      this.error = error;
      this.fireEvent('error');
    },

    remove() {
      this.removed = true;
      if (this.$item)
        this.$item.remove();
      if (this.xhr)
        this.xhr.abort();
      this.fireEvent('remove');
    },
    append() {
      let self = this;
      this.$item = this.uploader.$uploader.find('.sample').clone().removeClass('sample').show();
      this.uploader.$uploader.find('.uploader-list').prepend(this.$item);
      this.$item.data('file', this).find('.uploader-remove')
        .click(function () {
          self.failed || self.uploader.options.confirmRemoveStatus.indexOf(self.status) < 0 ?
            self.remove() :
            self.fireEvent('confirmRemove');
        });
      this.status = UFile.STATUS_APPENDED;
      this.fireEvent('appended');
      this.uploader.processNext();
    },
    upload() {
      let self = this;
      this.xhr = new XMLHttpRequest;
      this.xhr.open('POST', this.uploader.url);
      if (this.xhr.upload) {
        this.xhr.upload.addEventListener('progress', function (event) {
          self.progressUploading(event);
        }, false);
      }
      this.xhr.onreadystatechange = function (event) {
        self.changeReadyState(event);
      };
      // создать данные формы для выгрузки на сервер
      var data = new FormData;
      var attr = this.uploader.fileAttrName || 'file';
      data.append(attr, this.file.name);
      data.append(attr, this.file);
      this.status = UFile.STATUS_UPLOADING;
      this.fireEvent('started');
      this.xhr.send(data);
    },

    validate() {
      var self = this;
      // пытаемся загрузить файл как изображение, и по результату начинаем валидацию
      // загрузка изображения происходит по событиям, а не последовательно
      this.image = new Image;
      this.image.onload = function () {
        self.startValidate();
      };
      this.image.onerror = function () {
        self.image = null;
        self.startValidate();
      };
      this.image.src = window.URL.createObjectURL(this.file);
    },
    startValidate() {
      var error = this.validateFile();
      this.status = UFile.STATUS_VALIDATED;
      this.fireEvent('validated');
      if (error) this.setError(error);
      this.uploader.processNext();
    },
    validateFile() {
      const options = this.uploader.options;
      const file = this.file;
      if (this.isMatchFile())
        return options.alreadyExists;
      if (options.extensions && options.extensions.length > 0) {
        var index = file.name.lastIndexOf('.');
        var ext = index > -1 ? file.name.substr(index + 1, file.name.length).toLowerCase() : '';
        if (options.extensions.indexOf(ext) < 0)
          return options.wrongExtension.replace(/\{extensions\}/g, options.extensions.join(', '));
      }
      if (options.mimeTypes && options.mimeTypes.length > 0) {
        if (options.mimeTypes.indexOf(file.type) < 0)
          return options.wrongMimeType.replace(/\{mimeTypes\}/g, options.mimeTypes.join(', '));
      }
      if (options.maxSize && options.maxSize < file.size)
        return options.tooBig.replace(/\{limit\}/g, formatFileSize(options.maxSize));
      if (options.minSize && options.minSize > file.size)
        return options.tooSmall.replace(/\{limit\}/g, formatFileSize(options.minSize));
      if (options.onlyImage)
        return this.image ? this.validateImage() : options.notImage;
      if (this.image) return this.validateImage();
      if (options.onlyImage) return options.notImage;
      return false;
    },
    validateImage() {
      var options = this.uploader.options;
      if (options.maxHeight && options.maxHeight < this.image.height) {
        return options.overHeight.replace(/\{limit\}/g, options.maxHeight);
      }
      if (options.maxWidth && options.maxWidth < this.image.width) {
        return options.overWidth.replace(/\{limit\}/g, options.maxWidth);
      }
      if (options.minHeight && options.minHeight > this.image.height) {
        return options.underHeight.replace(/\{limit\}/g, options.minHeight);
      }
      if (options.minWidth && options.minWidth > this.image.width) {
        return options.underWidth.replace(/\{limit\}/g, options.minWidth);
      }
      return false;
    }
  });
})();
