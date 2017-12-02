$(function () {
    'use strict';
    var toppings = ['Mushroom', 'Onion', 'Spring Onion',
    'Jalapenos', 'Fresh Tomato', 'Pineapple', 'Cherry Peppers',
    'Cherry Tomato', 'Capsicum', 'Baby Spinach', 'Beef', 'Italian Sausage',
    'Pepperoni', 'Prawns', 'Bacon', 'Pork Fennel sausage', 'Chicken', 'Ham',
    'Camembert', 'Feta', 'Anchovies', 'Olives', 'Avocado', 'Roasted Pepper',
    'Chorizo'];
    
    var keysToppings = '1234567890qwertyuiopasdfg'.toUpperCase().split('');
    var spread = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    var keysSpread = spread.map(function(item) {
        if(item === "10") {
            return "Shift+0"
        }
        return "Shift+"+item
    })
    var doughTypes = ['Cheesy', 'Classic', 'Thin'];
    var doughTypesKeys = ["Shift+Q", "Shift+W", "Shift+E"];
    var quantityTypes = ['Less', 'Exact', 'Over'];
    var quantityTypesKeys = ['Shift+A', 'Shift+S', 'Shift+D'];
    var sauceTypes = ['Tomato', 'BBQ', 'Creme fraiche', 'none'];
    var sauceTypesKeys = ['Shift+Z', 'Shift+X', 'Shift+C', 'Shift+V'];
    var crustTypes = ['Under cooked', 'Good', 'Over cooked'];
    var crustTypesKeys = ['Shift+R', 'Shift+T', 'Shift+Y'];
    var buttons = [
        {
            id: 'Zone Marker',
            icon: 'static/img/paint-bucket.svg',
            state: 'fill'
        },
        {
            id: 'Custom Contour',
            icon: 'static/img/pencil-edit-button.svg',
            state: 'contour'
        },
        {
            id: 'Undo',
            icon: 'static/img/undo-arrow.svg',
        },
        {
            id: 'Save',
            icon: 'static/img/floppy-disk.svg',
        },
    ]
    var controls = $('.controls')
    var tool = null;

    var imageBlock = $('.image-block')

    var viewer, counter;

    function getList(names, keys) {
        return names.map(function(name, i) {
            return {
                shortcut: keys[i] || null,
                value: name
            }
        })
    }

    function initToppings(toppings, keysToppings) {
        var blist = new ButtonList({
            hostElement: document.querySelector(".controls .full"),
            list: getList(toppings, keysToppings),
            multiSelect: false,
            selectedClass: "topping-selected",
            name: "toppings"
        })
        blist.render()
        return blist
    }

    function initSpread(spread, keysSpread) {
        var blist = new ButtonList({
            hostElement: document.querySelector(".controls .full-spread"),
            list: getList(spread, keysSpread),
            multiSelect: false,
            selectedClass: "spread-selected",
            name: "spread"
        })
        blist.render()
        return blist
    }

    function initDough(doughTypes, doughTypesKeys) {
        var blist = new ButtonList({
            hostElement: document.querySelector(".controls .left"),
            list: getList(doughTypes, doughTypesKeys),
            multiSelect: false,
            selectedClass: "dough-selected",
            name: "dough"
        })
        blist.render()
        return blist
    }

    function initQuantity(quantityTypes, quantityTypesKeys) {
        var blist = new ButtonList({
            hostElement: document.querySelector(".controls .right"),
            list: getList(quantityTypes, quantityTypesKeys),
            multiSelect: false,
            selectedClass: "q-selected",
            name: "quantity"
        })
        blist.render()
        return blist
    }

    function initSauces(sauceTypes, sauceTypesKeys) {
        var blist = new ButtonList({
            hostElement: document.querySelector(".controls .full"),
            list: getList(sauceTypes, sauceTypesKeys),
            multiSelect: false,
            selectedClass: "sauces-selected",
            name: "sauces"
        })
        blist.render()
        return blist
    }

    function initCrust(crustTypes, crustTypesKeys) {
        var blist = new ButtonList({
            hostElement: document.querySelector(".controls .right-last"),
            list: getList(crustTypes, crustTypesKeys),
            multiSelect: false,
            selectedClass: "crust-selected",
            name: "crust"
        })
        blist.render()
        return blist
    }

    class EventEmitter {
        constructor() {
            this.events = {};
        }
        subscribe(eventName, fn) {
            if(!this.events[eventName]) {
                this.events[eventName] = [];
            }

            this.events[eventName].push(fn);

            return () => {
                this.events[eventName] = this.events[eventName].filter(eventFn => fn !== eventFn);
            }
        }

        emit(eventName, data) {
            const event = this.events[eventName];
            if(event) {
                event.forEach(fn => {
                    fn.call(null, data);
                });
            }
        }
    }
    
    function Controls(buttons, hostSelector) {
        this.buttons = buttons;
        this.host = $(hostSelector)
        this.currentState = buttons[0].state
        this.emitter = new EventEmitter();
        this.states = buttons.reduce((acc,el) => {
            if (el.state) acc[el.state] = el
            return acc
        }, {})
    }

    Controls.prototype.render = function() {
        this.host.html(this.buttons.reduce(function(acc, button) {
            return acc += `<li>
                        <button id="${button.id}" title="${button.id}" data-status="${button.state || ''}">
                            <img src="${button.icon}" alt="${button.id}">
                        </button>
                    </li>`
        }, "<ul class='canvas-controller'>") + "</ul>")
        $(this.host.children()[0]).children().each((i, el) => {
            let elm = $(el).children().get(0)
            let state = $(elm).data("status")
            if (state) this.states[state].element = elm
        })
        let state = this.states[this.currentState]
        $(state.element).addClass('actived')
    }

    Controls.prototype.applyEvents = function() {
        this.host.on('click', 'button', e => {
            this.emitter.emit(e.currentTarget.id, {
                state: this.currentState
            })
        })
    }

    Controls.prototype.changeState = function(newState) {
        let lastState = this.states[this.currentState]
        this.currentState = newState;
        let state = this.states[newState];
        $(lastState.element).removeClass('actived')
        $(state.element).addClass('actived')
    }

    function ButtonList(options) {
        Object.assign(this, options)
        this.data = this.multiSelect ? this.list.reduce(function(acc, el) {
            acc[el.value] = false;
            return acc
        }, {}) : "";
        this.colors = this.list.reduce(function(acc, el) {
            acc[el.value] = [Math.round(Math.random() * 255), Math.round(Math.random() * 255),
            Math.round(Math.random() * 255)]
            return acc
        }, {})
        this.emitter = new EventEmitter();
        
    }

    ButtonList.prototype.render = function() {
        this.container = document.createElement("div");
        this.container.classList.add("list-button-cnt");
        this.container.innerHTML = "<h3 class='list-b-title'>"+ this.name.toUpperCase() +"</h3>"
        this.element = document.createElement("ul");
        var self = this;
        this.element.innerHTML = this.list.reduce(function(acc, el, i) {
            return acc +=
            "<li id='"+el.value+"' class='list-element "+ (self.selectedClass || "") +"'>" +
                "<p class='color-label' style='background-color: rgba("+self.colors[el.value].join(',')+",255);'></p>"+
                "<p class='licontent'>" +
                    "<span class='el-name'>"+el.value+"</span>" +
                    "<span class='el-shortcut' title='Shortcut letter'>"
                        +el.shortcut+
                    "</span>" +
                "</p>" +
            "</li>"
        }, "")
        var nodes = this.element.querySelectorAll(".list-element")
        var elements = [].slice.call(nodes, 0)
        this.elementsMap = elements.reduce(function(acc,element) {
            acc[element.id] = element
            return acc
        }, {});
        this.element.classList.add("list-el", this.name)
        this.container.appendChild(this.element)
        this.hostElement.appendChild(this.container)
        this.handleToggle()
    }

    ButtonList.prototype.handleToggle = function(id) {
        var self = this;

        controls.on("click", "."+this.name, function(event) {

            var el = $(event.target).closest(".list-element")
            if (!el.length) {
                return
            }

            if (self.multiSelect) {
                el.toggleClass("selected")
                self.data[el.get(0).id] = !self.data[el.get(0).id]
                self.emitter.emit("input:list", { key: el.get(0).id, color: self.colors[el.get(0).id], value: self.data[el.get(0).id] })
            } else {
                $("."+self.name + " .list-element").removeClass("selected")
                self.data = self.data === el.get(0).id ? "" : el.get(0).id
                self.data ? el.addClass("selected") : el.removeClass("selected")
                self.emitter.emit("input:list", { key: el.get(0).id, color: self.colors[el.get(0).id], value: !!self.data })
            }

        })
        this.list.forEach(function(el) {
            shortcut.add(el.shortcut, function() {
                var elm = self.elementsMap[el.value]
                if (self.multiSelect) {
                    $(elm).toggleClass("selected")
                    self.data[el.value] = !self.data[el.value]
                    self.emitter.emit("input:list", { key: el.get(0).id, color: self.colors[el.get(0).id], value: self.data[el.get(0).id] })
                } else {
                    $("."+self.name + " .list-element").removeClass("selected")
                    self.data = self.data === el.value ? "" : el.value
                    self.data ? $(elm).addClass("selected") : $(elm).removeClass("selected")
                    self.emitter.emit("input:list", { key: el.get(0).id, color: self.colors[el.get(0).id], value: !!self.data })
                }
            });
        })
    }

    ButtonList.prototype.getData = function() {
        if (this.multiSelect) {
            return (Object.keys(this.data))
                .filter(function(key){
                    return this.data[key]
                }, this)
        } else {
            return this.data
        }
    }

    ButtonList.prototype.reset = function() {
        if (this.multiSelect) {
            (Object.keys(this.data))
                .forEach(function(key){
                    this.data[key] = false;
                }, this)
        } else {
            this.data = ""
        }
        $("."+this.name + " .list-element").removeClass("selected")
    }

    function Counter(options) {
        Object.assign(this, options)
        this._count = this.startValue;
        this.value = {}
        var self = this;
        Object.defineProperty(this.value, "count", {
            get: function() {
                return self._count
            },
            set: function(newVal) {
                self._count = newVal
                self.valueEl.textContent = self.value.count
            }
        })
    }

    Counter.prototype.render = function() {
        $(this.hostElement).html("<p>"+
            "<span class='c-title'>"+this.title+"</span>"+
            "<span class='c-value'>"+this.value.count+"</span>"+
        "</p>")
        this.valueEl = this.hostElement.querySelector('.c-value')
    }

    function initCounter() {
        var c = document.querySelector(".counter")        
        var contV = c.querySelector(".c-value")
        var counter = new Counter({
            startValue: isNaN(+contV.textContent) ? 0 : +contV.textContent,
            hostElement: c,
            title: "COUNTER:"
        })
        counter.render()
        return counter
    }
    function initControls(buttons) {
        var controls = new Controls(buttons, '.full-canvas')
        controls.render()
        controls.applyEvents()
        return controls
    }

    function initTool() {
        return {
            "controls": initControls(buttons),
            "annotation": initToppings(toppings, keysToppings),
            "sauce": initSauces(sauceTypes, sauceTypesKeys),
        }
    }

    function getData() {
        if (!tool) return null;
        return {
            annotation: tool.annotation.getData(),
            sauce: tool.sauce.getData(),
        }
    }

    function reset() {
        if (!tool) return null;
        tool.annotation.reset()
        tool.sauce.reset()
    }

    window.tool = initTool()
    window.tool.annotation.emitter.subscribe("input:list", e => {
        const sel = window.tool.sauce.element.querySelector(".list-element.selected")
        sel && sel.classList.remove("selected")
        window.tool.sauce.data = ""
    })
    window.tool.sauce.emitter.subscribe("input:list", e => {
        const sel = window.tool.annotation.element.querySelector(".list-element.selected")
        sel && sel.classList.remove("selected")
        window.tool.annotation.data = ""
    })
});
