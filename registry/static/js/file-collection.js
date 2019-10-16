(function ($) {

  function printSearchResults(container, results) {
    var i, j, div, ul;
    if (container) { 
      container.empty();
      $('<div>').addClass('results-count').text((results && results.length || 0) +' results:').appendTo(container);
      if (results && results.length) {
        for (i = 0; i < results.length; i++) {
          div = $('<div>').addClass('results-item').appendTo(container);
          $('<a>').attr('target','_blank').attr('href', results[i].link).text(results[i].title).appendTo(div);
          ul = $('<ul>').appendTo(div);
          if (results[0].excerpts && results[i].excerpts.length) {
            for (j = 0; j < results[i].excerpts.length; j++) {
              $('<li>').text(results[i].excerpts[j]).appendTo(ul);
            }
          }
        }
      }
    }
  }

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

  	var table = options.type === 'list' 
      ? new ListManager($table)
      : new AttrListManager($this, function (e, settings, json, xhr) {});

    if (options.actions.share) {
      $this.ionFileShare(opts.fileshare);
    }

    $table.on('click', '.file-col-delete', function (event) {
      var $thisBtn = $(this);
      var content = $thisBtn.closest('.file-frame');
      var fileId = content.data('fileid');
      var data = table.dt.row($thisBtn.data('row')).data() || {};
      if (data._id && data.__class && confirm('Delete object?')) {
        if (options.url && options.url.remove) {
          $.post(options.url.remove, {items: [{class: data.__class, id: data._id}]})
            .done(function(){
              if (options.url && options.url.removeFile && fileId) {
                $.post(options.url.removeFile  + encodeURIComponent(fileId), {})
                  .done(function() {})
                  .fail(function (xhr) { console.error(xhr) });
              }
              table.dt.rows($thisBtn.data('row')).remove();
              table.dt.draw();
            })
            .fail(function (xhr) {
              messageCallout.error(xhr.$message || 'Error during retrieval of objects');
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

    if ($uploader.length && $uploader.ajaxUploader) {
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
          data.$item.find(messageSelector).text('Uploading to server ...');
        })
        .on('uploader.file.progress', function (event, data) {
          data.$item.find('.progress-bar').css('width', data.percent + '%');
        })
        .on('uploader.file.uploaded', function (event, data) {
          data.$item.removeClass('processing').addClass('done');
          data.$item.find(messageSelector).text('Uploaded');
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
          data.$item.find(messageSelector).text('Error loading file');
        })
        .on('uploader.file.confirmRemove', function (event, data) {
          if (confirm('Delete downloaded file?')) {
            applier(data.response, data.$item, false);
            data.remove();
          }
        });
    }

    var $textSearch = $this.find('.fulltextsearch-modal');
    var $searchQuery = $this.find('input.search-query');
    var $extensionQuery = $this.find('input.extension-query');
    var $searchBtn = $textSearch.find('.run-search');
    var $searchResults = $textSearch.find('.search-results');

    if (options.url && options.url.search) {
      $searchBtn.on('click', function(){
        var data = {
          search: $searchQuery.val() || '',
          extension: $extensionQuery.val() || ''
        };
        $.ajax({
          url: options.url.search,
          type: 'GET',
          dataType: 'json',
          data: data,
          success: function(data){
            if(data && data.result) {
              printSearchResults($searchResults, data.result);
            }
          }
        });
      });
    }

    var $searchField = $('input.search-field');

    function search(claim) {
      table.dt.search(claim).draw();
    }

    if (options.searching) {
      $('.search-toggle-btn').on('click', function () {
        $searchField.toggle();
        if (!$searchField.is(':visible')) {
          $searchField.val('');
          search('');
        }
      });

      var prevValue = $searchField.val();
      var timer = null;
      var searchDelay = options.searchDelay || 0;
      var searchMinLength = options.searchMinLength || 3;

      $searchField.off().on('keyup', function (ev) {
        clearTimeout(timer);
        var value = $searchField.val();
        if (ev.keyCode === 13) {
          search(value && value.length >= searchMinLength ? value : '');
        } else if (prevValue !== value) {
          prevValue = value;
          timer = setTimeout(function() {
            search(value && value.length >= searchMinLength ? value : '');
          }, searchDelay);
        }
      });
    }

  };


})(jQuery);
