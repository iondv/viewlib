(function ($) {

  $.fn.ionAddrSearch = function (options) {
    if (!options.fields || !options.fields.length) {
      console.log('No fields specified');
      return;
    }
    this.each(function () {
      var $this = $(this);
      var searchUrl = $this.attr('search-url');

      var depth = options.fields.length;
      var values = [];
      var tmp = [];
      var results = [];
      var hidden = $this.next();
      var sep = options.separator || ',';

      function addrCaption() {
        var result = '';
        if (values.length) {
          result = values.map(function (o) {
            return o.text;
          }).join(sep + ' ');
          if (values.length < depth) {
            result = result + (sep + ' ');
          }
        }
        return result;
      }

      $this.select2({
        minimumInputLength: 1,
        closeOnSelect: false,
        ajax: {
          url: searchUrl,
          type: 'POST',
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          data: function (params) {
            var parts = params.term.split(sep);
            tmp = [];
            var i, term = [];
            for (i = 0; i < parts.length; i++) {
              if (values[i]) {
                if(parts[i].trim() === values[i].text) {
                  tmp.push(values[i]);
                } else {
                  break;
                }
              }
            }

            for (i = 0; i < parts.length; i++) {
              if ((tmp[i] && parts[i].trim() !== tmp[i].text) || !tmp[i]) {
                term.push(parts[i]);
              }
            }

            term = term.join(sep).trim();
            var index = tmp.length;
            var query = {
              values: tmp.map(function(o){ return o.id; }),
              filters: []
            };
            var f;
            query.values.length = depth - 1;
            query.filters.length = depth - 1;
            if (term.trim() && options.fields[index]) {
              f = {
                property: options.fields[index].searchBy,
                operation: 4,
                value: [term]
              };
              if (options.fields[index].filter && options.fields[index].filter.length) {
                f = options.fields[index].filter.slice().concat([f]);
              }
              query.filters[index] = f;
            }
            return JSON.stringify(query);
          },
          processResults: function (data) {
            results = [{id: '__' + values.length, text: 'Not'}];
            if(data && data.data && data.data.length) {
              for (var i = 0; i < data.data.length; i++) {
                results.push(data.data[i]);
              }
            }
            return {results: results};
          }
        },
        templateSelection: function(state) {
          if (state.selected) {
            return state.text;
          }
          return addrCaption();
        }
      });

      $this.on('select2:open', function(e) {
        $this.data("select2").dropdown.$search.val(addrCaption());
      })
      .on("select2:selecting", function (e) {
        var id = e.params.args.data.id;
        values = tmp.slice();
        if (id && id.substring(0,2) !== '__') {
          var s = results.filter(function(o){ return o.id === id; })[0];
          values.push({id: s.id, text: s.text.trim()});
          if (values.length === depth) {
            hidden.val(s.id);
            hidden.trigger("change");
            $this.select2("close");
          } else {
            hidden.val('');
          }
        } else {
          hidden.val('');
          hidden.trigger("change");
        }
        $this.data("select2").dropdown.$search.val(addrCaption());
      });

    });
  };

})(jQuery);
