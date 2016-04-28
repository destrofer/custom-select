/*
* CustomSelect - jQuery Plugin
*
* Copyright (c) 2016 Viacheslav Soroka
*
* MIT License - http://www.opensource.org/licenses/mit-license.php
*/
;(function($) {
	var originalValFunc = $.fn.val;

	var defaultSettings = {

	};

	var CustomSelect = function($input, settings) {
		this.$input = $input;
		this.isMultiSelect = this.$input.is('[multiple]');
		this.name = this.isMultiSelect ? null : ("_cs_" + (CustomSelect._nextIdx++));
		this.settings = $.extend({}, defaultSettings, settings);
		if( !this.settings.hasOwnProperty('type') ) {
			var data = this.$input.data();
			if( data.hasOwnProperty('type') )
				this.settings.type = data.type;
			else if( this.isMultiSelect )
				this.settings.type = this.$input.is('.csel-dropdown') ? 'dropdown' : 'list';
			else
				this.settings.type = this.$input.is('.csel-list') ? 'list' : 'dropdown';
		}
		this._init();
	};

	CustomSelect._nextIdx = 0;
	CustomSelect._activeDropdown = null;

	/**
	 * The element that replaces the "select" input.
	 * @type {jQuery}
	 **/
	CustomSelect.prototype.$element = null;

	/**
	 * The container for showing the current value. Available only in dropdown type.
	 * @type {jQuery}
	 **/
	CustomSelect.prototype.$value = null;

	/**
	 * The container for all the rendered options.
	 * @type {jQuery}
	 **/
	CustomSelect.prototype.$options = null;

	/**
	 * Input form element that gets customized.
	 * @type {jQuery}
	 **/
	CustomSelect.prototype.$input = null;

	/**
	 * @type {boolean}
	 **/
	CustomSelect.prototype.isMultiSelect = false;

	/**
	 * Contains widget settings specified by user.
	 * @type {object}
	 **/
	CustomSelect.prototype.settings = null;

	/**
	 * Contains name that is used to group radio buttons when only single selection is allowed.
	 * @type {string}
	 **/
	CustomSelect.prototype.name = null;

	/**
	 * Use getInputOptions() method to get options.
	 * @type {Array}
	 **/
	CustomSelect.prototype._inputOptions = null;

	/**
	 * Contains list of jQuery objects where the key is the option value and the value is a jQuery object.
	 * @type {object}
	 **/
	CustomSelect.prototype._optionsIndex = null;

	/**
	 * Updates widget settings.
	 * @param {object} newSettings
	 **/
	CustomSelect.prototype.options = function(newSettings) {
		this.settings = $.extend(this.settings, newSettings);
		this._inputOptions = null;
	};

	/**
	 * Initializes the widget.
	 **/
	CustomSelect.prototype._init = function() {
		var initialSize = {
			width: this.$input.width(),
			height: this.$input.height()
		};

		this.$element = $('<div/>');
		this.$element.attr('class', this.$input.attr('class')).addClass('custom-select-widget').addClass((this.settings.type == 'list') ? 'csel-list' : 'csel-dropdown');
		this.$element.attr('style', this.$input.attr('style'));

		this.$options = $('<div class="csel-options" />');

		if( this.settings.type == 'dropdown' ) {
			this.$value = $('<div class="csel-value" />');
		}

		// replace select with div and place the select inside the div
		this.$element.insertAfter(this.$input).append(this.$input);
		if( this.settings.type == 'dropdown' ) {
			this.$element.append('<div class="csel-caret" />');
			this.$element.append(this.$value);

			this.$options.addClass('csel-options-dd');

			$('body').append(this.$options);
		}
		else {
			this.$element.append(this.$options);
		}

		this.$input.css({
			position: 'absolute',
			left: '-10000px',
			top: '0',
			visibility: 'hidden'
		});

		this.$element.data('customSelect', this);
		this.$options.data('customSelect', this);

		this.$options.on('click', function(e) {
			var $target = $(e.target);
			e.stopImmediatePropagation();

			var instance;
			if( $target.is('input') ) {
				var val;
				instance = $target.closest('.csel-options').data('customSelect');
				if( instance.isMultiSelect ) {
					val = [];
					instance.$options.find(':input:checked').each(function() {
						val.push($(this).val());
					});
				}
				else {
					val = $target.val();
				}
				originalValFunc.call(instance.$input, val);
				instance.updateValue();
				instance.$input.trigger('change');
			}
		});

		this.$element.on('click', function(e) {
			var $target = $(e.target);
			e.stopImmediatePropagation();
			e.preventDefault();
			$target.closest('.custom-select-widget').data('customSelect').toggle();
		});

		this.refreshOptions();
	};

	CustomSelect.prototype.getOptions = function() {
		if( this._inputOptions !== null )
			return this._inputOptions;

		var options = [];
		this.$input.children('option,optgroup').each(function() {
			var $this = $(this);
			var option = {};
			option.cssClass = $this.attr('class');
			option.cssStyle = $this.attr('style');
			if( $this.is('optgroup') ) {
				option.label = $this.attr('label');
				option.children = [];
				$this.children('option').each(function() {
					var $this = $(this);
					option.children.push({
						value: $this.attr('value'),
						text: $this.text(),
						cssClass: $this.attr('class'),
						cssStyle: $this.attr('style')
					});
				});
			}
			else {
				option.value = $this.attr('value');
				option.text = $this.text();
			}
			options.push(option);
		});
		return this._inputOptions = options;
	};

	CustomSelect.prototype._createInput = function(option) {
		var $cont = $('<div />');
		var $lbl = $('<label />');
		var $inp = $('<input />');

		$cont
			.attr('class', option.cssClass)
			.attr('style', option.cssStyle)
			.addClass('csel-option');

		$inp.attr({
			type: this.isMultiSelect ? 'checkbox' : 'radio',
			name: this.name,
			value: option.value
		});

		var txt = option.text, i = 0, il = txt.length;
		while( i < il && txt.charAt(i) == " " ) // WARNING: THERE IS A UNICODE &nbsp; SYMBOL, NOT SPACE INSIDE THE QUOTES!
			i++;

		// if option text has &nbsp; in the beginning we move those spaces before the input
		// to offset radio buttons / checkboxes
		if( i > 0 ) {
			txt = txt.substring(i);
			$cont.css({
				'padding-left': (3 * i) + 'px'
			});
		}

		$lbl.append($inp).append(' ' + txt);

		$cont.append($lbl);

		return [$cont, $inp, txt];
	};

	CustomSelect.prototype.refreshOptions = function() {
		var option, option2, opt, $grp, $lbl;
		var options = this.getOptions();
		this._optionsIndex = {};

		var $wrapper = $('<div class="csel-options-wrapper" />');

		for( var i = 0, il = options.length; i < il; i++ ) {
			option = options[i];
			if( option.hasOwnProperty('children') ) {
				$grp = $('<div />');
				$lbl = $('<div />');
				$grp.addClass('csel-optgroup');
				$lbl
					.attr('class', option.cssClass)
					.attr('style', option.cssStyle)
					.addClass('csel-optgroup-label')
					.text((option.label === '') ? " " : option.label); // WARNING: THERE IS A UNICODE &nbsp; SYMBOL, NOT SPACE INSIDE THE QUOTES!
				$grp.append($lbl);

				for( var j = 0, jl = option.children.length; j < jl; j++ ) {
					option2 = option.children[j];
					opt = this._createInput(option2);
					$grp.append(opt[0]);
					this._optionsIndex[option2.value] = [opt[1], opt[2]];
				}
				// elements.push($grp);
				$wrapper.append($grp);
			}
			else {
				opt = this._createInput(option);
				// elements.push(opt[0]);
				$wrapper.append(opt[0]);
				this._optionsIndex[option.value] = [opt[1], opt[2]];
			}
		}

		this.$options.html($wrapper);

		this.updateSelection();
	};

	CustomSelect.prototype.updateSelection = function() {
		if( this._optionsIndex === null )
			this.refreshOptions();

		var selected = originalValFunc.call(this.$input);

		this.$options.find(':input:checked').prop('checked', false);
		if( this.isMultiSelect ) {
			if( selected === null )
				selected = [];
			for( var i = 0, il = selected.length; i < il; i++ ) {
				var v = selected[i];
				if( this._optionsIndex.hasOwnProperty(v) )
					this._optionsIndex[v][0].prop('checked', true);
			}
		}
		else {
			if( this._optionsIndex.hasOwnProperty(selected) )
				this._optionsIndex[selected][0].prop('checked', true);
		}

		this.updateValue();
	};

	/**
	 * Updates the value displayed in the always visible element when the select type is "dropdown".
	 */
	CustomSelect.prototype.updateValue = function() {
		if( !this.$value )
			return;
		if( this._optionsIndex === null )
			this.refreshOptions();

		var selected = originalValFunc.call(this.$input);
		var text = [];

		if( this.isMultiSelect ) {
			if( selected === null )
				selected = [];
			for( var i = 0, il = selected.length; i < il; i++ ) {
				var v = selected[i];
				if( this._optionsIndex.hasOwnProperty(v) )
					text.push(this._optionsIndex[v][1]);
			}
		}
		else {
			text.push(this._optionsIndex.hasOwnProperty(selected) ? this._optionsIndex[selected][1] : '');
		}

		text = text.join('; ');
		this.$value.prop('title', text).text(text);
	};

	CustomSelect.prototype.toggle = function() {
		if( CustomSelect._activeDropdown != this )
			this.open();
		else
			this.close();
	};

	CustomSelect.prototype.open = function() {
		if( CustomSelect._activeDropdown == this )
			return;

		if( CustomSelect._activeDropdown )
			CustomSelect._activeDropdown.close();

		if( this.settings.type == 'dropdown' ) {
			this.$element.addClass('active');
			this.$options.addClass('active');
			var pos = this.$element.offset();
			this.$options.css({
				left: pos.left + 'px',
				top: (pos.top + this.$element.outerHeight() - 1) + 'px',
				'min-width': this.$element.outerWidth() + 'px'
			});
			CustomSelect._activeDropdown = this;
			this.$input.trigger('open');
		}
	};

	CustomSelect.prototype.close = function() {
		if( this.settings.type == 'dropdown' ) {
			this.$element.removeClass('active');
			this.$options.removeClass('active');
			if( CustomSelect._activeDropdown == this )
				CustomSelect._activeDropdown = null;
			this.$input.trigger('close');
		}
	};

	CustomSelect.prototype.val = function() {
		var retVal = originalValFunc.apply(this.$input, arguments);
		if( arguments.length > 0 ) {
			this.updateSelection();
			// Uncomment if change event must be invoked when value is changed by javascript.
			// Default behaviour of inputs is not to invoke events.
			// this.$input.trigger('change');
		}
		return retVal;
	};

	$(function() {
		$('body').on('click', function(e) {
			if( CustomSelect._activeDropdown ) {
				var $options = $(e.target).closest('.csel-options');
				if( $options.length == 0 || $options.data('customSelect') != CustomSelect._activeDropdown )
					CustomSelect._activeDropdown.close();
			}
		});
	});

	$.fn.val = function() {
		var instance = this.data('customSelect');
		if( instance )
			return CustomSelect.prototype.val.apply(instance, arguments);
		return originalValFunc.apply(this, arguments);
	};

	$.fn.customSelect = function() {
		var args = arguments;
		var $items = $(this);
		var retVal = $items;

		$items.each(function() {
			var $this = $(this);
			var instance = $this.data('customSelect');
			if( typeof(args[0]) == "string" && args.length > 0 ) {
				if( !instance )
					return;
				if( args[0].substring(1,1) == '_' ) {
					console.error("Cannot call protected methods");
					return false;
				}

				if( typeof(instance[args[0]]) == 'function' ) {
					var rv = instance[args[0]].apply(instance, args.slice(1));
					if( typeof rv !== 'undefined' )
						retVal = rv;
				}
				else {
					console.error("Method '" + args[0] + "' not found in CustomSelect");
					return false;
				}
			}
			else if( instance && args.length > 0 ) {
				instance.options(args[0]);
			}
			else if( $this.is('select') ) {
				instance = new CustomSelect($this, (args.length > 0) ? args[0] : {});
				$this.data('customSelect', instance);
			}
		});
	};
})(jQuery);
