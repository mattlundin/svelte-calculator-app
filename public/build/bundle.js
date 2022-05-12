
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let h1;
    	let t1;
    	let div8;
    	let input;
    	let t2;
    	let div7;
    	let div0;
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let button2;
    	let t8;
    	let button3;
    	let t10;
    	let div5;
    	let div1;
    	let button4;
    	let t12;
    	let button5;
    	let t14;
    	let button6;
    	let t16;
    	let div2;
    	let button7;
    	let t18;
    	let button8;
    	let t20;
    	let button9;
    	let t22;
    	let div3;
    	let button10;
    	let t24;
    	let button11;
    	let t26;
    	let button12;
    	let t28;
    	let div4;
    	let button13;
    	let t30;
    	let button14;
    	let t32;
    	let button15;
    	let t34;
    	let div6;
    	let button16;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Svelte Calculator";
    			t1 = space();
    			div8 = element("div");
    			input = element("input");
    			t2 = space();
    			div7 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "+";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "-";
    			t6 = space();
    			button2 = element("button");
    			button2.textContent = "×";
    			t8 = space();
    			button3 = element("button");
    			button3.textContent = "÷";
    			t10 = space();
    			div5 = element("div");
    			div1 = element("div");
    			button4 = element("button");
    			button4.textContent = "7";
    			t12 = space();
    			button5 = element("button");
    			button5.textContent = "8";
    			t14 = space();
    			button6 = element("button");
    			button6.textContent = "9";
    			t16 = space();
    			div2 = element("div");
    			button7 = element("button");
    			button7.textContent = "4";
    			t18 = space();
    			button8 = element("button");
    			button8.textContent = "5";
    			t20 = space();
    			button9 = element("button");
    			button9.textContent = "6";
    			t22 = space();
    			div3 = element("div");
    			button10 = element("button");
    			button10.textContent = "1";
    			t24 = space();
    			button11 = element("button");
    			button11.textContent = "2";
    			t26 = space();
    			button12 = element("button");
    			button12.textContent = "3";
    			t28 = space();
    			div4 = element("div");
    			button13 = element("button");
    			button13.textContent = "0";
    			t30 = space();
    			button14 = element("button");
    			button14.textContent = ".";
    			t32 = space();
    			button15 = element("button");
    			button15.textContent = "C";
    			t34 = space();
    			div6 = element("div");
    			button16 = element("button");
    			button16.textContent = "=";
    			attr_dev(h1, "class", "svelte-ocwdb2");
    			add_location(h1, file, 119, 0, 2111);
    			attr_dev(input, "type", "text");
    			input.readOnly = "true";
    			attr_dev(input, "class", "svelte-ocwdb2");
    			add_location(input, file, 121, 1, 2164);
    			attr_dev(button0, "class", "svelte-ocwdb2");
    			add_location(button0, file, 124, 3, 2276);
    			attr_dev(button1, "class", "svelte-ocwdb2");
    			add_location(button1, file, 131, 3, 2366);
    			attr_dev(button2, "class", "svelte-ocwdb2");
    			add_location(button2, file, 138, 3, 2461);
    			attr_dev(button3, "class", "svelte-ocwdb2");
    			add_location(button3, file, 145, 3, 2562);
    			attr_dev(div0, "class", "operations svelte-ocwdb2");
    			add_location(div0, file, 123, 2, 2248);
    			attr_dev(button4, "class", "svelte-ocwdb2");
    			add_location(button4, file, 155, 4, 2705);
    			attr_dev(button5, "class", "svelte-ocwdb2");
    			add_location(button5, file, 162, 4, 2794);
    			attr_dev(button6, "class", "svelte-ocwdb2");
    			add_location(button6, file, 169, 4, 2883);
    			attr_dev(div1, "class", "svelte-ocwdb2");
    			add_location(div1, file, 154, 3, 2695);
    			attr_dev(button7, "class", "svelte-ocwdb2");
    			add_location(button7, file, 178, 4, 2991);
    			attr_dev(button8, "class", "svelte-ocwdb2");
    			add_location(button8, file, 185, 4, 3080);
    			attr_dev(button9, "class", "svelte-ocwdb2");
    			add_location(button9, file, 192, 4, 3169);
    			attr_dev(div2, "class", "svelte-ocwdb2");
    			add_location(div2, file, 177, 3, 2981);
    			attr_dev(button10, "class", "svelte-ocwdb2");
    			add_location(button10, file, 201, 4, 3277);
    			attr_dev(button11, "class", "svelte-ocwdb2");
    			add_location(button11, file, 208, 4, 3366);
    			attr_dev(button12, "class", "svelte-ocwdb2");
    			add_location(button12, file, 215, 4, 3455);
    			attr_dev(div3, "class", "svelte-ocwdb2");
    			add_location(div3, file, 200, 3, 3267);
    			attr_dev(button13, "class", "svelte-ocwdb2");
    			add_location(button13, file, 224, 4, 3563);
    			attr_dev(button14, "class", "svelte-ocwdb2");
    			add_location(button14, file, 231, 4, 3652);
    			attr_dev(button15, "class", "svelte-ocwdb2");
    			add_location(button15, file, 238, 4, 3743);
    			attr_dev(div4, "class", "svelte-ocwdb2");
    			add_location(div4, file, 223, 3, 3553);
    			attr_dev(div5, "class", "numbers svelte-ocwdb2");
    			add_location(div5, file, 153, 2, 2670);
    			attr_dev(button16, "class", "svelte-ocwdb2");
    			add_location(button16, file, 248, 3, 3874);
    			attr_dev(div6, "class", "equal svelte-ocwdb2");
    			add_location(div6, file, 247, 2, 3851);
    			attr_dev(div7, "class", "buttons svelte-ocwdb2");
    			add_location(div7, file, 122, 1, 2224);
    			attr_dev(div8, "class", "calculator svelte-ocwdb2");
    			add_location(div8, file, 120, 0, 2138);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, input);
    			set_input_value(input, /*console*/ ctx[0]);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			append_dev(div7, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t4);
    			append_dev(div0, button1);
    			append_dev(div0, t6);
    			append_dev(div0, button2);
    			append_dev(div0, t8);
    			append_dev(div0, button3);
    			append_dev(div7, t10);
    			append_dev(div7, div5);
    			append_dev(div5, div1);
    			append_dev(div1, button4);
    			append_dev(div1, t12);
    			append_dev(div1, button5);
    			append_dev(div1, t14);
    			append_dev(div1, button6);
    			append_dev(div5, t16);
    			append_dev(div5, div2);
    			append_dev(div2, button7);
    			append_dev(div2, t18);
    			append_dev(div2, button8);
    			append_dev(div2, t20);
    			append_dev(div2, button9);
    			append_dev(div5, t22);
    			append_dev(div5, div3);
    			append_dev(div3, button10);
    			append_dev(div3, t24);
    			append_dev(div3, button11);
    			append_dev(div3, t26);
    			append_dev(div3, button12);
    			append_dev(div5, t28);
    			append_dev(div5, div4);
    			append_dev(div4, button13);
    			append_dev(div4, t30);
    			append_dev(div4, button14);
    			append_dev(div4, t32);
    			append_dev(div4, button15);
    			append_dev(div7, t34);
    			append_dev(div7, div6);
    			append_dev(div6, button16);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[6], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[7], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[8], false, false, false),
    					listen_dev(button4, "click", /*click_handler_4*/ ctx[9], false, false, false),
    					listen_dev(button5, "click", /*click_handler_5*/ ctx[10], false, false, false),
    					listen_dev(button6, "click", /*click_handler_6*/ ctx[11], false, false, false),
    					listen_dev(button7, "click", /*click_handler_7*/ ctx[12], false, false, false),
    					listen_dev(button8, "click", /*click_handler_8*/ ctx[13], false, false, false),
    					listen_dev(button9, "click", /*click_handler_9*/ ctx[14], false, false, false),
    					listen_dev(button10, "click", /*click_handler_10*/ ctx[15], false, false, false),
    					listen_dev(button11, "click", /*click_handler_11*/ ctx[16], false, false, false),
    					listen_dev(button12, "click", /*click_handler_12*/ ctx[17], false, false, false),
    					listen_dev(button13, "click", /*click_handler_13*/ ctx[18], false, false, false),
    					listen_dev(button14, "click", /*click_handler_14*/ ctx[19], false, false, false),
    					listen_dev(button15, "click", /*click_handler_15*/ ctx[20], false, false, false),
    					listen_dev(button16, "click", /*equal*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*console*/ 1 && input.value !== /*console*/ ctx[0]) {
    				set_input_value(input, /*console*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div8);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let total = 0;
    	let console = '';
    	let state = null;

    	function resolveState() {
    		switch (state) {
    			case 'add':
    				total += parseFloat(console);
    				$$invalidate(0, console = 0);
    				break;
    			case 'subtract':
    				total -= parseFloat(console);
    				$$invalidate(0, console = 0);
    				break;
    			case 'multiply':
    				total *= parseFloat(console);
    				$$invalidate(0, console = 0);
    				break;
    			case 'divide':
    				total /= parseFloat(console);
    				$$invalidate(0, console = 0);
    				break;
    			default:
    				total = parseFloat(console);
    				$$invalidate(0, console = 0);
    				break;
    		}
    	}

    	function setOperation(operation) {
    		resolveState();
    		state = operation;
    	}

    	function setValue(value) {
    		if (console.toString() == '0' || state == 'equal') {
    			$$invalidate(0, console = '');
    		}

    		if (state == 'equal') {
    			state = null;
    		}

    		if (value == 'C') {
    			total = 0;
    			state = null;
    			$$invalidate(0, console = '');
    			return;
    		}

    		$$invalidate(0, console = console + value);
    	}

    	function equal() {
    		resolveState();
    		$$invalidate(0, console = total);
    		state = 'equal';
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		console = this.value;
    		$$invalidate(0, console);
    	}

    	const click_handler = () => {
    		setOperation('add');
    	};

    	const click_handler_1 = () => {
    		setOperation('subtract');
    	};

    	const click_handler_2 = () => {
    		setOperation('multiply');
    	};

    	const click_handler_3 = () => {
    		setOperation('divide');
    	};

    	const click_handler_4 = () => {
    		setValue(7);
    	};

    	const click_handler_5 = () => {
    		setValue(8);
    	};

    	const click_handler_6 = () => {
    		setValue(9);
    	};

    	const click_handler_7 = () => {
    		setValue(4);
    	};

    	const click_handler_8 = () => {
    		setValue(5);
    	};

    	const click_handler_9 = () => {
    		setValue(6);
    	};

    	const click_handler_10 = () => {
    		setValue(1);
    	};

    	const click_handler_11 = () => {
    		setValue(2);
    	};

    	const click_handler_12 = () => {
    		setValue(3);
    	};

    	const click_handler_13 = () => {
    		setValue(0);
    	};

    	const click_handler_14 = () => {
    		setValue('.');
    	};

    	const click_handler_15 = () => {
    		setValue('C');
    	};

    	$$self.$capture_state = () => ({
    		total,
    		console,
    		state,
    		resolveState,
    		setOperation,
    		setValue,
    		equal
    	});

    	$$self.$inject_state = $$props => {
    		if ('total' in $$props) total = $$props.total;
    		if ('console' in $$props) $$invalidate(0, console = $$props.console);
    		if ('state' in $$props) state = $$props.state;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		console,
    		setOperation,
    		setValue,
    		equal,
    		input_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10,
    		click_handler_11,
    		click_handler_12,
    		click_handler_13,
    		click_handler_14,
    		click_handler_15
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
