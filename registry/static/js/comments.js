(function ($) {

  function tpl(tplStr, obj) {
    return tplStr.replace(/{{(\w+)}}/g, function (match, property) {
      return $('<div />').text(obj[property] || '').html();
    });
  }

  function fetchComments(fetchUrl, options, count) {
    count = count || options.count || 5;
    var lo = {
      sorting: [{
        property: [options.comment.date],
        mode: 1
      }],
      eagerLoading: [options.comment.user],
      length: count,
    };
    return $.post(fetchUrl, lo);
  }

  function deleteComment(deleteUrl, item) {
    return $.post(deleteUrl, {
      $action: 'DELETE',
      items: [{
        class: item.__class,
        id: item._id
      }]
    });
  }

  function editComment(editUrl, options, className, id, value) {
    editUrl = editUrl.replace(/{{class}}/g, className);
    editUrl = editUrl.replace(/{{id}}/g, id);
    return $.post(editUrl, {
      $action: 'SAVE',
      [options.comment.text]: value
    });
  }

  function renderComment(item, template, cb, options, cache) {
    var c = options.comment;
    var photo = getDataProperty(c.photo, item, cache);
    var d = {
      author: item[c.user + '_str'] ? item[c.user + '_str'] : item[c.user],
      date: moment(item[c.date]).format(DATETIME_FORMAT),
      text: item[c.text],
      photo: photo ? 'background-image: url('+ photo +')' : ''
    };
    var $comment = $(tpl(template, d));
    item._children && $comment.addClass('has-children');
    $comment.attr('comment-id', item._id);
    $comment.attr('comment-class', item.__class);
    cb($comment, item);
    return $comment;
  }

  function objectKeysCount(obj) {
    var results = [];
    for (key in obj) {
      if (obj.hasOwnProperty(key) && key.slice(0,1) !== '_') {
        results.push(key);
      }
    }
    return results.length;
  }

  function cacheListRefs(list, cache) {
    var item, key, ref;
    cache = cache || {};
    for (var i = 0; i < list.length; i++) {
      item = list[i];
      for (key in item) {
        if (item.hasOwnProperty(key) && key.slice(-4) === '_ref') {
          ref = item[key];
          if (ref._id && ref.__class && objectKeysCount(ref) > 0) {
            cache[ref.__class + '' + ref._id] = ref;
            cacheListRefs([ref], cache);
          }
        }
      }
    }
    return cache;
  }

  function enrichItemRefs(item, cache) {
    var key;
    for (key in item) {
      if (item.hasOwnProperty(key) && key.slice(-4) === '_ref') {
        ref = item[key];
        if (ref._id && ref.__class && cache[ref.__class + '' + ref._id]) {
          item[key] = enrichItemRefs(cache[ref.__class + '' + ref._id], cache);
        }
      }
    }
    return item;
  }

  function enrichListRefs(list, cache) {
    var results = [];
    cache = cache || {};
    for (var i = 0; i < list.length; i++) {
      results.push(enrichItemRefs(list[i], cache));
    }
    return results;
  }

  function renderComments(list, $container, template, cb, options) {
    if (list && list.length) {
      list.sort(getOrderDirection(options) === 'asc' ? orderByAsc : orderByDesc);
      list = enrichListRefs(list, cacheListRefs(list));
      var map = createHierarchy(list, options);
      for (var i = 0; i < list.length; ++i) {
        list[i]._$content = renderComment(list[i], template, cb, options);
      }
      for (var i = 0; i < list.length; ++i) {
        var parent = list[i][options.comment.parent];
        if (parent) {
          if (map.hasOwnProperty(parent)) {
            map[parent]._$content.children('.item-comment-children').append(list[i]._$content);
          }
        } else {
          $container.append(list[i]._$content);
        }
      }
    }
  }

  function createHierarchy(list, options) {
    var map = {};
    for (var i = 0; i < list.length; ++i) {
      map[list[i]._id] = list[i];
    }
    for (var i = 0; i < list.length; ++i) {
      var parent = list[i][options.comment.parent];
      if (parent) {
        if (map.hasOwnProperty(parent)) {
          if (map[parent]._children instanceof Array) {
            map[parent]._children.push(list[i]._id);
          } else {
            map[parent]._children = [list[i]._id];
          }
        } else {
          console.warn('Skipped:', [list[i]._id], 'Not found parent comment');
        }
      }
    }
    return map;
  }

  function commentEvents(list, url, $modal, options) {
    return function($comment, item) {
      if(options.user && options.user === item._creator) {
        $comment.find('.dropdown').show();
        $comment.find('.item-comment-edit').on('click', function () {
          $modal.find('.modal-body textarea').val(item[options.comment.text]);
          $modal.attr('comment-id', item._id);
          $modal.attr('comment-class', item.__class);
        });
        $comment.find('.item-comment-delete').on('click', function () {
          if (confirm('Удалить данный комментарирй?')) {
            deleteComment(url.delete, item)
              .then(function () {
                var $parent = $comment.closest('.item-comment-children').closest('.item-comment');
                if ($parent.length) {
                  if ($parent.children('.item-comment-children').children().length === 1) {
                    $parent.removeClass('has-children');
                  }
                }
                $comment.remove();
                list.trigger('comment-deleted');
              })
              .fail(console.error);
          }
        });
      }
    };
  }

  function orderByAsc(a, b) {
    return a.date.localeCompare(b.date);
  }

  function orderByDesc(a, b) {
    return !a.date.localeCompare(b.date);
  }

  function getOrderDirection (options) {
    return options.$orderToggle.data('direction') || 'asc';
  }

  function replaceContent (selector, $old, $new) {
    $old.find(selector).html($new.find(selector).html());
  }

  function getDataProperty (prop, data, cache) {
    cache = cache || {};
    var props = String(prop).split('.');
    var result = data;
    for (var i = 0; i < props.length; ++i) {
      if (result) {
        /*if (props[i].slice(-4) === '_ref' && cache[props[i]]) {
          result[props[i]] = cache[props[i]];
        }*/
        result = result[props[i]];
      }
    }
    return result;
  }

  $.fn.ionItemComments = function (options) {
    this.each(function() {

      if (!options.comment) {
        throw new Error('comment properties not specified');
      }
      var $this = $(this);
      var url = {
        create: $this.data('create-url'),
        put: $this.data('put-url'),
        fetch: $this.data('fetch-url'),
        delete: $this.data('action-url'),
        edit: $this.data('edit-url')
      };
      if (!url.create || !url.put || !url.fetch) {
        throw new Error('urls not specified');
      }
      var commentTpl = $this.find('#item-comment').html();
      var $commentsList = $this.find('.item-comments-list');
      var $modal = $this.find('#comment-edit-modal');
      var $listLoad = $this.find('.item-comments-list-load');
      var $footer = $this.find('.items-comments-footer');
      var $addComment = $this.find('.add-new-comment');
      var $newComment = $this.find('.new-comment');
      var $newCommentText = $this.find('.new-comment-text');
      var $cancelNewComment = $this.find('.cancel-new-comment');
      var $orderToggle = $this.find('.comment-order-toggle');

      $this.on('comment-reload', function(e, count) {
        $this.addClass('loading');
        count = count || parseInt(options.count) || 5;
        fetchComments(url.fetch, options, count)
          .then(function(result) {
            $commentsList.empty();
            if (result && result.data) {
              renderComments(result.data, $commentsList, commentTpl, commentEvents($this, url, $modal, options), options);
              $listLoad.toggle(result.hasOwnProperty('recordsTotal') && result.recordsTotal > count);
            }
            $this.removeClass('loading');
          })
          .fail(console.log);
      });

      $this.trigger('comment-reload');

      $this.find('.new-comment-send').on('click', function () {
        var data = {};
        $this.addClass('loading');
        $cancelNewComment.click();
        $.post(url.create, {
          $action: 'CREATE',
          [options.comment.text]: $newCommentText.val(),
          [options.comment.parent]: $newComment.data('parent'),
        })
          .always(function () {
            $this.removeClass('loading');
          })
          .then(function (comment) {
            $newCommentText.val('');
            if (comment && comment._id) {
              data = comment;
              return $.post(url.put, {
                $action: 'SAVE',
                [$newCommentText.attr('name')]: [{
                  action: 'put',
                  id: comment._id
                }]
              });
            } else {
              throw new Error('wrong response');
            }
          })
          .then(function () {
            $this.trigger('comment-added');
            $this.trigger('comment-reload');
          })
          .fail(console.log);
      });

      $modal.find('.modal-comment-edit').on('click', function () {
        var className = $modal.attr('comment-class');
        var id = $modal.attr('comment-id');
        editComment(url.edit, options, className, id, $modal.find('.modal-body textarea').val())
          .then(function(newItem){
            var $old = $('.item-comment[comment-class="'+className+'"][comment-id="'+id+'"]');
            var $new = renderComment(newItem, commentTpl, commentEvents($this, url, $modal, options), options);
            replaceContent('> .item-comment-body .item-comment-title-date', $old, $new);
            replaceContent('> .item-comment-body .item-comment-inner', $old, $new);
          });
        $modal.modal('hide');
      });

      $this.on('comment-added comment-deleted', function () {
        // loadWorkflowState();
      });

      $(document.body).on('mouseenter', '.item-comment', function () {
        $(this).addClass('mouse-enter');
      });

      $(document.body).on('mouseleave', '.item-comment', function () {
        $(this).removeClass('mouse-enter');
      });

      $listLoad.on('click', function(){
        var $listLoad = $(this);
        var click = parseInt($listLoad.data('click')) || 1;
        var count = parseInt(options.count) || 5;
        $this.trigger('comment-reload', count * (click + 1));
        $listLoad.data('click', click + 1);
      });

      options.$orderToggle = $orderToggle;
      $orderToggle.click(function () {
        var direction = $orderToggle.data('direction') === 'desc' ? 'asc' : 'desc';
        $orderToggle.data('direction', direction);
        $orderToggle.toggleClass('asc', direction === 'asc');
        $orderToggle.toggleClass('desc', direction === 'desc');
        $this.trigger('comment-reload');
      });

      $commentsList.on('click', '.item-comment-replay', function () {
        var $item = $(this).closest('.item-comment');
        $cancelNewComment.click();
        $item.children('.item-comment-body').append($newComment);
        $newComment.data('parent', $item.attr('comment-id'));
        showNewComment();
      });

      $commentsList.on('click', '.item-comment-edit', function () {
        $cancelNewComment.click();
      });

      $commentsList.on('click', '.item-comment-delete', function () {
        $cancelNewComment.click();
      });

      $addComment.click(function () {
        $cancelNewComment.click();
        $newComment.data('parent', null);
        $addComment.hide();
        showNewComment();
      });

      $cancelNewComment.click(function () {
        $footer.prepend($newComment);
        $newComment.hide();
        $addComment.show();
      });

      function showNewComment () {
        $newComment.show();
        $newCommentText.val('').focus();
      }

    });
  };
})(jQuery);