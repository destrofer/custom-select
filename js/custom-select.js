/*
* CustomSelect - jQuery Plugin
*
* Copyright (c) 2016 Viacheslav Soroka
*
* Version: 1.4.0
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
	 * The container for all the rendered actions and options.
	 * @type {jQuery}
	 **/
	CustomSelect.prototype.$dropDown = null;

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

		this.$dropDown = $('<div class="csel-options" />');

		if( typeof this.settings.actions !== "object" )
			this.settings.actions = this.$input.data("actions");

		if( this.settings.type == 'dropdown' ) {
			this.$value = $('<div class="csel-value" />');
		}

		// replace select with div and place the select inside the div
		this.$element.insertAfter(this.$input).append(this.$input);
		if( this.settings.type == 'dropdown' ) {
			this.$element.append('<div class="csel-caret" />');
			this.$element.append(this.$value);

			this.$dropDown.addClass('csel-options-dd');

			$('body').append(this.$dropDown);
		}
		else {
			this.$element.append(this.$dropDown);
		}

		this.$input.css({
			position: 'absolute',
			left: '-10000px',
			top: '0',
			visibility: 'hidden'
		});

		this.$element.data('customSelect', this);
		this.$dropDown.data('customSelect', this);

		this.$dropDown.on('click', function(e) {
			var $target = $(e.target);
			e.stopImmediatePropagation();

			var instance;
			if( $target.is('input') && !$target.is(".csel-toggle-action-input") ) {
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
		return this._inputOptions = CustomSelect.getOptionsOfElement(this.$input);
	};

	CustomSelect.getOptionsOfElement = function($element) {
		var options = [];
		$element.children('option,optgroup').each(function() {
			var $this = $(this);
			var option = {};
			option.cssClass = $this.attr('class');
			option.cssStyle = $this.attr('style');
			if( $this.is('optgroup') ) {
				option.text = $this.attr('label');
				option.children = CustomSelect.getOptionsOfElement($this);
			}
			else {
				option.separator = $this.attr('data-separator');
				option.disabled = $this.is(':disabled');
				option.value = $this.attr('value');
				option.text = $this.text();
			}
			options.push(option);
		});
		return options;
	};

	CustomSelect.prototype._createInput = function(option) {
		var $cont = $('<div />');
		if( option.separator ) {
			$cont.addClass("csel-separator-horizontal");
			return [$cont];
		}

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
		if( option.disabled ) {
			$cont.addClass("csel-option-disabled");
			$inp.attr("disabled", "disabled");
		}
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
		var $wrapper;
		var options = this.getOptions();
		this._optionsIndex = {};

		this.$dropDown.empty();

		var _this = this;
		if( this.settings.actions ) {
			$wrapper = $('<div class="csel-actions" />');
			for( var i = 0; i < this.settings.actions.length; i++ ) {
				var actionGroup = this.settings.actions[i];
				var $group = $('<div class="csel-action-group" />');
				if( typeof actionGroup.text === "string" && actionGroup.text !== "" )
					$group.append($('<span class="csel-action-group-title" />').text(actionGroup.text));
				for( var j = 0; j < actionGroup.actions.length; j++ ) {
					var $action, action = actionGroup.actions[j];
					if( action.action === "toggle" ) {
						$action = $('<label class="csel-action csel-toggle-action" />');
						action.$input = $('<input type="checkbox" class="csel-toggle-action-input" />')
							.data("action", action)
							.prop("indeterminate", true)
							.on("click", function(e) {
								if( $(this).prop("checked") )
									_this.addToSelection($(this).data("action").value);
								else
									_this.removeFromSelection($(this).data("action").value);
							})
						;
						action.$text = $('<span class="csel-toggle-action-text" />').text(action.text.replace("{count}", 0).replace("{total}", action.value.length));
						$action.append(action.$input, action.$text);
					}
					else if( action.action === "quick-filter" ) {
						$action = $('<div class="csel-action csel-quick-filter-action" />');
						action.$input = $('<input type="text" value="" />').attr("placeholder", action.text)
							.on("keyup change paste cut", function() {
								var searchVal = $(this).val().toLowerCase();
								_this.$options.find(':input').each(function() {
									var $input = $(this);
									var $option = $input.closest(".csel-option");
									if( searchVal === "" || $input.attr("value").toLowerCase().indexOf(searchVal) >= 0 || $option.text().toLowerCase().indexOf(searchVal) >= 0 )
										$option.css("display", "");
									else
										$option.css("display", "none");
								});
							})
						;
						$action.append(action.$input);
					}
					else {
						$action = $('<a class="csel-action" href="javascript:void(0)" />')
							.data("action", action)
							.text(action.text)
							.on("click", function(e) {
								e.stopImmediatePropagation();
								e.preventDefault();
								var action = $(this).data("action");
								switch( action.action ) {
									case "select": {
										_this.addToSelection(action.value);
										break;
									}
									case "deselect": {
										_this.removeFromSelection(action.value);
										break;
									}
								}
							})
						;
					}
					$group.append($action);
				}
				$wrapper.append($group);
			}
			this.$dropDown.append($wrapper);
		}

		this.$options = $('<div class="csel-options-wrapper" />');
		this._renderOptions(this.$options, options);
		this.$dropDown.append(this.$options);

		this.updateSelection();
	};

	CustomSelect.prototype.addToSelection = function(value) {
		if( this.isMultiSelect ) {
			var curVal = this.val() || [];
			var prevVal = curVal.sort().join("~|~");

			for( var i = value.length - 1; i >= 0; i-- )
				if( curVal.indexOf(value[i]) < 0 )
					curVal.push(value[i]);

			this.val(curVal);
			if( (this.val() || []).sort().join("~|~") !== prevVal )
				this.$input.trigger("change");
		}
		return this;
	};

	CustomSelect.prototype.removeFromSelection = function(value) {
		if( this.isMultiSelect ) {
			var curVal = this.val() || [];
			var prevVal = curVal.sort().join("~|~");

			curVal = curVal.filter(function(val) {
				return value.indexOf(val) < 0;
			});

			this.val(curVal);
			if( (this.val() || []).sort().join("~|~") !== prevVal )
				this.$input.trigger("change");
		}
		return this;
	};

	CustomSelect.prototype._renderOptions = function($parent, options) {
		var i, il, j, jl, k, kl, $groupCont, $optCont, option, opt, $grp, $lbl, hGroups = [], vGroups = [], curVGroup = [];
		for( i = 0, il = options.length; i < il; i++ ) {
			option = options[i];
			if( option.hasOwnProperty('children') ) {
				$grp = $('<div />');
				$lbl = $('<div />');
				$grp.addClass('csel-optgroup');
				$lbl
					.attr('class', option.cssClass)
					.attr('style', option.cssStyle)
					.addClass('csel-optgroup-label')
					.text((option.text === '') ? " " : option.text); // WARNING: THERE IS A UNICODE &nbsp; SYMBOL, NOT SPACE INSIDE THE QUOTES!
				$grp.append($lbl);

				this._renderOptions($grp, option.children);

				curVGroup.push($grp);
			}
			else if( option.separator ) {
				if( curVGroup.length ) {
					vGroups.push(curVGroup);
					curVGroup = [];
				}
				if( option.separator === "vertical" && vGroups.length ) {
					hGroups.push(vGroups);
					vGroups = [];
				}
			}
			else {
				opt = this._createInput(option);
				this._optionsIndex[option.value] = [opt[1], opt[2]];
				curVGroup.push(opt[0]);
			}
		}

		if( curVGroup.length )
			vGroups.push(curVGroup);
		if( vGroups.length )
			hGroups.push(vGroups);

		for( i = 0, il = hGroups.length; i < il; i++ ) {
			vGroups = hGroups[i];
			if( il === 1 )
				$groupCont = $parent;
			else {
				$groupCont = $('<div class="csel-horizontal-group">');
				$parent.append($groupCont).css({
					whiteSpace: "nowrap"
				});
			}
			for( j = 0, jl = vGroups.length; j < jl; j++ ) {
				curVGroup = vGroups[j];
				if( jl === 1 )
					$optCont = $groupCont;
				else {
					$optCont = $('<div class="csel-vertical-group">');
					$groupCont.append($optCont);
				}
				for( k = 0, kl = curVGroup.length; k < kl; k++ ) {
					$optCont.append(curVGroup[k]);
				}
			}
		}
	};

	CustomSelect.prototype.updateSelection = function() {
		if( this._optionsIndex === null )
			this.refreshOptions();

		var i, j, k, selected = originalValFunc.call(this.$input);

		this.$options.find(':input:checked').prop('checked', false);
		if( this.isMultiSelect ) {
			if( selected === null )
				selected = [];
			for( i = 0, il = selected.length; i < il; i++ ) {
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

	CustomSelect.prototype.updateActions = function() {
		if( typeof this.settings.actions === "object" && this.settings.actions ) {
			var selected = originalValFunc.call(this.$input) || [];
			for( i = this.settings.actions.length - 1; i >= 0; i-- ) {
				var actionGroup = this.settings.actions[i];
				for( j = actionGroup.actions.length - 1; j >= 0; j-- ) {
					var action = actionGroup.actions[j];
					if( action.action !== "toggle" )
						continue;
					var count = 0, total = action.value.length;
					for( k = total - 1; k >= 0; k-- ) {
						if( !this._optionsIndex.hasOwnProperty(action.value[k]) || this._optionsIndex[action.value[k]][0].is(":disabled") ) {
							total--;
							continue;
						}
						if( selected.indexOf(action.value[k]) >= 0 )
							count++;
					}
					action.$text.text(action.text.replace("{count}", count).replace("{total}", total));
					if( count === total )
						action.$input.prop({ checked: true, indeterminate: false });
					else if( count )
						action.$input.prop({ checked: true, indeterminate: true });
					else
						action.$input.prop({ checked: false, indeterminate: false });
				}
			}
		}
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
			this.updateActions();
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
			this.$dropDown.addClass('active');
			var pos = this.$element.offset();
			this.$dropDown.css({
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
			this.$dropDown.removeClass('active');
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
				var $dropDown = $(e.target).closest('.csel-options');
				if( $dropDown.length == 0 || $dropDown.data('customSelect') != CustomSelect._activeDropdown )
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
				if( args[0].substring(1,1) === '_' ) {
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
