$(function () {
    'use strict';
    var fragments = JSON.parse(localStorage.getItem("items") || 
    `[
        {
            "name": "Default",
            "color": [
                "255",
                "0",
                "0"
            ]
        }
    ]`);
    
    var keysFragments = '1234567890qwertyuiopasdfg'.toUpperCase().split('');
    var spread = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    var keysSpread = spread.map(function(item) {
        if(item === "10") {
            return "Shift+0"
        }
        return "Shift+"+item
    })
    var buttons = [
        {
            id: 'Zone Marker',
            icon: 'img/paint-bucket.svg',
            state: 'fill',
            shortcut: 'Shift+D'
        },
        {
            id: 'Custom Contour',
            icon: 'img/pencil-edit-button.svg',
            state: 'contour',
            shortcut: 'Shift+F'
        },
        {
            id: 'Brush',
            icon: 'img/brush-stroke.svg',
            state: 'brush',
            shortcut: 'Shift+G'
        },
        {
            id: 'Change Thickness',
            icon: '',
            custom: 
                `<div class="thickness-box">
                    <p>10</p>
                    <input id="thickness" type="range" min="1" max="60" value="10" step="1">
                </div>`,
            event: {
                type: "input",
                target: "#thickness",
                name: 'Change Thickness',
                callback: (event) => {
                    $(event.target).siblings().text(event.target.value)
                }
            },
            shortcut: 'Shift+H'
        },
        {
            id: 'Eraser',
            icon: 'img/eraser.svg',
            state: 'eraser',
            shortcut: 'Shift+A'
        },
        {
            id: 'Change Thickness Eraser',
            icon: '',
            custom: 
                `<div class="thickness-box">
                    <p>10</p>
                    <input id="thickness-er" type="range" min="1" max="60" value="10" step="1">
                </div>`,
            event: {
                type: "input",
                target: "#thickness-er",
                name: 'Change Thickness Eraser',
                callback: (event) => {
                    $(event.target).siblings().text(event.target.value)
                }
            },
            shortcut: 'Shift+T'
        },
        {
            id: 'Show/Hide Net',
            icon: 'img/grid.svg',
            preactived: true,
            shortcut: 'Shift+E'
        },
        {
            id: 'Undo',
            icon: 'img/undo-arrow.svg',
            shortcut: 'Ctrl+Z'
        },
        {
            id: 'Upload new image',
            icon: 'img/jpg-image-file-format.svg',
            custom: 
                `
                <label id='label-uploader'>
                    <input type="file" name="uploader" id="uploader" accept="image/jpeg,image/jpg" class="hidden">
                    <img src="img/jpg-image-file-format.svg" alt="Upload new image">
                </label>`,
            event: {
                type: "change",
                target: "#uploader",
                name: 'New file'
            },
            shortcut: 'Shift+W'
        },
        {
            id: 'Save',
            icon: 'img/floppy-disk.svg',
            shortcut: 'Shift+S'
        },
    ]
    var controls = $('.controls')
    var tool = null;

    var imageBlock = $('.image-block')

    var viewer, counter;

    function getList(values, keys) {
        return values.map(function(val, i) {
            return {
                name: val.name,
                color: [+val.color[0], +val.color[1], +val.color[2]]
            }
        })
    }

    function initFragments(fragments, keysFragments) {
        var blist = new ButtonList({
            hostElement: document.querySelector(".controls .full"),
            list: getList(fragments, keysFragments),
            multiSelect: false,
            selectedClass: "topping-selected",
            name: "fragments"
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
        this.elements = {};
    }

    Controls.prototype.render = function() {
        this.host.html(this.buttons.reduce(function(acc, button) {
            if (!button.custom) {
                return acc += `<li>
                            <button id="${button.id}" title="${button.id} (${button.shortcut})"
                                class="${button.preactived ? 'actived' : ''}" 
                                data-status="${button.state || ''}">
                                <img src="${button.icon}" alt="${button.id}">
                            </button>
                        </li>`
            } else {
                return acc += `<li>
                        ${button.custom}
                        </li>`
            }
        }, "<ul class='canvas-controller'>") + "</ul>")
        $(this.host.children()[0]).children().each((i, el) => {
            let elm = $(el).children().get(0)
            this.elements[elm.id] = elm
            let state = $(elm).data("status")
            if (state) this.states[state].element = elm
        })
        let state = this.states[this.currentState]
        $(state.element).addClass('actived')
    }

    Controls.prototype.applyEvents = function() {
        this.host.on('click', 'button', e => {
            this.emitter.emit(e.currentTarget.id, {
                state: this.currentState,
                event: e,
            })
        })
        this.buttons.forEach(button => {
            if (!button.custom) {
                shortcut.add(button.shortcut, () => {
                    let event = {}
                    event.currentTarget = this.elements[button.id]
                    this.emitter.emit(button.id, {
                        state: this.currentState,
                        event: event,
                    })
                })
            }
            if (button.event) {
                this.host.on(button.event.type, button.event.target, e => {
                    this.emitter.emit(button.event.name, {
                        event: e,
                    })
                    if (button.event.callback) {
                        button.event.callback(e)
                    }
                })
            }
        })
    }

    Controls.prototype.changeState = function(newState) {
        let lastState = this.states[this.currentState]
        this.currentState = newState;
        let state = this.states[newState];
        $(lastState.element).removeClass('actived')
        $(state.element).addClass('actived')
    }

    function Spinner() {
        this.element = $('.spinner')
    }

    Spinner.prototype.show = function() {
        this.element.removeClass('hidden')
    }

    Spinner.prototype.hide = function() {
        this.element.addClass('hidden')
    }

    function initSpinner() {
        return new Spinner()
    }

    function ButtonList(options) {
        Object.assign(this, options)
        this.data = this.multiSelect ? this.list.reduce(function(acc, el) {
            acc[el.value] = false;
            return acc
        }, {}) : "";
        this.colors = this.list.reduce(function(acc, el) {
            acc[el.name] = el.color
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
            "<li id='"+el.name+"' class='list-element "+ (self.selectedClass || "") +"'>" +
                "<input type='color' name='"+el.name+"' value='"+rgbToHex(+el.color[0], +el.color[1], +el.color[2])+"'></input>"+
                "<p class='licontent'>" +
                    "<span class='el-name check-"+self.name+"'>"+el.name+"</span>" +
                    "<span class='el-remove' title='Remove'>"
                        +"X"+
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
        $(this.container).append(
            `<input type='text' id='add-color' name='add-color'>
            <button class='add-color-btn'>Add</button>`
        )
        $('.add-color-btn').on("click", function(e){
            var value = $('#add-color').val()
            if (!value) return
            self.colors[value] = [255,255,255]
            self.list.push({
                name: value,
                color: [255,255,255]
            })
            self.save()
            $(self.element).append(
                "<li id='"+value+"' class='list-element "+ (self.selectedClass || "") +"'>" +
                    "<input type='color' name='"+value+"' value='#ffffff'></input>"+
                    "<p class='licontent'>" +
                        "<span class='el-name check-"+self.name+"'>"+value+"</span>" +
                        "<span class='el-remove' title='Remove'>"
                            +"X"+
                        "</span>" +
                    "</p>" +
                "</li>"
            )
        })
        this.handleToggle()
        $('.el-remove').on('click', function(e) {
            var el = $(e.target).closest('.list-element')
            var id = el[0].id
            el.remove()
            delete self.colors[id]
            self.list.splice(self.list.findIndex(item => item.name === id), 1)
            self.save()
        })
        $(this.element).on('change.spectrum', function(e, color) {
            self.colors[e.target.name] = hexToRgb(e.target.value)
            self.list[self.list.findIndex(item => item.name === e.target.name)].color = hexToRgb(e.target.value)
            self.save()
            var el = $(event.target).closest(".list-element")
            if (!el.length) {
                return
            }
            $("."+self.name + " .list-element").removeClass("selected")
            self.data = self.data === el.get(0).id ? "" : el.get(0).id
            self.data ? el.addClass("selected") : el.removeClass("selected")
            self.emitter.emit("input:list", { key: el.get(0).id, color: self.colors[el.get(0).id], value: !!self.data })
        })
    }

    ButtonList.prototype.save = function() {
        console.log(this)
        localStorage.setItem('items', JSON.stringify(this.list))
    }

    ButtonList.prototype.handleToggle = function(id) {
        var self = this;
        controls.on("click", ".check-"+this.name, function(event) {
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

    function SlicControls() {
        this.resolver = null;
        this.all = document.querySelector('.slic-controls');
        this.spSizeEl = this.all.querySelector('.spx-size-value');
        this.spSizeInput = this.all.querySelector('#spx-size-in');

        this.spCompEl = this.all.querySelector('.spx-comp-value');
        this.spCompInput = this.all.querySelector('#spx-comp-in');

        this.spItEl = this.all.querySelector('.spx-it-value');
        this.spItInput = this.all.querySelector('#spx-it-in');
    }

    SlicControls.prototype.init = function() {
        this.spSizeEl.textContent = this.spSizeInput.value;
        this.spCompEl.textContent = this.spCompInput.value;
        this.spItEl.textContent = this.spItInput.value;

        $(this.all).on('input', 'input', (e) => {
            this.spSizeEl.textContent = this.spSizeInput.value;
            this.spCompEl.textContent = this.spCompInput.value;
            this.spItEl.textContent = this.spItInput.value;
        })

        $(this.all).on('click', 'button.ok', (e) => {
            this.hide()
        })
        return this
    }

    SlicControls.prototype.getData = function() {
        return {
            size: parseInt(this.spSizeInput.value),
            compactness: parseFloat(this.spCompInput.value),
            iterations: parseInt(this.spItInput.value),
        }
    }

    SlicControls.prototype.show = function(resolver) {
        this.resolver = resolver;
        this.all.classList.remove('hidden')
    }

    SlicControls.prototype.hide = function(resolver) {
        if (this.resolver) this.resolver(this.getData());
        this.all.classList.add('hidden')
    }

    function initSlicControls() {
        return new SlicControls().init()
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
            "annotation": initFragments(fragments, keysFragments),
            "slic": initSlicControls(),
            "spinner": initSpinner()
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

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    function rgbToHex(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    function hexToRgb(hex) {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });
    
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    }

    window.tool = initTool()
});
